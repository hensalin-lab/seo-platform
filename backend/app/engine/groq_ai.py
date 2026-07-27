"""Fast Groq AI service - primary AI provider for all analysis.
Groq LPU is 10-50x faster than OpenAI/Gemini for inference.
"""
import json
import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


async def groq_chat(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    response_format: str = "json",
) -> Optional[dict | str]:
    """Send a chat completion request to Groq API. Returns parsed JSON or raw text."""
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, skipping Groq AI")
        return None

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if response_format == "json":
        payload["response_format"] = {"type": "json_object"}

    for attempt in range(settings.GROQ_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if response_format == "json":
                        try:
                            return json.loads(content)
                        except json.JSONDecodeError:
                            return content
                    return content
                else:
                    logger.warning(f"Groq API error {resp.status_code}: {resp.text[:200]}")
                    if resp.status_code == 429:
                        import asyncio
                        await asyncio.sleep(1 * (attempt + 1))
                        continue
                    return None
        except Exception as e:
            logger.warning(f"Groq API exception (attempt {attempt+1}): {e}")
            import asyncio
            await asyncio.sleep(0.5 * (attempt + 1))
    return None


async def groq_analyze_seo(url: str, title: str, meta_desc: str, content: str, headings: dict, signals: list) -> dict:
    """AI-powered SEO analysis using Groq - returns detailed recommendations."""
    system = """You are an expert SEO analyst. Given a page's data and SEO signals,
return a JSON object with these fields:
{
  "executive_summary": "2-3 sentence overview of the page's SEO health",
  "google_likes": [{"element": "...", "why": "..."}],
  "google_dislikes": [{"element": "...", "why": "...", "fix": "..."}],
  "content_recommendations": [{"title": "...", "action": "...", "priority": "high|medium|low"}],
  "technical_fixes": [{"issue": "...", "fix": "...", "code": "..."}],
  "keyword_strategy": {"primary_kw": "...", "missing_kws": ["..."], "suggestions": ["..."]},
  "competitor_gap": ["..."],
  "quick_wins": ["..."],
  "long_term_strategy": ["..."]
}"""

    signal_summary = "\n".join([
        f"- [{s.get('status','?')}] {s.get('name','?')}: {s.get('what_wrong','OK')}"
        for s in (signals or [])[:50]
    ])

    headings_text = ""
    if headings:
        for tag, text in headings.items() if isinstance(headings, dict) else []:
            headings_text += f"  {tag}: {text}\n"

    user = f"""URL: {url}
Title: {title}
Meta Description: {meta_desc}
Word Count: {len(content.split())}
Headings:
{headings_text}
SEO Signals ({len(signals)} total):
{signal_summary}

Analyze this page and provide comprehensive SEO recommendations. Focus on what Google and AI search engines want to see."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3500)
    if isinstance(result, dict):
        return result
    return {"executive_summary": str(result)[:500] if result else "Analysis unavailable"}


async def groq_content_rewrite(url: str, title: str, meta_desc: str, content: str, target_keywords: list, issues: list) -> dict:
    """AI-powered content rewrite recommendations using Groq."""
    system = """You are an expert content strategist and SEO copywriter.
Given a page's content and issues, return a JSON object:
{
  "rewrite_sections": [
    {
      "section": "Section Name",
      "current_text": "current text snippet",
      "improved_text": "improved version",
      "reason": "why this change improves SEO/visibility",
      "keyword_placement": "where to place target keywords",
      "impact": "high|medium|low"
    }
  ],
  "new_content_suggestions": [
    {"section": "...", "content": "...", "why": "..."}
  ],
  "title_suggestions": ["..."],
  "meta_description_suggestions": ["..."],
  "faq_suggestions": [{"question": "...", "answer": "..."}],
  "schema_suggestions": ["..."],
  "internal_link_suggestions": ["..."]
}"""

    issues_text = "\n".join([
        f"- [{i.get('severity','?')}] {i.get('issue', i.get('signal_name','?'))}: {i.get('fix','')}"
        for i in (issues or [])[:30]
    ])

    user = f"""URL: {url}
Current Title: {title}
Meta Description: {meta_desc}
Word Count: {len(content.split())}
Target Keywords: {', '.join(target_keywords) if target_keywords else 'Not specified'}
Content Issues:
{issues_text}

Content Preview (first 2000 chars):
{content[:2000]}

Provide specific content rewrite recommendations with before/after examples."""

    result = await groq_chat(system, user, temperature=0.4, max_tokens=4000)
    if isinstance(result, dict):
        return result
    return {"rewrite_sections": [], "new_content_suggestions": []}


async def groq_ai_search_optimization(url: str, title: str, content: str, signals: list) -> dict:
    """AI-powered analysis for ChatGPT, Perplexity, Gemini, Claude, Google AI Overview citation readiness."""
    system = """You are an expert in AI search optimization (GEO - Generative Engine Optimization).
Analyze content for how likely it is to be cited by AI search engines.
Return a JSON object:
{
  "overall_ai_score": 75,
  "platform_scores": {
    "chatgpt": {"score": 70, "reasons": ["..."], "fixes": ["..."]},
    "perplexity": {"score": 80, "reasons": ["..."], "fixes": ["..."]},
    "gemini": {"score": 75, "reasons": ["..."], "fixes": ["..."]},
    "claude": {"score": 85, "reasons": ["..."], "fixes": ["..."]},
    "google_ai_overview": {"score": 70, "reasons": ["..."], "fixes": ["..."]}
  },
  "citation_signals": {
    "has_statistics": true,
    "has_expert_quotes": false,
    "has_definitions": true,
    "has_structured_lists": false,
    "has_tables": false,
    "has_faq": true,
    "has_author_info": false,
    "has_sources_cited": false
  },
  "improvement_actions": [
    {"action": "...", "platforms_affected": ["..."], "priority": "high|medium|low"}
  ],
  "entity_optimization": ["..."],
  "content_gaps_for_ai": ["..."]
}"""

    signal_summary = "\n".join([
        f"- [{s.get('status','?')}] {s.get('category','?')}: {s.get('name','?')}"
        for s in (signals or [])[:50]
    ])

    user = f"""URL: {url}
Title: {title}
Word Count: {len(content.split())}
Content Preview: {content[:2000]}
SEO Signals:
{signal_summary}

Rate this page for AI search engine citation readiness and provide specific improvements."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3500)
    if isinstance(result, dict):
        return result
    return {"overall_ai_score": 50, "platform_scores": {}}


async def groq_entity_extraction(content: str, url: str) -> dict:
    """Extract entities, topics, and knowledge graph signals from content using Groq."""
    system = """Extract entities and topics from the given content.
Return a JSON object:
{
  "entities": [
    {"name": "...", "type": "Person|Organization|Product|Location|Concept", "relevance": "high|medium|low"}
  ],
  "topics": ["topic1", "topic2"],
  "knowledge_graph_signals": {
    "brand_mentioned": true,
    "founder_mentioned": false,
    "product_named": true,
    "location_mentioned": false,
    "industry_terms": ["..."]
  },
  "entity_gaps": ["Missing entities that should be mentioned for authority"],
  "topic_authority_score": 65,
  "recommended_entities": ["..."]
}"""

    user = f"""URL: {url}
Content (first 3000 chars):
{content[:3000]}

Extract all entities, topics, and knowledge graph signals."""

    result = await groq_chat(system, user, temperature=0.2, max_tokens=2500)
    if isinstance(result, dict):
        return result
    return {"entities": [], "topics": []}


async def groq_competitor_analysis(your_url: str, your_content: str, competitor_url: str, competitor_content: str) -> dict:
    """Analyze content gap between your page and competitor."""
    system = """You are a competitive SEO analyst. Compare two pages and find gaps.
Return a JSON object:
{
  "your_advantages": ["..."],
  "competitor_advantages": ["..."],
  "content_gaps": ["..."],
  "keyword_gaps": ["..."],
  "structure_gaps": ["..."],
  "authority_gaps": ["..."],
  "action_plan": [
    {"action": "...", "priority": "high|medium|low", "effort": "low|medium|high"}
  ],
  "estimated_impact": "high|medium|low"
}"""

    user = f"""Your Page: {your_url}
Your Content Preview: {your_content[:1500]}

Competitor Page: {competitor_url}
Competitor Content Preview: {competitor_content[:1500]}

Compare and identify gaps and opportunities."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3000)
    if isinstance(result, dict):
        return result
    return {"content_gaps": [], "action_plan": []}


async def groq_schema_generation(url: str, title: str, content: str, page_type: str) -> dict:
    """Generate optimized Schema.org JSON-LD markup using Groq."""
    system = f"""Generate Schema.org JSON-LD structured data for a {page_type} page.
Return a JSON object:
{{
  "schemas": [
    {{
      "type": "SchemaType",
      "json_ld": {{...}},
      "rich_results_eligible": true,
      "implementation_code": "<script type='application/ld+json'>...</script>"
    }}
  ],
  "missing_schemas": ["Schemas that should be added"],
  "validation_notes": ["..."]
}}"""

    user = f"""URL: {url}
Title: {title}
Page Type: {page_type}
Content Preview: {content[:2000]}

Generate comprehensive structured data for this page."""

    result = await groq_chat(system, user, temperature=0.2, max_tokens=3500)
    if isinstance(result, dict):
        return result
    return {"schemas": [], "missing_schemas": []}


async def groq_page_recommendations(page_data: dict, signals: list, cat_scores: dict) -> dict:
    """Generate hyper-specific page-level recommendations using Groq."""
    system = """You are a senior SEO consultant. Based on page data and signal analysis,
provide specific, actionable recommendations.
Return a JSON object:
{
  "executive_summary": "Brief overview",
  "critical_fixes": [
    {"issue": "...", "what_wrong": "...", "why_it_matters": "...", "how_to_fix": "...", "before_code": "...", "after_code": "...", "impact": "high|medium|low", "effort": "low|medium|high"}
  ],
  "content_improvements": [
    {"area": "...", "current": "...", "improved": "...", "reason": "..."}
  ],
  "technical_fixes": [
    {"issue": "...", "fix": "...", "code_example": "..."}
  ],
  "seo_score_prediction": {"current": 0, "after_fixes": 0},
  "priority_ranking": ["Most important fixes in order"]
}"""

    failing = [s for s in (signals or []) if s.get("status") in ("fail", "warn")]
    signal_text = "\n".join([
        f"- [{s.get('status')}] {s.get('name','?')}: {s.get('what_wrong','')}"
        for s in failing[:40]
    ])

    user = f"""Page: {page_data.get('url', 'Unknown')}
Title: {page_data.get('title', 'Unknown')}
Word Count: {page_data.get('word_count', 0)}
Overall Score: {page_data.get('overall_score', 'N/A')}
Category Scores: {json.dumps({k: round(v) for k, v in (cat_scores or {}).items() if v < 100}, indent=2)}

Failing/Warning Signals:
{signal_text}

Provide specific, code-level recommendations for this page."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=4000)
    if isinstance(result, dict):
        return result
    return {"executive_summary": str(result)[:500] if result else "Recommendations unavailable"}


async def groq_readability_analysis(content: str) -> dict:
    """Analyze content readability and provide improvement suggestions."""
    system = """Analyze the readability of this content and return a JSON object:
{
  "readability_score": 65,
  "reading_level": "Grade 8",
  "grade_level": 8,
  "issues": [
    {"type": "sentence_length|jargon|passive_voice|paragraph_length|complexity", "text": "...", "suggestion": "..."}
  ],
  "improved_versions": [
    {"original": "...", "improved": "...", "reason": "..."}
  ],
  "vocabulary_suggestions": {"word": "easier alternative"},
  "structure_suggestions": ["..."]
}"""

    user = f"""Content to analyze (first 3000 chars):
{content[:3000]}

Analyze readability and suggest improvements for both human readers and SEO."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3000)
    if isinstance(result, dict):
        return result
    return {"readability_score": 50, "issues": []}


async def groq_eeat_analysis(content: str, url: str, title: str) -> dict:
    """Analyze E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals."""
    system = """Analyze E-E-A-T signals in this content. Return a JSON object:
{
  "experience_score": 60,
  "expertise_score": 70,
  "authoritativeness_score": 55,
  "trustworthiness_score": 65,
  "overall_eeat": 62,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_signals": [
    {"signal": "...", "why": "...", "how_to_add": "..."}
  ],
  "author_analysis": {
    "author_mentioned": true,
    "credentials_shown": false,
    "author_page_linked": false
  },
  "source_analysis": {
    "external_sources_cited": 2,
    "academic_sources": 0,
    "official_sources": 1,
    "citations_needed": ["..."]
  },
  "trust_signals": {
    "contact_info": false,
    "privacy_policy": false,
    "about_page": false,
    "clear_purpose": true
  }
}"""

    user = f"""URL: {url}
