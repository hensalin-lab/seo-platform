"""
Page Improvement Engine
Generates per-page recommendations: what to add, remove, rewrite, move, link, optimize.
Produces role-based fixes (Developer / Content / Designer) with difficulty and time estimates.
"""
import logging
import re
import json

logger = logging.getLogger(__name__)


class PageImprovementEngine:
    def analyze(self, pages, keyword_research=None):
        result = {
            "page_improvements": [],
            "role_based_tasks": {"developer": [], "content": [], "designer": []},
            "priority_matrix": [],
            "summary": {},
        }

        if not pages:
            return result

        for page in pages:
            improvement = self._analyze_page(page, keyword_research)
            result["page_improvements"].append(improvement)

            for role, tasks in improvement["role_tasks"].items():
                for task in tasks:
                    task["page_url"] = page.url
                    task["page_title"] = page.title or ""
                    result["role_based_tasks"][role].append(task)

        result["priority_matrix"] = self._build_priority_matrix(result["page_improvements"])
        result["summary"] = self._build_summary(result)

        return result

    def _analyze_page(self, page, keyword_research=None):
        improvements = {
            "url": page.url,
            "title": page.title or "",
            "page_type": page.page_type or "UNKNOWN",
            "current_score": 0,
            "what_to_add": [],
            "what_to_remove": [],
            "what_to_rewrite": [],
            "what_to_link": [],
            "what_to_optimize": [],
            "role_tasks": {"developer": [], "content": [], "designer": []},
        }

        content_text = page.content_text or ""
        word_count = page.word_count or 0
        headings = page.headings or []
        if isinstance(headings, str):
            headings = json.loads(headings) if headings.strip() else []
        links_internal = page.links_internal or []
        links_external = page.links_external or []
        if isinstance(links_internal, str):
            links_internal = json.loads(links_internal) if links_internal.strip() else []
        if isinstance(links_external, str):
            links_external = json.loads(links_external) if links_external.strip() else []
        images = page.images or []
        if isinstance(images, str):
            images = json.loads(images) if images.strip() else []
        schema = page.schema_markup or []
        if isinstance(schema, str):
            schema = json.loads(schema) if schema.strip() else []

        score = 100

        if word_count < 300:
            improvements["what_to_add"].append({
                "item": "Expanded Content",
                "detail": f"Page has only {word_count} words — expand to 800-1,500+ words with comprehensive coverage",
                "impact": "HIGH",
                "effort": "HIGH",
                "estimated_time": "3-5 hours",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Expand content from {word_count} to 1,500+ words",
                "difficulty": "MEDIUM",
                "estimated_time": "3-5 hours",
                "priority": "HIGH",
            })
            score -= 20
        elif word_count < 800:
            improvements["what_to_add"].append({
                "item": "Additional Depth",
                "detail": f"Page has {word_count} words — expand to 1,000+ words with examples and data",
                "impact": "MEDIUM",
                "effort": "MEDIUM",
                "estimated_time": "1-2 hours",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Expand content from {word_count} to 1,000+ words",
                "difficulty": "EASY",
                "estimated_time": "1-2 hours",
                "priority": "MEDIUM",
            })
            score -= 10

        h1_count = sum(1 for h in headings if h.get("level") == "H1")
        h2_count = sum(1 for h in headings if h.get("level") == "H2")
        if h1_count == 0:
            improvements["what_to_add"].append({
                "item": "H1 Tag",
                "detail": "Add a single H1 tag with the primary target keyword",
                "impact": "CRITICAL",
                "effort": "EASY",
                "estimated_time": "5 min",
            })
            improvements["role_tasks"]["developer"].append({
                "task": "Add H1 tag to page template or content",
                "difficulty": "EASY",
                "estimated_time": "5 min",
                "priority": "CRITICAL",
            })
            score -= 15
        elif h1_count > 1:
            improvements["what_to_remove"].append({
                "item": "Duplicate H1 Tags",
                "detail": f"Found {h1_count} H1 tags — keep only one",
                "impact": "HIGH",
                "effort": "EASY",
                "estimated_time": "5 min",
            })
            improvements["role_tasks"]["developer"].append({
                "task": f"Remove {h1_count - 1} duplicate H1 tags",
                "difficulty": "EASY",
                "estimated_time": "5 min",
                "priority": "HIGH",
            })
            score -= 10

        if h2_count < 2 and word_count > 400:
            improvements["what_to_add"].append({
                "item": "H2 Subheadings",
                "detail": f"Only {h2_count} H2s found — add 3-5 H2s to structure content",
                "impact": "HIGH",
                "effort": "EASY",
                "estimated_time": "15 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Add {3 - h2_count} more H2 subheadings to structure content",
                "difficulty": "EASY",
                "estimated_time": "15 min",
                "priority": "HIGH",
            })
            score -= 8

        if not page.title or len(page.title) < 30:
            improvements["what_to_rewrite"].append({
                "item": "Title Tag",
                "detail": f"Title is {'missing' if not page.title else f'only {len(page.title)} chars'} — optimize to 50-60 characters with primary keyword",
                "impact": "CRITICAL",
                "effort": "EASY",
                "estimated_time": "10 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Rewrite title tag to 50-60 chars with primary keyword",
                "difficulty": "EASY",
                "estimated_time": "10 min",
                "priority": "CRITICAL",
            })
            score -= 15
        elif len(page.title) > 65:
            improvements["what_to_rewrite"].append({
                "item": "Title Tag (Too Long)",
                "detail": f"Title is {len(page.title)} chars — truncate to 55-60 characters",
                "impact": "MEDIUM",
                "effort": "EASY",
                "estimated_time": "5 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Shorten title from {len(page.title)} to 55-60 characters",
                "difficulty": "EASY",
                "estimated_time": "5 min",
                "priority": "MEDIUM",
            })
            score -= 5

        if not page.meta_description or len(page.meta_description) < 70:
            improvements["what_to_add"].append({
                "item": "Meta Description",
                "detail": f"Meta description is {'missing' if not page.meta_description else f'only {len(page.meta_description)} chars'} — write 150-160 chars with keyword + CTA",
                "impact": "HIGH",
                "effort": "EASY",
                "estimated_time": "10 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": "Write compelling meta description (150-160 chars) with target keyword",
                "difficulty": "EASY",
                "estimated_time": "10 min",
                "priority": "HIGH",
            })
            score -= 10

        if len(links_internal) < 3:
            improvements["what_to_link"].append({
                "item": "Internal Links",
                "detail": f"Only {len(links_internal)} internal links — add 5+ contextual internal links",
                "impact": "HIGH",
                "effort": "EASY",
                "estimated_time": "20 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": f"Add {3 - len(links_internal)}+ internal links to related pages",
                "difficulty": "EASY",
                "estimated_time": "20 min",
                "priority": "HIGH",
            })
            score -= 8

        if len(links_external) == 0:
            improvements["what_to_link"].append({
                "item": "External Links",
                "detail": "No external links — add 2-3 links to authoritative sources",
                "impact": "MEDIUM",
                "effort": "EASY",
                "estimated_time": "15 min",
            })
            improvements["role_tasks"]["content"].append({
                "task": "Add 2-3 outbound links to authoritative reference sources",
                "difficulty": "EASY",
                "estimated_time": "15 min",
                "priority": "MEDIUM",
            })
            score -= 5

        no_alt_images = [img for img in images if not img.get("alt")]
        if no_alt_images:
            improvements["what_to_optimize"].append({
                "item": "Image Alt Text",
                "detail": f"{len(no_alt_images)} images missing alt text — add descriptive alt attributes",
                "impact": "MEDIUM",
                "effort": "EASY",
                "estimated_time": f"{len(no_alt_images) * 2} min",
            })
            improvements["role_tasks"]["developer"].append({
                "task": f"Add alt text to {len(no_alt_images)} images",
                "difficulty": "EASY",
                "estimated_time": f"{len(no_alt_images) * 2} min",
                "priority": "MEDIUM",
            })
            score -= min(10, len(no_alt_images) * 2)

        schema_types = [s.get("@type", "") for s in schema if isinstance(s, dict)]
        if not schema_types:
            improvements["what_to_add"].append({
                "item": "Structured Data (Schema)",
                "detail": "No schema markup found — add Organization, Article, or BreadcrumbList schema",
                "impact": "MEDIUM",
                "effort": "MEDIUM",
                "estimated_time": "30 min",
            })
            improvements["role_tasks"]["developer"].append({
                "task": "Implement JSON-LD structured data (Organization + page-type schema)",
                "difficulty": "MEDIUM",
                "estimated_time": "30 min",
                "priority": "MEDIUM",
            })
            score -= 10

        if word_count > 500:
            cta_signals = ["buy", "get started", "sign up", "try", "demo", "contact", "learn more", "download", "subscribe", "request"]
            has_cta = any(sig in content_text.lower() for sig in cta_signals)
            if not has_cta:
                improvements["what_to_add"].append({
                    "item": "Call-to-Action (CTA)",
                    "detail": "No CTA found — add a relevant call-to-action button or section",
                    "impact": "MEDIUM",
                    "effort": "EASY",
                    "estimated_time": "15 min",
                })
                improvements["role_tasks"]["designer"].append({
                    "task": "Design and add CTA section appropriate to page purpose",
                    "difficulty": "EASY",
                    "estimated_time": "15 min",
                    "priority": "MEDIUM",
                })
                score -= 5

        improvements["current_score"] = max(0, min(100, score))
        return improvements

    def _build_priority_matrix(self, page_improvements):
        matrix = []
        for page in page_improvements:
            for item in page["what_to_add"] + page["what_to_remove"] + page["what_to_rewrite"] + page["what_to_link"] + page["what_to_optimize"]:
                matrix.append({
                    "page_url": page["url"],
                    "page_title": page["title"],
                    "item": item["item"],
                    "detail": item["detail"],
                    "impact": item["impact"],
                    "effort": item["effort"],
                    "estimated_time": item["estimated_time"],
                    "score": page["current_score"],
                })

        impact_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        effort_order = {"EASY": 0, "MEDIUM": 1, "HIGH": 2}
        matrix.sort(key=lambda x: (impact_order.get(x["impact"], 9), effort_order.get(x["effort"], 9)))

        return matrix[:50]

    def _build_summary(self, result):
        total_pages = len(result["page_improvements"])
        pages_below_70 = len([p for p in result["page_improvements"] if p["current_score"] < 70])
        pages_above_90 = len([p for p in result["page_improvements"] if p["current_score"] >= 90])

        total_add = sum(len(p["what_to_add"]) for p in result["page_improvements"])
        total_remove = sum(len(p["what_to_remove"]) for p in result["page_improvements"])
        total_rewrite = sum(len(p["what_to_rewrite"]) for p in result["page_improvements"])
        total_link = sum(len(p["what_to_link"]) for p in result["page_improvements"])
        total_optimize = sum(len(p["what_to_optimize"]) for p in result["page_improvements"])

        dev_tasks = len(result["role_based_tasks"]["developer"])
        content_tasks = len(result["role_based_tasks"]["content"])
        designer_tasks = len(result["role_based_tasks"]["designer"])

        critical_count = len([m for m in result["priority_matrix"] if m["impact"] == "CRITICAL"])
        high_count = len([m for m in result["priority_matrix"] if m["impact"] == "HIGH"])

        return {
            "total_pages": total_pages,
            "pages_needing_work": pages_below_70,
            "pages_in_good_shape": pages_above_90,
            "avg_score": round(sum(p["current_score"] for p in result["page_improvements"]) / max(total_pages, 1), 1),
            "total_improvements": total_add + total_remove + total_rewrite + total_link + total_optimize,
            "by_action": {
                "add": total_add,
                "remove": total_remove,
                "rewrite": total_rewrite,
                "link": total_link,
                "optimize": total_optimize,
            },
            "by_role": {
                "developer": dev_tasks,
                "content": content_tasks,
                "designer": designer_tasks,
            },
            "critical_items": critical_count,
            "high_items": high_count,
        }
