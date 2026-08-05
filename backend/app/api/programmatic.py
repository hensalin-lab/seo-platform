import csv
import io
import json
import logging
import datetime as _dt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ProgrammaticTemplate, ProgrammaticEntry, ProgrammaticPage
from app.schemas import (
    ProgrammaticTemplateRequest,
    ProgrammaticEntriesRequest,
    ProgrammaticCsvRequest,
    ProgrammaticPreviewRequest,
)
from app.engine.programmatic_seo import generate_pages
from app.api.auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/programmatic", tags=["programmatic"])

MAX_ENTRIES = 10000
MAX_CSV_CHARS = 500000


def _template_dict(t: ProgrammaticTemplate) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description or "",
        "base_url": t.base_url or "",
        "url_pattern": t.url_pattern or "",
        "title_template": t.title_template or "",
        "meta_template": t.meta_template or "",
        "h1_template": t.h1_template or "",
        "sections": t.sections or [],
        "schema_type": t.schema_type or "Article",
        "schema_fields": t.schema_fields or {},
        "faq_enabled": bool(t.faq_enabled),
        "faq_section": t.faq_section or [],
        "min_words_target": t.min_words_target or 800,
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "updated_at": t.updated_at.isoformat() if t.updated_at else "",
    }


def _entry_dict(e: ProgrammaticEntry) -> dict:
    return {"id": e.id, "data": e.data or {}, "created_at": e.created_at.isoformat() if e.created_at else ""}


def _page_dict(p: ProgrammaticPage) -> dict:
    return {
        "id": p.id,
        "template_id": p.template_id,
        "url": p.url or "",
        "slug": p.slug or "",
        "title": p.title or "",
        "meta_description": p.meta_description or "",
        "h1": p.h1 or "",
        "sections": p.sections or [],
        "faq": p.faq or [],
        "schema_markup": p.schema_markup or [],
        "internal_links": p.internal_links or [],
        "word_count": p.word_count or 0,
        "warnings": p.warnings or [],
        "created_at": p.created_at.isoformat() if p.created_at else "",
    }


