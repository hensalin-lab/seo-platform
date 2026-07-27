from __future__ import annotations

import math
import re
from typing import Any


class SpeedIntelligenceEngine:

    def analyze(self, page: dict, all_pages: list[dict] | None = None) -> dict:
        url = page.get("url", "")
        html_raw = page.get("html_raw", "") or ""
        word_count = page.get("word_count", 0) or 0
        response_time = self._safe_int(page.get("response_time_ms", 0))
        status_code = self._safe_int(page.get("status_code", 200))
        images = page.get("images", []) or []
        links_internal = page.get("links_internal", []) or []
        links_external = page.get("links_external", []) or []
        title = page.get("title", "") or ""

        html_size = len(html_raw.encode("utf-8", errors="replace"))
        script_tags = self._count_pattern(html_raw, r"<script[\s>]")
        inline_scripts = self._count_pattern(html_raw, r"<script[^>]*>[^<]")
        external_scripts = script_tags - inline_scripts
        style_tags = self._count_pattern(html_raw, r"<style[\s>]|<link[^>]*stylesheet")
        has_viewport = bool(re.search(r'<meta[^>]*name=["\']viewport["\']', html_raw, re.I))
        has_preconnect = bool(re.search(r"preconnect", html_raw, re.I))
        has_preload = bool(re.search(r"preload", html_raw, re.I))
        has_dns_prefetch = bool(re.search(r"dns-prefetch", html_raw, re.I))
        has_async_scripts = self._count_pattern(html_raw, r"<script[^>]*\basync\b")
        has_defer_scripts = self._count_pattern(html_raw, r"<script[^>]*\bdefer\b")
        has_gzip_header = self._detect_compression(html_raw)
        image_count = len(images)
        images_without_dimensions = sum(
            1 for img in images if not img.get("width") and not img.get("height")
        )
        images_with_lazy = sum(
            1 for img in images if img.get("loading") == "lazy"
        )
        images_without_lazy = image_count - images_with_lazy
        large_images = sum(
            1 for img in images if self._safe_int(img.get("size_kb", 0)) > 100
        )
        total_image_kb = sum(self._safe_int(img.get("size_kb", 0)) for img in images)

        dom_depth = self._estimate_dom_depth(html_raw)
        dom_elements = self._estimate_dom_elements(html_raw)
        has_font_display = bool(re.search(r"font-display\s*:", html_raw, re.I))
        external_fonts = self._count_pattern(
            html_raw, r"<link[^>]*fonts\.(?:googleapis|gstatic)\.com"
        )
        third_party_scripts = self._detect_third_party(html_raw)
        has_lazy_images = has_preload or images_with_lazy > 0
        event_handlers = self._count_pattern(html_raw, r"on(click|mouse|key|touch|focus|blur|input|change|submit|scroll|resize)\s*=")

        cwv = self._estimate_cwv(
            html_size=html_size,
            response_time=response_time,
            image_count=image_count,
            images_without_dimensions=images_without_dimensions,
            script_tags=script_tags,
            inline_scripts=inline_scripts,
            event_handlers=event_handlers,
            style_tags=style_tags,
            has_async_scripts=has_async_scripts,
            has_defer_scripts=has_defer_scripts,
            word_count=word_count,
            dom_elements=dom_elements,
            has_preconnect=has_preconnect,
            total_image_kb=total_image_kb,
        )

        issues = self._detect_issues(
            html_raw=html_raw,
            html_size=html_size,
            images=images,
            image_count=image_count,
            images_without_dimensions=images_without_dimensions,
            images_without_lazy=images_without_lazy,
            large_images=large_images,
            script_tags=script_tags,
            inline_scripts=inline_scripts,
            external_scripts=external_scripts,
            has_gzip_header=has_gzip_header,
            has_preconnect=has_preconnect,
            has_preload=has_preload,
            has_dns_prefetch=has_dns_prefetch,
            has_font_display=has_font_display,
            external_fonts=external_fonts,
            has_viewport=has_viewport,
            dom_depth=dom_depth,
            dom_elements=dom_elements,
            third_party_scripts=third_party_scripts,
            style_tags=style_tags,
            cwv=cwv,
            response_time=response_time,
            event_handlers=event_handlers,
            word_count=word_count,
        )

        resource_analysis = self._analyze_resources(
            html_size=html_size,
            images=images,
            total_image_kb=total_image_kb,
            image_count=image_count,
            script_tags=script_tags,
            external_scripts=external_scripts,
            inline_scripts=inline_scripts,
            style_tags=style_tags,
            external_fonts=external_fonts,
            word_count=word_count,
        )

        third_party_impact = self._analyze_third_party(third_party_scripts)

        optimization_plan = self._build_optimization_plan(issues, cwv)

        perf_score = self._calculate_score(cwv, issues, html_size, word_count, response_time)

        mobile_est = self._mobile_estimate(cwv)
        desktop_est = self._desktop_estimate(cwv)

        score_predictions = self._score_predictions(perf_score, issues)

        page_comparison = None
        if all_pages and len(all_pages) > 1:
            page_comparison = self._compare_pages(all_pages)

        return {
            "performance_score": round(perf_score, 1),
            "core_web_vitals": cwv,
            "mobile_estimate": mobile_est,
            "desktop_estimate": desktop_est,
            "issues_detected": issues,
            "resource_analysis": resource_analysis,
            "third_party_impact": third_party_impact,
            "optimization_plan": optimization_plan,
            "score_predictions": score_predictions,
            "page_comparison": page_comparison,
        }

    def _safe_int(self, val: Any) -> int:
        if val is None:
            return 0
        try:
            v = float(val)
            if math.isnan(v) or math.isinf(v):
                return 0
            return int(v)
        except (TypeError, ValueError):
            return 0

    def _safe_float(self, val: Any, default: float = 0.0) -> float:
        if val is None:
            return default
        try:
            v = float(val)
            if math.isnan(v) or math.isinf(v):
                return default
            return v
        except (TypeError, ValueError):
            return default

    def _count_pattern(self, text: str, pattern: str) -> int:
        return len(re.findall(pattern, text, re.I | re.S))

    def _detect_compression(self, html_raw: str) -> bool:
        lower = html_raw.lower()[:500]
        if "content-encoding" in lower and "gzip" in lower:
            return True
        if "transfer-encoding" in lower and "chunked" in lower:
            return True
        return False

    def _detect_third_party(self, html_raw: str) -> list[str]:
        detected = []
        patterns = {
            "Google Analytics / GA4": r"(google-analytics\.com|gtag/js|googletagmanager\.com|analytics\.js)",
            "Google Tag Manager": r"googletagmanager\.com",
            "Facebook Pixel": r"connect\.facebook\.net|fbevents\.js",
            "Hotjar": r"hotjar\.com|static\.hotjar\.com",
            "Intercom": r"widget\.intercom\.io|intercomcdn\.com",
            "Zendesk Chat": r"zopim\.com|zendesk\.com",
            "HubSpot": r"js\.hs-scripts\.com|hubspot\.com",
            "Segment": r"cdn\.segment\.com|segment\.io",
            "Clarity": r"clarity\.ms",
            "Tawk.to": r"embed\.tawk\.to",
            "Crisp": r"client\.crisp\.chat",
            "Drift": r"js\.driftt\.com",
            "Adobe Analytics": r"omtrdc\.net|2o7\.net|demdex\.net",
            "Mixpanel": r"cdn\.mxpnl\.com|mixpanel\.com",
            "Stripe": r"js\.stripe\.com",
            "reCAPTCHA": r"google\.com/recaptcha|recaptcha\.net",
            "YouTube Embed": r"youtube\.com/embed|ytimg\.com",
            "Vimeo Embed": r"player\.vimeo\.com",
            "Twitter/X Widget": r"platform\.twitter\.com|syndication\.twimg\.com",
            "LinkedIn Insight": r"snap\.licdn\.com",
            "Pinterest Tag": r"pintrk\.com",
            "TikTok Pixel": r"analytics\.tiktok\.com",
            "Cloudflare": r"cloudflare\.com|cf-static\.cloudflare\.com",
            "New Relic": r"newrelic\.com|nr-data\.net",
            "Sentry": r"sentry\.io|browser\.sentry-cdn\.com",
            "DataDog": r"datadoghq\.com|DD_RUM",
            "Optimizely": r"optimizely\.com",
            "VWO": r"visualwebsiteoptimizer\.com|vwo\.com",
            "Cookie Consent": r"cookiebot\.com|onetrust\.com|cookiepro\.com|osano\.com",
        }
        for name, pat in patterns.items():
            if re.search(pat, html_raw, re.I):
                if name not in detected:
                    detected.append(name)
        return detected

    def _estimate_dom_depth(self, html_raw: str) -> int:
        max_depth = 1
        current = 0
        in_tag = False
        is_closing = False
        is_self_closing = False
        i = 0
        length = len(html_raw)
        sample = html_raw[:50000]
        while i < len(sample):
            ch = sample[i]
            if ch == "<":
                in_tag = True
                is_closing = False
                is_self_closing = False
                if i + 1 < len(sample) and sample[i + 1] == "/":
                    is_closing = True
                tag_name = ""
                j = i + 1
                if is_closing:
                    j += 1
                while j < len(sample) and sample[j] not in (" ", ">", "/", "\n", "\r", "\t"):
                    tag_name += sample[j].lower()
                    j += 1
                skip_tags = {"meta", "link", "br", "hr", "img", "input", "source", "area", "col", "embed", "track", "wbr"}
                void_tags = skip_tags
                if tag_name in void_tags:
                    is_self_closing = True
            elif ch == ">":
                in_tag = False
                if is_closing:
                    current = max(0, current - 1)
                elif not is_self_closing:
                    current += 1
                    if current > max_depth:
                        max_depth = current
                is_closing = False
                is_self_closing = False
            i += 1
        return min(max_depth, 50)

    def _estimate_dom_elements(self, html_raw: str) -> int:
        tags = re.findall(r"<([a-zA-Z][a-zA-Z0-9]*)\b", html_raw)
        return len(tags)

    def _estimate_cwv(
        self,
        html_size: int,
        response_time: int,
        image_count: int,
        images_without_dimensions: int,
        script_tags: int,
        inline_scripts: int,
        event_handlers: int,
        style_tags: int,
        has_async_scripts: int,
        has_defer_scripts: int,
        word_count: int,
        dom_elements: int,
        has_preconnect: bool,
        total_image_kb: int,
    ) -> dict:
        ttfb = self._estimate_ttfb(response_time)
        lcp = self._estimate_lcp(
            html_size=html_size,
            response_time=response_time,
            image_count=image_count,
            total_image_kb=total_image_kb,
            word_count=word_count,
            ttfb=ttfb,
        )
        cls = self._estimate_cls(images_without_dimensions, image_count, dom_elements)
        inp = self._estimate_inp(script_tags, inline_scripts, event_handlers, dom_elements)
        fcp = self._estimate_fcp(
            ttfb=ttfb,
            html_size=html_size,
            style_tags=style_tags,
            has_async_scripts=has_async_scripts,
            has_defer_scripts=has_defer_scripts,
            inline_scripts=inline_scripts,
            word_count=word_count,
        )
        speed_index = self._estimate_speed_index(lcp, fcp, ttfb)

        return {
            "lcp": {
                "value": round(lcp, 2),
                "unit": "s",
                "status": self._cwv_status(lcp, good=2.5, poor=4.0),
                "target": 2.5,
                "explanation": self._lcp_explanation(lcp, image_count, total_image_kb, response_time),
            },
            "cls": {
                "value": round(cls, 3),
                "unit": "score",
                "status": self._cwv_status_inv(cls, good=0.1, poor=0.25),
                "target": 0.1,
                "explanation": self._cls_explanation(cls, images_without_dimensions, image_count),
            },
            "inp": {
                "value": round(inp, 0),
                "unit": "ms",
                "status": self._cwv_status(inp, good=200, poor=500),
                "target": 200,
                "explanation": self._inp_explanation(inp, script_tags, event_handlers),
            },
            "fcp": {
                "value": round(fcp, 2),
                "unit": "s",
                "status": self._cwv_status(fcp, good=1.8, poor=3.0),
                "target": 1.8,
                "explanation": self._fcp_explanation(fcp, style_tags, inline_scripts),
            },
            "ttfb": {
                "value": round(ttfb, 0),
                "unit": "ms",
                "status": self._cwv_status(ttfb, good=800, poor=1800),
                "target": 800,
                "explanation": self._ttfb_explanation(ttfb, response_time),
            },
            "speed_index": {
                "value": round(speed_index, 2),
                "unit": "s",
                "status": self._cwv_status(speed_index, good=3.4, poor=5.8),
            },
        }

    def _estimate_ttfb(self, response_time: int) -> float:
        if response_time <= 0:
            return 200.0
        if response_time <= 200:
            return float(response_time)
        ttfb = response_time * 0.35
        ttfb = max(100, min(ttfb, 5000))
        return ttfb

    def _estimate_lcp(
        self,
        html_size: int,
        response_time: int,
        image_count: int,
        total_image_kb: int,
        word_count: int,
        ttfb: float,
    ) -> float:
        base = ttfb / 1000.0
        html_penalty = 0.0
        if html_size > 500000:
            html_penalty = 1.2
        elif html_size > 200000:
            html_penalty = 0.6
        elif html_size > 100000:
            html_penalty = 0.3
        image_penalty = 0.0
        if image_count > 0:
            avg_img = total_image_kb / image_count if image_count else 0
            if avg_img > 500:
                image_penalty = 1.5
            elif avg_img > 200:
                image_penalty = 0.8
            elif avg_img > 100:
                image_penalty = 0.4
            elif avg_img > 50:
                image_penalty = 0.2
            if image_count > 20:
                image_penalty += 0.3
            elif image_count > 10:
                image_penalty += 0.15
        render_penalty = 0.0
        if word_count > 5000:
            render_penalty = 0.4
        elif word_count > 2000:
            render_penalty = 0.2
        total = base + html_penalty + image_penalty + render_penalty
        return max(0.5, min(total, 12.0))

    def _estimate_cls(
        self,
        images_without_dimensions: int,
        image_count: int,
        dom_elements: int,
    ) -> float:
        cls = 0.0
        if image_count > 0:
            ratio = images_without_dimensions / max(image_count, 1)
            cls += ratio * 0.15
        if images_without_dimensions > 5:
            cls += 0.05
        if dom_elements > 3000:
            cls += 0.04
        elif dom_elements > 1500:
            cls += 0.02
        if images_without_dimensions > 10:
            cls += 0.08
        return min(cls, 0.5)

    def _estimate_inp(
        self,
        script_tags: int,
        inline_scripts: int,
        event_handlers: int,
        dom_elements: int,
    ) -> float:
        base = 50.0
        script_penalty = script_tags * 12.0
        inline_penalty = inline_scripts * 25.0
        event_penalty = event_handlers * 8.0
        dom_penalty = 0.0
        if dom_elements > 3000:
            dom_penalty = 80.0
        elif dom_elements > 1500:
            dom_penalty = 40.0
        elif dom_elements > 800:
            dom_penalty = 20.0
        total = base + script_penalty + inline_penalty + event_penalty + dom_penalty
        return max(30.0, min(total, 2000.0))

    def _estimate_fcp(
        self,
        ttfb: float,
        html_size: int,
        style_tags: int,
        has_async_scripts: int,
        has_defer_scripts: int,
        inline_scripts: int,
        word_count: int,
    ) -> float:
        base = ttfb / 1000.0
        html_penalty = 0.0
        if html_size > 300000:
            html_penalty = 0.8
        elif html_size > 150000:
            html_penalty = 0.4
        elif html_size > 80000:
            html_penalty = 0.2
        render_blocking = 0.0
        blocking_scripts = max(0, inline_scripts - has_async_scripts - has_defer_scripts)
        render_blocking += blocking_scripts * 0.3
        render_blocking += style_tags * 0.15
        text_penalty = 0.0
        if word_count > 5000:
            text_penalty = 0.3
        elif word_count > 2000:
            text_penalty = 0.15
        total = base + html_penalty + render_blocking + text_penalty
        return max(0.4, min(total, 8.0))

    def _estimate_speed_index(self, lcp: float, fcp: float, ttfb: float) -> float:
        si = (ttfb / 1000.0 * 0.2) + (fcp * 0.3) + (lcp * 0.5)
        return max(0.5, min(si, 10.0))

    def _cwv_status(self, value: float, good: float, poor: float) -> str:
        if value <= good:
            return "good"
        if value <= poor:
            return "needs_improvement"
        return "poor"

    def _cwv_status_inv(self, value: float, good: float, poor: float) -> str:
        if value <= good:
            return "good"
        if value <= poor:
            return "needs_improvement"
        return "poor"

    def _lcp_explanation(self, lcp: float, image_count: int, total_image_kb: int, response_time: int) -> str:
        parts = []
        if lcp <= 2.5:
            parts.append("LCP is within the good threshold")
        elif lcp <= 4.0:
            parts.append("LCP needs improvement")
        else:
            parts.append("LCP is poor and significantly delays largest contentful paint")
        if response_time > 1000:
            parts.append(f"server response time of {response_time}ms contributes to delay")
        if image_count > 10:
            avg = total_image_kb / image_count if image_count else 0
            parts.append(f"{image_count} images averaging {avg:.0f}KB each may slow LCP element loading")
        elif total_image_kb > 500:
            parts.append("large total image payload impacts LCP")
        return "; ".join(parts) if parts else "estimated from page characteristics"

    def _cls_explanation(self, cls: float, images_without_dimensions: int, image_count: int) -> str:
        parts = []
        if cls <= 0.1:
            parts.append("CLS is within acceptable limits")
        elif cls <= 0.25:
            parts.append("CLS indicates moderate layout instability")
        else:
            parts.append("CLS indicates severe layout instability")
        if images_without_dimensions > 0:
            parts.append(f"{images_without_dimensions} of {image_count} images lack explicit width/height attributes")
        return "; ".join(parts) if parts else "no significant layout shift indicators detected"

    def _inp_explanation(self, inp: float, script_tags: int, event_handlers: int) -> str:
        parts = []
        if inp <= 200:
            parts.append("INP is within the good threshold")
        elif inp <= 500:
            parts.append("INP suggests delayed interactivity on some interactions")
        else:
            parts.append("INP indicates significant interactivity delays")
        if script_tags > 15:
            parts.append(f"{script_tags} script tags found which may block the main thread")
        elif script_tags > 8:
            parts.append(f"{script_tags} script tags contribute to JS processing time")
        if event_handlers > 20:
            parts.append(f"{event_handlers} inline event handlers detected")
        return "; ".join(parts) if parts else "estimated from script and interaction indicators"

    def _fcp_explanation(self, fcp: float, style_tags: int, inline_scripts: int) -> str:
        parts = []
        if fcp <= 1.8:
            parts.append("FCP is within the good threshold")
        elif fcp <= 3.0:
            parts.append("FCP needs improvement — users see blank screen longer")
        else:
            parts.append("FCP is poor — users experience extended blank screen time")
        if style_tags > 5:
            parts.append(f"{style_tags} style elements may render block initial paint")
        if inline_scripts > 5:
            parts.append("render-blocking inline scripts delay first contentful paint")
        return "; ".join(parts) if parts else "estimated from render-blocking resource indicators"

    def _ttfb_explanation(self, ttfb: float, response_time: int) -> str:
        if ttfb <= 800:
            return f"TTFB of {ttfb:.0f}ms is within good range"
        elif ttfb <= 1800:
            return f"TTFB of {ttfb:.0f}ms needs improvement — server or network latency is high"
        else:
            return f"TTFB of {ttfb:.0f}ms is poor — significant server-side delay detected (raw response: {response_time}ms)"

    def _detect_issues(
        self,
        html_raw: str,
        html_size: int,
        images: list,
        image_count: int,
        images_without_dimensions: int,
        images_without_lazy: int,
        large_images: int,
        script_tags: int,
        inline_scripts: int,
        external_scripts: int,
        has_gzip_header: bool,
        has_preconnect: bool,
        has_preload: bool,
        has_dns_prefetch: bool,
        has_font_display: bool,
        external_fonts: int,
        has_viewport: bool,
        dom_depth: int,
        dom_elements: int,
        third_party_scripts: list[str],
        style_tags: int,
        cwv: dict,
        response_time: int,
        event_handlers: int,
        word_count: int,
    ) -> list[dict]:
        issues: list[dict] = []

        if not has_viewport:
            issues.append({
                "severity": "critical",
                "category": "mobile",
                "message": "Missing viewport meta tag",
                "explanation": "Without the viewport meta tag, mobile browsers will render the page at desktop width, causing text to be tiny and requiring users to zoom and scroll horizontally.",
                "fix": 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head> section.',
                "impact": "Major — affects all mobile users and is a Google ranking factor",
                "effort": "minimal",
                "estimated_improvement": "significant mobile usability improvement",
            })

        if cwv["lcp"]["status"] == "poor":
            issues.append({
                "severity": "critical",
                "category": "performance",
                "message": f"LCP is poor at {cwv['lcp']['value']}s (target: ≤2.5s)",
                "explanation": "The largest contentful element takes too long to render. This directly impacts Core Web Vitals scoring and user experience — users perceive the page as slow to load.",
                "fix": "Optimize the LCP element: compress and properly size hero images, use a CDN, implement server-side rendering or pre-rendering, and eliminate render-blocking resources.",
                "impact": "Major — directly affects Core Web Vitals ranking signal",
                "effort": "moderate",
                "estimated_improvement": f"potential LCP reduction to ~{max(1.5, cwv['lcp']['value'] * 0.55):.1f}s",
            })
        elif cwv["lcp"]["status"] == "needs_improvement":
            issues.append({
                "severity": "warning",
                "category": "performance",
                "message": f"LCP needs improvement at {cwv['lcp']['value']}s (target: ≤2.5s)",
                "explanation": "LCP is close to the threshold. Optimizing the largest element could push it into the good range.",
                "fix": "Compress hero images, preload the LCP element, and reduce server response time.",
                "impact": "moderate — approaching the good threshold",
                "effort": "minimal",
                "estimated_improvement": f"potential LCP reduction to ~{max(1.5, cwv['lcp']['value'] * 0.7):.1f}s",
            })

        if cwv["cls"]["status"] == "poor":
            issues.append({
                "severity": "critical",
                "category": "stability",
                "message": f"CLS is poor at {cwv['cls']['value']} (target: ≤0.1)",
                "explanation": "Significant layout shifts are occurring after page load, causing content to move unexpectedly. This frustrates users and can lead to accidental clicks.",
                "fix": "Always set explicit width and height on images and videos, use CSS aspect-ratio, avoid inserting content above existing content, and use transform animations instead of layout-triggering properties.",
                "impact": "Major — directly affects Core Web Vitals ranking signal",
                "effort": "moderate",
                "estimated_improvement": f"potential CLS reduction to ~{max(0.02, cwv['cls']['value'] * 0.2):.3f}",
            })
        elif cwv["cls"]["status"] == "needs_improvement":
            issues.append({
                "severity": "warning",
                "category": "stability",
                "message": f"CLS needs improvement at {cwv['cls']['value']} (target: ≤0.1)",
                "explanation": "Some layout shifts detected. Addressing missing dimensions on images can significantly improve this metric.",
                "fix": "Add explicit width/height attributes to all images and use CSS aspect-ratio for responsive sizing.",
                "impact": "moderate — approaching the good threshold",
                "effort": "minimal",
                "estimated_improvement": f"potential CLS reduction to ~{max(0.02, cwv['cls']['value'] * 0.3):.3f}",
            })

        if cwv["inp"]["status"] == "poor":
            issues.append({
                "severity": "critical",
                "category": "interactivity",
                "message": f"INP is poor at {cwv['inp']['value']:.0f}ms (target: ≤200ms)",
                "explanation": "Interactions are experiencing significant delays. The main thread is likely blocked by JavaScript execution, preventing responsive user input processing.",
                "fix": "Break up long tasks, defer non-critical JavaScript, reduce inline event handlers, use web workers for heavy computation, and minimize third-party script impact.",
                "impact": "Major — directly affects Core Web Vitals ranking signal",
                "effort": "high",
                "estimated_improvement": f"potential INP reduction to ~{max(50, cwv['inp']['value'] * 0.35):.0f}ms",
            })
        elif cwv["inp"]["status"] == "needs_improvement":
            issues.append({
                "severity": "warning",
                "category": "interactivity",
                "message": f"INP needs improvement at {cwv['inp']['value']:.0f}ms (target: ≤200ms)",
                "explanation": "Some interactions experience moderate delays. Optimizing JavaScript execution can push this into the good range.",
                "fix": "Defer non-critical scripts, use requestIdleCallback for low-priority work, and reduce DOM complexity.",
                "impact": "moderate",
                "effort": "moderate",
                "estimated_improvement": f"potential INP reduction to ~{max(50, cwv['inp']['value'] * 0.5):.0f}ms",
            })

        if images_without_dimensions > 0:
            issues.append({
                "severity": "critical" if images_without_dimensions > 5 else "warning",
                "category": "layout_stability",
                "message": f"{images_without_dimensions} of {image_count} images missing explicit width/height attributes",
                "explanation": "Images without intrinsic dimensions cannot reserve space before loading, causing layout shifts when they render. This is one of the most common causes of high CLS.",
                "fix": "Add width and height attributes to all <img> tags. Use CSS aspect-ratio for responsive images to maintain proportions while preserving layout space.",
                "impact": "significant — each missing dimension contributes to CLS score",
                "effort": "minimal",
                "estimated_improvement": f"CLS reduction of ~{min(0.15, images_without_dimensions * 0.015):.3f}",
            })

        if large_images > 0:
            issues.append({
                "severity": "critical" if large_images > 3 else "warning",
                "category": "resource",
                "message": f"{large_images} images exceed 100KB — largest contentful paint element may be oversized",
                "explanation": "Large image files take longer to download and decode, directly impacting LCP and overall page load time. Unoptimized images are the most common cause of poor page speed.",
                "fix": "Compress images using tools like Sharp, Imagify, or Squoosh. Convert to WebP/AVIF format. Implement responsive images with srcset and sizes attributes.",
                "impact": "significant — image optimization is typically the highest-impact speed improvement",
                "effort": "moderate",
                "estimated_improvement": "40-70% image size reduction achievable",
            })

        if images_without_lazy > 5:
            above_fold = min(4, images_without_lazy)
            below_fold = images_without_lazy - above_fold
            if below_fold > 0:
                issues.append({
                    "severity": "warning",
                    "category": "resource",
                    "message": f"{below_fold} below-the-fold images missing lazy loading",
                    "explanation": "Without lazy loading, all images are downloaded immediately, wasting bandwidth and delaying initial page render. This is especially impactful on image-heavy pages.",
                    "fix": 'Add loading="lazy" to below-the-fold images. Keep above-the-fold hero images eager-loaded for optimal LCP.',
                    "impact": "moderate — reduces initial page weight and improves FCP/LCP",
                    "effort": "minimal",
                    "estimated_improvement": f"~{below_fold * 30:.0f}KB+ bandwidth savings on initial load",
                })

        if script_tags > 15:
            issues.append({
                "severity": "critical",
                "category": "resource",
                "message": f"{script_tags} script tags detected — excessive JavaScript payload",
                "explanation": "A large number of script tags increases parse/compile time, network requests, and main thread blocking. Each script must be downloaded, parsed, compiled, and executed.",
                "fix": "Audit scripts for necessity, bundle where possible, defer non-critical scripts, and eliminate unused code. Consider code splitting and dynamic imports.",
                "impact": "significant — directly impacts FCP, LCP, and INP",
                "effort": "high",
                "estimated_improvement": "20-50% reduction in JS processing time",
            })
        elif script_tags > 8:
            issues.append({
                "severity": "warning",
                "category": "resource",
                "message": f"{script_tags} script tags detected — consider consolidating",
                "explanation": "Multiple separate scripts increase HTTP requests and can cause waterfall loading patterns.",
                "fix": "Consolidate scripts into bundles, use async/defer attributes, and eliminate duplicates.",
                "impact": "moderate",
                "effort": "moderate",
                "estimated_improvement": "10-30% reduction in JS loading time",
            })

        if inline_scripts > 5:
            issues.append({
                "severity": "warning",
                "category": "rendering",
                "message": f"{inline_scripts} inline scripts may be render-blocking",
                "explanation": "Inline scripts without defer/async block HTML parsing and delay first contentful paint. They cannot be cached independently.",
                "fix": "Move inline scripts to external files with async/defer, or wrap non-critical logic in DOMContentLoaded or requestIdleCallback.",
                "impact": "moderate — directly affects FCP",
                "effort": "moderate",
                "estimated_improvement": f"FCP improvement of ~{min(0.5, inline_scripts * 0.08):.1f}s",
            })

        if not has_gzip_header:
            issues.append({
                "severity": "warning",
                "category": "delivery",
                "message": "No compression detected in response",
                "explanation": "Without gzip or Brotli compression, text-based resources (HTML, CSS, JS) are transferred uncompressed, increasing transfer size by 60-80%.",
                "fix": "Enable gzip or Brotli compression on the server (nginx: gzip on; Apache: mod_deflate). Most CDNs support compression by default.",
                "impact": "significant — 60-80% reduction in text resource transfer size",
                "effort": "minimal",
                "estimated_improvement": f"~{(html_size * 0.7 / 1024):.0f}KB savings on HTML alone",
            })

        if not has_preconnect and script_tags > 5:
            issues.append({
                "severity": "warning",
                "category": "resource",
                "message": "No preconnect hints found — connection setup delays third-party resources",
                "explanation": "Preconnect allows the browser to establish early connections to third-party origins (CDNs, analytics, fonts), saving 100-300ms per connection.",
                "fix": "Add <link rel=\"preconnect\" href=\"https://important-third-party.com\"> for critical third-party origins. Use dns-prefetch as a fallback for less critical origins.",
                "impact": "moderate — saves 100-300ms per third-party origin connection",
                "effort": "minimal",
                "estimated_improvement": f"~{min(300, len(third_party_scripts) * 80):.0f}ms connection time savings",
            })

        if external_fonts > 0 and not has_font_display:
            issues.append({
                "severity": "warning",
                "category": "rendering",
                "message": f"{external_fonts} external font(s) loaded without font-display strategy",
                "explanation": "Without font-display, the browser may hide text until fonts load (FOIT), causing a flash of invisible content. This delays visible text and harms FCP/LCP.",
                "fix": "Add font-display: swap (or optional) to @font-face rules. For Google Fonts, append &display=swap to the URL.",
                "impact": "moderate — affects text visibility timing",
                "effort": "minimal",
                "estimated_improvement": "eliminates FOIT, faster text visibility",
            })

        if dom_elements > 2000:
            issues.append({
                "severity": "critical" if dom_elements > 4000 else "warning",
                "category": "dom",
                "message": f"Large DOM detected: ~{dom_elements} elements (target: <1,500)",
                "explanation": "A large DOM increases memory usage, slows style recalculation, and makes layout computations expensive. It also increases the likelihood of deep nesting and layout shifts.",
                "fix": "Break up large pages into smaller components, use virtualization for long lists, remove unused elements, and flatten deeply nested structures.",
                "impact": "significant — affects CLS, INP, and memory usage",
                "effort": "high",
                "estimated_improvement": "40-60% reduction in style/layout computation time",
            })

        if dom_depth > 15:
            issues.append({
                "severity": "warning",
                "category": "dom",
                "message": f"Deep DOM nesting detected: ~{dom_depth} levels deep (target: <10)",
                "explanation": "Deeply nested DOM trees increase selector matching time and layout computation cost. Each level adds overhead to style inheritance and event bubbling.",
                "fix": "Flatten nested structures where possible, use CSS Grid/Flexbox for complex layouts instead of nested divs.",
                "impact": "moderate — increases style/layout computation time",
                "effort": "moderate",
                "estimated_improvement": "reduced selector matching and layout time",
            })

        if third_party_scripts:
            issues.append({
                "severity": "warning",
                "category": "third_party",
                "message": f"{len(third_party_scripts)} third-party scripts detected: {', '.join(third_party_scripts[:5])}",
                "explanation": "Third-party scripts are one of the biggest causes of poor page speed. They execute on the main thread, add network requests, and cannot be easily optimized.",
                "fix": "Audit each third-party script for business necessity. Lazy-load non-critical ones (chat, analytics) after page load. Use a tag manager for controlled loading. Consider self-hosting critical scripts.",
                "impact": "significant — each third-party script can add 100-500ms to load time",
                "effort": "moderate",
                "estimated_improvement": f"removing unnecessary scripts could improve LCP by 0.5-2.0s",
            })

        if response_time > 2000:
            issues.append({
                "severity": "critical",
                "category": "server",
                "message": f"Slow server response: {response_time}ms (target: <800ms)",
                "explanation": "High server response time (TTFB) delays everything downstream — no client-side optimization can fully compensate for a slow server.",
                "fix": "Investigate server-side bottlenecks: database queries, API calls, server configuration, CDN usage. Consider server-side caching, edge computing, or a CDN with origin shielding.",
                "impact": "critical — affects every page load metric",
                "effort": "high",
                "estimated_improvement": f"reducing to 500ms could improve LCP by ~{(response_time - 500) / 1000:.1f}s",
            })
        elif response_time > 1000:
            issues.append({
                "severity": "warning",
                "category": "server",
                "message": f"Server response time is {response_time}ms (target: <800ms)",
                "explanation": "Server response time is above the recommended threshold, which delays initial page rendering.",
                "fix": "Implement server-side caching, optimize database queries, and consider using a CDN for static and dynamic content.",
                "impact": "moderate — affects TTFB and all downstream metrics",
                "effort": "moderate",
                "estimated_improvement": f"optimization could reduce TTFB by ~{max(0, response_time - 500)}ms",
            })

        if html_size > 300000:
            issues.append({
                "severity": "critical",
                "category": "resource",
                "message": f"HTML document is very large: {html_size / 1024:.0f}KB (target: <100KB)",
                "explanation": "A large HTML document takes longer to download, parse, and render. It may contain unnecessary inline content, large data structures, or bloated markup.",
                "fix": "Remove inline data, minify HTML, use server-side rendering judiciously, and move non-critical content to async-loaded sections.",
                "impact": "significant — affects FCP, LCP, and total transfer size",
                "effort": "moderate",
                "estimated_improvement": f"reducing to ~100KB saves ~{(html_size - 100000) / 1024:.0f}KB",
            })
        elif html_size > 150000:
            issues.append({
                "severity": "warning",
                "category": "resource",
                "message": f"HTML document is large: {html_size / 1024:.0f}KB (target: <100KB)",
                "explanation": "The HTML document is larger than recommended, which increases download and parse time.",
                "fix": "Review HTML for unnecessary content, minify, and consider lazy-loading below-the-fold content.",
                "impact": "moderate",
                "effort": "moderate",
                "estimated_improvement": f"potential savings of ~{(html_size - 100000) / 1024:.0f}KB",
            })

        if word_count > 10000:
            issues.append({
                "severity": "warning",
                "category": "content",
                "message": f"Heavy content: {word_count:,} words — consider content splitting",
                "explanation": "Very long pages take longer to render and may overwhelm users. Search engines may also have difficulty determining primary topic focus.",
                "fix": "Consider splitting into multiple pages with clear topical focus, or use progressive loading for below-the-fold content.",
                "impact": "moderate — affects render time and potentially SEO",
                "effort": "moderate",
                "estimated_improvement": "improved perceived performance and content focus",
            })

        if response_time <= 0:
            issues.append({
                "severity": "info",
                "category": "data",
                "message": "No response time data available",
                "explanation": "Could not measure server response time. Some CWV estimates may be less accurate without this data.",
                "fix": "Ensure response_time_ms is captured during crawling or page analysis.",
                "impact": "none — informational only",
                "effort": "none",
                "estimated_improvement": "N/A",
            })

        issues.sort(key=lambda x: {"critical": 0, "warning": 1, "info": 2}.get(x["severity"], 3))
        return issues

    def _analyze_resources(
        self,
        html_size: int,
        images: list,
        total_image_kb: int,
        image_count: int,
        script_tags: int,
        external_scripts: int,
        inline_scripts: int,
        style_tags: int,
        external_fonts: int,
        word_count: int,
    ) -> dict:
        est_scripts_kb = max(10, script_tags * 15 + inline_scripts * 8)
        est_styles_kb = max(5, style_tags * 12)
        est_fonts_kb = external_fonts * 40
        total_kb = (html_size / 1024) + total_image_kb + est_scripts_kb + est_styles_kb + est_fonts_kb

        def _fmt(kb: float) -> str:
            if kb >= 1024:
                return f"{kb / 1024:.1f}MB"
            return f"{kb:.0f}KB"

        img_rec = "optimize and compress images" if image_count > 0 else "no images detected"
        if large_count := sum(1 for img in images if self._safe_int(img.get("size_kb", 0)) > 100):
            img_rec = f"{large_count} images over 100KB need compression; convert to WebP/AVIF"

        script_rec = "consolidate and defer non-critical scripts"
        if external_scripts > 10:
            script_rec = f"{external_scripts} external scripts — audit for necessity, bundle and defer"
        elif script_tags > 8:
            script_rec = f"{script_tags} scripts total — consolidate bundles and use async/defer"

        style_rec = "minify and criticalize CSS"
        if style_tags > 8:
            style_rec = f"{style_tags} style elements — extract critical CSS inline and defer the rest"

        font_rec = "use font-display: swap and subset fonts"
        if external_fonts > 3:
            font_rec = f"{external_fonts} external font files — subset, self-host, and use font-display: swap"

        return {
            "estimated_page_weight": _fmt(total_kb),
            "images": {
                "count": image_count,
                "estimated_size": _fmt(total_image_kb),
                "recommendation": img_rec,
            },
            "scripts": {
                "count": script_tags,
                "estimated_size": _fmt(est_scripts_kb),
                "recommendation": script_rec,
            },
            "styles": {
                "estimated_size": _fmt(est_styles_kb),
                "recommendation": style_rec,
            },
            "fonts": {
                "recommendation": font_rec,
            },
        }

    def _analyze_third_party(self, third_party_scripts: list[str]) -> list[dict]:
        impacts = {
            "Google Analytics / GA4": ("moderate", "load asynchronously with sendBeque after page load"),
            "Google Tag Manager": ("moderate", "ensure gtm.js loads async; defer tag execution"),
            "Facebook Pixel": ("moderate", "load after page idle using requestIdleCallback"),
            "Hotjar": ("moderate", "lazy-load on user interaction or after page load"),
            "Intercom": ("high", "lazy-load on intent signals (scroll, time on page)"),
            "Zendesk Chat": ("moderate", "load only on support-focused pages"),
            "HubSpot": ("moderate", "defer non-essential HubSpot tracking scripts"),
            "Segment": ("moderate", "ensure client-side tracking is deferred"),
            "Clarity": ("low-moderate", "load asynchronously after page content"),
            "Tawk.to": ("moderate", "lazy-load chat widget after page load"),
            "Crisp": ("low-moderate", "defer chat initialization"),
            "Drift": ("moderate", "lazy-load after user engagement signals"),
            "Adobe Analytics": ("high", "defer and bundle with other analytics"),
            "Mixpanel": ("moderate", "defer event tracking to after page load"),
            "Stripe": ("low", "load only on payment pages"),
            "reCAPTCHA": ("moderate", "use invisible reCAPTCHA, load on form focus"),
            "YouTube Embed": ("high", "use lite-youtube-embed or facade with preview image"),
            "Vimeo Embed": ("high", "use lite-vimeo-embed or facade with preview image"),
            "Twitter/X Widget": ("moderate", "use platform.js lazy loading"),
            "LinkedIn Insight": ("low-moderate", "load after page idle"),
            "Pinterest Tag": ("low-moderate", "defer to after page load"),
            "TikTok Pixel": ("low-moderate", "defer to after page load"),
            "Cloudflare": ("low", "typically infrastructure — minimal client-side impact"),
            "New Relic": ("moderate", "monitor main thread impact, consider sampling rate reduction"),
            "Sentry": ("low-moderate", "ensure error monitoring doesn't block main thread"),
            "DataDog": ("moderate", "monitor RUM overhead, reduce sample rate if needed"),
            "Optimizely": ("high", "defer experiment activation until after page load"),
            "VWO": ("moderate", "defer A/B testing scripts"),
            "Cookie Consent": ("low-moderate", "render non-blocking, defer to after first paint"),
        }

        results = []
        for script in third_party_scripts:
            impact, rec = impacts.get(script, ("moderate", "evaluate necessity and defer if possible"))
            results.append({
                "script": script,
                "estimated_impact": impact,
                "recommendation": rec,
            })
        return results

    def _build_optimization_plan(self, issues: list[dict], cwv: dict) -> list[dict]:
        plan = []

        critical = [i for i in issues if i["severity"] == "critical"]
        warnings = [i for i in issues if i["severity"] == "warning"]

        priority_map = {
            0: "P0-critical",
            1: "P1-high",
            2: "P2-medium",
            3: "P3-low",
        }

        for idx, issue in enumerate(critical):
            priority = priority_map.get(min(idx, 3), "P3-low")
            plan.append({
                "recommendation": issue["fix"],
                "priority": priority,
                "impact": issue["impact"],
                "effort": issue["effort"],
                "estimated_improvement": issue["estimated_improvement"],
                "confidence": 0.85 if "LCP" in issue.get("message", "") or "CLS" in issue.get("message", "") or "INP" in issue.get("message", "") else 0.7,
                "time": self._estimate_time(issue["effort"]),
            })

        for idx, issue in enumerate(warnings):
            priority = priority_map.get(min(idx + len(critical), 3), "P3-low")
            plan.append({
                "recommendation": issue["fix"],
                "priority": priority,
                "impact": issue["impact"],
                "effort": issue["effort"],
                "estimated_improvement": issue["estimated_improvement"],
                "confidence": 0.7 if "LCP" in issue.get("message", "") or "CLS" in issue.get("message", "") else 0.6,
                "time": self._estimate_time(issue["effort"]),
            })

        return plan

    def _estimate_time(self, effort: str) -> str:
        times = {
            "minimal": "15-30 minutes",
            "low": "30-60 minutes",
            "moderate": "2-4 hours",
            "high": "1-3 days",
            "none": "N/A",
        }
        return times.get(effort, "unknown")

    def _calculate_score(
        self,
        cwv: dict,
        issues: list[dict],
        html_size: int,
        word_count: int,
        response_time: int,
    ) -> float:
        score = 100.0

        lcp = cwv["lcp"]["value"]
        if lcp <= 2.5:
            score -= 0
        elif lcp <= 4.0:
            score -= (lcp - 2.5) * 8
        else:
            score -= 12 + (lcp - 4.0) * 5

        cls = cwv["cls"]["value"]
        if cls <= 0.1:
            score -= 0
        elif cls <= 0.25:
            score -= (cls - 0.1) * 40
        else:
            score -= 6 + (cls - 0.25) * 20

        inp = cwv["inp"]["value"]
        if inp <= 200:
            score -= 0
        elif inp <= 500:
            score -= (inp - 200) * 0.05
        else:
            score -= 15 + (inp - 500) * 0.02

        fcp = cwv["fcp"]["value"]
        if fcp <= 1.8:
            score -= 0
        elif fcp <= 3.0:
            score -= (fcp - 1.8) * 5
        else:
            score -= 6 + (fcp - 3.0) * 3

        ttfb = cwv["ttfb"]["value"]
        if ttfb <= 800:
            score -= 0
        elif ttfb <= 1800:
            score -= (ttfb - 800) * 0.005
        else:
            score -= 5 + (ttfb - 1800) * 0.002

        critical_count = sum(1 for i in issues if i["severity"] == "critical")
        warning_count = sum(1 for i in issues if i["severity"] == "warning")
        score -= critical_count * 3
        score -= warning_count * 1

        if html_size > 300000:
            score -= 5
        elif html_size > 150000:
            score -= 2

        if response_time > 2000:
            score -= 5
        elif response_time > 1000:
            score -= 2

        score = max(0.0, min(100.0, score))
        return score

    def _mobile_estimate(self, cwv: dict) -> dict:
        lcp_mult = 1.4
        cls_mult = 1.1
        inp_mult = 1.3
        return {
            "lcp": round(cwv["lcp"]["value"] * lcp_mult, 2),
            "cls": round(min(cwv["cls"]["value"] * cls_mult, 0.5), 3),
            "inp": round(cwv["inp"]["value"] * inp_mult, 0),
        }

    def _desktop_estimate(self, cwv: dict) -> dict:
        lcp_mult = 0.85
        cls_mult = 0.95
        inp_mult = 0.9
        return {
            "lcp": round(cwv["lcp"]["value"] * lcp_mult, 2),
            "cls": round(max(0, cwv["cls"]["value"] * cls_mult), 3),
            "inp": round(cwv["inp"]["value"] * inp_mult, 0),
        }

    def _score_predictions(self, current: float, issues: list[dict]) -> dict:
        critical = [i for i in issues if i["severity"] == "critical"]
        all_impact = [i for i in issues if i["severity"] in ("critical", "warning")]

        critical_gain = min(30, len(critical) * 5)
        all_gain = min(45, len(all_impact) * 3)

        after_critical = min(100.0, current + critical_gain)
        after_all = min(100.0, current + all_gain)

        return {
            "current": round(current, 1),
            "after_critical": round(after_critical, 1),
            "after_all": round(after_all, 1),
        }

    def _compare_pages(self, all_pages: list[dict]) -> list[dict]:
        results = []
        for p in all_pages:
            url = p.get("url", "")
            html_raw = p.get("html_raw", "") or ""
            response_time = self._safe_int(p.get("response_time_ms", 0))
            word_count = p.get("word_count", 0) or 0
            images = p.get("images", []) or []
            links_internal = p.get("links_internal", []) or []
            links_external = p.get("links_external", []) or []
            title = p.get("title", "") or ""

            html_size = len(html_raw.encode("utf-8", errors="replace"))
            script_tags = self._count_pattern(html_raw, r"<script[\s>]")
            inline_scripts = self._count_pattern(html_raw, r"<script[^>]*>[^<]")
            external_scripts = script_tags - inline_scripts
            style_tags = self._count_pattern(html_raw, r"<style[\s>]|<link[^>]*stylesheet")
            image_count = len(images)
            images_without_dimensions = sum(
                1 for img in images if not img.get("width") and not img.get("height")
            )
            has_async_scripts = self._count_pattern(html_raw, r"<script[^>]*\basync\b")
            has_defer_scripts = self._count_pattern(html_raw, r"<script[^>]*\bdefer\b")
            has_preconnect = bool(re.search(r"preconnect", html_raw, re.I))
            total_image_kb = sum(self._safe_int(img.get("size_kb", 0)) for img in images)
            dom_elements = self._estimate_dom_elements(html_raw)
            event_handlers = self._count_pattern(html_raw, r"on(click|mouse|key|touch|focus|blur|input|change|submit|scroll|resize)\s*=")

            cwv = self._estimate_cwv(
                html_size=html_size,
                response_time=response_time,
                image_count=image_count,
                images_without_dimensions=images_without_dimensions,
                script_tags=script_tags,
                inline_scripts=inline_scripts,
                event_handlers=event_handlers,
                style_tags=style_tags,
                has_async_scripts=has_async_scripts,
                has_defer_scripts=has_defer_scripts,
                word_count=word_count,
                dom_elements=dom_elements,
                has_preconnect=has_preconnect,
                total_image_kb=total_image_kb,
            )

            issues = self._detect_issues(
                html_raw=html_raw,
                html_size=html_size,
                images=images,
                image_count=image_count,
                images_without_dimensions=images_without_dimensions,
                images_without_lazy=0,
                large_images=0,
                script_tags=script_tags,
                inline_scripts=inline_scripts,
                external_scripts=external_scripts,
                has_gzip_header=False,
                has_preconnect=has_preconnect,
                has_preload=False,
                has_dns_prefetch=False,
                has_font_display=False,
                external_fonts=0,
                has_viewport=bool(re.search(r'<meta[^>]*name=["\']viewport["\']', html_raw, re.I)),
                dom_depth=self._estimate_dom_depth(html_raw),
                dom_elements=dom_elements,
                third_party_scripts=self._detect_third_party(html_raw),
                style_tags=style_tags,
                cwv=cwv,
                response_time=response_time,
                event_handlers=event_handlers,
                word_count=word_count,
            )

            score = self._calculate_score(cwv, issues, html_size, word_count, response_time)

            results.append({
                "url": url,
                "score": round(score, 1),
                "lcp": cwv["lcp"]["value"],
                "response_time": response_time,
            })

        results.sort(key=lambda x: x["score"])
        return results
