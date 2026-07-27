"""
Blog AI Engine
Generates blog ideas, content calendar, internal linking opportunities, featured snippets,
content repurposing suggestions, and trend signals.
"""
import logging
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

BLOG_TEMPLATES = {
    "guide": [
        "The Complete Guide to {topic}",
        "{topic}: Everything You Need to Know in 2026",
        "How to {topic}: Step-by-Step Guide for Beginners",
        "The Ultimate {topic} Playbook",
        "{topic} 101: A Beginner's Guide",
    ],
    "listicle": [
        "Top {n} {topic} Tips That Actually Work",
        "{n} {topic} Mistakes to Avoid",
        "{n} Ways to Improve Your {topic}",
        "{n} Best {topic} Strategies for 2026",
        "{n} Signs You Need a Better {topic} Strategy",
    ],
    "comparison": [
        "{topic} vs {alternative}: Which Is Better?",
        "Best {topic} Tools Compared",
        "{topic}: Our Honest Review",
        "Is {topic} Worth It? A Deep Dive",
    ],
    "howto": [
        "How to {action} (With Examples)",
        "How to {action} in {timeframe}",
        "How to {action}: A Practical Guide",
        "Step-by-Step: How to {action}",
    ],
    "case_study": [
        "How We {result} Using {topic}",
        "{topic} Case Study: {result}",
        "Real Results: {topic} in Action",
    ],
}

TOPIC_CATEGORIES = {
    "SEO": ["keyword research", "on-page SEO", "technical SEO", "link building", "local SEO", "mobile SEO", "content SEO", "E-E-A-T", "Core Web Vitals", "SERP features", "schema markup", "site architecture", "crawlability", "indexing", "page speed"],
    "Content Marketing": ["content strategy", "blog writing", "content calendar", "content distribution", "repurposing content", "content briefs", "editorial calendar", "content audits", "topic clusters", "pillar pages"],
    "AI & Search": ["AI overviews", "GEO", "ChatGPT for SEO", "AI content", "LLM optimization", "AI search visibility", "generative engine optimization", "AI-driven SEO"],
    "Analytics": ["GA4", "Search Console", "SEO reporting", "KPIs", "attribution", "conversion tracking", "A/B testing", "data analysis"],
    "Social & Brand": ["social media SEO", "brand building", "online reputation", "influencer marketing", "community building", "thought leadership"],
}

TREND_SIGNALS = {
    "rising": ["AI overview optimization", "GEO", "zero-click searches", "entity SEO", "passage ranking", "helpful content update", "AI-generated content detection", "search generative experience", "visual search", "multimodal search"],
    "seasonal": ["year-end SEO audit", "Q1 content planning", "holiday SEO checklist", "Black Friday SEO", "back to school content", "summer content strategy"],
    "evergreen": ["keyword research guide", "technical SEO checklist", "link building strategies", "content marketing fundamentals", "local SEO optimization", "mobile-first indexing", "Core Web Vitals optimization"],
}