async def _get_template(db: AsyncSession, template_id: str, user_id: str) -> ProgrammaticTemplate:
    result = await db.execute(select(ProgrammaticTemplate).where(ProgrammaticTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return template


@router.post("/templates")
async def create_template(
    req: ProgrammaticTemplateRequest,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.name.strip():
        raise HTTPException(status_code=422, detail="Template name is required")
    if len(req.name) > 120:
        raise HTTPException(status_code=422, detail="Template name must be under 120 characters")
    template = ProgrammaticTemplate(
        user_id=user.id,
        name=req.name.strip(),
        description=req.description or "",
        base_url=req.base_url or "",
        url_pattern=req.url_pattern or "",
        title_template=req.title_template or "",
        meta_template=req.meta_template or "",
        h1_template=req.h1_template or "",
        sections=[s.model_dump() for s in req.sections],
        schema_type=req.schema_type or "Article",
        schema_fields=req.schema_fields or {},
        faq_enabled=req.faq_enabled,
        faq_section=[f.model_dump() for f in req.faq_section],
        min_words_target=max(100, min(5000, req.min_words_target or 800)),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return _template_dict(template)


@router.get("/templates")
async def list_templates(
    audit_id: str = "",
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if audit_id:
        result = await db.execute(
            select(ProgrammaticTemplate)
            .where(ProgrammaticTemplate.user_id == user.id, ProgrammaticTemplate.audit_id == audit_id)
            .order_by(ProgrammaticTemplate.updated_at.desc())
        )
    else:
        result = await db.execute(
            select(ProgrammaticTemplate)
            .where(ProgrammaticTemplate.user_id == user.id)
            .order_by(ProgrammaticTemplate.updated_at.desc())
        )
    templates = result.scalars().all()
    out = []
    for t in templates:
        page_count = (
            await db.execute(select(ProgrammaticPage.id).where(ProgrammaticPage.template_id == t.id))
        ).scalars().all()
        entry_count = (
            await db.execute(select(ProgrammaticEntry.id).where(ProgrammaticEntry.template_id == t.id))
        ).scalars().all()
        d = _template_dict(t)
        d["page_count"] = len(page_count)
        d["entry_count"] = len(entry_count)
        out.append(d)
    return {"templates": out}


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    return _template_dict(template)


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    req: ProgrammaticTemplateRequest,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    template.name = req.name.strip() or template.name
    template.description = req.description
    template.base_url = req.base_url or ""
    template.url_pattern = req.url_pattern or ""
    template.title_template = req.title_template or ""
    template.meta_template = req.meta_template or ""
    template.h1_template = req.h1_template or ""
    template.sections = [s.model_dump() for s in req.sections]
    template.schema_type = req.schema_type or "Article"
    template.schema_fields = req.schema_fields or {}
    template.faq_enabled = req.faq_enabled
    template.faq_section = [f.model_dump() for f in req.faq_section]
    template.min_words_target = max(100, min(5000, req.min_words_target or 800))
    template.updated_at = _dt.datetime.utcnow()
    await db.commit()
    await db.refresh(template)
    return _template_dict(template)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    await db.execute(delete(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id))
    await db.execute(delete(ProgrammaticPage).where(ProgrammaticPage.template_id == template_id))
    await db.delete(template)
    await db.commit()
    return {"status": "ok"}


@router.post("/templates/{template_id}/entries")
async def add_entries(
    template_id: str,
    req: ProgrammaticEntriesRequest,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_template(db, template_id, user.id)
    if not req.entries:
        raise HTTPException(status_code=422, detail="No entries provided")
    if len(req.entries) > MAX_ENTRIES:
        raise HTTPException(status_code=422, detail=f"Too many entries (max {MAX_ENTRIES})")
    if req.clear:
        await db.execute(delete(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id))
    existing = (await db.execute(select(ProgrammaticEntry.id).where(ProgrammaticEntry.template_id == template_id))).scalars().all()
    if len(existing) + len(req.entries) > MAX_ENTRIES:
        raise HTTPException(status_code=422, detail=f"Would exceed {MAX_ENTRIES} entries")
    for e in req.entries:
        if not isinstance(e, dict):
            continue
        db.add(ProgrammaticEntry(template_id=template_id, user_id=user.id, data={k: v for k, v in e.items()}))
    await db.commit()
    return {"status": "ok", "added": len(req.entries)}


@router.get("/templates/{template_id}/entries")
async def list_entries(
    template_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_template(db, template_id, user.id)
    result = await db.execute(
        select(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id).order_by(ProgrammaticEntry.created_at)
    )
    return {"entries": [_entry_dict(e) for e in result.scalars().all()]}


@router.delete("/templates/{template_id}/entries")
async def clear_entries(
    template_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_template(db, template_id, user.id)
    await db.execute(delete(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id))
    await db.commit()
    return {"status": "ok"}


@router.post("/parse-csv")
async def parse_csv(
    req: ProgrammaticCsvRequest,
    user=Depends(get_current_active_user),
):
    if len(req.csv_text) > MAX_CSV_CHARS:
        raise HTTPException(status_code=422, detail="CSV too large")
    delimiter = req.delimiter or ","
    if delimiter not in (",", ";", "\t"):
        delimiter = ","
    try:
        reader = csv.reader(io.StringIO(req.csv_text), delimiter=delimiter)
        rows = [r for r in reader if any(cell.strip() for cell in r)]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {e}")
    if not rows:
        raise HTTPException(status_code=422, detail="CSV is empty")
    if req.has_header and rows:
        headers = [h.strip() for h in rows[0]]
        data_rows = rows[1:]
    else:
        headers = [f"col{i + 1}" for i in range(len(rows[0]))]
        data_rows = rows
    entries = []
    for row in data_rows:
        entry = {}
        for i, h in enumerate(headers):
            entry[h] = row[i].strip() if i < len(row) else ""
        entries.append(entry)
    return {"entries": entries[:MAX_ENTRIES], "total": len(entries)}


@router.post("/templates/{template_id}/preview")
async def preview_pages(
    template_id: str,
    req: ProgrammaticPreviewRequest,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    entries = req.entries or []
    if not entries:
        stored = (await db.execute(select(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id).order_by(ProgrammaticEntry.created_at))).scalars().all()
        entries = [e.data or {} for e in stored]
    limit = max(1, min(20, req.limit or 5))
    pages, errors, count = generate_pages(template, entries[:limit])
    return {"preview": pages, "errors": errors[:50], "total_entries": len(entries), "generated": count}


@router.post("/templates/{template_id}/generate")
async def generate(
    template_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    stored = (await db.execute(select(ProgrammaticEntry).where(ProgrammaticEntry.template_id == template_id).order_by(ProgrammaticEntry.created_at))).scalars().all()
    if not stored:
        raise HTTPException(status_code=422, detail="No entries yet — add entries before generating")
    entries = [e.data or {} for e in stored]
    pages, errors, count = generate_pages(template, entries)

    await db.execute(delete(ProgrammaticPage).where(ProgrammaticPage.template_id == template_id))
    for page in pages:
        entry_ref = page.get("entry_index")
        db.add(ProgrammaticPage(
            template_id=template_id,
            entry_id=stored[entry_ref].id if entry_ref is not None and entry_ref < len(stored) else None,
            user_id=user.id,
            url=page["url"],
            slug=page.get("slug", ""),
            title=page.get("title", ""),
            meta_description=page.get("meta_description", ""),
            h1=page.get("h1", ""),
            sections=page.get("sections", []),
            faq=page.get("faq", []),
            schema_markup=page.get("schema_markup", []),
            internal_links=page.get("internal_links", []),
            word_count=page.get("word_count", 0),
            warnings=page.get("warnings", []),
        ))
    await db.commit()
    warning_count = sum(len(p.get("warnings", [])) for p in pages)
    return {
        "status": "ok",
        "generated": count,
        "errors": errors[:50],
        "error_count": len(errors),
        "warning_count": warning_count,
        "duplicate_urls": sum(1 for e in errors if "Duplicate URL" in e.get("message", "")),
    }


@router.get("/templates/{template_id}/pages")
async def list_pages(
    template_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_template(db, template_id, user.id)
    total = (
        await db.execute(select(ProgrammaticPage.id).where(ProgrammaticPage.template_id == template_id))
    ).scalars().all()
    result = await db.execute(
        select(ProgrammaticPage)
        .where(ProgrammaticPage.template_id == template_id)
        .order_by(ProgrammaticPage.created_at)
        .offset(offset)
        .limit(limit)
    )
    pages = result.scalars().all()
    return {"pages": [_page_dict(p) for p in pages], "total": len(total), "offset": offset, "limit": limit}


@router.delete("/pages/{page_id}")
async def delete_page(
    page_id: str,
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProgrammaticPage).where(ProgrammaticPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if page.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(page)
    await db.commit()
    return {"status": "ok"}


@router.get("/templates/{template_id}/export")
async def export_pages(
    template_id: str,
    format: str = Query("json"),
    user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    template = await _get_template(db, template_id, user.id)
    result = await db.execute(
        select(ProgrammaticPage).where(ProgrammaticPage.template_id == template_id).order_by(ProgrammaticPage.created_at)
    )
    pages = result.scalars().all()

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["url", "title", "meta_description", "h1", "word_count", "schema_type", "warnings"])
        for p in pages:
            schema_types = [s.get("@type", "") for s in (p.schema_markup or []) if isinstance(s, dict)]
            writer.writerow([
                p.url,
                p.title,
                p.meta_description,
                p.h1,
                p.word_count,
                ",".join(schema_types),
                "; ".join(w.get("message", "") for w in (p.warnings or [])),
            ])
        return {"filename": f"{template.name}-pages.csv", "content": buf.getvalue()}

    if format == "sitemap":
        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ]
        for p in pages:
            lines.append(f"  <url><loc>{p.url}</loc></url>")
        lines.append("</urlset>")
        return {"filename": f"{template.name}-sitemap.xml", "content": "\n".join(lines)}

    return {"filename": f"{template.name}-pages.json", "content": json.dumps([_page_dict(p) for p in pages], indent=2)}
