from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
import ipaddress


BLOCKED_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "metadata.google.internal", "169.254.169.254",
}


def _is_private_ip(hostname: str) -> bool:
    try:
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local
    except ValueError:
        return False


def _validate_url(url: str, field_name: str) -> str:
    url = url.strip()
    if not url:
        return url
    if len(url) > 2048:
        raise ValueError(f"{field_name} must be under 2048 characters")
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"{field_name} must use http or https")
    hostname = parsed.hostname or ""
    if not hostname:
        raise ValueError(f"{field_name} must have a valid hostname")
    if hostname in BLOCKED_HOSTS:
        raise ValueError(f"{field_name} cannot point to internal/private addresses")
    if _is_private_ip(hostname):
        raise ValueError(f"{field_name} cannot point to private/internal IP addresses")
    return url


class AuditRequest(BaseModel):
    website_url: str
    competitor_url: Optional[str] = None

    @field_validator("website_url")
    @classmethod
    def validate_website_url(cls, v):
        return _validate_url(v, "website_url")

    @field_validator("competitor_url")
    @classmethod
    def validate_competitor_url(cls, v):
        if v is None:
            return v
        return _validate_url(v, "competitor_url")


class AuditStartResponse(BaseModel):
    audit_id: str
    status: str
    message: str = "Audit started"


class HealthResponse(BaseModel):
    status: str
    version: str
    database: str


class ChatRequest(BaseModel):
    message: str
    audit_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > 10000:
            raise ValueError("Message must be under 10000 characters")
        return v.strip()


class ChatResponse(BaseModel):
    response: str
    sources: list = []


class ProgrammaticSection(BaseModel):
    heading: str
    body: str = ""
    keywords: Optional[str] = None


class ProgrammaticFaq(BaseModel):
    q: str
    a: str


class ProgrammaticTemplateRequest(BaseModel):
    name: str
    description: str = ""
    base_url: str = ""
    url_pattern: str = ""
    title_template: str = ""
    meta_template: str = ""
    h1_template: str = ""
    sections: List[ProgrammaticSection] = []
    schema_type: str = "Article"
    schema_fields: Dict[str, Any] = {}
    faq_enabled: bool = False
    faq_section: List[ProgrammaticFaq] = []
    min_words_target: int = 800


class ProgrammaticEntriesRequest(BaseModel):
    entries: List[Dict[str, Any]] = []
    clear: bool = False


class ProgrammaticCsvRequest(BaseModel):
    csv_text: str
    has_header: bool = True
    delimiter: str = ","


class ProgrammaticPreviewRequest(BaseModel):
    entries: List[Dict[str, Any]] = []
    limit: int = 5
