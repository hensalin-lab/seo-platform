"""Programmatic SEO engine.

Template-driven bulk page generation. A template defines URL / title / meta /
H1 patterns plus body sections and schema; entries are variable rows. Each
entry expands the template into a validated, schema-annotated landing page.

Supports {var}, {var|slug}, {var|title}, {var|upper}, {var|lower} placeholders
and nested lookups like {city.name}.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

_TEMPLATE_VAR_RE = re.compile(r"\{([^{}]+)\}")


def slugify(value: str, max_len: int = 160) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^A-Za-z0-9\s\-_]", " ", text)
    text = re.sub(r"[\s_]+", "-", text.strip().lower())
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:max_len].rstrip("-")


def _lookup(data: Dict[str, Any], key: str) -> Optional[str]:
    """Nested lookup supporting dot notation and numeric indexes."""
    if not key:
        return None
    cur: Any = data
    for part in key.split("."):
        if isinstance(cur, dict):
            if part in cur:
                cur = cur[part]
            else:
                return None
        elif isinstance(cur, (list, tuple)):
            try:
                cur = cur[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
    return cur


def render_template(text: str, data: Dict[str, Any]) -> str:
    """Replace {var} / {var|slug} / {var|title} placeholders in a template."""

    def _repl(match: re.Match) -> str:
        expr = match.group(1)
        parts = [p.strip() for p in expr.split("|")]
        key = parts[0]
        value = _lookup(data, key)
        if value is None:
            return match.group(0)  # leave unresolved for validation
        text_val = str(value)
        for transform in parts[1:]:
            t = transform.lower()
            if t == "slug":
                text_val = slugify(text_val)
            elif t == "title":
                text_val = text_val.title()
            elif t == "upper":
                text_val = text_val.upper()
            elif t == "lower":
                text_val = text_val.lower()
            elif t == "num":
                text_val = re.sub(r"[^0-9]", "", text_val)
        return text_val

    return _TEMPLATE_VAR_RE.sub(_repl, str(text or ""))


def unresolved_placeholders(text: str) -> List[str]:
    return list(dict.fromkeys(_TEMPLATE_VAR_RE.findall(str(text or ""))))


def build_url(base_url: str, url_pattern: str, data: Dict[str, Any]) -> str:
    base = (base_url or "").strip().rstrip("/")
    pattern = (url_pattern or "").strip()
    if not base:
        return render_template(pattern, data)
    if not pattern or pattern in ("/", ""):
        return base
    rendered = render_template(pattern, data)
    query = ""
    if "?" in rendered:
        rendered, query = rendered.split("?", 1)
    segments = [slugify(seg) if seg else seg for seg in rendered.split("/")]
    path = "/".join(segments)
    if not path.startswith("/"):
        path = "/" + path
    url = f"{base}{path}"
    if query:
        url = f"{url}?{query}"
    return url[:2048]


def estimate_word_count(sections: List[Dict[str, Any]], faq: List[Dict[str, Any]] = None) -> int:
    count = 0
    for sec in sections or []:
        count += len(str(sec.get("heading", "")).split())
        count += len(str(sec.get("body", "")).split())
    for item in faq or []:
        count += len(str(item.get("q", "")).split())
        count += len(str(item.get("a", "")).split())
    return count


def validate_page(page: Dict[str, Any], min_words_target: int = 800) -> List[Dict[str, str]]:
    warnings: List[Dict[str, str]] = []
    title = str(page.get("title", ""))
    meta = str(page.get("meta_description", ""))
    url = str(page.get("url", ""))

    if not title:
        warnings.append({"type": "missing_title", "message": "Title is empty"})
    elif len(title) > 60:
        warnings.append({"type": "title_long", "message": f"Title is {len(title)} chars (recommended 50-60)"})
    if not meta:
        warnings.append({"type": "missing_meta", "message": "Meta description is empty"})
    elif len(meta) > 160:
        warnings.append({"type": "meta_long", "message": f"Meta description is {len(meta)} chars (recommended max 160)"})
    elif len(meta) < 50:
        warnings.append({"type": "meta_short", "message": f"Meta description is {len(meta)} chars (recommended 120-160)"})
    if not page.get("h1"):
        warnings.append({"type": "missing_h1", "message": "H1 is empty"})

    wc = page.get("word_count", 0)
    if wc < min_words_target:
        warnings.append({"type": "thin_content", "message": f"Thin content: ~{wc} words (target {min_words_target}+)"})

    for field_name in ("title", "meta_description", "h1", "url"):
        leftover = unresolved_placeholders(str(page.get(field_name, "")))
        if leftover:
            warnings.append({"type": "unresolved_var", "message": f"Unresolved {'/'.join(leftover)} in {field_name}"})

    if len(url) > 2048:
        warnings.append({"type": "url_long", "message": "URL exceeds 2048 characters"})
    return warnings


def _render_schema_value(value: Any, data: Dict[str, Any]) -> Any:
    if isinstance(value, str):
        return render_template(value, data)
    if isinstance(value, dict):
        return {k: _render_schema_value(v, data) for k, v in value.items()}
    if isinstance(value, list):
        return [_render_schema_value(v, data) for v in value]
    return value


def build_schema(
    schema_type: str,
    schema_fields: Dict[str, Any],
    data: Dict[str, Any],
    page: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    stype = (schema_type or "Article").strip()
    fields = _render_schema_value(schema_fields or {}, data)
    url = page.get("url", "")
    title = page.get("title", "")

    if stype == "FAQPage":
        faq = page.get("faq", [])
        if not faq:
            return None
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": item.get("q", ""), "acceptedAnswer": {"@type": "Answer", "text": item.get("a", "")}}
                for item in faq
            ],
        }

    schema: Dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": stype,
        "name": fields.get("name", title) or title,
        "url": url,
    }
    for key in ("description", "headline", "image", "author", "brand", "price", "address", "geo", "datePublished", "review", "aggregateRating"):
        if fields.get(key):
            schema[key] = fields[key]

    if stype == "Article" and page.get("sections"):
        schema["articleBody"] = " ".join(str(s.get("body", "")) for s in page.get("sections", []) if s.get("body"))[:10000]

    if stype == "BreadcrumbList":
        name = title or url
        schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": "/"},
                {"@type": "ListItem", "position": 2, "name": name, "item": url},
            ],
        }
    return schema


def build_internal_links(pages: List[Dict[str, Any]], max_links: int = 5) -> None:
    """Assign related-page links based on shared resolved variables."""
    if len(pages) < 2:
        return
    keyed = []
    for page in pages:
        data = page.get("_data", {})
        scalars = {
            k: str(v).strip().lower()
            for k, v in data.items()
            if v is not None and isinstance(v, (str, int, float)) and len(str(v)) > 2
        }
        keyed.append({"page": page, "scalars": scalars})
    for idx, item in enumerate(keyed):
        scored = []
        for j, other in enumerate(keyed):
            if j == idx:
                continue
            shared = set(item["scalars"].values()) & set(other["scalars"].values())
            score = len(shared)
            if shared:
                scored.append((score, j))
        scored.sort(key=lambda t: -t[0])
        links = []
        for _, j in scored[:max_links]:
            other = keyed[j]["page"]
            shared_vals = list(set(item["scalars"].values()) & set(keyed[j]["scalars"].values()))
            reason = f"Shares: {', '.join(v.title() for v in shared_vals[:3])}" if shared_vals else ""
            links.append({"url": other.get("url", ""), "title": other.get("title", ""), "reason": reason})
        if len(links) < max_links:
            count = 0
            for j, other in enumerate(keyed):
                if j == idx:
                    continue
                if count >= max_links - len(links):
                    break
                if any(l.get("url") == other["page"].get("url") for l in links):
                    continue
                links.append({"url": other["page"].get("url", ""), "title": other["page"].get("title", ""), "reason": "Related page"})
                count += 1
        item["page"]["internal_links"] = links


def generate_pages(
    template,
    entries: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]], int]:
    """Expand a template over entries. Returns (pages, errors, generated_count)."""
    pages: List[Dict[str, Any]] = []
    errors: List[Dict[str, str]] = []
    seen_urls: Dict[str, str] = {}

    for idx, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append({"index": idx, "message": "Entry must be an object"})
            continue
        try:
            url = build_url(template.base_url, template.url_pattern, entry)
        except Exception as e:  # pragma: no cover
            errors.append({"index": idx, "message": f"URL build failed: {e}"})
            continue

        if not url:
            errors.append({"index": idx, "message": "Could not build a URL for this entry"})
            continue
        if url in seen_urls:
            errors.append({"index": idx, "message": f"Duplicate URL: {url} (also used by entry {seen_urls[url]})"})
            continue
        seen_urls[url] = idx

        title = render_template(template.title_template, entry) or url
        meta = render_template(template.meta_template, entry)
        h1 = render_template(template.h1_template, entry) or title

        sections = []
        for sec in template.sections or []:
            sections.append({
                "heading": render_template(sec.get("heading", ""), entry),
                "body": render_template(sec.get("body", ""), entry),
                "keywords": render_template(sec.get("keywords", ""), entry) if sec.get("keywords") else "",
            })

        faq = []
        if template.faq_enabled:
            for item in template.faq_section or []:
                q = render_template(item.get("q", ""), entry)
                a = render_template(item.get("a", ""), entry)
                if q and a:
                    faq.append({"q": q, "a": a})

        slug = url.rsplit("/", 1)[-1].split("?")[0] if url else ""
        page = {
            "entry_index": idx,
            "url": url,
            "slug": slug,
            "title": title,
            "meta_description": meta,
            "h1": h1,
            "sections": sections,
            "faq": faq,
            "schema_markup": [],
            "internal_links": [],
            "word_count": estimate_word_count(sections, faq),
            "warnings": [],
            "_data": entry,
        }
        _schema = build_schema(template.schema_type, template.schema_fields, entry, page)
        page["schema_markup"] = [_schema] if _schema else []
        page["warnings"] = validate_page(page, getattr(template, "min_words_target", 800) or 800)
        pages.append(page)

    build_internal_links(pages)
    for page in pages:
        page.pop("_data", None)
    return pages, errors, len(pages)
