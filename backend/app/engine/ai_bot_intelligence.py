from __future__ import annotations

import re
from urllib.parse import urlparse, urljoin


AI_BOT_NAMES = {
    "gptbot": "GPTBot",
    "chatgpt_user": "ChatGPT-User",
    "claudebot": "ClaudeBot",
    "anthropic_ai": "anthropic-ai",
    "perplexitybot": "PerplexityBot",
    "google_extended": "Google-Extended",
    "ccbot": "CCBot",
    "amazonbot": "AmazonBot",
    "applebot": "Applebot",
    "bingbot": "Bingbot",
    "meta_external_agent": "Meta-ExternalAgent",
    "tiktok_bot": "Bytespider",
    "youbot": "YouBot",
    "facebookbot": "FacebookBot",
    "diffbot": "Diffbot",
    "omgili": "omgili",
    "ia_archiver": "ia_archiver",
}

TRADITIONAL_BOTS = [
    "Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider",
    "YandexBot", "Sogou", "Exabot", "facebot", "archive.org_bot",
]

_REC_GUIDES = {
    "Create a robots.txt with explicit AI bot rules": {
        "what": "Add a robots.txt file that explicitly tells each AI crawler which areas it may crawl and which it must avoid.",
        "how": [
            "Create a file named robots.txt and place it in the web server document root so it is served at the domain root.",
            "Add one User-agent group per AI crawler you control (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended).",
            "Set 'Allow: /' for public content and 'Disallow:' for sensitive paths like /search, /admin, /user-account, /cart.",
            "Append a 'Sitemap:' line pointing to your sitemap so AI crawlers discover all indexable pages.",
            "Verify the file loads at /robots.txt and test every rule with a robots.txt tester before shipping.",
        ],
        "where": "Web server document root",
        "which_page": "/robots.txt (domain root)",
        "ai_suggestion": "Give every AI crawler an explicit group: 'User-agent: GPTBot' then 'Allow: /', 'Disallow: /search /admin /user-account'. Keep the homepage, /about, blog and /llms.txt Allow-all so Gemini, ChatGPT, Claude and Perplexity can ingest them. AI crawlers respect Disallow, so never block the pages you want to be cited.",
    },
    "Create /llms.txt with site summary and key pages": {
        "what": "Publish an llms.txt file that gives AI crawlers a short, machine-readable summary of your site plus links to the most important pages.",
        "how": [
            "Create a plain-text file named llms.txt and serve it at the domain root (no framework routing needed — static file).",
            "Line 1: the site title. Line 2: a 2-3 sentence summary of what the site is and who it serves.",
            "Then list key pages in 'Markdown URL' format, one per line, starting with homepage, about, product/service pages, top 5 blog posts.",
            "Prefer stable, descriptive URLs and short titles so the file stays under ~20 lines for top discoverability.",
            "Re-deploy or push the file, then fetch /llms.txt to confirm it renders as plain text.",
        ],
        "where": "Domain root (static file)",
        "which_page": "/llms.txt",
        "ai_suggestion": "Your llms.txt should read like an elevator pitch an AI can quote: '# [Site name]', a summary sentence, then '## Key pages' with 5-10 links using the exact page titles. This is the first file many AI crawlers read, so put your strongest, most citable pages at the top.",
    },
    "Create /llms-full.txt with full content dump for AI consumption": {
        "what": "Publish llms-full.txt containing the full text of your key pages so AI crawlers can ingest complete content in one fetch.",
        "how": [
            "Generate a concatenated plain-text dump of your top pages: title, meta description, H1, and body text per page.",
            "Separate each page with a clear '## [Page Title]' header and include the canonical URL.",
            "Start with the highest-value pages (homepage, services, cornerstone blog posts) before lower-value ones.",
            "Keep the file under 5-10MB by including full text only for pages worth citing.",
            "Auto-regenerate it on every deploy so it never goes stale.",
        ],
        "where": "Domain root (static file)",
        "which_page": "/llms-full.txt",
        "ai_suggestion": "Think of llms-full.txt as the AI version of your sitemap: every page header plus its full text. AIs cite what they can read in one request, so your best-performing content should appear verbatim near the top of the file.",
    },
    "Add /humans.txt with team and project info": {
        "what": "Publish humans.txt crediting the people and teams behind the site to reinforce E-E-A-T signals for AI systems.",
        "how": [
            "Create a plain-text humans.txt at the domain root listing the team, roles, and contact.",
            "Add a short 'Team' section with names and roles, and an 'Acknowledgements' section if you have contributors.",
            "Cross-link it from robots.txt with a 'Human: /humans.txt' line.",
            "Keep it honest and current — outdated team info hurts trust.",
        ],
        "where": "Domain root (static file)",
        "which_page": "/humans.txt",
        "ai_suggestion": "AI systems weigh named humans as an authority signal. Include real team names, titles and a contact email — it tells Gemini and ChatGPT that a person with expertise is behind the content, which improves your E-E-A-T for citation.",
    },
    "Add an RSS/Atom feed at /feed.xml for content discovery": {
        "what": "Publish an RSS/Atom feed so AI crawlers and readers can detect new content the moment it is published.",
        "how": [
            "Generate /feed.xml from your CMS or build step, listing the latest posts with title, link, description, and publish date.",
            "Include <lastBuildDate> and <updated> timestamps so crawlers know when the feed changes.",
            "Add the feed link to your <head> with <link rel=\"alternate\" type=\"application/rss+xml\">.",
            "Expose it in robots.txt and/or sitemap so AI crawlers discover it.",
        ],
        "where": "Domain root (generated file)",
        "which_page": "/feed.xml",
        "ai_suggestion": "A fresh feed is a freshness signal. Publishing to the feed every time you post new content makes it easier for AI systems to re-crawl and re-cite your newest material instead of stale pages.",
    },
    "Add JSON-LD structured data (Organization, Article, FAQ, etc.)": {
        "what": "Add JSON-LD structured data so AI systems can reliably extract who you are and what each page means.",
        "how": [
            "Add Organization schema to the homepage with name, url, logo, sameAs (LinkedIn, X, GitHub) and contactPoint.",
            "Add Article/BlogPosting schema to blog posts with headline, author, datePublished, dateModified, and image.",
            "Add FAQPage schema wherever you already answer common questions.",
            "Add BreadcrumbList on category pages and Product/Service schema on the pages that sell them.",
            "Validate every schema with the Rich Results Test before deploying.",
        ],
        "where": "Inside each page's <head> or as JSON-LD script tags",
        "which_page": "Homepage + every article/service/product page",
        "ai_suggestion": "The homepage Organization schema is your identity card — it ties your brand, logo and social profiles together with sameAs links so AI systems resolve you as one entity. Article schema with a named author and dates tells AI your content is attributable and fresh.",
    },
    "Add FAQ sections with FAQPage schema where appropriate": {
        "what": "Add FAQ sections with FAQPage schema so AI assistants can extract ready-made Q&A answers.",
        "how": [
            "Collect the 4-8 most common questions your customers ask about this topic.",
            "Answer each question in 1-2 plain, factual sentences directly under the question.",
            "Wrap the section in FAQPage JSON-LD matching the visible on-page questions exactly.",
            "Only mark up content that is actually visible on the page — hidden FAQ markup is a penalty risk.",
        ],
        "where": "Bottom or middle of relevant content pages",
        "which_page": "This page and all service/product/blog pages with common questions",
        "ai_suggestion": "FAQPage is the single best structured-data shortcut to AI citations — ChatGPT, Perplexity and Google's AI Overview all pull directly from it. Match the schema questions to the visible headings so the answer is extractable verbatim.",
    },
    "Include clear definitions for key terms (using <dl> or structured patterns)": {
        "what": "Add definition blocks for key industry terms so AI models can extract clean definitions.",
        "how": [
            "Identify 3-6 key terms a reader must understand before the rest of the page makes sense.",
            "For each term add a definition sentence in a <dt>/<dd> pair, or a heading + one-sentence definition below it.",
            "Place definitions near the top of the page or where the term is first used.",
            "Keep definitions 1-2 sentences and start with the term itself ('[Term] is a ...') so they read like dictionary entries.",
        ],
        "where": "Top of page content, in <dl> lists or H3 + paragraph pairs",
        "which_page": "This page, especially for technical or industry-specific terms",
        "ai_suggestion": "AI models extract definitions from 'X is a ...' patterns. Write each definition as a standalone dictionary-style sentence under its own heading — that structure is what RAG pipelines pick out when building answers.",
    },
    "Reduce crawl-delay restrictions or disallow rules for key AI bots": {
        "what": "Loosen crawl-delay and disallow rules that keep AI crawlers from indexing your content.",
        "how": [
            "List which AI bots score below 30 and why (crawl-delay, disallow, block in robots.txt).",
            "For each, decide if the restricted path actually needs protection; if not, add 'Allow: /' and remove the delay.",
            "Keep protection only for genuinely private areas (/admin, /cart, /user-account).",
            "Re-test the robots.txt and confirm the bots' estimated accessible pages rises.",
        ],
        "where": "robots.txt rules",
        "which_page": "/robots.txt (rules affecting the low-scoring bots)",
        "ai_suggestion": "If GPTBot or ClaudeBot can only see a fraction of your site, you are invisible to ChatGPT and Claude citations. Allow your public content to every AI crawler and reserve disallows exclusively for private, non-indexable paths.",
    },
}


