from __future__ import annotations

import json
import logging
import re
import math
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


_SCHEMA_DEFINITIONS: dict[str, dict[str, Any]] = {
    "Organization": {
        "required": {"name": True, "url": True},
        "recommended": {"logo": False, "description": False, "contactPoint": False, "sameAs": False},
        "rich_result": "Knowledge Panel",
        "importance": "CRITICAL",
        "applicable_pages": {"homepage", "about", "service", "contact", "landing_page"},
    },
    "Product": {
        "required": {"name": True, "image": True},
        "recommended": {"description": False, "offers": False, "brand": False, "review": False, "aggregateRating": False},
        "rich_result": "Product Rich Result",
        "importance": "CRITICAL",
        "applicable_pages": {"product"},
    },
    "Service": {
        "required": {"name": True, "description": True},
        "recommended": {"provider": False, "areaServed": False, "serviceType": False},
        "rich_result": "Service Knowledge Panel",
        "importance": "HIGH",
        "applicable_pages": {"service", "homepage", "landing_page"},
    },
    "SoftwareApplication": {
        "required": {"name": True, "applicationCategory": True},
        "recommended": {"description": False, "operatingSystem": False, "offers": False},
        "rich_result": "Software App Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"product", "service", "landing_page", "homepage"},
    },
    "FAQPage": {
        "required": {"mainEntity": True},
        "recommended": {},
        "rich_result": "FAQ Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"faq", "service", "product", "landing_page"},
    },
    "HowTo": {
        "required": {"name": True, "step": True},
        "recommended": {"totalEstimatedTime": False, "supply": False, "tool": False},
        "rich_result": "How-To Rich Result",
        "importance": "MEDIUM",
        "applicable_pages": {"article", "blog_post", "documentation"},
    },
    "BreadcrumbList": {
        "required": {"itemListElement": True},
        "recommended": {},
        "rich_result": "Breadcrumb Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"homepage", "article", "blog_post", "product", "service", "faq", "about", "contact", "category", "landing_page", "documentation", "news", "local_business"},
    },
    "Article": {
        "required": {"headline": True, "author": True, "datePublished": True},
        "recommended": {"dateModified": False, "image": False},
        "rich_result": "Article Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"article", "blog_post", "news"},
    },
    "BlogPosting": {
        "required": {"headline": True, "author": True, "datePublished": True},
        "recommended": {"dateModified": False, "image": False},
        "rich_result": "Blog Post Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"blog_post"},
    },
    "Review": {
        "required": {"itemReviewed": True, "reviewRating": True},
        "recommended": {"author": False, "datePublished": False, "reviewBody": False},
        "rich_result": "Review Rich Result",
        "importance": "MEDIUM",
        "applicable_pages": {"review", "product", "service"},
    },
    "AggregateRating": {
        "required": {"ratingValue": True, "reviewCount": True},
        "recommended": {"bestRating": False, "worstRating": False},
        "rich_result": "Aggregate Rating in Rich Results",
        "importance": "HIGH",
        "applicable_pages": {"product", "service", "local_business"},
    },
    "VideoObject": {
        "required": {"name": True, "description": True, "thumbnailUrl": True, "uploadDate": True},
        "recommended": {"duration": False, "contentUrl": False, "embedUrl": False},
        "rich_result": "Video Rich Result",
        "importance": "HIGH",
        "applicable_pages": {"article", "blog_post", "product", "service", "landing_page", "video"},
    },
    "LocalBusiness": {
        "required": {"name": True, "address": True, "telephone": True},
        "recommended": {"openingHours": False, "geo": False, "image": False, "priceRange": False},
        "rich_result": "Local Business Rich Result",
        "importance": "CRITICAL",
        "applicable_pages": {"local_business", "contact", "homepage"},
    },
    "Person": {
        "required": {"name": True},
        "recommended": {"jobTitle": False, "worksFor": False, "sameAs": False, "image": False, "url": False},
        "rich_result": "Knowledge Panel",
        "importance": "MEDIUM",
        "applicable_pages": {"about", "blog_post", "article"},
    },
    "WebSite": {
        "required": {"name": True, "url": True},
        "recommended": {"potentialAction": False},
        "rich_result": "Sitelinks Searchbox",
        "importance": "HIGH",
        "applicable_pages": {"homepage"},
    },
    "Speakable": {
        "required": {"cssSelector": True},
        "recommended": {"xpath": False},
        "rich_result": "Voice Assistant Readout",
        "importance": "LOW",
        "applicable_pages": {"article", "blog_post", "faq", "homepage"},
    },
}

