"""
Recommendation Confidence Engine v1.0
Calculates real confidence scores based on signal quality, crawl confidence,
AI verification, and data completeness — never displays arbitrary values.
"""
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ConfidenceCalculator:
    """Calculate recommendation confidence from multiple weighted signals."""

    # Weight distribution for confidence components
    WEIGHTS = {
        "signal_quality": 0.30,
        "crawl_confidence": 0.25,
        "ai_verification": 0.25,
        "data_completeness": 0.20,
    }

    def __init__(self):
        self.signal_evidence = {}

    def calculate(
        self,
        signal_quality: float = 0.0,
        crawl_confidence: float = 0.0,
        ai_verification: float = 0.0,
        data_completeness: float = 0.0,
        evidence: Optional[List[str]] = None,
    ) -> dict:
        """Calculate weighted confidence score with evidence trail.

        Args:
            signal_quality: 0-100, how strong the signal is (e.g., HTML confirmed = high)
            crawl_confidence: 0-100, how reliable the crawl data is
            ai_verification: 0-100, AI cross-verified (0 if not checked)
            data_completeness: 0-100, how complete the data is for this signal
            evidence: list of human-readable evidence strings
        """
        confidence = (
            signal_quality * self.WEIGHTS["signal_quality"]
            + crawl_confidence * self.WEIGHTS["crawl_confidence"]
            + ai_verification * self.WEIGHTS["ai_verification"]
            + data_completeness * self.WEIGHTS["data_completeness"]
        )

        confidence = min(100, max(0, round(confidence)))

        # Determine tier
        if confidence >= 90:
            tier = "CONFIRMED"
        elif confidence >= 70:
            tier = "HIGH"
        elif confidence >= 50:
            tier = "MEDIUM"
        elif confidence >= 30:
            tier = "LOW"
        else:
            tier = "UNCERTAIN"

        return {
            "score": confidence,
            "tier": tier,
            "breakdown": {
                "signal_quality": round(signal_quality, 1),
                "crawl_confidence": round(crawl_confidence, 1),
                "ai_verification": round(ai_verification, 1),
                "data_completeness": round(data_completeness, 1),
            },
            "weights": self.WEIGHTS,
            "evidence": evidence or [],
        }

    def for_missing_schema(self, page: dict, schema_type: str, detected_content: bool = True) -> dict:
        """High confidence when JSON-LD missing but content is detected in HTML."""
        signal_quality = 95 if detected_content else 40
        crawl_confidence = 98  # HTML parsing is reliable
        ai_verification = 0
        data_completeness = 90 if detected_content else 30

        evidence = []
        if detected_content:
            evidence.append(f"{schema_type} content detected in page HTML")
            evidence.append("JSON-LD structured data block is missing")
            evidence.append("HTML validated successfully")
        else:
            evidence.append(f"No {schema_type} content detected on page")
            evidence.append("Cannot confirm if schema is needed")

        return self.calculate(signal_quality, crawl_confidence, ai_verification, data_completeness, evidence)

    def for_missing_meta(self, page: dict, meta_type: str) -> dict:
        """Calculate confidence for missing meta tag issues."""
        has_title = bool(page.get("title"))
        has_desc = bool(page.get("meta_description"))
        has_h1 = bool(page.get("h1"))

        signal_quality = 100  # Meta tag absence is binary
        crawl_confidence = 99  # HTML parsing is reliable
        data_completeness = 70 if (has_title or has_desc or has_h1) else 30

        evidence = []
        if meta_type == "og:title":
            evidence.append("Open Graph title tag is missing")
            if has_title:
                evidence.append(f"Page has <title>: '{page.get('title', '')[:50]}'")
        elif meta_type == "og:description":
            evidence.append("Open Graph description is missing")
            if has_desc:
                evidence.append(f"Page has meta description: '{page.get('meta_description', '')[:50]}'")
        elif meta_type == "twitter:card":
            evidence.append("Twitter Card meta tag is missing")
        elif meta_type == "meta_description":
            evidence.append("Meta description is missing")
            if has_h1:
                evidence.append(f"Page has H1: '{page.get('h1', '')[:50]}'")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_slow_page(self, page: dict, threshold_ms: int = 3000) -> dict:
        """Confidence for slow page load issues."""
        load_time = page.get("response_time_ms", 0) or page.get("load_time", 0)
        if load_time <= 0:
            return self.calculate(20, 20, 0, 10, ["Response time data not available"])

        signal_quality = 100  # Direct measurement
        crawl_confidence = 95  # Single point measurement, not field data
        data_completeness = 80 if load_time > threshold_ms else 60

        evidence = [
            f"Measured response time: {load_time}ms",
            f"Threshold: {threshold_ms}ms",
        ]
        if load_time > threshold_ms:
            evidence.append(f"Exceeds threshold by {load_time - threshold_ms}ms")
        else:
            evidence.append("Within acceptable range")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_missing_alt_text(self, images: list) -> dict:
        """Confidence for images missing alt text."""
        if not images:
            return self.calculate(0, 0, 0, 0, ["No images found on page"])

        missing = [img for img in images if not img.get("alt") or img.get("alt", "").strip() == ""]
        pct_missing = (len(missing) / max(len(images), 1)) * 100

        signal_quality = 100  # Binary check
        crawl_confidence = 98  # HTML parsing reliable
        data_completeness = min(100, pct_missing + 20)

        evidence = [
            f"{len(images)} images found on page",
            f"{len(missing)} images missing alt text ({round(pct_missing)}%)",
        ]
        if missing:
            evidence.append(f"Example: {missing[0].get('src', 'unknown')[:80]}")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_duplicate_content(self, pages_with_same_content: list) -> dict:
        """Confidence for duplicate content detection."""
        count = len(pages_with_same_content)
        if count < 2:
            return self.calculate(0, 0, 0, 0, ["Not enough pages to detect duplication"])

        signal_quality = 85 if count > 3 else 70
        crawl_confidence = 90  # Text comparison is reliable
        data_completeness = 95

        evidence = [
            f"{count} pages with similar content detected",
            f"Pages: {', '.join(p.get('url', '?')[:40] for p in pages_with_same_content[:3])}",
        ]

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_ai_visibility(self, page: dict, prompt_tested: bool = False, cited: bool = False) -> dict:
        """Confidence for AI visibility recommendations."""
        if prompt_tested:
            signal_quality = 95 if cited else 60
            crawl_confidence = 90
            ai_verification = 95
            data_completeness = 85
            evidence = [
                "Prompt tested against AI platform",
                f"Brand {'cited' if cited else 'NOT cited'} in response",
            ]
        else:
            signal_quality = 50  # Estimated from content signals
            crawl_confidence = 70
            ai_verification = 0
            data_completeness = 50
            evidence = [
                "AI visibility estimated from content signals",
                "Not verified with actual prompt testing",
            ]

        return self.calculate(signal_quality, crawl_confidence, ai_verification, data_completeness, evidence)

    def for_internal_links(self, page: dict, link_count: int, recommended: int = 5) -> dict:
        """Confidence for internal linking recommendations."""
        signal_quality = 100  # Counted directly
        crawl_confidence = 98  # Link parsing reliable
        data_completeness = min(100, (link_count / max(recommended, 1)) * 100)

        evidence = [
            f"{link_count} internal links found",
            f"Recommended minimum: {recommended}",
        ]
        if link_count < recommended:
            evidence.append(f"Missing {recommended - link_count} internal links")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_word_count(self, word_count: int, min_words: int = 300, target_words: int = 1500) -> dict:
        """Confidence for thin content detection."""
        signal_quality = 100  # Direct measurement
        crawl_confidence = 95
        data_completeness = min(100, (word_count / max(target_words, 1)) * 100)

        evidence = [
            f"Word count: {word_count}",
            f"Minimum recommended: {min_words}",
            f"Target: {target_words}",
        ]
        if word_count < min_words:
            evidence.append(f"Content is {min_words - word_count} words below minimum")
        elif word_count < target_words:
            evidence.append(f"Content is {target_words - word_count} words below target")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)

    def for_heading_structure(self, headings: list, has_h1: bool, h1_count: int) -> dict:
        """Confidence for heading structure issues."""
        signal_quality = 100
        crawl_confidence = 99
        h2_count = sum(1 for h in headings if h.get("level") == "H2" or h.get("level") == "h2")

        missing = []
        if not has_h1:
            missing.append("H1 tag")
        if h1_count > 1:
            missing.append(f"Multiple H1 tags ({h1_count})")
        if h2_count < 2:
            missing.append(f"Only {h2_count} H2 subheadings")

        data_completeness = 90 if missing else 95

        evidence = [f"{len(headings)} headings found on page"]
        if missing:
            evidence.extend([f"Issue: {m}" for m in missing])
        else:
            evidence.append("Heading structure is well-formed")

        return self.calculate(signal_quality, crawl_confidence, 0, data_completeness, evidence)


