"""Enterprise Audit Orchestrator — Combines all engines into enterprise payload"""
import json
import logging

from app.engine.classic_seo import ClassicSEOEngine
from app.engine.ai_geo import AIGeoEngine
from app.engine.content_intelligence_v2 import ContentIntelligenceV2
from app.engine.page_classifier import classifier

logger = logging.getLogger(__name__)


class EnterpriseOrchestrator:
    def __init__(self):
        self.classic = ClassicSEOEngine()
        self.ai_geo = AIGeoEngine()
        self.content = ContentIntelligenceV2()

    def analyze_page(self, page):
        schema_types = []
        if page.schema_markup:
            for s in page.schema_markup:
                if isinstance(s, dict) and "@type" in s:
                    schema_types.append(s["@type"])
        image_list = page.images if isinstance(page.images, list) else []

        classification = classifier.classify(
            url=page.url, title=page.title,
            content_text=page.content_text, h1=page.h1,
            word_count=page.word_count or 0,
            schema_types=schema_types,
            images=image_list,
        )
        page_type = classification["page_type"]

        engine_status = {"classic": "ok", "ai_geo": "ok", "content": "ok"}
        try:
            classic_result = self.classic.analyze(page)
        except Exception as e:
            logger.error(f"ClassicSEOEngine failed for {page.url}: {e}")
            classic_result = {"issues": [], "signals_checked": 0, "category_scores": {}}
            engine_status["classic"] = f"failed: {e}"
        try:
            ai_geo_result = self.ai_geo.analyze(page)
        except Exception as e:
            logger.error(f"AIGeoEngine failed for {page.url}: {e}")
            ai_geo_result = {"issues": [], "signals_checked": 0, "category_scores": {}}
            engine_status["ai_geo"] = f"failed: {e}"
        try:
            content_result = self.content.analyze(page)
        except Exception as e:
            logger.error(f"ContentIntelligenceV2 failed for {page.url}: {e}")
            content_result = {"issues": [], "signals_checked": 0, "category_scores": {}}
            engine_status["content"] = f"failed: {e}"

        all_issues = classic_result.get("issues", []) + ai_geo_result.get("issues", []) + content_result.get("issues", [])
        all_issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("severity", "LOW"), 4))

        classic_score = classic_result.get("technical_score") if "technical_score" in classic_result else None
        ai_geo_score = ai_geo_result.get("geo_score") if "geo_score" in ai_geo_result else None
        content_score = content_result.get("content_score") if "content_score" in content_result else None
        eeat_score = content_result.get("category_scores", {}).get("eeat") if content_result.get("category_scores") else None

        valid_scores = [s for s in [classic_score, ai_geo_score, content_score, eeat_score] if s is not None]
        if valid_scores:
            overall = sum(valid_scores) / len(valid_scores)
        else:
            overall = 0
            logger.warning(f"No valid engine scores for {page.url}, overall=0")

        diagnostics = {
            "why_not_ranking": ai_geo_result.get("why_not_ranking", []),
            "competitor_gap": self._competitor_gap(page, classic_result, ai_geo_result),
            "actionable_fixes": all_issues,
        }

        page_type_targets = self._get_page_type_targets(page_type)

        cat_scores_classic = classic_result.get("category_scores", {})
        cat_scores_ai = ai_geo_result.get("category_scores", {})
        cat_scores_content = content_result.get("category_scores", {})

        return {
            "url": page.url,
            "page_type": page_type,
            "_engine_status": engine_status,
            "overall_health_score": round(overall, 1),
            "scores": {
                "classic_seo": round(classic_score, 1) if classic_score is not None else 0,
                "technical": round(cat_scores_classic.get("indexability", 0), 1),
                "eeat": round(eeat_score, 1) if eeat_score is not None else 0,
                "ai_search_geo": round(ai_geo_score, 1) if ai_geo_score is not None else 0,
                "content_quality": round(content_score, 1) if content_score is not None else 0,
                "readability": round(cat_scores_content.get("readability", 0), 1),
            },
            "platform_scores": ai_geo_result.get("platform_scores", {}),
            "diagnostics": diagnostics,
            "page_type_targets": page_type_targets,
            "signals_checked": classic_result.get("signals_checked", 0) + ai_geo_result.get("signals_checked", 0) + content_result.get("signals_checked", 0),
            "category_scores": {
                **cat_scores_classic,
                **cat_scores_ai,
                **cat_scores_content,
            },
        }

    def _competitor_gap(self, page, classic_result, ai_geo_result):
        gaps = []
        wc = page.word_count or 0
        if wc < 1500:
            gaps.append({
                "signal": "content_depth",
                "current": f"{wc} words",
                "competitor_benchmark": "1500-2500 words",
                "gap": f"{1500 - wc} words short of AI citation threshold",
            })

        ext_links = len(page.links_external or [])
        if ext_links < 3:
            gaps.append({
                "signal": "external_references",
                "current": f"{ext_links} external links",
                "competitor_benchmark": "5-10 external references",
                "gap": f"Need {3 - ext_links}+ more authoritative external references",
            })

        sources = len([s for s in ai_geo_result.get("diagnostics", {}).get("citation_readiness", []) if s["name"] == "has_sources" and s["status"] == "warn"])
        if sources:
            gaps.append({
                "signal": "source_citations",
                "current": "0 citations",
                "competitor_benchmark": "3-5 named sources",
                "gap": "No source citations — AI platforms heavily weight cited content",
            })

        schema = page.schema_markup or []
        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]
        if "FAQPage" not in types:
            questions_count = len([s for s in ai_geo_result.get("diagnostics", {}).get("answer_engine", []) if s["name"] == "question_coverage" and s["status"] == "pass"])
            if questions_count:
                gaps.append({
                    "signal": "faq_schema",
                    "current": "No FAQPage schema",
                    "competitor_benchmark": "FAQPage JSON-LD",
                    "gap": "Questions in content but no FAQPage schema for AI extraction",
                })

        images = page.images or []
        if len(images) < 3:
            gaps.append({
                "signal": "visual_content",
                "current": f"{len(images)} images",
                "competitor_benchmark": "5-10 images with alt text",
                "gap": "Insufficient visual content for engagement and image SEO",
            })

        return gaps

    def _get_page_type_targets(self, page_type):
        targets = {
            "HOMEPAGE": {"min_words": 500, "must_have": ["Organization schema", "clear value proposition", "navigation links", "CTA"], "ideal_words": 800},
            "BLOG": {"min_words": 1200, "must_have": ["Article/BlogPosting schema", "author attribution", "publication date", "3+ internal links", "FAQ section"], "ideal_words": 2000},
            "PRODUCT": {"min_words": 800, "must_have": ["Product schema", "price", "reviews", "images", "CTA"], "ideal_words": 1500},
            "PRICING": {"min_words": 600, "must_have": ["clear pricing tiers", "comparison table", "CTA", "FAQ"], "ideal_words": 1000},
            "SERVICES": {"min_words": 800, "must_have": ["Service schema", "benefits", "case studies", "CTA"], "ideal_words": 1200},
            "SOLUTIONS": {"min_words": 800, "must_have": ["problem-solution structure", "benefits", "social proof", "CTA"], "ideal_words": 1200},
            "FEATURES": {"min_words": 800, "must_have": ["feature descriptions", "screenshots", "comparisons", "CTA"], "ideal_words": 1200},
            "FAQ": {"min_words": 600, "must_have": ["FAQPage schema", "question headings", "concise answers", "3+ questions"], "ideal_words": 1000},
            "DOCUMENTATION": {"min_words": 1000, "must_have": ["code examples", "step-by-step", "table of contents", "navigation"], "ideal_words": 2000},
            "CASE_STUDY": {"min_words": 1500, "must_have": ["problem/solution/result structure", "metrics", "quotes", "before/after"], "ideal_words": 2500},
            "LANDING_PAGE": {"min_words": 500, "must_have": ["clear headline", "benefits", "social proof", "strong CTA"], "ideal_words": 800},
            "ABOUT": {"min_words": 600, "must_have": ["Organization schema", "team info", "mission", "timeline"], "ideal_words": 1000},
            "DEMO": {"min_words": 500, "must_have": ["demo form", "screenshot/video", "key features", "CTA"], "ideal_words": 800},
        }
        return targets.get(page_type, {"min_words": 800, "must_have": ["quality content", "internal links", "schema"], "ideal_words": 1500})

    def generate_enterprise_payload(self, pages, website_url):
        from app.engine.crawl_snapshot import _normalize_url
        seen_urls: set[str] = set()
        deduped_pages = []
        for p in pages:
            norm = _normalize_url(getattr(p, 'url', p.get('url', '') if isinstance(p, dict) else ''))
            if norm not in seen_urls:
                seen_urls.add(norm)
                deduped_pages.append(p)
        pages = deduped_pages

        page_results = []
        all_issues = []
        all_why_not_ranking = []
        all_competitor_gaps = []
        score_sum = {"classic_seo": 0, "technical": 0, "eeat": 0, "ai_search_geo": 0, "content_quality": 0}
        platform_sums = {"chatgpt": 0, "gemini": 0, "perplexity": 0, "claude": 0, "google_ai_overview": 0}

        for page in pages:
            try:
                result = self.analyze_page(page)
                page_results.append(result)
                all_issues.extend(result["diagnostics"]["actionable_fixes"])
                all_why_not_ranking.extend(result["diagnostics"]["why_not_ranking"])
                all_competitor_gaps.extend(result["diagnostics"]["competitor_gap"])

                for key in score_sum:
                    score_sum[key] += result["scores"].get(key, 50)
                for key in platform_sums:
                    platform_sums[key] += result["platform_scores"].get(key, 50)
            except Exception as e:
                logger.error(f"Enterprise analysis failed for {page.url}: {e}")

        n = max(len(pages), 1)
        avg_scores = {k: round(v / n, 1) for k, v in score_sum.items()}
        avg_platform = {k: round(v / n, 1) for k, v in platform_sums.items()}

        all_issues.sort(key=lambda x: x.get("impact_score", 0), reverse=True)
        all_issues_deduped = []
        seen_fixes = set()
        for issue in all_issues:
            key = (issue.get("element", ""), issue.get("issue", ""))
            if key not in seen_fixes:
                seen_fixes.add(key)
                all_issues_deduped.append(issue)

        return {
            "website_url": website_url,
            "total_pages_analyzed": len(pages),
            "overall_health_score": round(sum(r["overall_health_score"] for r in page_results) / n, 1),
            "scores": avg_scores,
            "platform_scores": avg_platform,
            "diagnostics": {
                "why_not_ranking": list(set(all_why_not_ranking))[:20],
                "competitor_gap": all_competitor_gaps[:20],
                "actionable_fixes": all_issues_deduped[:100],
            },
            "page_results": page_results,
            "summary": {
                "critical_fixes": sum(1 for i in all_issues_deduped if i["severity"] == "CRITICAL"),
                "high_fixes": sum(1 for i in all_issues_deduped if i["severity"] == "HIGH"),
                "medium_fixes": sum(1 for i in all_issues_deduped if i["severity"] == "MEDIUM"),
                "low_fixes": sum(1 for i in all_issues_deduped if i["severity"] == "LOW"),
                "page_types": self._page_type_distribution(page_results),
            },
        }

    def _page_type_distribution(self, page_results):
        dist = {}
        for pr in page_results:
            pt = pr.get("page_type", "UNKNOWN")
            dist[pt] = dist.get(pt, 0) + 1
        return dist

    def generate_expanded_report(self, pages, website_url, competitor_data=None):
        base = self.generate_enterprise_payload(pages, website_url)
        all_issues = base["diagnostics"]["actionable_fixes"]

        seo_issues = [i for i in all_issues if i.get("category", "").lower() in ("title_tag","meta_tags","headings","url_structure","open_graph","canonical","keyword_optimization")]
        technical_issues = [i for i in all_issues if i.get("category", "").lower() in ("page_speed","security","crawlability","indexability","mobile_optimization","core_web_vitals_detailed","technical_integrity")]
        content_issues = [i for i in all_issues if i.get("category", "").lower() in ("content_quality","content_structure","readability","entity_optimization","keyword_optimization","content_freshness")]
        ai_geo_issues = [i for i in all_issues if i.get("category", "").lower() in ("schema_markup","ai_search_readiness","structured_data_richness","eeat","entity_optimization")]

        quick_wins = sorted([i for i in all_issues if i.get("effort", "").upper() in ("EASY",)], key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("severity", "LOW"), 4))[:5]

        top_10 = sorted(all_issues, key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x.get("severity", "LOW"), 4))[:10]

        base["executive_summary"] = {
            "total_issues_found": len(all_issues),
            "critical_count": base["summary"]["critical_fixes"],
            "high_count": base["summary"]["high_fixes"],
            "medium_count": base["summary"]["medium_fixes"],
            "low_count": base["summary"]["low_fixes"],
            "top_10_opportunities": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "category": i.get("category", ""), "effort": i.get("effort", "MEDIUM")} for i in top_10],
            "quick_wins_under_30min": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "category": i.get("category", "")} for i in quick_wins],
        }
        base["section_rollups"] = {
            "technical_fixes": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "fix": i.get("fix", i.get("exact_fix", "")), "effort": i.get("effort", "MEDIUM")} for i in technical_issues[:15]],
            "content_fixes": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "fix": i.get("fix", i.get("exact_fix", "")), "effort": i.get("effort", "MEDIUM")} for i in content_issues[:15]],
            "seo_fixes": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "fix": i.get("fix", i.get("exact_fix", "")), "effort": i.get("effort", "MEDIUM")} for i in seo_issues[:15]],
            "ai_geo_fixes": [{"signal_name": i.get("signal_name", i.get("issue", "")), "severity": i.get("severity", ""), "fix": i.get("fix", i.get("exact_fix", "")), "effort": i.get("effort", "MEDIUM")} for i in ai_geo_issues[:15]],
        }
        base["roadmaps"] = {
            "30_day_action_plan": base["summary"].get("critical_fixes", 0) + base["summary"].get("high_fixes", 0),
            "90_day_roadmap": base["summary"].get("medium_fixes", 0) + base["summary"].get("low_fixes", 0),
        }
        if competitor_data:
            base["competitor_gaps"] = {
                "strengths": competitor_data.get("strengths", [])[:5],
                "weaknesses": competitor_data.get("weaknesses", [])[:5],
                "note": competitor_data.get("_note", "Competitor data derived from real crawl comparison"),
                "source": competitor_data.get("_source", "competitor_crawl"),
            }
        return base