class BlogAIEngine:
    def analyze(self, pages, keyword_research=None, content_gaps=None):
        result = {
            "blog_ideas": [],
            "content_calendar": [],
            "internal_linking": [],
            "featured_snippets": [],
            "content_repurposing": [],
            "trend_signals": [],
            "content_gaps": [],
            "summary": {},
        }

        if not pages:
            return result

        all_text = " ".join(p.content_text for p in pages if p.content_text)
        all_titles = [p.title for p in pages if p.title]
        existing_topics = self._extract_existing_topics(all_titles, all_text)

        question_keywords = keyword_research.get("question_keywords", []) if keyword_research else []
        topic_clusters = keyword_research.get("topic_clusters", []) if keyword_research else []
        content_gaps_data = keyword_research.get("content_gaps", []) if keyword_research else []

        result["blog_ideas"] = self._generate_blog_ideas(
            existing_topics, question_keywords, topic_clusters, content_gaps_data, pages
        )

        result["content_calendar"] = self._build_content_calendar(result["blog_ideas"])

        result["internal_linking"] = self._find_internal_linking_opportunities(pages)

        result["featured_snippets"] = self._find_featured_snippet_opportunities(pages, question_keywords)

        result["content_repurposing"] = self._suggest_repurposing(pages)

        result["trend_signals"] = self._identify_trend_signals(existing_topics, all_text)

        result["content_gaps"] = self._analyze_content_gaps(pages, content_gaps_data)

        result["summary"] = self._build_summary(result)

        return result

    def _extract_existing_topics(self, titles, all_text):
        topics = set()
        for title in titles:
            if title:
                words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', title) if len(w) > 3]
                topics.update(words)
        text_words = re.findall(r'\b[a-zA-Z]{5,}\b', all_text.lower())
        word_freq = Counter(text_words)
        for word, freq in word_freq.most_common(50):
            if freq >= 5:
                topics.add(word)
        return topics

    def _generate_blog_ideas(self, existing_topics, question_keywords, topic_clusters, content_gaps, pages):
        ideas = []
        idea_id = 0

        for cluster in topic_clusters[:5]:
            root = cluster["root_keyword"]
            for template_type in ["guide", "listicle", "howto"]:
                templates = BLOG_TEMPLATES[template_type]
                template = templates[idea_id % len(templates)]
                title = template.format(
                    topic=root.title(),
                    n="7",
                    action=f"master {root}",
                    timeframe="2026",
                    alternative="alternatives",
                    result="increased traffic",
                )
                idea_id += 1
                ideas.append({
                    "id": idea_id,
                    "title": title,
                    "type": template_type.upper(),
                    "primary_keyword": root,
                    "related_keywords": cluster["keywords"][:5],
                    "target_words": 1500 if template_type == "guide" else 1200,
                    "priority": "HIGH" if cluster["topic_authority"] == "HIGH" else "MEDIUM",
                    "source": "topic_cluster",
                    "estimated_traffic_potential": "HIGH" if cluster["total_frequency"] >= 20 else "MEDIUM",
                    "internal_links_to": [],
                })

        for q in question_keywords[:10]:
            question = q["question"]
            clean_q = question.rstrip("?").strip()
            templates = BLOG_TEMPLATES["howto"] + BLOG_TEMPLATES["guide"]
            template = templates[idea_id % len(templates)]
            title = template.format(
                topic=clean_q.title(),
                n="5",
                action=clean_q.lower(),
                timeframe="2026",
                alternative="alternatives",
                result="improved rankings",
            )
            idea_id += 1
            ideas.append({
                "id": idea_id,
                "title": title,
                "type": "Q&A" if "?" in question else "GUIDE",
                "primary_keyword": clean_q.lower(),
                "related_keywords": [],
                "target_words": 800,
                "priority": "HIGH" if q.get("difficulty") == "LOW" else "MEDIUM",
                "source": "question_keyword",
                "estimated_traffic_potential": "MEDIUM",
                "internal_links_to": [],
            })

        for gap in content_gaps[:8]:
            keyword = gap["keyword"]
            template = BLOG_TEMPLATES["listicle"][idea_id % len(BLOG_TEMPLATES["listicle"])]
            title = template.format(
                topic=keyword.title(),
                n="10",
                action=f"improve {keyword}",
                timeframe="2026",
                alternative="alternatives",
                result="grew organic traffic",
            )
            idea_id += 1
            ideas.append({
                "id": idea_id,
                "title": title,
                "type": "LISTICLE",
                "primary_keyword": keyword,
                "related_keywords": [],
                "target_words": 1200,
                "priority": "HIGH" if gap.get("priority") == "HIGH" else "MEDIUM",
                "source": "content_gap",
                "estimated_traffic_potential": "HIGH",
                "internal_links_to": [],
            })

        category_ideas = []
        for category, topics in TOPIC_CATEGORIES.items():
            for topic in topics[:2]:
                if not any(topic.lower() in t.lower() for t in existing_topics):
                    template = BLOG_TEMPLATES["guide"][idea_id % len(BLOG_TEMPLATES["guide"])]
                    title = template.format(
                        topic=topic.title(),
                        n="7",
                        action=f"implement {topic}",
                        timeframe="2026",
                        alternative="alternatives",
                        result="improved rankings",
                    )
                    idea_id += 1
                    category_ideas.append({
                        "id": idea_id,
                        "title": title,
                        "type": "GUIDE",
                        "primary_keyword": topic,
                        "related_keywords": [],
                        "target_words": 1500,
                        "priority": "MEDIUM",
                        "source": "category_gap",
                        "estimated_traffic_potential": "MEDIUM",
                        "internal_links_to": [],
                    })

        ideas.extend(category_ideas[:15])

        for i, idea in enumerate(ideas):
            if i < len(ideas) - 1:
                idea["internal_links_to"] = [ideas[i + 1]["primary_keyword"]]

        return ideas[:50]

    def _build_content_calendar(self, blog_ideas):
        calendar = []
        high_priority = [idea for idea in blog_ideas if idea["priority"] == "HIGH"]
        medium_priority = [idea for idea in blog_ideas if idea["priority"] == "MEDIUM"]

        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())

        for i, idea in enumerate(high_priority[:8]):
            publish_date = week_start + timedelta(weeks=i // 2, days=(i % 2) * 3)
            calendar.append({
                "week": f"Week {i // 2 + 1}",
                "publish_date": publish_date.strftime("%Y-%m-%d"),
                "title": idea["title"],
                "type": idea["type"],
                "primary_keyword": idea["primary_keyword"],
                "target_words": idea["target_words"],
                "status": "PLANNED",
                "priority": "HIGH",
            })

        for i, idea in enumerate(medium_priority[:6]):
            publish_date = week_start + timedelta(weeks=4 + i // 2, days=(i % 2) * 3)
            calendar.append({
                "week": f"Week {4 + i // 2 + 1}",
                "publish_date": publish_date.strftime("%Y-%m-%d"),
                "title": idea["title"],
                "type": idea["type"],
                "primary_keyword": idea["primary_keyword"],
                "target_words": idea["target_words"],
                "status": "PLANNED",
                "priority": "MEDIUM",
            })

        return calendar

    def _find_internal_linking_opportunities(self, pages):
        opportunities = []
        page_content = {}
        for p in pages:
            if p.content_text and p.word_count and p.word_count > 200:
                page_content[p.url] = {
                    "title": p.title or "",
                    "text": p.content_text,
                    "links_internal": [l.get("url", "") if isinstance(l, dict) else l for l in (p.links_internal or [])],
                    "word_count": p.word_count,
                }

        url_list = list(page_content.keys())
        for i, url_a in enumerate(url_list):
            info_a = page_content[url_a]
            for url_b in url_list[i+1:]:
                info_b = page_content[url_b]

                text_a_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', info_a["text"].lower()))
                text_b_words = set(re.findall(r'\b[a-zA-Z]{5,}\b', info_b["text"].lower()))
                overlap = text_a_words & text_b_words

                if len(overlap) >= 5 and url_b not in info_a["links_internal"]:
                    opportunities.append({
                        "source_page": url_a,
                        "source_title": info_a["title"],
                        "target_page": url_b,
                        "target_title": info_b["title"],
                        "shared_topics": list(overlap)[:8],
                        "overlap_score": len(overlap),
                        "recommendation": f"Add internal link from '{info_a['title'][:50]}' to '{info_b['title'][:50]}'",
                    })

        opportunities.sort(key=lambda x: x["overlap_score"], reverse=True)
        return opportunities[:20]

    def _find_featured_snippet_opportunities(self, pages, question_keywords):
        snippets = []
        for q in question_keywords[:10]:
            question = q["question"]
            snippet = {
                "question": question,
                "type": q.get("type", "GENERAL"),
                "suggested_format": self._get_snippet_format(q.get("type", "GENERAL")),
                "target_page": None,
                "current_content_match": "NONE",
                "priority": "HIGH" if q.get("difficulty") == "LOW" else "MEDIUM",
            }

            question_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', question.lower()))
            best_match = None
            best_score = 0
            for p in pages:
                if p.content_text:
                    page_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', p.content_text.lower()))
                    match_score = len(question_words & page_words)
                    if match_score > best_score:
                        best_score = match_score
                        best_match = p.url

            if best_match and best_score >= 3:
                snippet["target_page"] = best_match
                snippet["current_content_match"] = "PARTIAL" if best_score < len(question_words) else "STRONG"

            snippets.append(snippet)

        return snippets

    def _get_snippet_format(self, question_type):
        formats = {
            "DEFINITION": "Paragraph (40-60 words, direct answer)",
            "YES_NO": "Paragraph + List (Yes/No + supporting points)",
            "EXPLANATION": "List (Numbered steps or bullet points)",
            "COMPARISON": "Table (Side-by-side comparison)",
            "TEMPORAL": "Paragraph (Direct answer with date)",
            "LOCATION": "Paragraph + Map embed",
            "PERSON": "Paragraph (Brief bio/description)",
            "GENERAL": "Paragraph (Concise, direct answer)",
        }
        return formats.get(question_type, "Paragraph (40-60 words)")

    def _suggest_repurposing(self, pages):
        suggestions = []
        for p in pages:
            if not p.content_text or not p.title:
                continue
            wc = p.word_count or 0

            if wc >= 1500:
                suggestions.append({
                    "source_url": p.url,
                    "source_title": p.title,
                    "source_words": wc,
                    "repurpose_into": [
                        {"type": "Social Thread", "platform": "Twitter/X", "estimated_time": "30 min", "description": f"Extract 5-7 key points into a Twitter thread"},
                        {"type": "Infographic", "platform": "Visual", "estimated_time": "2 hours", "description": "Create visual summary of main concepts"},
                        {"type": "Video Script", "platform": "YouTube", "estimated_time": "1 hour", "description": "Adapt as 5-8 minute video script with talking points"},
                    ],
                })
            elif wc >= 800:
                suggestions.append({
                    "source_url": p.url,
                    "source_title": p.title,
                    "source_words": wc,
                    "repurpose_into": [
                        {"type": "Social Post", "platform": "LinkedIn", "estimated_time": "15 min", "description": "Adapt as a LinkedIn article or post"},
                        {"type": "Email Newsletter", "platform": "Email", "estimated_time": "20 min", "description": "Condense into newsletter section with CTA"},
                    ],
                })

        return suggestions[:15]

    def _identify_trend_signals(self, existing_topics, all_text):
        signals = []
        text_lower = all_text.lower()

        for signal in TREND_SIGNALS["rising"]:
            if signal.lower() not in text_lower:
                signals.append({
                    "topic": signal,
                    "type": "RISING",
                    "action": f"Create content targeting '{signal}' — rising search interest",
                    "priority": "HIGH",
                })

        for signal in TREND_SIGNALS["seasonal"][:3]:
            if signal.lower() not in text_lower:
                signals.append({
                    "topic": signal,
                    "type": "SEASONAL",
                    "action": f"Prepare seasonal content for '{signal}' ahead of time",
                    "priority": "MEDIUM",
                })

        for signal in TREND_SIGNALS["evergreen"][:5]:
            if signal.lower() not in text_lower:
                signals.append({
                    "topic": signal,
                    "type": "EVERGREEN",
                    "action": f"Create foundational content on '{signal}'",
                    "priority": "MEDIUM",
                })

        return signals[:20]

    def _analyze_content_gaps(self, pages, content_gaps):
        gaps = []
        existing_word_count = sum(p.word_count or 0 for p in pages)
        avg_word_count = existing_word_count / max(len(pages), 1)

        if avg_word_count < 800:
            gaps.append({
                "type": "THIN_CONTENT",
                "description": f"Average word count is {int(avg_word_count)} — aim for 1,200+ across all pages",
                "priority": "HIGH",
                "action": "Expand existing pages and create comprehensive new content",
            })

        blog_pages = [p for p in pages if p.page_type and "BLOG" in p.page_type.upper()]
        if len(blog_pages) < len(pages) * 0.3:
            gaps.append({
                "type": "LOW_BLOG_RATIO",
                "description": f"Only {len(blog_pages)}/{len(pages)} pages are blog content — aim for 40%+",
                "priority": "MEDIUM",
                "action": "Create more informational blog content to capture top-of-funnel traffic",
            })

        for gap in content_gaps[:5]:
            gaps.append({
                "type": "KEYWORD_GAP",
                "keyword": gap["keyword"],
                "description": f"Competitor uses '{gap['keyword']}' (×{gap['competitor_frequency']}) but you don't",
                "priority": gap.get("priority", "MEDIUM"),
                "action": f"Create or update content to include '{gap['keyword']}' naturally",
            })

        return gaps

    def _build_summary(self, result):
        total_ideas = len(result["blog_ideas"])
        high_priority = len([i for i in result["blog_ideas"] if i["priority"] == "HIGH"])
        total_calendar = len(result["content_calendar"])
        total_linking = len(result["internal_linking"])
        total_snippets = len(result["featured_snippets"])
        total_repurpose = len(result["content_repurposing"])
        total_trends = len(result["trend_signals"])

        return {
            "total_blog_ideas": total_ideas,
            "high_priority_ideas": high_priority,
            "content_calendar_items": total_calendar,
            "internal_linking_opportunities": total_linking,
            "featured_snippet_targets": total_snippets,
            "repurposing_suggestions": total_repurpose,
            "trend_signals": total_trends,
            "content_gaps": len(result["content_gaps"]),
        }