Title: {title}
Content (first 3000 chars):
{content[:3000]}

Analyze all E-E-A-T signals and provide specific improvements."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3500)
    if isinstance(result, dict):
        return result
    return {"overall_eeat": 50, "strengths": [], "weaknesses": []}


async def groq_internal_link_strategy(pages_data: list, current_url: str, current_content: str) -> dict:
    """Suggest internal linking strategy using Groq."""
    system = """Analyze internal linking opportunities. Return a JSON object:
{
  "suggested_links": [
    {"from": "...", "to": "...", "anchor_text": "...", "reason": "...", "context": "..."}
  ],
  "broken_links": [{"url": "...", "status": "..."}],
  "orphan_pages": ["..."],
  "link_hub_opportunities": ["..."],
  "anchor_text_suggestions": ["..."],
  "link_depth_analysis": {"too_deep": ["..."], "well_linked": ["..."]}
}"""

    pages_summary = "\n".join([
        f"- {p.get('url','?')}: {p.get('title','?')} ({p.get('word_count',0)}w)"
        for p in (pages_data or [])[:30]
    ])

    user = f"""Current Page: {current_url}
Current Content Preview: {current_content[:1500]}

Available Pages:
{pages_summary}

Suggest internal linking strategy for this page."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3000)
    if isinstance(result, dict):
        return result
    return {"suggested_links": []}


async def groq_full_strategy(audit_data: dict, pages: list, issues: list) -> dict:
    """Generate comprehensive #1 ranking strategy using Groq."""
    system = """You are an expert SEO strategist. Given audit data, generate a comprehensive
strategy to rank #1 on Google. Return a JSON object:
{
  "strategy_name": "...",
  "estimated_timeline": "3-6 months",
  "steps": [
    {
      "step": 1,
      "title": "...",
      "description": "...",
      "priority": "critical|high|medium|low",
      "actions": ["..."],
      "expected_impact": "...",
      "effort": "low|medium|high",
      "tools_needed": ["..."]
    }
  ],
  "content_strategy": {...},
  "technical_strategy": {...},
  "link_building_strategy": {...},
  "ai_search_strategy": {...},
  "kpis": ["..."]
}"""

    pages_summary = f"{len(pages)} pages crawled"
    critical_issues = [i for i in (issues or []) if i.get("severity") in ("CRITICAL", "HIGH")]
    issues_text = "\n".join([f"- {i.get('category','?')}: {i.get('title', i.get('issue','?'))}" for i in critical_issues[:20]])

    user = f"""Audit URL: {audit_data.get('url', 'Unknown')}
SEO Score: {audit_data.get('seo_score', 0)}
Technical Score: {audit_data.get('technical_score', 0)}
AEO Score: {audit_data.get('aeo_score', 0)}
GEO Score: {audit_data.get('geo_score', 0)}
Pages: {pages_summary}
Critical Issues ({len(critical_issues)}):
{issues_text}

Generate a complete ranking strategy for this website."""

    result = await groq_chat(system, user, temperature=0.4, max_tokens=4000)
    if isinstance(result, dict):
        return result
    return {"steps": [], "strategy_name": "Generated Strategy"}


