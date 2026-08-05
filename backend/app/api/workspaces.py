"""Client workspaces: organize audits into client groups and manage members."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Workspace, WorkspaceMember, WorkspaceAudit, Audit, User
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceRequest(BaseModel):
    name: str
    description: str = ""


class AuditAssignRequest(BaseModel):
    audit_ids: List[str] = []


class MemberAddRequest(BaseModel):
    email: str
    role: str = "viewer"


async def _get_ws(db, ws_id, user) -> Workspace:
    result = await db.execute(select(Workspace).where(Workspace.id == ws_id))
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")
    return ws


def _ws_dict(ws: Workspace, member_count: int, audit_count: int) -> dict:
    return {
        "id": ws.id,
        "name": ws.name,
        "description": ws.description or "",
        "member_count": member_count,
        "audit_count": audit_count,
        "created_at": ws.created_at.isoformat() if ws.created_at else "",
    }


@router.get("")
async def list_workspaces(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).where(Workspace.user_id == user.id).order_by(Workspace.created_at.desc()))
    workspaces = result.scalars().all()
    out = []
    for ws in workspaces:
        members = (await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id))).scalars().all()
        audits = (await db.execute(select(WorkspaceAudit).where(WorkspaceAudit.workspace_id == ws.id))).scalars().all()
        out.append(_ws_dict(ws, len(members), len(audits)))
    return {"workspaces": out}


@router.post("")
async def create_workspace(req: WorkspaceRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=422, detail="Workspace name is required")
    ws = Workspace(user_id=user.id, name=req.name.strip(), description=req.description.strip())
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner"))
    await db.commit()
    return _ws_dict(ws, 1, 0)


@router.put("/{ws_id}")
async def update_workspace(ws_id: str, req: WorkspaceRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    ws.name = req.name.strip() or ws.name
    ws.description = req.description.strip()
    await db.commit()
    await db.refresh(ws)
    members = (await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id))).scalars().all()
    audits = (await db.execute(select(WorkspaceAudit).where(WorkspaceAudit.workspace_id == ws.id))).scalars().all()
    return _ws_dict(ws, len(members), len(audits))


@router.delete("/{ws_id}")
async def delete_workspace(ws_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    await db.delete(ws)
    await db.commit()
    return {"status": "deleted"}


@router.get("/{ws_id}/audits")
async def list_ws_audits(ws_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    links = (await db.execute(select(WorkspaceAudit).where(WorkspaceAudit.workspace_id == ws.id))).scalars().all()
    audit_ids = [l.audit_id for l in links]
    audits = []
    if audit_ids:
        rows = (await db.execute(select(Audit).where(Audit.id.in_(audit_ids)).order_by(Audit.created_at.desc()))).scalars().all()
        audits = [{
            "id": a.id, "website_url": a.website_url, "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        } for a in rows]
    return {"audits": audits}


@router.post("/{ws_id}/audits")
async def assign_audits(ws_id: str, req: AuditAssignRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    existing = {l.audit_id for l in (await db.execute(select(WorkspaceAudit).where(WorkspaceAudit.workspace_id == ws.id))).scalars().all()}
    added = 0
    for aid in req.audit_ids:
        if aid in existing:
            continue
        owner = (await db.execute(select(Audit).where(Audit.id == aid))).scalar_one_or_none()
        if not owner:
            continue
        if owner.user_id and owner.user_id != user.id:
            continue
        db.add(WorkspaceAudit(workspace_id=ws.id, audit_id=aid))
        added += 1
    await db.commit()
    return {"status": "ok", "added": added}


@router.delete("/{ws_id}/audits/{audit_id}")
async def unassign_audit(ws_id: str, audit_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    link = (await db.execute(
        select(WorkspaceAudit).where(WorkspaceAudit.workspace_id == ws.id, WorkspaceAudit.audit_id == audit_id)
    )).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Audit not in workspace")
    await db.delete(link)
    await db.commit()
    return {"status": "removed"}


@router.get("/{ws_id}/members")
async def list_members(ws_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    members = (await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id))).scalars().all()
    out = []
    for m in members:
        member_user = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one_or_none()
        out.append({
            "id": m.id, "user_id": m.user_id, "role": m.role,
            "email": member_user.email if member_user else "",
            "username": member_user.username if member_user else "",
            "created_at": m.created_at.isoformat() if m.created_at else "",
        })
    return {"members": out}


@router.post("/{ws_id}/members")
async def add_member(ws_id: str, req: MemberAddRequest, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    if req.role not in ("owner", "editor", "viewer"):
        raise HTTPException(status_code=422, detail="Role must be owner, editor, or viewer")
    member_user = (await db.execute(select(User).where(User.email == req.email.strip().lower()))).scalar_one_or_none()
    if not member_user:
        raise HTTPException(status_code=404, detail="No account found with that email")
    existing = (await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id, WorkspaceMember.user_id == member_user.id)
    )).scalar_one_or_none()
    if existing:
        existing.role = req.role
        await db.commit()
        return {"status": "updated", "user_id": member_user.id, "role": req.role}
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=member_user.id, role=req.role))
    await db.commit()
    return {"status": "added", "user_id": member_user.id, "role": req.role}


@router.delete("/{ws_id}/members/{member_id}")
async def remove_member(ws_id: str, member_id: str, user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    ws = await _get_ws(db, ws_id, user)
    member = (await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id, WorkspaceMember.id == member_id)
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")
    await db.delete(member)
    await db.commit()
    return {"status": "removed"}
