import json
import logging
import asyncio
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AIEngine:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.timeout = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
        self.max_retries = min(settings.GEMINI_MAX_RETRIES, 1)
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
                    logger.warning("Marking Gemini as unreachable")
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

    async def generate_recommendations(self, analysis_summary, keyword_data=None, content_data=None, competitor_data=None):
        if not self.available:
            return []

        kw_summary = ""
        if keyword_data:
            missing = keyword_data.get("missing_keywords", [])[:5]
            kw_summary = f"Missing keywords: {json.dumps(missing[:5])}"

        content_summary = ""
        if content_data:
            quality = content_data.get("content_quality", [])[:3]
            content_summary = f"Content quality samples: {json.dumps(quality[:3])}"

        comp_summary = ""
        if competitor_data:
            comp_summary = f"Competitor strengths: {competitor_data.get('strengths', [])[:3]}, Weaknesses: {competitor_data.get('weaknesses', [])[:3]}"

        prompt = f"""You are a Technical SEO, AEO, and GEO specialist writing recommendations for a page audit. You will be given ONLY structured, pre-verified data. CRITICAL RULES:
1. Never state a fact not present in the provided data. If asked to compare to competitors and no competitor data is provided, say so explicitly — do not estimate or infer a plausible number.
2. Never contradict another part of the same input data (e.g. if word count is 5000, never write "thin content").
3. Write the "Why It Matters" and "Exact Fix" sections in plain language, citing the specific numbers given (e.g. "23 of 47 images" not "several images").
4. Priority is determined by: severity × pages affected × effort (inverse) — compute this from the input, don't assign priority from vibes.
5. Output valid JSON matching the schema below — no prose outside the schema.

Analysis Scores (from crawl data):
- Overall: {analysis_summary.get('overall_score', 0)}/100
- SEO: {analysis_summary.get('seo_score', 0)}/100
- Technical: {analysis_summary.get('technical_score', 0)}/100
- AEO: {analysis_summary.get('aeo_score', 0)}/100
- GEO: {analysis_summary.get('geo_score', 0)}/100
- Content: {analysis_summary.get('content_score', 0)}/100
- Total Pages Crawled: {analysis_summary.get('total_pages', 0)}
- Error Pages (4xx+): {analysis_summary.get('error_pages', 0)}

Issues and signals from real crawl analysis: {json.dumps(analysis_summary.get('top_issues', [])[:10], indent=2)}

{kw_summary}
{content_summary}
{comp_summary}

For each recommendation, output a JSON object with these exact fields:
{{
  "page_url": "specific page URL if applicable, or 'sitewide'",
  "category": "SEO|AEO|GEO|CONTENT|TECHNICAL|AI_SEARCH",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "issue": "concise issue title",
  "current_problem": "what's specifically wrong, citing the crawled data values",
  "why_it_matters": "business impact explanation using specific numbers from the data",
  "exact_fix": "step-by-step implementation guide using the page's actual values",
  "before_example": "current state example from the data",
  "after_example": "fixed state example",
  "suggested_content": "specific content to add (only if you have the actual content area)",
  "suggested_heading": "recommended heading text",
  "keywords": ["target keywords for this fix"],
  "expected_impact": "HIGH|MEDIUM|LOW",
  "difficulty": "EASY|MODERATE|HARD"
}}

Return ONLY the JSON array, no other text."""

        result = await self._call_gemini(prompt)
        if result and isinstance(result, list):
            return result
        return []

    async def analyze_ai_visibility(self, website_url: str, brand_name: str) -> dict:
        if not self.available:
            return {
                "_note": "AI visibility analysis requires a configured AI provider. Set GEMINI_API_KEY or OPENAI_API_KEY to enable.",
                "_source": "unavailable",
                "citation_readiness_factors": [],
            }

        prompt = f"""Assess the AI citation readiness of this website based on crawlable signals ONLY. Do not fabricate percentages — instead analyze the underlying factors that make a page citable by AI systems.

Website: {website_url}
Brand: {brand_name}

Analyze ONLY these verifiable factors:
1. Schema markup (Article, FAQPage, HowTo, Person, Organization, etc.)
2. Author bios and bylines (E-E-A-T signal for AI trust)
3. Statistics and data citations in content
4. FAQ structure with Q&A pairs
5. Content structure (headings, numbered steps, clarity)
6. Page freshness signals (dates visible)

Return JSON:
{{
  "_source": "gemini_analysis",
  "_note": "This is an analysis of citation-readiness factors, not a measured probability. Actual AI citation rates require querying the AI providers directly.",
  "citation_readiness_factors": [
    {{
      "factor": "schema_markup"|"author_bios"|"statistics"|"faq_structure"|"content_structure"|"freshness",
      "status": "present"|"partial"|"missing",
      "detail": "specific observation based on crawl data"
    }}
  ],
  "strengths": ["verifiable strength 1", "verifiable strength 2"],
  "gaps": ["specific gap 1", "specific gap 2"]
}}"""

        result = await self._call_gemini(prompt)
        if result and isinstance(result, dict):
            return result
        return {
            "_note": "AI citation readiness analysis failed or returned invalid data",
            "_source": "unavailable",
            "citation_readiness_factors": [],
        }

    async def chat(self, message: str, audit_context: dict) -> str:
        return await self.chat_with_context(message, audit_context)

    async def chat_with_context(self, message: str, context: dict) -> str:
        if not self.available:
            return "AI assistant is temporarily unavailable. Please set GEMINI_API_KEY in your .env file."

        scores = context.get("scores", {})
        prompt = f"""You are an expert AI SEO consultant. Answer the user's question about their website audit.

Audit Context:
Website: {context.get('website_url', 'N/A')}
Competitor: {context.get('competitor_url', 'None')}
Overall Score: {scores.get('overall', 0)}/100
SEO: {scores.get('seo', 0)}/100 | Technical: {scores.get('technical', 0)}/100
AEO: {scores.get('aeo', 0)}/100 | GEO: {scores.get('geo', 0)}/100
Content: {scores.get('content', 0)}/100 | AI Visibility: {scores.get('ai_visibility', 0)}/100

Top Issues: {json.dumps(context.get('top_issues', [])[:8], indent=2)}

User Question: {message}

Answer comprehensively. Reference specific data from the audit. Provide actionable advice. Be concise but thorough. Use markdown formatting."""

        result = await self._call_gemini_text(prompt)
        if result:
            return result
        return "AI assistant encountered an error. Please try again."
