import logging
import datetime as _dt

logger = logging.getLogger(__name__)


class RoadmapGenerator:
    def generate(self, analysis_result, keyword_data=None, content_data=None, competitor_data=None):
        roadmap = {
            "immediate": [],
            "week_1": [],
            "month_1": [],
            "month_3": [],
        }

        if not analysis_result:
            return roadmap

        scores = analysis_result.scores
        issues = analysis_result.issues

        critical_issues = [i for i in issues if i.get("severity") == "CRITICAL"]
        high_issues = [i for i in issues if i.get("severity") == "HIGH"]
        medium_issues = [i for i in issues if i.get("severity") == "MEDIUM"]

        for issue in critical_issues:
            roadmap["immediate"].append({
                "task": f"Fix: {issue['signal_name']}",
                "page": issue.get("page_url", ""),
                "category": issue.get("category", ""),
                "priority": "CRITICAL",
                "impact": issue.get("impact", ""),
                "fix": issue.get("fix", issue.get("description", "")),
            })

        for issue in high_issues[:10]:
            roadmap["immediate"].append({
                "task": f"Fix: {issue['signal_name']}",
                "page": issue.get("page_url", ""),
                "category": issue.get("category", ""),
                "priority": "HIGH",
                "impact": issue.get("impact", ""),
                "fix": issue.get("fix", issue.get("description", "")),
            })

        if scores.get("technical", 0) < 70:
            roadmap["week_1"].append({
                "task": "Improve Technical SEO",
                "category": "TECHNICAL",
                "priority": "HIGH",
                "details": [
                    "Fix broken links and redirects",
                    "Implement canonical tags",
                    "Add XML sitemap",
                    "Fix robots.txt",
                    "Improve page speed",
                ],
            })

        if scores.get("seo", 0) < 70:
            roadmap["week_1"].append({
                "task": "Optimize On-Page SEO",
                "category": "SEO",
                "priority": "HIGH",
                "details": [
                    "Optimize title tags (30-60 chars)",
                    "Write meta descriptions (120-160 chars)",
                    "Fix H1 tag issues",
                    "Add internal links",
                    "Optimize image alt text",
                ],
            })

        if scores.get("aeo", 0) < 60:
            roadmap["month_1"].append({
                "task": "Implement AEO Strategy",
                "category": "AEO",
                "priority": "MEDIUM",
                "details": [
                    "Add FAQ sections with FAQPage schema",
                    "Create question-based headings (H2/H3)",
                    "Write direct answer paragraphs",
                    "Add step-by-step how-to content",
                    "Create comparison and list content",
                ],
            })

        if scores.get("geo", 0) < 60:
            roadmap["month_1"].append({
                "task": "Build GEO Authority",
                "category": "GEO",
                "priority": "MEDIUM",
                "details": [
                    "Add author bios with expertise signals",
                    "Create About and Team pages",
                    "Add customer testimonials and reviews",
                    "Include citations and references",
                    "Build trust signals throughout content",
                ],
            })

        if scores.get("ai_visibility", 0) < 60:
            roadmap["month_1"].append({
                "task": "Optimize for AI Search",
                "category": "AI_SEARCH",
                "priority": "MEDIUM",
                "details": [
                    "Add structured data (JSON-LD) to all pages",
                    "Create definition sections for key concepts",
                    "Ensure content is citation-ready",
                    "Add freshness signals with dates",
                    "Create llms.txt file",
                ],
            })

        if keyword_data:
            missing_kws = keyword_data.get("missing_keywords", [])
            if missing_kws:
                roadmap["month_1"].append({
                    "task": f"Target {len(missing_kws)} Missing Keywords",
                    "category": "KEYWORDS",
                    "priority": "MEDIUM",
                    "keywords": [kw["keyword"] for kw in missing_kws[:10]],
                    "details": [f"Create or optimize content for '{kw['keyword']}'" for kw in missing_kws[:5]],
                })

        if content_data:
            gaps = content_data.get("content_gaps", [])
            if gaps:
                roadmap["month_3"].append({
                    "task": f"Create {len(gaps)} Missing Content Pieces",
                    "category": "CONTENT",
                    "priority": "MEDIUM",
                    "details": [g.get("suggestion", "") for g in gaps[:5]],
                })

        if competitor_data:
            strengths = competitor_data.get("strengths", [])
            weaknesses = competitor_data.get("weaknesses", [])
            if weaknesses:
                roadmap["month_3"].append({
                    "task": "Address Competitive Weaknesses",
                    "category": "COMPETITOR",
                    "priority": "MEDIUM",
                    "details": [f"Weakness: {w}" if isinstance(w, str) else str(w) for w in weaknesses[:5]],
                })

        roadmap["month_3"].append({
            "task": "Authority Building",
            "category": "AUTHORITY",
            "priority": "LOW",
            "details": [
                "Build high-quality backlinks",
                "Create linkable assets (research, tools, guides)",
                "Guest posting on industry publications",
                "Digital PR and outreach campaigns",
                "Build brand mentions across the web",
            ],
        })

        return roadmap