_RICH_RESULT_CTR_BOOSTS: dict[str, str] = {
    "Product Rich Result": "+15-30% CTR",
    "FAQ Rich Result": "+10-25% CTR",
    "How-To Rich Result": "+15-25% CTR",
    "Breadcrumb Rich Result": "+5-15% CTR",
    "Article Rich Result": "+10-20% CTR",
    "Video Rich Result": "+20-40% CTR",
    "Local Business Rich Result": "+15-35% CTR",
    "Software App Rich Result": "+10-20% CTR",
    "Sitelinks Searchbox": "+5-10% CTR",
    "Aggregate Rating in Rich Results": "+10-30% CTR",
    "Knowledge Panel": "+5-15% CTR",
    "Review Rich Result": "+10-20% CTR",
    "Voice Assistant Readout": "+5-10% CTR",
}


class SchemaIntelligenceEngine:

    def analyze(self, page: dict, all_pages: list | None = None) -> dict[str, Any]:
        url = page.get("url", "")
        html_raw = page.get("html_raw", "")
        schema_markup = page.get("schema_markup", []) or []
        title = page.get("title", "") or ""
        meta_description = page.get("meta_description", "") or ""
        h1 = page.get("h1", "") or ""
        images = page.get("images", []) or []
        word_count = page.get("word_count", 0)
        page_type = page.get("page_type", "unknown") or "unknown"

        if not isinstance(schema_markup, list):
            schema_markup = []

        valid_json_ld = self._validate_json_ld_syntax(html_raw)

        detected = self._detect_schemas(schema_markup, page_type, title, meta_description, url, h1, images, word_count)
        missing = self._generate_missing_schemas(schema_markup, page_type, title, meta_description, url, h1)
        validation = self._validate_all_schemas(schema_markup, valid_json_ld)
        rich_results = self._compute_rich_results(detected)
        issues, recommendations = self._compute_issues_and_recommendations(detected, missing, validation, page_type)
        before_after = self._build_before_after(detected, missing, title, meta_description, url, h1, page_type)

        schema_score = self._compute_schema_score(detected, validation, page_type)
        schema_coverage = self._compute_schema_coverage(detected, page_type)

        return {
            "schema_score": schema_score,
            "schema_coverage": schema_coverage,
            "detected_schemas": detected,
            "missing_schemas": missing,
            "validation": validation,
            "rich_results": rich_results,
            "issues": issues,
            "recommendations": recommendations,
            "before_after": before_after,
        }

    def _validate_json_ld_syntax(self, html_raw: str) -> bool:
        if not html_raw:
            return True
        blocks = re.findall(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html_raw,
            re.DOTALL | re.IGNORECASE,
        )
        for block in blocks:
            try:
                parsed = json.loads(block)
                if not isinstance(parsed, (dict, list)):
                    return False
            except (json.JSONDecodeError, ValueError):
                return False
        return True

    def _detect_schemas(
        self,
        schemas: list[dict],
        page_type: str,
        title: str,
        meta_description: str,
        url: str,
        h1: str,
        images: list,
        word_count: int,
    ) -> list[dict]:
        found_types: dict[str, dict] = {}
        for schema in schemas:
            if not isinstance(schema, dict):
                continue
            schema_type = schema.get("@type", "")
            if not schema_type:
                continue
            variants = [schema_type]
            if schema_type in found_types:
                self._merge_schema_props(found_types[schema_type], schema)
                continue
            found_types[schema_type] = {"type": schema_type, "data": schema}

        results: list[dict] = []
        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            if type_name in found_types:
                entry = found_types[type_name]
                result = self._evaluate_schema(type_name, entry["data"], definition)
                results.append(result)
            else:
                results.append({
                    "type": type_name,
                    "found": False,
                    "completeness": 0.0,
                    "required_properties": {p: False for p in definition["required"]},
                    "recommended_properties": {p: False for p in definition["recommended"]},
                    "issues": [],
                    "warnings": [],
                    "rich_result_eligible": False,
                    "rich_result_type": definition.get("rich_result", ""),
                    "json_ld": {},
                })

        for schema in schemas:
            if not isinstance(schema, dict):
                continue
            schema_type = schema.get("@type", "")
            if schema_type and schema_type not in _SCHEMA_DEFINITIONS:
                self._handle_custom_schema(schema_type, schema, results)

        return results

    def _merge_schema_props(self, target: dict, source: dict) -> None:
        data = target["data"]
        for key, value in source.items():
            if key == "@type":
                continue
            if key not in data or data[key] is None or data[key] == "" or data[key] == []:
                data[key] = value

    def _handle_custom_schema(self, type_name: str, data: dict, results: list[dict]) -> None:
        props = [k for k in data if k != "@context" and k != "@type" and not k.startswith("@")]
        has_required = len(props) >= 2
        completeness = min(len(props) / 5.0 * 100, 100.0) if props else 10.0
        results.append({
            "type": type_name,
            "found": True,
            "completeness": round(completeness, 1),
            "required_properties": {p: True for p in props[:3]},
            "recommended_properties": {p: True for p in props[3:]},
            "issues": [],
            "warnings": ["Custom schema type not in standard rich result types"],
            "rich_result_eligible": False,
            "rich_result_type": "",
            "json_ld": data,
        })

    def _evaluate_schema(self, type_name: str, data: dict, definition: dict) -> dict:
        required = definition["recommended"]
        recommended = definition["recommended"]
        all_required = definition["required"]

        required_props: dict[str, bool] = {}
        for prop in all_required:
            required_props[prop] = self._has_property(data, prop)

        recommended_props: dict[str, bool] = {}
        for prop in recommended:
            recommended_props[prop] = self._has_property(data, prop)

        present_required = sum(1 for v in required_props.values() if v)
        total_required = len(required_props) if required_props else 1
        present_recommended = sum(1 for v in recommended_props.values() if v)
        total_recommended = len(recommended_props) if recommended_props else 1

        required_score = (present_required / total_required) * 70
        recommended_score = (present_recommended / total_recommended) * 30
        completeness = round(min(required_score + recommended_score, 100.0), 1)

        issues: list[str] = []
        warnings: list[str] = []
        for prop, present in required_props.items():
            if not present:
                issues.append(f"Missing required property: {prop}")
        for prop, present in recommended_props.items():
            if not present:
                warnings.append(f"Missing recommended property: {prop}")

        if type_name == "Article" or type_name == "BlogPosting":
            dp = data.get("datePublished", "")
            dm = data.get("dateModified", "")
            if dp and dm:
                try:
                    dp_clean = re.sub(r'[Z\+\-].*$', '', dp)
                    dm_clean = re.sub(r'[Z\+\-].*$', '', dm)
                    if dp_clean > dm_clean:
                        issues.append("dateModified is before datePublished")
                except (TypeError, ValueError):
                    warnings.append("Unable to compare datePublished and dateModified")

        if type_name == "FAQPage":
            main_entity = data.get("mainEntity", [])
            if isinstance(main_entity, list):
                for i, entity in enumerate(main_entity):
                    if not isinstance(entity, dict):
                        issues.append(f"mainEntity[{i}] is not a valid object")
                        continue
                    if entity.get("@type") != "Question":
                        issues.append(f"mainEntity[{i}] @type should be 'Question', got '{entity.get('@type', 'missing')}'")
                    accepted = entity.get("acceptedAnswer")
                    if not accepted:
                        issues.append(f"mainEntity[{i}] missing acceptedAnswer")
                    elif isinstance(accepted, dict) and accepted.get("@type") != "Answer":
                        issues.append(f"mainEntity[{i}].acceptedAnswer @type should be 'Answer'")
            elif not main_entity:
                issues.append("mainEntity is empty or missing question/answer pairs")

        if type_name == "HowTo":
            step = data.get("step", [])
            if isinstance(step, list):
                for i, s in enumerate(step):
                    if isinstance(s, dict) and not s.get("name"):
                        warnings.append(f"step[{i}] missing name property")
            elif not step:
                issues.append("step is empty or missing")

        if type_name == "BreadcrumbList":
            items = data.get("itemListElement", [])
            if isinstance(items, list):
                for i, item in enumerate(items):
                    if isinstance(item, dict):
                        if "position" not in item:
                            issues.append(f"itemListElement[{i}] missing position property")
                        if "name" not in item and "item" not in item:
                            issues.append(f"itemListElement[{i}] missing name or item property")
                        item_val = item.get("item", "")
                        if isinstance(item_val, str) and not item_val.startswith("http"):
                            warnings.append(f"itemListElement[{i}].item should be a full URL")
            elif not items:
                issues.append("itemListElement is empty")

        if type_name == "Product":
            offers = data.get("offers", {})
            if isinstance(offers, dict):
                if "price" not in offers and "lowPrice" not in offers:
                    warnings.append("offers missing price or lowPrice")
                if "priceCurrency" not in offers:
                    warnings.append("offers missing priceCurrency")
            elif isinstance(offers, list) and offers:
                first_offer = offers[0]
                if isinstance(first_offer, dict) and "price" not in first_offer:
                    warnings.append("offers[0] missing price")
            elif not offers:
                warnings.append("No offers defined for Product schema")

        if type_name == "LocalBusiness":
            addr = data.get("address", {})
            if isinstance(addr, dict):
                for field in ("streetAddress", "addressLocality", "addressRegion"):
                    if field not in addr:
                        warnings.append(f"address missing {field}")
            elif not addr:
                issues.append("address is missing or invalid")

        if type_name == "WebSite":
            pa = data.get("potentialAction", {})
            if isinstance(pa, dict):
                if pa.get("@type") != "SearchAction":
                    warnings.append("potentialAction @type should be 'SearchAction'")
                target = pa.get("target", "")
                if isinstance(target, str) and "{search_term_string}" not in target:
                    warnings.append("SearchAction target should contain {search_term_string}")
            elif not pa:
                warnings.append("No potentialAction (SearchAction) defined")

        rich_result_eligible = completeness >= 60 and len(issues) == 0

        return {
            "type": type_name,
            "found": True,
            "completeness": completeness,
            "required_properties": required_props,
            "recommended_properties": recommended_props,
            "issues": issues,
            "warnings": warnings,
            "rich_result_eligible": rich_result_eligible,
            "rich_result_type": definition.get("rich_result", ""),
            "json_ld": data,
        }

    def _has_property(self, data: dict, prop: str) -> bool:
        if prop not in data:
            return False
        value = data[prop]
        if value is None:
            return False
        if isinstance(value, str) and value.strip() == "":
            return False
        if isinstance(value, list) and len(value) == 0:
            return False
        if isinstance(value, dict):
            if not value:
                return False
            if all(v is None or v == "" for v in value.values()):
                return False
        return True

    def _generate_missing_schemas(
        self,
        schemas: list[dict],
        page_type: str,
        title: str,
        meta_description: str,
        url: str,
        h1: str,
    ) -> list[dict]:
        existing_types = set()
        for schema in schemas:
            if isinstance(schema, dict):
                t = schema.get("@type", "")
                if t:
                    existing_types.add(t)

        missing: list[dict] = []
        domain = ""
        try:
            parsed = urlparse(url)
            domain = parsed.scheme + "://" + parsed.netloc if parsed.scheme and parsed.netloc else ""
        except (ValueError, AttributeError):
            pass

        display_title = h1 or title or "Page"
        description = meta_description or display_title

        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            if type_name in existing_types:
                continue

            applicable = definition.get("applicable_pages", set())
            if page_type in applicable or page_type == "unknown":
                importance = definition.get("importance", "LOW")
                rich_result = definition.get("rich_result", "")
                generated = self._generate_json_ld(
                    type_name, title, meta_description, url, h1, display_title, description, domain
                )
                impact_map = {
                    "CRITICAL": "Can significantly improve search visibility and click-through rates",
                    "HIGH": "Enables rich results and improves search presence",
                    "MEDIUM": "Enhances content understanding and may trigger special search features",
                    "LOW": "Improves machine readability and future-proofs for emerging search features",
                }
                missing.append({
                    "type": type_name,
                    "importance": importance,
                    "rich_result": rich_result,
                    "generated_json_ld": generated,
                    "estimated_impact": impact_map.get(importance, "Moderate improvement to search presence"),
                    "confidence": self._schema_confidence(type_name, page_type),
                })

        importance_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        missing.sort(key=lambda x: importance_order.get(x["importance"], 99))
        return missing

    def _schema_confidence(self, schema_type: str, page_type: str) -> float:
        scores = {
            "Organization": 0.95,
            "BreadcrumbList": 0.98,
            "WebSite": 0.92,
            "FAQPage": 0.90,
            "Product": 0.94,
            "Service": 0.88,
            "Article": 0.90,
            "BlogPosting": 0.90,
            "HowTo": 0.85,
            "VideoObject": 0.87,
            "LocalBusiness": 0.93,
            "Person": 0.80,
            "SoftwareApplication": 0.85,
            "AggregateRating": 0.88,
            "Review": 0.82,
            "Speakable": 0.70,
        }
        base = scores.get(schema_type, 0.75)
        return round(base, 2)

    def _generate_json_ld(
        self,
        schema_type: str,
        title: str,
        meta_description: str,
        url: str,
        h1: str,
        display_title: str,
        description: str,
        domain: str,
    ) -> str:
        if schema_type == "Organization":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": display_title,
                "url": domain or url,
                "logo": domain + "/logo.png" if domain else "",
                "description": description[:160] if description else "",
                "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "customer service",
                    "email": "info@" + urlparse(domain).netloc if domain else "",
                },
                "sameAs": [],
            }, indent=2)

        if schema_type == "WebSite":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": display_title,
                "url": domain or url,
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": (domain or url) + "/?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                },
            }, indent=2)

        if schema_type == "BreadcrumbList":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": domain or "/"},
                    {"@type": "ListItem", "position": 2, "name": display_title, "item": url},
                ],
            }, indent=2)

        if schema_type == "Product":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": display_title,
                "description": description[:500] if description else "",
                "image": "",
                "brand": {"@type": "Brand", "name": display_title},
                "offers": {
                    "@type": "Offer",
                    "priceCurrency": "USD",
                    "price": "0.00",
                    "availability": "https://schema.org/InStock",
                    "url": url,
                },
            }, indent=2)

        if schema_type == "Service":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Service",
                "name": display_title,
                "description": description[:500] if description else "",
                "provider": {"@type": "Organization", "name": display_title},
                "areaServed": {"@type": "Country", "name": "US"},
                "serviceType": display_title,
            }, indent=2)

        if schema_type == "SoftwareApplication":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": display_title,
                "description": description[:500] if description else "",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "offers": {
                    "@type": "Offer",
                    "price": "0.00",
                    "priceCurrency": "USD",
                },
            }, indent=2)

        if schema_type == "FAQPage":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": "What is " + display_title + "?",
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": description if description else "Information about " + display_title,
                        },
                    }
                ],
            }, indent=2)

        if schema_type == "HowTo":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": "How to " + display_title.lower(),
                "step": [
                    {"@type": "HowToStep", "name": "Step 1", "text": "Begin with " + display_title.lower()},
                ],
                "totalEstimatedTime": "PT30M",
            }, indent=2)

        if schema_type == "Article":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": display_title,
                "description": description[:500] if description else "",
                "author": {"@type": "Person", "name": "Author Name"},
                "datePublished": "",
                "dateModified": "",
                "image": "",
                "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            }, indent=2)

        if schema_type == "BlogPosting":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": display_title,
                "description": description[:500] if description else "",
                "author": {"@type": "Person", "name": "Author Name"},
                "datePublished": "",
                "dateModified": "",
                "image": "",
                "mainEntityOfPage": {"@type": "WebPage", "@id": url},
            }, indent=2)

        if schema_type == "VideoObject":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "VideoObject",
                "name": display_title,
                "description": description[:500] if description else "",
                "thumbnailUrl": "",
                "uploadDate": "",
                "duration": "PT10M",
                "contentUrl": "",
                "embedUrl": "",
            }, indent=2)

        if schema_type == "LocalBusiness":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": display_title,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "",
                    "addressLocality": "",
                    "addressRegion": "",
                    "postalCode": "",
                    "addressCountry": "US",
                },
                "telephone": "",
                "openingHours": "Mo-Fr 09:00-17:00",
                "priceRange": "$$",
            }, indent=2)

        if schema_type == "Person":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Author Name",
                "jobTitle": "",
                "worksFor": {"@type": "Organization", "name": display_title},
                "sameAs": [],
            }, indent=2)

        if schema_type == "SoftwareApplication":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": display_title,
                "description": description[:500] if description else "",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
            }, indent=2)

        if schema_type == "AggregateRating":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "AggregateRating",
                "ratingValue": "4.5",
                "reviewCount": "10",
                "bestRating": "5",
                "worstRating": "1",
            }, indent=2)

        if schema_type == "Review":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "Review",
                "itemReviewed": {"@type": "Product", "name": display_title},
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": "5",
                    "bestRating": "5",
                },
                "author": {"@type": "Person", "name": "Reviewer Name"},
                "datePublished": "",
                "reviewBody": "",
            }, indent=2)

        if schema_type == "Speakable":
            return json.dumps({
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": display_title,
                "speakable": {
                    "@type": "SpeakableSpecification",
                    "cssSelector": ["h1", ".main-content"],
                },
            }, indent=2)

        return json.dumps({
            "@context": "https://schema.org",
            "@type": schema_type,
            "name": display_title,
            "description": description[:500] if description else "",
        }, indent=2)

    def _validate_all_schemas(self, schemas: list[dict], valid_json_ld: bool) -> dict:
        errors: list[dict] = []
        warnings: list[dict] = []
        valid_count = 0
        error_count = 0
        warning_count = 0

        for schema in schemas:
            if not isinstance(schema, dict):
                errors.append({
                    "schema": "Unknown",
                    "property": "@type",
                    "error": "Schema is not a valid JSON object",
                    "fix": "Ensure each schema block contains a valid JSON-LD object",
                })
                error_count += 1
                continue

            schema_type = schema.get("@type", "Unknown")
            context = schema.get("@context", "")

            if context and context != "https://schema.org":
                warnings.append({
                    "schema": schema_type,
                    "property": "@context",
                    "warning": f"@context should be 'https://schema.org', got '{context}'",
                })
                warning_count += 1

            if not schema_type:
                errors.append({
                    "schema": "Unknown",
                    "property": "@type",
                    "error": "Schema missing @type property",
                    "fix": "Add an '@type' property to the schema (e.g., '@type': 'Organization')",
                })
                error_count += 1
                continue

            if "@type" not in schema:
                errors.append({
                    "schema": schema_type,
                    "property": "@type",
                    "error": "Schema missing @type property",
                    "fix": "Add an '@type' property to the schema",
                })
                error_count += 1
                continue

            if "id" in schema and not schema["id"].startswith("http"):
                warnings.append({
                    "schema": schema_type,
                    "property": "@id",
                    "warning": "Schema @id should be a valid URL",
                })
                warning_count += 1

            definition = _SCHEMA_DEFINITIONS.get(schema_type)
            if definition:
                has_issues = False
                for prop in definition["required"]:
                    if prop not in schema or not schema[prop]:
                        errors.append({
                            "schema": schema_type,
                            "property": prop,
                            "error": f"Missing required property: {prop}",
                            "fix": f"Add '{prop}' property to the {schema_type} schema",
                        })
                        error_count += 1
                        has_issues = True

                for prop in definition["recommended"]:
                    if prop not in schema or not schema[prop]:
                        warnings.append({
                            "schema": schema_type,
                            "property": prop,
                            "warning": f"Missing recommended property: {prop}",
                        })
                        warning_count += 1

                if not has_issues:
                    valid_count += 1
            else:
                valid_count += 1

        return {
            "total_schemas": len(schemas),
            "valid_schemas": valid_count,
            "schemas_with_errors": error_count,
            "schemas_with_warnings": warning_count,
            "errors": errors,
            "warnings": warnings,
            "json_ld_syntax_valid": valid_json_ld,
        }

    def _compute_rich_results(self, detected: list[dict]) -> dict:
        eligible: list[str] = []
        ineligible: list[str] = []
        potential: list[str] = []

        for schema in detected:
            if not schema.get("found"):
                continue
            type_name = schema["type"]
            rich_type = schema.get("rich_result_type", "")
            if not rich_type:
                continue
            if schema["rich_result_eligible"]:
                eligible.append(rich_type)
            elif schema["completeness"] >= 30:
                potential.append(rich_type)
            else:
                ineligible.append(rich_type)

        eligible_set = set(eligible)
        total_boost = "+5-10% CTR"
        if "Product Rich Result" in eligible_set:
            total_boost = "+15-30% CTR"
        elif "Video Rich Result" in eligible_set:
            total_boost = "+20-40% CTR"
        elif "Local Business Rich Result" in eligible_set:
            total_boost = "+15-35% CTR"
        elif "FAQ Rich Result" in eligible_set:
            total_boost = "+10-25% CTR"
        elif "How-To Rich Result" in eligible_set:
            total_boost = "+15-25% CTR"
        elif "Aggregate Rating in Rich Results" in eligible_set:
            total_boost = "+10-30% CTR"
        elif eligible_set:
            total_boost = "+10-20% CTR"

        return {
            "eligible_types": eligible,
            "ineligible_types": ineligible,
            "potential_rich_results": potential,
            "estimated_ctr_boost": total_boost,
        }

    def _compute_issues_and_recommendations(
        self,
        detected: list[dict],
        missing: list[dict],
        validation: dict,
        page_type: str,
    ) -> tuple[list[str], list[str]]:
        issues: list[str] = []
        recommendations: list[str] = []

        if validation["json_ld_syntax_valid"] is False:
            issues.append("JSON-LD syntax contains errors that prevent parsing by search engines")

        for schema in detected:
            if not schema["found"]:
                continue
            if schema["issues"]:
                for issue in schema["issues"]:
                    issues.append(f"{schema['type']}: {issue}")
            if schema["warnings"]:
                for warning in schema["warnings"]:
                    issues.append(f"{schema['type']}: {warning}")

        for error in validation.get("errors", []):
            issues.append(f"{error['schema']}.{error['property']}: {error['error']}")

        found_types = [s["type"] for s in detected if s.get("found")]
        has_breadcrumb = "BreadcrumbList" in found_types
        has_org = "Organization" in found_types

        if not has_breadcrumb:
            recommendations.append("Add BreadcrumbList schema to improve navigation signals and earn breadcrumb rich results")
        if not has_org and page_type in ("homepage", "about", "contact", "service"):
            recommendations.append("Add Organization schema to establish brand identity and enable Knowledge Panel")

        high_importance_missing = [m for m in missing if m["importance"] in ("CRITICAL", "HIGH")]
        for m in high_importance_missing[:5]:
            recommendations.append(f"Add {m['type']} schema to enable {m['rich_result']} ({m['estimated_impact']})")

        for schema in detected:
            if schema.get("found") and schema["completeness"] < 50:
                recommendations.append(
                    f"Improve {schema['type']} schema completeness from {schema['completeness']:.0f}% to 80%+ by adding missing properties"
                )

        if not recommendations:
            recommendations.append("Schema implementation is comprehensive. Monitor for new Google rich result types")

        return issues, recommendations

    def _build_before_after(
        self,
        detected: list[dict],
        missing: list[dict],
        title: str,
        meta_description: str,
        url: str,
        h1: str,
        page_type: str,
    ) -> list[dict]:
        before_after: list[dict] = []
        display_title = h1 or title or "Page"
        description = meta_description or display_title
        domain = ""
        try:
            parsed = urlparse(url)
            domain = parsed.scheme + "://" + parsed.netloc if parsed.scheme and parsed.netloc else ""
        except (ValueError, AttributeError):
            pass

        found_map = {s["type"]: s for s in detected if s.get("found")}

        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            applicable = definition.get("applicable_pages", set())
            if page_type not in applicable and page_type != "unknown":
                continue

            rich_result = definition.get("rich_result", "")
            importance = definition.get("importance", "LOW")

            if type_name in found_map:
                schema_data = found_map[type_name]
                completeness = schema_data["completeness"]
                if completeness >= 90:
                    continue
                current = f"Present but {completeness:.0f}% complete"
                recommended_json = self._generate_json_ld(
                    type_name, title, meta_description, url, h1, display_title, description, domain
                )
                effort = "High" if completeness < 40 else "Medium" if completeness < 70 else "Low"
                before_after.append({
                    "schema_type": type_name,
                    "current": current,
                    "recommended": f"Complete {type_name} schema with all required and recommended properties to enable {rich_result}",
                    "json_ld": recommended_json,
                    "priority": importance,
                    "effort": effort,
                    "impact": definition.get("rich_result", "") + " - " + _RICH_RESULT_CTR_BOOSTS.get(rich_result, "Moderate CTR improvement"),
                })
            else:
                recommended_json = self._generate_json_ld(
                    type_name, title, meta_description, url, h1, display_title, description, domain
                )
                before_after.append({
                    "schema_type": type_name,
                    "current": "Not present",
                    "recommended": f"Add {type_name} schema to enable {rich_result}",
                    "json_ld": recommended_json,
                    "priority": importance,
                    "effort": "Medium",
                    "impact": rich_result + " - " + _RICH_RESULT_CTR_BOOSTS.get(rich_result, "Moderate CTR improvement"),
                })

        return before_after

    def _compute_schema_score(self, detected: list[dict], validation: dict, page_type: str) -> float:
        total_score = 0.0
        max_score = 0.0
        pt = page_type.lower()

        applicable = set()
        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            if pt in definition.get("applicable_pages", set()) or page_type == "unknown":
                applicable.add(type_name)

        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            if type_name not in applicable:
                continue

            importance = definition.get("importance", "LOW")
            weight = {"CRITICAL": 3.0, "HIGH": 2.0, "MEDIUM": 1.5, "LOW": 1.0}.get(importance, 1.0)
            max_score += weight * 100.0

            found = False
            for schema in detected:
                if schema["type"] == type_name and schema.get("found"):
                    completeness = schema["completeness"]
                    total_score += weight * completeness
                    found = True
                    break

            if not found:
                total_score += 0.0

        if max_score == 0:
            return 0.0

        base_score = (total_score / max_score) * 100.0

        syntax_penalty = 0.0
        if not validation.get("json_ld_syntax_valid", True):
            syntax_penalty = 20.0
        error_penalty = min(validation.get("schemas_with_errors", 0) * 3.0, 30.0)
        warning_penalty = min(validation.get("schemas_with_warnings", 0) * 1.0, 10.0)

        final_score = max(base_score - syntax_penalty - error_penalty - warning_penalty, 0.0)
        final_score = min(final_score, 100.0)

        if math.isnan(final_score) or math.isinf(final_score):
            return 0.0

        return round(final_score, 1)

    def _compute_schema_coverage(self, detected: list[dict], page_type: str) -> float:
        applicable_count = 0
        found_count = 0
        pt = page_type.lower()

        for type_name, definition in _SCHEMA_DEFINITIONS.items():
            if pt in definition.get("applicable_pages", set()) or page_type == "unknown":
                applicable_count += 1
                for schema in detected:
                    if schema["type"] == type_name and schema.get("found"):
                        found_count += 1
                        break

        if applicable_count == 0:
            return 0.0

        coverage = (found_count / applicable_count) * 100.0

        if math.isnan(coverage) or math.isinf(coverage):
            return 0.0

        return round(coverage, 1)
