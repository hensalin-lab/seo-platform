import json
import logging
import asyncio
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class GeminiEngine:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.timeout = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)
        self.max_retries = 1
        self._unreachable = False

    @property
    def available(self) -> bool:
        return bool(self.api_key) and not self._unreachable

    async def _call_gemini(self, prompt: str) -> Optional[dict]:
        if not self.available:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 8192,
                            "responseMimeType": "application/json",
                        },
                    }
                    response = await client.post(url, json=payload)
                    if response.status_code != 200:
                        logger.warning(f"Gemini error attempt {attempt+1}: {response.status_code}")
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        return None
                    data = response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text)
            except asyncio.TimeoutError:
                logger.warning(f"Gemini timeout attempt {attempt+1}")
                if attempt < self.max_retries:
                    await asyncio.sleep(1)
            except Exception as e:
                logger.warning(f"Gemini error attempt {attempt+1}: {e}")
                if "connect" in str(e).lower() or "timeout" in str(e).lower():
                    self._unreachable = True
                    return None
                if attempt < self.max_retries:
                    await asyncio.sleep(1)
        return None

    async def _call_gemini_text(self, prompt: str) -> Optional[str]:
        if not self.available:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.4,
                            "maxOutputTokens": 4096,
                        },
                    }
                    response = await client.post(url, json=payload)
                    if response.status_code != 200:
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        return None
                    data = response.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                logger.warning(f"Gemini text error attempt {attempt+1}: {e}")
                if "connect" in str(e).lower() or "timeout" in str(e).lower():
                    self._unreachable = True
                    return None
                if attempt < self.max_retries:
                    await asyncio.sleep(1)
        return None

    async def generate_suggestions(self, audit_data: dict) -> dict:
        if not self.available:
            return self._fallback_suggestions(audit_data)

        prompt = f"""You are an expert SEO consultant. Analyze this audit data and generate smart, actionable SEO suggestions.

Audit Data:
- Website: {audit_data.get('website_url', 'N/A')}
- Overall Score: {audit_data.get('overall_score', 0)}/100
- SEO Score: {audit_data.get('seo_score', 0)}/100
- Technical Score: {audit_data.get('technical_score', 0)}/100
- Content Score: {audit_data.get('content_score', 0)}/100
- AEO Score: {audit_data.get('aeo_score', 0)}/100
- GEO Score: {audit_data.get('geo_score', 0)}/100
- Total Pages: {audit_data.get('total_pages', 0)}
- Total Issues: {audit_data.get('total_issues', 0)}
- High Issues: {audit_data.get('high_issues', 0)}
- Top Issues: {json.dumps(audit_data.get('top_issues', [])[:10])}

Generate a JSON response with:
{{
  "priority_actions": [
    {{
      "title": "action title",
      "description": "what to do",
      "impact": "HIGH|MEDIUM|LOW",
      "effort": "LOW|MEDIUM|HIGH",
      "category": "SEO|TECHNICAL|CONTENT|AEO|GEO",
      "specific_steps": ["step1", "step2"]
    }}
  ],
  "quick_wins": [
    {{
      "title": "quick win title",
      "description": "easy fix",
      "estimated_time": "5 minutes",
      "expected_improvement": "+X% ranking potential"
    }}
  ],
  "strategic_insights": [
    "insight 1",
    "insight 2"
  ],
  "content_recommendations": [
    {{
      "topic": "topic to create content about",
      "type": "blog_post|landing_page|faq|guide",
      "priority": "HIGH|MEDIUM|LOW",
      "target_words": 2000,
      "keywords": ["kw1", "kw2"]
    }}
  ],
  "summary": "2-3 sentence executive summary"
}}

Return ONLY valid JSON."""

        result = await self._call_gemini(prompt)
        if result and isinstance(result, dict):
            return result
        return self._fallback_suggestions(audit_data)

    async def generate_keyword_strategy(self, keywords_data: dict) -> dict:
        if not self.available:
            return self._fallback_keyword_strategy(keywords_data)

        prompt = f"""You are an expert keyword strategist. Analyze this keyword data and generate a comprehensive keyword strategy.

Keywords Data:
- Top Keywords: {json.dumps(keywords_data.get('top_keywords', [])[:20])}
- Missing Keywords: {json.dumps(keywords_data.get('missing_keywords', [])[:20])}
- Content Gaps: {json.dumps(keywords_data.get('content_gaps', [])[:10])}
- Keyword Clusters: {json.dumps(keywords_data.get('keyword_clusters', [])[:10])}
- Opportunities: {json.dumps(keywords_data.get('keyword_opportunities', [])[:10])}

Generate a JSON response with:
{{
  "priority_keywords": [
    {{
      "keyword": "keyword",
      "search_intent": "informational|commercial|transactional|navigational",
      "difficulty": "easy|medium|hard",
      "opportunity_score": 85,
      "content_type": "blog|landing_page|product_page|faq",
      "target_url": "suggested URL",
      "notes": "strategy notes"
    }}
  ],
  "cluster_strategy": [
    {{
      "pillar_topic": "main topic",
      "cluster_keywords": ["kw1", "kw2", "kw3"],
      "content_plan": ["page 1 topic", "page 2 topic"]
    }}
  ],
  "gap_analysis": {{
    "missing_from_site": ["keyword1", "keyword2"],
    "competitor_opportunities": ["keyword3", "keyword4"],
    "quick_rank_wins": ["keyword5"]
  }},
  "monthly_plan": {{
    "month_1": ["focus keywords for month 1"],
    "month_2": ["focus keywords for month 2"],
    "month_3": ["focus keywords for month 3"]
  }},
  "summary": "strategic summary"
}}

Return ONLY valid JSON."""

        result = await self._call_gemini(prompt)
        if result and isinstance(result, dict):
            return result
        return self._fallback_keyword_strategy(keywords_data)

    async def generate_content_brief(self, topic: str, context: dict) -> dict:
        if not self.available:
            return self._fallback_content_brief(topic, context)

        prompt = f"""You are an expert SEO content strategist. Create a comprehensive content brief for: {topic}

Context:
- Website: {context.get('website_url', 'N/A')}
- Target Audience: {context.get('audience', 'general')}
- Content Type: {context.get('type', 'blog_post')}
- Current Word Count: {context.get('current_word_count', 0)}
- Related Keywords: {json.dumps(context.get('keywords', [])[:10])}
- Competitor Content: {json.dumps(context.get('competitor_urls', [])[:5])}
- Site Score: {context.get('site_score', 0)}/100

Generate a JSON response with:
{{
  "title": "H1 title",
  "meta_title": "SEO title (50-60 chars)",
  "meta_description": "Description (150-160 chars)",
  "outline": [
    {{
      "heading": "H2 Heading",
      "subheadings": ["H3a", "H3b"],
      "key_points": ["point1", "point2"],
      "target_word_count": 500
    }}
  ],
  "primary_keywords": ["kw1", "kw2"],
  "secondary_keywords": ["kw3", "kw4"],
  "lsi_keywords": ["related1", "related2"],
  "faq_section": [
    {{"question": "Q?", "answer": "A"}}
  ],
  "internal_link_opportunities": ["page topic suggestions"],
  "schema_recommendation": "Article|HowTo|FAQPage|Product",
  "estimated_read_time": "8 min",
  "unique_angle": "suggested unique angle for the content"
}}

Return ONLY valid JSON."""

        result = await self._call_gemini(prompt)
        if result and isinstance(result, dict):
            return result
        return self._fallback_content_brief(topic, context)

    def _fallback_suggestions(self, audit_data: dict) -> dict:
        overall = audit_data.get('overall_score', 0)
        return {
            "priority_actions": [
                {"title": "Fix High Priority Issues", "description": f"Address {audit_data.get('high_issues', 0)} critical issues immediately", "impact": "HIGH", "effort": "MEDIUM", "category": "SEO", "specific_steps": ["Review all HIGH severity issues", "Fix meta tags and canonicals", "Add missing schema markup"]},
                {"title": "Improve Content Depth", "description": "Expand thin content pages to 1,500+ words", "impact": "HIGH", "effort": "HIGH", "category": "CONTENT", "specific_steps": ["Identify pages under 300 words", "Add comprehensive sections", "Include FAQs and structured data"]},
                {"title": "Optimize for AI Search", "description": "Add citation-ready content and structured data", "impact": "MEDIUM", "effort": "LOW", "category": "AEO", "specific_steps": ["Add definition paragraphs", "Create FAQ sections", "Implement FAQPage schema"]},
            ],
            "quick_wins": [
                {"title": "Add Missing Meta Descriptions", "description": "Write compelling descriptions for all pages", "estimated_time": "30 minutes", "expected_improvement": "Improved click-through rate from search results (estimate)"},
                {"title": "Fix Canonical Tags", "description": "Ensure all pages have proper canonical URLs", "estimated_time": "15 minutes", "expected_improvement": "Prevent duplicate-content dilution (estimate)"},
                {"title": "Add Schema Markup", "description": "Implement Organization and WebPage schemas", "estimated_time": "1 hour", "expected_improvement": "Rich-snippet eligibility where supported (estimate)"},
            ],
            "strategic_insights": [
                f"Site scores {overall}/100 overall. {'Good foundation' if overall > 60 else 'Significant improvement needed'}.",
                "Focus on E-E-A-T signals to improve both traditional and AI search rankings.",
                "Content depth is critical — aim for 1,500+ words on key landing pages.",
            ],
            "content_recommendations": [
                {"topic": "Industry Best Practices Guide", "type": "guide", "priority": "HIGH", "target_words": 2000, "keywords": ["best practices", "guide", "tips"]},
                {"topic": "FAQ Section", "type": "faq", "priority": "MEDIUM", "target_words": 1000, "keywords": ["faq", "questions", "answers"]},
            ],
            "summary": f"Your site scores {overall}/100. Fix the {audit_data.get('high_issues', 0)} high-priority issues first, then focus on content depth and AI search optimization for maximum impact.",
        }

    def _fallback_keyword_strategy(self, keywords_data: dict) -> dict:
        return {
            "priority_keywords": [
                {"keyword": kw.get("keyword", "") if isinstance(kw, dict) else str(kw), "search_intent": "informational", "difficulty": "medium", "opportunity_score": 65, "content_type": "blog", "target_url": "/", "notes": "Create comprehensive content"}
                for kw in keywords_data.get("top_keywords", [])[:5]
            ],
            "cluster_strategy": [{"pillar_topic": "Main Topic", "cluster_keywords": ["kw1", "kw2"], "content_plan": ["Pillar page", "Supporting articles"]}],
            "gap_analysis": {"missing_from_site": keywords_data.get("missing_keywords", [])[:5], "competitor_opportunities": [], "quick_rank_wins": []},
            "monthly_plan": {"month_1": ["Fix existing content"], "month_2": ["Create new content"], "month_3": ["Build backlinks"]},
            "summary": "Set GEMINI_API_KEY for AI-powered keyword strategy analysis.",
        }

    def _fallback_content_brief(self, topic: str, context: dict) -> dict:
        brand = context.get("website_url", "").split("//")[-1].split(".")[0].replace("-", " ").title()
        return {
            "title": f"Complete Guide to {topic.title()}",
            "meta_title": f"{topic.title()} Guide | {brand}",
            "meta_description": f"Learn everything about {topic}. Comprehensive guide with expert insights, tips, and best practices.",
            "outline": [
                {"heading": f"What is {topic.title()}?", "subheadings": ["Definition", "Importance"], "key_points": ["Define clearly", "Explain relevance"], "target_word_count": 300},
                {"heading": f"Benefits of {topic.title()}", "subheadings": ["Key advantages"], "key_points": ["List benefits with data"], "target_word_count": 400},
                {"heading": "How to Get Started", "subheadings": ["Step by step guide"], "key_points": ["Actionable steps with examples"], "target_word_count": 500},
                {"heading": "Best Practices", "subheadings": ["Do's", "Don'ts"], "key_points": ["Expert tips"], "target_word_count": 400},
                {"heading": "FAQ", "subheadings": [], "key_points": ["Answer common questions"], "target_word_count": 300},
            ],
            "primary_keywords": [topic.lower()],
            "secondary_keywords": [f"{topic.lower()} guide", f"best {topic.lower()}"],
            "lsi_keywords": [f"{topic.lower()} tips", f"{topic.lower()} examples", f"{topic.lower()} benefits"],
            "faq_section": [{"question": f"What is {topic}?", "answer": f"{topic} refers to..."}, {"question": f"Why is {topic} important?", "answer": "It matters because..."}],
            "internal_link_opportunities": [],
            "schema_recommendation": "Article",
            "estimated_read_time": "8 min",
            "unique_angle": "Focus on practical implementation with real-world examples.",
            "notes": "Fallback brief. Set GEMINI_API_KEY for AI-generated briefs.",
        }
