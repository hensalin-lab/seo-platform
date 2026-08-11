"""Symmetric encryption for OAuth tokens at rest.

Uses AES-128-CBC via the `cryptography` library (already pulled in by
python-jose[cryptography]). The key comes from TOKEN_ENCRYPTION_KEY when set;
otherwise it is derived from JWT_SECRET_KEY so the platform works out of the
box. Production deployments SHOULD set a dedicated TOKEN_ENCRYPTION_KEY.
"""
import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_PREFIX = "enc:"


def _key() -> bytes:
    token = getattr(settings, "TOKEN_ENCRYPTION_KEY", "") or settings.JWT_SECRET_KEY
    if not token:
        token = os.environ.get("TOKEN_ENCRYPTION_KEY") or settings.JWT_SECRET_KEY
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_key())


def encrypt_plaintext(plaintext: str) -> str:
    """Encrypt a secret string. Returns a prefixed token; empty input stays empty."""
    if not plaintext:
        return ""
    return _PREFIX + _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_to_plaintext(token: str) -> str:
    """Decrypt a value created by encrypt_plaintext. Returns '' for empty/legacy plaintext."""
    if not token:
        return ""
    if not token.startswith(_PREFIX):
        return token
    try:
        return _fernet.decrypt(token[len(_PREFIX):].encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""
    except Exception:
        return ""


def looks_encrypted(token: str) -> bool:
    return bool(token) and token.startswith(_PREFIX)