async def groq_link_suggestions(url: str, content: str, pages: list) -> list:
    """Generate specific internal link suggestions for a page."""
    system = """Suggest 5-10 internal links for this page. Return a JSON array:
[
  {"anchor_text": "...", "suggested_url": "...", "context_sentence": "...", "reason": "..."}
]
If no good opportunities, return an empty array."""

    pages_list = "\n".join([f"- {p.get('url','?')}" for p in (pages or [])[:50]])

    user = f"""Page: {url}
Content Preview: {content[:1500]}
Available Pages:
{pages_list}

Suggest internal links that would improve topical authority."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=2000)
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and "suggestions" in result:
        return result["suggestions"]
    return []


async def groq_keyword_insights(url: str, title: str, content: str, existing_keywords: list) -> dict:
    """Generate keyword insights and missing keyword opportunities."""
    system = """Analyze keyword optimization and find gaps. Return a JSON object:
{
  "primary_keyword": {"keyword": "...", "in_title": true, "in_h1": false, "in_meta": true, "density": "1.2%"},
  "secondary_keywords": [{"keyword": "...", "present": true, "suggested_usage": "..."}],
  "missing_keywords": [{"keyword": "...", "importance": "high|medium|low", "where_to_add": "..."}],
  "long_tail_opportunities": ["..."],
  "semantic_keywords": ["..."],
  "keyword_density_analysis": {"overall": 0, "by_keyword": {}},
  "content_keyword_suggestions": ["..."]
}"""

    user = f"""URL: {url}
Title: {title}
Content (first 2000 chars): {content[:2000]}
Existing Keywords: {', '.join(existing_keywords) if existing_keywords else 'Unknown'}

Analyze keyword optimization and suggest improvements."""

    result = await groq_chat(system, user, temperature=0.3, max_tokens=3000)
    if isinstance(result, dict):
        return result
    return {"primary_keyword": {}, "missing_keywords": []}