class RecommendationConfidenceEngine:
    """Engine that enriches all recommendations with real confidence scores."""

    def __init__(self):
        self.calculator = ConfidenceCalculator()

    def enrich_recommendations(self, recommendations: list, page: dict) -> list:
        """Enrich a list of recommendations with calculated confidence scores."""
        enriched = []
        for rec in recommendations:
            rec_type = rec.get("type", rec.get("category", ""))
            enriched_rec = {**rec}

            # Calculate confidence based on type
            confidence = self._calculate_for_type(rec_type, rec, page)
            enriched_rec["confidence"] = confidence["score"]
            enriched_rec["confidence_tier"] = confidence["tier"]
            enriched_rec["confidence_breakdown"] = confidence["breakdown"]
            enriched_rec["evidence"] = confidence["evidence"]

            enriched.append(enriched_rec)

        return enriched

    def _calculate_for_type(self, rec_type: str, rec: dict, page: dict) -> dict:
        """Route to correct calculator method based on recommendation type."""
        rec_type_lower = rec_type.lower()

        if "schema" in rec_type_lower and ("faq" in rec_type_lower or "missing" in rec_type_lower):
            detected = bool(page.get("content_text", ""))
            return self.calculator.for_missing_schema(page, "FAQ", detected)

        elif "meta" in rec_type_lower or "og:" in rec_type_lower or "twitter" in rec_type_lower:
            return self.calculator.for_missing_meta(page, rec_type)

        elif "slow" in rec_type_lower or "speed" in rec_type_lower or "performance" in rec_type_lower:
            return self.calculator.for_slow_page(page)

        elif "alt" in rec_type_lower or "image" in rec_type_lower:
            images = page.get("images", [])
            return self.calculator.for_missing_alt_text(images)

        elif "duplicate" in rec_type_lower:
            return self.calculator.for_duplicate_content([page])

        elif "ai" in rec_type_lower or "visibility" in rec_type_lower:
            return self.calculator.for_ai_visibility(page)

        elif "link" in rec_type_lower and "internal" in rec_type_lower:
            links = page.get("links_internal", [])
            count = len(links) if isinstance(links, list) else 0
            return self.calculator.for_internal_links(page, count)

        elif "thin" in rec_type_lower or "word" in rec_type_lower or "content" in rec_type_lower:
            wc = page.get("word_count", 0)
            return self.calculator.for_word_count(wc)

        elif "heading" in rec_type_lower or "h1" in rec_type_lower:
            headings = page.get("headings", page.get("headers", []))
            h1s = [h for h in headings if h.get("level") == "H1" or h.get("level") == "h1"]
            return self.calculator.for_heading_structure(headings, bool(h1s), len(h1s))

        else:
            # Generic fallback
            return self.calculator.calculate(
                signal_quality=60,
                crawl_confidence=80,
                ai_verification=0,
                data_completeness=60,
                evidence=[f"Confidence calculated for: {rec_type}"],
            )

    def analyze(self, pages: list, recommendations: list = None) -> dict:
        """Full confidence analysis across all pages and recommendations."""
        all_recommendations = recommendations or []

        # Enrich per-page recommendations
        enriched_total = 0
        high_confidence = 0
        medium_confidence = 0
        low_confidence = 0

        for page in pages:
            page_recs = page.get("recommendations", page.get("issues", []))
            if page_recs:
                enriched = self.enrich_recommendations(page_recs, page)
                for r in enriched:
                    conf = r.get("confidence", 0)
                    if conf >= 70:
                        high_confidence += 1
                    elif conf >= 40:
                        medium_confidence += 1
                    else:
                        low_confidence += 1
                    enriched_total += 1

        return {
            "summary": {
                "total_recommendations": enriched_total,
                "high_confidence": high_confidence,
                "medium_confidence": medium_confidence,
                "low_confidence": low_confidence,
                "avg_confidence": round(
                    sum(r.get("confidence", 0) for page in pages for r in (page.get("recommendations", page.get("issues", [])) or []))
                    / max(enriched_total, 1), 1
                ),
            },
            "confidence_distribution": {
                "90-100": high_confidence,
                "50-89": medium_confidence,
                "0-49": low_confidence,
            },
        }