def _enrich_rec(rec: dict, url: str) -> dict:
    """Attach concrete how/what/where guidance + an AI suggestion to a recommendation."""
    guide = _REC_GUIDES.get(rec.get("recommendation", ""), {})
    page_path = urlparse(url).path or "/"
    rec["what"] = guide.get("what", rec.get("recommendation", "").rstrip(".") + ".")
    rec["how"] = guide.get("how", [f"Set up {rec.get('recommendation','').lower().rstrip('.')} on {page_path}."])
    rec["where"] = guide.get("where", "On-page")
    rec["which_page"] = guide.get("which_page", page_path)
    rec["ai_suggestion"] = guide.get(
        "ai_suggestion",
        "Apply this fix on the most important pages first (homepage, services, top blog posts) and re-run the audit to confirm the improvement.",
    )
    return rec


class AiBotIntelligenceEngine:
    """Engine 10: AI Bot Intelligence — evaluates how accessible a website
    is to AI crawlers and machine-readable content standards."""

    def analyze(self, page: dict, all_pages: list = None) -> dict:
        robots_raw = page.get("robots_txt", "") or ""
        url = page.get("url", "")
        html_raw = page.get("html_raw", "") or ""
        meta_tags = page.get("meta_tags", {}) or {}
        headers = page.get("headers", {}) or {}
        links_internal = page.get("links_internal", []) or []
        links_external = page.get("links_external", []) or []
        sitemap_urls = page.get("sitemap_urls", []) or []
        linked_files = page.get("linked_files", {}) or {}

        if all_pages is None:
            all_pages = [page]

        robots_analysis = self._analyze_robots_txt(robots_raw, sitemap_urls)
        bot_accessibility = self._score_bot_accessibility(
            robots_analysis, url, len(all_pages), links_internal
        )
        machine_readability = self._check_machine_readability(
            url, links_external, linked_files
        )
        content_opt = self._analyze_content_for_ai(html_raw, meta_tags)
        issues, recommendations = self._build_issues_and_recommendations(
            robots_analysis, bot_accessibility, machine_readability, content_opt, url
        )

        ai_score = self._compute_overall_score(
            robots_analysis, bot_accessibility, machine_readability, content_opt
        )

        estimated = self._estimate_scores(ai_score, issues, recommendations)

        return {
            "overall_ai_accessibility_score": round(ai_score, 1),
            "robots_txt_analysis": robots_analysis,
            "bot_accessibility": bot_accessibility,
            "machine_readability": machine_readability,
            "content_optimization_for_ai": content_opt,
            "issues": issues,
            "recommendations": recommendations,
            "estimated_scores": estimated,
        }

    # ------------------------------------------------------------------
    # Robots.txt
    # ------------------------------------------------------------------

    def _analyze_robots_txt(self, raw: str, sitemap_urls: list) -> dict:
        if not raw or not raw.strip():
            return {
                "exists": bool(raw),
                "valid": True,
                "ai_bots_allowed": [],
                "ai_bots_blocked": [],
                "traditional_bots": [],
                "total_disallow_rules": 0,
                "has_sitemap_reference": False,
                "issues": [{"severity": "warning", "message": "No robots.txt found",
                            "fix": "Create a robots.txt at the root of the domain",
                            "impact": "Per RFC 9309, all crawlers (including GPTBot, ClaudeBot, PerplexityBot) default to allowed. This means your content is crawlable, but you have no control to block or throttle specific AI bots."}],
            }

        lines = raw.strip().splitlines()
        sections = self._parse_robots_sections(lines)

        ai_allowed = []
        ai_blocked = []
        traditional = []
        total_disallow = 0
        has_sitemap_ref = False
        issues = []

        sitemap_urls_lower = [s.lower() for s in sitemap_urls] if sitemap_urls else []

        for section in sections:
            agent_header = section.get("user_agent", "")
            disallowed = section.get("disallow", [])
            crawl_delay = section.get("crawl_delay")
            total_disallow += len(disallowed)

            sitemap_directives = section.get("sitemap", [])
            for s in sitemap_directives:
                if s.lower() in sitemap_urls_lower or any(s.lower() in sl for sl in sitemap_urls_lower):
                    has_sitemap_ref = True

            matched_ai = self._match_ai_bot(agent_header)
            matched_trad = self._match_traditional_bot(agent_header)

            if matched_ai:
                bot_key = matched_ai
                allowed = len(disallowed) == 0
                entry = {
                    "bot": AI_BOT_NAMES.get(bot_key, agent_header),
                    "allowed": allowed,
                    "crawl_delay": crawl_delay,
                    "disallowed_paths": disallowed,
                }
                if allowed:
                    ai_allowed.append(entry)
                else:
                    ai_blocked.append(entry)

            if matched_trad:
                traditional.append({
                    "bot": matched_trad,
                    "allowed": len(disallowed) == 0,
                    "crawl_delay": crawl_delay,
                    "disallowed_paths": disallowed,
                })

        if not ai_allowed and not ai_blocked:
            issues.append({
                "severity": "warning",
                "message": "No explicit AI bot rules found in robots.txt",
                "fix": "Add explicit User-agent rules for GPTBot, ClaudeBot, PerplexityBot, etc.",
                "impact": "AI bots fall back to wildcard or no rules, which may allow unrestricted crawling",
            })

        if not has_sitemap_ref:
            issues.append({
                "severity": "info",
                "message": "No Sitemap directive found in robots.txt",
                "fix": "Add 'Sitemap: <url>' directives to help crawlers discover pages",
                "impact": "Crawlers may miss pages not reachable via link traversal",
            })

        try:
            from urllib.robotparser import RobotFileParser
            rp = RobotFileParser()
            rp.parse(raw.splitlines())
        except Exception:
            issues.append({
                "severity": "warning",
                "message": "robots.txt may contain syntax errors",
                "fix": "Validate robots.txt syntax",
                "impact": "Bots may misinterpret rules",
            })

        return {
            "exists": True,
            "valid": len(issues) == 0,
            "ai_bots_allowed": ai_allowed,
            "ai_bots_blocked": ai_blocked,
            "traditional_bots": traditional,
            "total_disallow_rules": total_disallow,
            "has_sitemap_reference": has_sitemap_ref,
            "issues": issues,
        }

    def _parse_robots_sections(self, lines: list) -> list:
        sections: list[dict] = []
        current: dict = {"user_agent": "", "disallow": [], "allow": [],
                         "crawl_delay": None, "sitemap": []}

        for raw_line in lines:
            line = raw_line.split("#", 1)[0].strip()
            if not line:
                continue
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            key = key.strip().lower()
            value = value.strip()

            if key == "user-agent":
                if current["user_agent"]:
                    sections.append(current)
                current = {"user_agent": value, "disallow": [], "allow": [],
                           "crawl_delay": None, "sitemap": []}
            elif key == "disallow" and value:
                current["disallow"].append(value)
            elif key == "allow" and value:
                current["allow"].append(value)
            elif key == "crawl-delay":
                try:
                    current["crawl_delay"] = float(value)
                except ValueError:
                    pass
            elif key == "sitemap":
                current["sitemap"].append(value)

        if current["user_agent"]:
            sections.append(current)
        return sections

    def _match_ai_bot(self, agent_header: str) -> str | None:
        lower = agent_header.lower()
        for key, canonical in AI_BOT_NAMES.items():
            if key in lower or canonical.lower() in lower:
                return key
        return None

    def _match_traditional_bot(self, agent_header: str) -> str | None:
        lower = agent_header.lower()
        for bot in TRADITIONAL_BOTS:
            if bot.lower() in lower:
                return bot
        return None

    # ------------------------------------------------------------------
    # Per-bot accessibility
    # ------------------------------------------------------------------

    def _score_bot_accessibility(self, robots: dict, url: str,
                                  total_pages: int, internal_links: list) -> dict:
        result = {}
        for key, canonical in AI_BOT_NAMES.items():
            allowed_entry = None
            for entry in robots.get("ai_bots_allowed", []):
                if entry["bot"] == canonical:
                    allowed_entry = entry
                    break
            blocked_entry = None
            for entry in robots.get("ai_bots_blocked", []):
                if entry["bot"] == canonical:
                    blocked_entry = entry
                    break

            if allowed_entry is not None:
                allowed = True
                delay = allowed_entry.get("crawl_delay")
                disallowed = allowed_entry.get("disallowed_paths", [])
            elif blocked_entry is not None:
                allowed = False
                delay = blocked_entry.get("crawl_delay")
                disallowed = blocked_entry.get("disallowed_paths", [])
            else:
                allowed = True
                delay = None
                disallowed = []

            score = self._bot_score(allowed, delay, disallowed, total_pages)
            est_pages = self._estimate_accessible_pages(
                allowed, disallowed, total_pages, len(internal_links)
            )
            notes = self._bot_notes(allowed, delay, disallowed, canonical)

            result[key] = {
                "allowed": allowed,
                "score": round(score, 1),
                "estimated_pages_accessible": est_pages,
                "notes": notes,
            }
        return result

    def _bot_score(self, allowed: bool, delay, disallowed: list,
                   total_pages: int) -> float:
        if not allowed:
            return 0.0
        score = 60.0
        if delay is None:
            score += 20.0
        elif delay <= 1.0:
            score += 15.0
        elif delay <= 5.0:
            score += 10.0
        else:
            score += 5.0

        if total_pages > 0:
            ratio = len(disallowed) / max(total_pages, 1)
            score -= ratio * 40.0
        return max(0.0, min(100.0, score))

    def _estimate_accessible_pages(self, allowed: bool, disallowed: list,
                                    total_pages: int, internal_count: int) -> int:
        if not allowed:
            return 0
        total = max(total_pages, 1)
        blocked_paths = set(d.strip("/") for d in disallowed if d.strip("/"))
        if not blocked_paths:
            return total
        penalty = min(len(blocked_paths) * 0.05, 0.5)
        return max(0, int(total * (1.0 - penalty)))

    def _bot_notes(self, allowed: bool, delay, disallowed: list,
                   canonical: str) -> str:
        parts: list[str] = []
        if allowed:
            parts.append(f"{canonical} is allowed")
        else:
            parts.append(f"{canonical} is blocked by robots.txt")
        if delay is not None:
            parts.append(f"crawl-delay: {delay}s")
        if disallowed:
            parts.append(f"{len(disallowed)} disallowed path(s)")
        return "; ".join(parts)

    # ------------------------------------------------------------------
    # Machine readability
    # ------------------------------------------------------------------

    def _check_machine_readability(self, url: str, links_external: list,
                                    linked_files: dict) -> dict:
        base = self._get_base_url(url)
        file_checks = {
            "llms_txt": "/llms.txt",
            "llms_full_txt": "/llms-full.txt",
            "pricing_md": "/pricing.md",
            "docs": "/docs",
            "api_docs": "/api-docs",
            "changelog": "/changelog",
            "feed_xml": "/feed.xml",
            "humans_txt": "/humans.txt",
            "security_txt": "/.well-known/security.txt",
            "ads_txt": "/ads.txt",
        }

        links_lower = [l.lower() if isinstance(l, str) else "" for l in links_external]

        result: dict = {}
        for key, path in file_checks.items():
            expected_url = base.rstrip("/") + path
            exists = False

            if linked_files and key in linked_files:
                exists = bool(linked_files[key])
            else:
                for link in links_lower:
                    if path.lower() in link:
                        exists = True
                        break

            result[key] = {
                "exists": exists,
                "url": expected_url,
                "score": 100.0 if exists else 0.0,
            }

        scores = [v["score"] for v in result.values()]
        overall = sum(scores) / max(len(scores), 1) if scores else 0.0
        result["overall_readability_score"] = round(overall, 1)
        return result

    def _get_base_url(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            return url

    # ------------------------------------------------------------------
    # Content optimization for AI
    # ------------------------------------------------------------------

    def _analyze_content_for_ai(self, html_raw: str, meta_tags: dict) -> dict:
        if not html_raw:
            return {
                "has_definitions": False,
                "has_faq": False,
                "has_structured_data": False,
                "has_clear_headings": False,
                "content_length_adequate": False,
                "extraction_score": 0.0,
            }

        lower = html_raw.lower()

        has_definitions = bool(
            re.search(r"<(dl|dt|dd)\b", html_raw)
            or re.search(r'class=["\'].*?(definition|glossar).*?["\']', lower)
            or re.search(r"<strong>\s*\w+\s*</strong>\s*[:\-–—]", html_raw, re.IGNORECASE)
        )

        has_faq = bool(
            re.search(r'itemtype=["\'].*?FAQPage.*?["\']', lower)
            or re.search(r'class=["\'].*?faq.*?["\']', lower)
            or re.search(r'<h[23][^>]*>\s*(frequently asked|faq)\s*</h[23]>', lower)
            or re.search(r'aria-label=["\'].*?faq.*?["\']', lower)
        )

        has_structured_data = bool(
            re.search(r'application/ld\+json', lower)
            or re.search(r'itemtype=["\']https?://schema\.org', lower)
        )

        headings = re.findall(r"<h([1-6])[^>]*>", html_raw, re.IGNORECASE)
        has_clear_headings = len(headings) >= 2

        text_only = re.sub(r"<[^>]+>", " ", html_raw)
        text_only = re.sub(r"\s+", " ", text_only).strip()
        content_length_adequate = len(text_only) >= 300

        score = 0.0
        if has_definitions:
            score += 20.0
        if has_faq:
            score += 20.0
        if has_structured_data:
            score += 25.0
        if has_clear_headings:
            score += 15.0
        if content_length_adequate:
            score += 20.0

        return {
            "has_definitions": has_definitions,
            "has_faq": has_faq,
            "has_structured_data": has_structured_data,
            "has_clear_headings": has_clear_headings,
            "content_length_adequate": content_length_adequate,
            "extraction_score": round(score, 1),
        }

    # ------------------------------------------------------------------
    # Issues and recommendations
    # ------------------------------------------------------------------

    def _build_issues_and_recommendations(self, robots, bot_access,
                                           machine_read, content_opt,
                                           url: str) -> tuple[list, list]:
        issues: list[dict] = []
        recommendations: list[dict] = []

        # Robots.txt issues
        if not robots.get("exists"):
            issues.append({
                "severity": "critical",
                "message": "No robots.txt file found",
                "fix": "Create a robots.txt at the domain root",
                "impact": "AI bots have no crawl directives and may over- or under-crawl",
            })
            recommendations.append({
                "recommendation": "Create a robots.txt with explicit AI bot rules",
                "priority": "high",
                "effort": "low",
                "impact": "Controls AI bot behavior and protects sensitive areas",
                "confidence": 0.95,
            })
        elif robots.get("issues"):
            for item in robots["issues"]:
                issues.append(item)

        blocked_bots = [e["bot"] for e in robots.get("ai_bots_blocked", [])]
        if blocked_bots:
            names = ", ".join(blocked_bots)
            issues.append({
                "severity": "warning",
                "message": f"AI bots blocked in robots.txt: {names}",
                "fix": "Review disallow rules to ensure critical content is accessible",
                "impact": "Blocked bots cannot crawl content, reducing AI visibility",
            })

        # Machine readability issues
        if not machine_read.get("llms_txt", {}).get("exists"):
            issues.append({
                "severity": "warning",
                "message": "No llms.txt file found",
                "fix": "Create /llms.txt summarising site content for AI crawlers",
                "impact": "AI systems lack a concise site overview",
            })
            recommendations.append({
                "recommendation": "Create /llms.txt with site summary and key pages",
                "priority": "high",
                "effort": "low",
                "impact": "Provides AI crawlers with a machine-readable site overview",
                "confidence": 0.85,
            })

        if not machine_read.get("llms_full_txt", {}).get("exists"):
            recommendations.append({
                "recommendation": "Create /llms-full.txt with full content dump for AI consumption",
                "priority": "medium",
                "effort": "medium",
                "impact": "Allows AI crawlers to ingest complete site content efficiently",
                "confidence": 0.80,
            })

        if not machine_read.get("humans_txt", {}).get("exists"):
            recommendations.append({
                "recommendation": "Add /humans.txt with team and project info",
                "priority": "low",
                "effort": "low",
                "impact": "Provides context about site authors and contributors",
                "confidence": 0.60,
            })

        if not machine_read.get("feed_xml", {}).get("exists"):
            recommendations.append({
                "recommendation": "Add an RSS/Atom feed at /feed.xml for content discovery",
                "priority": "medium",
                "effort": "low",
                "impact": "Enables bots to detect new content quickly",
                "confidence": 0.75,
            })

        # Content issues
        if not content_opt.get("has_structured_data"):
            issues.append({
                "severity": "warning",
                "message": "No structured data (JSON-LD / microdata) detected",
                "fix": "Add JSON-LD structured data relevant to page content",
                "impact": "AI systems cannot reliably extract entities and relationships",
            })
            recommendations.append({
                "recommendation": "Add JSON-LD structured data (Organization, Article, FAQ, etc.)",
                "priority": "high",
                "effort": "medium",
                "impact": "Improves AI content extraction accuracy by 30-50%",
                "confidence": 0.90,
            })

        if not content_opt.get("has_faq"):
            recommendations.append({
                "recommendation": "Add FAQ sections with FAQPage schema where appropriate",
                "priority": "medium",
                "effort": "medium",
                "impact": "FAQ content is highly extractable by AI assistants",
                "confidence": 0.80,
            })

        if not content_opt.get("has_definitions"):
            recommendations.append({
                "recommendation": "Include clear definitions for key terms (using <dl> or structured patterns)",
                "priority": "medium",
                "effort": "low",
                "impact": "AI models extract definitions more reliably from structured markup",
                "confidence": 0.75,
            })

        if not content_opt.get("has_clear_headings"):
            issues.append({
                "severity": "info",
                "message": "Insufficient heading structure detected",
                "fix": "Use H1-H6 tags to create a clear content hierarchy",
                "impact": "AI systems rely on headings to understand page structure",
            })

        if not content_opt.get("content_length_adequate"):
            issues.append({
                "severity": "info",
                "message": "Page content may be too thin for effective AI extraction",
                "fix": "Expand content with substantive, relevant information",
                "impact": "Thin pages provide less value to AI systems and users",
            })

        # Low overall score recommendations
        low_score_bots = [
            k for k, v in bot_access.items() if v.get("score", 0) < 30 and v.get("allowed", False)
        ]
        if low_score_bots:
            recommendations.append({
                "recommendation": "Reduce crawl-delay restrictions or disallow rules for key AI bots",
                "priority": "high",
                "effort": "low",
                "impact": "Enables AI crawlers to index more content",
                "confidence": 0.85,
            })

        return issues, recommendations

    # ------------------------------------------------------------------
    # Overall score
    # ------------------------------------------------------------------

    def _compute_overall_score(self, robots, bot_access, machine_read,
                                content_opt) -> float:
        weights = {
            "robots": 0.25,
            "bots": 0.30,
            "readability": 0.25,
            "content": 0.20,
        }

        # Robots score
        if not robots.get("exists"):
            robot_score = 10.0
        else:
            robot_score = 80.0
            if robots.get("has_sitemap_reference"):
                robot_score += 10.0
            if robots.get("ai_bots_allowed"):
                robot_score += 10.0
            if robots.get("ai_bots_blocked"):
                robot_score -= len(robots["ai_bots_blocked"]) * 5.0
            robot_score = max(0.0, min(100.0, robot_score))

        # Bot score
        if bot_access:
            bot_score = sum(b["score"] for b in bot_access.values()) / len(bot_access)
        else:
            bot_score = 50.0

        # Readability score
        readability_score = machine_read.get("overall_readability_score", 0.0)

        # Content score
        content_score = content_opt.get("extraction_score", 0.0)

        total = (
            robot_score * weights["robots"]
            + bot_score * weights["bots"]
            + readability_score * weights["readability"]
            + content_score * weights["content"]
        )
        return max(0.0, min(100.0, total))

    def _estimate_scores(self, current: float, issues: list,
                          recommendations: list) -> dict:
        critical = sum(1 for i in issues if i.get("severity") == "critical")
        warnings = sum(1 for i in issues if i.get("severity") == "warning")
        high_rec = sum(1 for r in recommendations if r.get("priority") == "high")
        med_rec = sum(1 for r in recommendations if r.get("priority") == "medium")

        critical_boost = critical * 12.0
        warning_boost = warnings * 5.0
        high_boost = high_rec * 8.0
        med_boost = med_rec * 3.0

        after_critical = min(100.0, current + critical_boost + warning_boost)
        after_all = min(100.0, current + critical_boost + warning_boost + high_boost + med_boost)

        return {
            "current": round(current, 1),
            "after_critical_fixes": round(after_critical, 1),
            "after_all_fixes": round(after_all, 1),
        }
