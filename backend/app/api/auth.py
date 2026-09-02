import logging
import secrets
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, field_validator
from typing import Optional

from app.database import get_db
from app.models import User, APIKey
from app.auth import hash_password, verify_password, create_access_token, decode_access_token
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if not v or "@" not in v:
            raise ValueError("Invalid email address")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be 3-50 characters")
        if not v.isalnum() and "_" not in v:
            raise ValueError("Username must be alphanumeric or underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None


class CreateAPIKeyRequest(BaseModel):
    name: str = "API Key"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


async def _get_user_from_token(request: Request, db: AsyncSession) -> User | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        api_key = request.headers.get("X-API-Key", "")
        if api_key:
            result = await db.execute(select(APIKey).where(APIKey.key == api_key, APIKey.is_active == True))
            api_key_obj = result.scalar_one_or_none()
            if api_key_obj:
                api_key_obj.last_used_at = _dt.datetime.utcnow()
                await db.commit()
                result2 = await db.execute(select(User).where(User.id == api_key_obj.user_id, User.is_active == True))
                return result2.scalar_one_or_none()
        return None
    token = auth_header.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    return result.scalar_one_or_none()


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    user = await _get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def get_current_active_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    user = await _get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user


async def optional_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    return await _get_user_from_token(request, db)


def require_role(role: str):
    async def checker(user: User = Depends(get_current_active_user)):
        if user.role not in (role, "ADMIN"):
            raise HTTPException(status_code=403, detail=f"Requires {role} role")
        return user
    return checker


async def require_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where((User.email == req.email) | (User.username == req.username)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")

    user = User(
        email=req.email,
        username=req.username,
        hashed_password=hash_password(req.password),
        role="VIEWER",
    )
    db.add(user)
    await db.flush()

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "auth.registered", "user", user.id, {"username": req.username})
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, user=_user_dict(user))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.strip().lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email address. Create an account first, then sign in.")
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again, or use the sign-up page to create a fresh account.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": user.id, "role": user.role})

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "auth.logged_in", "user", user.id)
    await db.commit()
    return TokenResponse(access_token=token, user=_user_dict(user))


@router.get("/me")
async def get_me(user: User = Depends(get_current_active_user)):
    return _user_dict(user)


@router.put("/me")
async def update_me(req: UpdateProfileRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if req.username:
        existing = await db.execute(select(User).where(User.username == req.username, User.id != user.id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = req.username
    user.updated_at = _dt.datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return _user_dict(user)


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(req.new_password)
    user.updated_at = _dt.datetime.utcnow()
    await db.commit()
    return {"status": "password changed"}


@router.post("/api-keys")
async def create_api_key(req: CreateAPIKeyRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    key_value = f"seo_{secrets.token_urlsafe(32)}"
    api_key = APIKey(user_id=user.id, key=key_value, name=req.name)
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": api_key.key,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else "",
    }


@router.get("/api-keys")
async def list_api_keys(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    count_q = select(func.count()).select_from(APIKey).where(APIKey.user_id == user.id)
    total = (await db.execute(count_q)).scalar()
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user.id).order_by(APIKey.created_at.desc()).limit(limit).offset(offset)
    )
    keys = result.scalars().all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [{
            "id": k.id,
            "name": k.name,
            "key": k.key[:8] + "..." + k.key[-4:] if len(k.key) > 12 else k.key,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat() if k.created_at else "",
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        } for k in keys],
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id, APIKey.user_id == user.id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False

    from app.utils.activity import log_activity
    await log_activity(db, user.id, "api_key.revoked", "api_key", key_id, {"name": key.name})
    await db.commit()
    return {"status": "revoked"}
