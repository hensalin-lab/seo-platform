import json
import logging
import asyncio
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIEngine:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.timeout = httpx.Timeout(connect=5.0, read=60.0, write=5.0, pool=5.0)
        self.max_retries = 1
        self._unreachable = False

    @property
    def available(self) -> bool:
        return bool(self.api_key) and not self._unreachable

    async def _call_openai(self, prompt: str, response_format: dict = None) -> Optional[dict]:
        if not self.available:
            return None
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are an expert SEO consultant. Always respond with valid JSON only, no markdown, no code blocks."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, json=payload, headers=headers)
                    if response.status_code != 200:
                        logger.warning(f"OpenAI error attempt {attempt+1}: {response.status_code} {response.text[:200]}")
                        if attempt < self.max_retries:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        return None
                    data = response.json()
                    text = data["choices"][0]["message"]["content"]
                    text = text.strip()
                    if text.startswith("```"):
                        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    return json.loads(text)
            except asyncio.TimeoutError:
                logger.warning(f"OpenAI timeout attempt {attempt+1}")
                if attempt < self.max_retries:
                    await asyncio.sleep(1)
            except Exception as e:
                logger.warning(f"OpenAI error attempt {attempt+1}: {e}")
                if "connect" in str(e).lower() or "timeout" in str(e).lower():
                    self._unreachable = True
                    return None
                if attempt < self.max_retries:
                    await asyncio.sleep(1)
        return None

    async def generate_suggestions(self, audit_data: dict) -> dict:
        if not self.available:
            return None

        prompt = f"""Analyze this website audit and generate actionable SEO suggestions.

Website: {audit_data.get('website_url', 'N/A')}
Overall Score: {audit_data.get('overall_score', 0)}/100
SEO Score: {audit_data.get('seo_score', 0)}/100
Technical Score: {audit_data.get('technical_score', 0)}/100
Content Score: {audit_data.get('content_score', 0)}/100
AEO Score: {audit_data.get('aeo_score', 0)}/100
GEO Score: {audit_data.get('geo_score', 0)}/100
Total Pages: {audit_data.get('total_pages', 0)}
Total Issues: {audit_data.get('total_issues', 0)}
High Issues: {audit_data.get('high_issues', 0)}
Top Issues: {json.dumps(audit_data.get('top_issues', [])[:10])}

Return JSON with this exact structure:
{{
  "priority_actions": [{{"title": "string", "description": "string", "impact": "HIGH|MEDIUM|LOW", "effort": "LOW|MEDIUM|HIGH", "category": "SEO|TECHNICAL|CONTENT|AEO|GEO", "specific_steps": ["step1", "step2"]}}],
  "quick_wins": [{{"title": "string", "description": "string", "estimated_time": "string", "expected_improvement": "string"}}],
  "strategic_insights": ["insight1", "insight2"],
  "content_recommendations": [{{"topic": "string", "type": "blog_post|landing_page|faq|guide", "priority": "HIGH|MEDIUM|LOW", "target_words": 2000, "keywords": ["kw1"]}}],
  "summary": "2-3 sentence executive summary"
}}"""

        return await self._call_openai(prompt, response_format={"type": "json_object"})

    async def generate_keyword_strategy(self, keywords_data: dict) -> dict:
        if not self.available:
            return None

        prompt = f"""Analyze this keyword data and generate a comprehensive keyword strategy.

Top Keywords: {json.dumps(keywords_data.get('top_keywords', [])[:20])}
Missing Keywords: {json.dumps(keywords_data.get('missing_keywords', [])[:20])}
Content Gaps: {json.dumps(keywords_data.get('content_gaps', [])[:10])}
Keyword Clusters: {json.dumps(keywords_data.get('keyword_clusters', [])[:10])}

Return JSON with this exact structure:
{{
  "priority_keywords": [{{"keyword": "string", "search_intent": "informational|commercial|transactional", "difficulty": "easy|medium|hard", "opportunity_score": 85, "content_type": "blog|landing_page|product_page|faq", "target_url": "string", "notes": "string"}}],
  "cluster_strategy": [{{"pillar_topic": "string", "cluster_keywords": ["kw1"], "content_plan": ["page1"]}}],
  "gap_analysis": {{"missing_from_site": ["kw1"], "competitor_opportunities": ["kw2"], "quick_rank_wins": ["kw3"]}},
  "monthly_plan": {{"month_1": ["focus"], "month_2": ["expand"], "month_3": ["scale"]}},
  "summary": "strategic summary"
}}"""

        return await self._call_openai(prompt, response_format={"type": "json_object"})

    async def chat(self, message: str, audit_context: dict) -> str:
        if not self.available:
            return None

        prompt = f"""You are an expert AI SEO consultant. Answer the user's question about their website.

Website: {audit_context.get('website_url', 'N/A')}
Overall Score: {audit_context.get('overall_score', 0)}/100
SEO Score: {audit_context.get('seo_score', 0)}/100
Content Score: {audit_context.get('content_score', 0)}/100
AEO Score: {audit_context.get('aeo_score', 0)}/100
Total Issues: {audit_context.get('total_issues', 0)}

User question: {message}

Provide a clear, actionable answer. Be specific and reference their actual data."""

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are an expert SEO consultant. Be concise, specific, and actionable."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 1024,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code != 200:
                    return None
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"OpenAI chat error: {e}")
            return None

    async def generate_page_fix(self, page_data: dict) -> dict:
        if not self.available:
            return None

        prompt = f"""Analyze this page and generate specific fix recommendations.

URL: {page_data.get('url', 'N/A')}
Title: {page_data.get('title', 'N/A')}
Meta Description: {page_data.get('meta_description', 'N/A')}
H1: {page_data.get('h1', 'N/A')}
Word Count: {page_data.get('word_count', 0)}
Score: {page_data.get('score', 0)}/100
Issues: {json.dumps(page_data.get('issues', [])[:10])}

Return JSON with:
{{
  "fixes": [{{"issue": "string", "current": "string", "fixed": "string", "priority": "HIGH|MEDIUM|LOW", "reason": "string"}}],
  "meta_title": "optimized title 50-60 chars",
  "meta_description": "optimized description 150-160 chars",
  "heading_suggestions": ["H2 suggestion 1", "H2 suggestion 2"],
  "content_additions": ["add section about X", "add FAQ about Y"],
  "estimated_impact": "+X% improvement estimate"
}}"""

        return await self._call_openai(prompt, response_format={"type": "json_object"})

    async def generate_schema(self, page_data: dict) -> dict:
        if not self.available:
            return None

        prompt = f"""Generate optimal Schema.org structured data for this page.

URL: {page_data.get('url', 'N/A')}
Title: {page_data.get('title', 'N/A')}
Content Type: {page_data.get('content_type', 'webpage')}
Business: {page_data.get('business_name', 'N/A')}
Description: {page_data.get('description', 'N/A')}

Return JSON with:
{{
  "recommended_schemas": ["SchemaType1", "SchemaType2"],
  "schemas": [{{"type": "SchemaType", "priority": "HIGH", "json_ld": {{}}, "benefits": "why this helps"}}],
  "summary": "brief explanation"
}}"""

        return await self._call_openai(prompt, response_format={"type": "json_object"})


openai_engine = OpenAIEngine()
