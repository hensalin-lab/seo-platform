"""Content Intelligence Engine v2 — Paragraph-level analysis, E-E-A-T, readability"""
import re
import math

_WORD_RE = re.compile(r'\b\w+\b')
_SENTENCE_RE = re.compile(r'[^.!?]+[.!?]+')
_PARA_RE = re.compile(r'\n\s*\n')
_PASSIVE_RE = re.compile(r'\b(?:is|are|was|were|been|being|be)\s+\w+ed\b', re.I)
_FLESCH_RE = re.compile(r'[aeiouy]+', re.I)
_SYLLABLE_RE = re.compile(r'(?i:[aeiouy]+[^aeiouy]*)', re.I)
_TRANSITION_RE = re.compile(r'\b(?:however|moreover|furthermore|additionally|consequently|therefore|in contrast|on the other hand|for example|specifically|in particular|as a result|similarly|likewise|nevertheless|nonetheless|meanwhile|subsequently|alternatively|conversely|but|also|yet|and so|in addition|notably|importantly|crucially|significantly|specifically)\b', re.I)
_FACTUAL_MARKERS = re.compile(r'\b(?:according to|research shows|study found|data indicates|evidence suggests|statistics show|reports indicate|survey reveals|published|journal|doi:|source:)\b', re.I)
_HEDGING = re.compile(r'\b(?:maybe|perhaps|possibly|might be|could be|sort of|kind of|it seems|appears to be|arguably|potentially|supposedly|presumably)\b', re.I)
_SUPERLATIVES = re.compile(r'\b(?:best|worst|greatest|most|least|highest|lowest|top|leading|number one|#1|premier|foremost|unrivaled|unmatched|unparalleled)\b', re.I)
_SPAM_PATTERNS = re.compile(r'\b(?:click here|buy now|limited time|act now|don\'t miss|free money|guaranteed|100% free|no cost|risk free)\b', re.I)


class ContentIntelligenceV2:
    def analyze(self, page):
        text = page.content_text or ""
        wc = page.word_count or 0
        html = page.html_raw or ""
        title = page.title or ""
        desc = page.meta_description or ""
        h1 = page.h1 or ""
        url = page.url or ""
        images = page.images or []
        links_int = page.links_internal or []
        links_ext = page.links_external or []
        schema = page.schema_markup or []
        page_type = getattr(page, 'page_type', '') or ""

        paragraphs = self._extract_paragraphs(text)
        sentences = _SENTENCE_RE.findall(text)

        readability = self._readability(text, sentences, paragraphs)
        structure = self._structure(text, html, title, h1, paragraphs)
        depth = self._depth(text, wc, paragraphs, sentences)
        eat = self._eeat_signals(text, wc, title, links_ext, schema, paragraphs)
        media = self._media_analysis(images, html, wc)
        freshness = self._freshness(text, html)
        word_quality = self._word_quality(sentences, text)
        spam_risk = self._spam_check(text, title)

        all_signals = readability["signals"] + structure["signals"] + depth["signals"] + eat["signals"] + media["signals"] + freshness["signals"] + word_quality["signals"] + spam_risk["signals"]

        cat_scores = {
            "readability": readability["score"],
            "structure": structure["score"],
            "depth": depth["score"],
            "eeat": eat["score"],
            "media": media["score"],
            "freshness": freshness["score"],
            "word_quality": word_quality["score"],
            "spam_risk": spam_risk["score"],
        }

        weights = {"readability": 0.20, "structure": 0.15, "depth": 0.20, "eeat": 0.20, "media": 0.05, "freshness": 0.05, "word_quality": 0.10, "spam_risk": 0.05}
        overall = sum(cat_scores.get(c, 50) * w for c, w in weights.items())

        issues = self._generate_issues(all_signals, wc, title)

        return {
            "content_score": round(overall, 1),
            "signals_checked": len(all_signals),
            "category_scores": cat_scores,
            "readability": readability,
            "structure": structure,
            "depth": depth,
            "eeat": eat,
            "media": media,
            "freshness": freshness,
            "word_quality": word_quality,
            "spam_risk": spam_risk,
            "diagnostics": {
                cat: [s for s in all_signals if s["category"] == cat]
                for cat in cat_scores
            },
            "issues": issues,
            "paragraph_analysis": self._paragraph_summary(paragraphs),
        }

    def _extract_paragraphs(self, text):
        paras = [p.strip() for p in _PARA_RE.split(text) if len(p.strip()) > 20]
        return paras

    def _flesch_kincaid(self, text, sentence_count, word_count):
        if sentence_count == 0 or word_count == 0:
            return 50.0
        syllables = len(_SYLLABLE_RE.findall(text))
        asl = word_count / sentence_count
        asw = syllables / word_count
        score = 206.835 - 1.015 * asl - 84.6 * asw
        return max(0, min(100, score))

    def _readability(self, text, sentences, paragraphs):
        sigs = []
        wc = len(_WORD_RE.findall(text))
        sc = max(len(sentences), 1)

        fk = self._flesch_kincaid(text, sc, wc)
        if fk >= 60:
            sigs.append(self._sig("readability", "flesch_kincaid", "pass", f"{fk:.0f}", ">=60", f"Readable (Flesch-Kincaid {fk:.0f})"))
        elif fk >= 40:
            sigs.append(self._sig("readability", "flesch_kincaid", "warn", f"{fk:.0f}", ">=60", f"Slightly difficult (Flesch-Kincaid {fk:.0f})"))
        else:
            sigs.append(self._sig("readability", "flesch_kincaid", "fail", f"{fk:.0f}", ">=60", f"Very difficult to read (Flesch-Kincaid {fk:.0f})"))

        avg_sentence_len = wc / sc
        if avg_sentence_len <= 20:
            sigs.append(self._sig("readability", "sentence_length", "pass", f"{avg_sentence_len:.0f} words", "<=20", "Good sentence length"))
        elif avg_sentence_len <= 30:
            sigs.append(self._sig("readability", "sentence_length", "warn", f"{avg_sentence_len:.0f} words", "<=20", "Sentences slightly long"))
        else:
            sigs.append(self._sig("readability", "sentence_length", "fail", f"{avg_sentence_len:.0f} words", "<=20", "Sentences too long for readability"))

        long_sentences = sum(1 for s in sentences if len(_WORD_RE.findall(s)) > 30)
        long_pct = (long_sentences / max(sc, 1)) * 100
        if long_pct <= 15:
            sigs.append(self._sig("readability", "long_sentences", "pass", f"{long_pct:.0f}%", "<=15%", "Few long sentences"))
        else:
            sigs.append(self._sig("readability", "long_sentences", "warn", f"{long_pct:.0f}%", "<=15%", f"{long_pct:.0f}% of sentences are too long"))

        paragraphs_raw = [p.strip() for p in _PARA_RE.split(text) if len(p.strip()) > 10]
        avg_para = sum(len(_WORD_RE.findall(p)) for p in paragraphs_raw) / max(len(paragraphs_raw), 1)
        if 30 <= avg_para <= 100:
            sigs.append(self._sig("readability", "paragraph_length", "pass", f"{avg_para:.0f} words", "30-100", "Optimal paragraph length"))
        elif avg_para > 150:
            sigs.append(self._sig("readability", "paragraph_length", "warn", f"{avg_para:.0f} words", "30-100", "Paragraphs too long"))
        else:
            sigs.append(self._sig("readability", "paragraph_length", "warn", f"{avg_para:.0f} words", "30-100", "Paragraphs may be too short"))

        transitions = len(_TRANSITION_RE.findall(text))
        if transitions >= 5:
            sigs.append(self._sig("readability", "transitions", "pass", transitions, ">=5", "Good transition word usage"))
        elif transitions >= 2:
            sigs.append(self._sig("readability", "transitions", "warn", transitions, ">=5", f"Only {transitions} transition words"))
        else:
            sigs.append(self._sig("readability", "transitions", "warn", transitions, ">=5", "Very few transition words"))

        score = self._compute_score(sigs)
        return {"score": score, "flesch_kincaid": round(fk, 1), "signals": sigs}

    def _structure(self, text, html, title, h1, paragraphs):
        sigs = []

        h1_count = len(re.findall(r'<h1\b', html, re.I))
        if h1_count == 1:
            sigs.append(self._sig("structure", "h1_count", "pass", "1", "1", "Single H1 tag"))
        elif h1_count == 0:
            sigs.append(self._sig("structure", "h1_count", "fail", "0", "1", "No H1 tag"))
        else:
            sigs.append(self._sig("structure", "h1_count", "warn", h1_count, "1", f"Multiple H1 tags ({h1_count})"))

        h2_count = len(re.findall(r'<h2\b', html, re.I))
        h3_count = len(re.findall(r'<h3\b', html, re.I))
        if h2_count >= 2:
            sigs.append(self._sig("structure", "subheadings", "pass", f"{h2_count} H2, {h3_count} H3", ">=2 H2", "Good heading structure"))
        elif h2_count >= 1:
            sigs.append(self._sig("structure", "subheadings", "warn", f"{h2_count} H2", ">=2 H2", "More subheadings recommended"))
        else:
            sigs.append(self._sig("structure", "subheadings", "warn", "0 H2", ">=2 H2", "No subheadings found"))

        question_headings = len(re.findall(r'<h[23][^>]*>\s*(?:what|how|why|when|where|which|who|is|are|do|does|can|should|will)\b', html, re.I))
        if question_headings >= 1:
            sigs.append(self._sig("structure", "question_headings", "pass", question_headings, ">=1", "Question-format headings present"))
        else:
            sigs.append(self._sig("structure", "question_headings", "warn", 0, ">=1", "No question-format headings (helps featured snippets)"))

        lists = len(re.findall(r'<(?:ul|ol)\b', html, re.I))
        if lists >= 1:
            sigs.append(self._sig("structure", "lists", "pass", lists, ">=1", f"{lists} list elements present"))
        else:
            sigs.append(self._sig("structure", "lists", "warn", 0, ">=1", "No lists found — lists improve scannability"))

        tables = len(re.findall(r'<table\b', html, re.I))
        if tables >= 1:
            sigs.append(self._sig("structure", "tables", "pass", tables, ">=1", f"{tables} tables present"))
        else:
            sigs.append(self._sig("structure", "tables", "warn", 0, ">=1", "No tables found"))

        toc = bool(re.search(r'table.of.contents|toc|in.this.article|on.this.page', html, re.I))
        if toc:
            sigs.append(self._sig("structure", "table_of_contents", "pass", "present", "present", "Table of contents detected"))
        else:
            sigs.append(self._sig("structure", "table_of_contents", "warn", "missing", "present", "No table of contents"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _depth(self, text, wc, paragraphs, sentences):
        sigs = []

        if wc >= 2000:
            sigs.append(self._sig("depth", "word_count", "pass", wc, ">=2000", f"Comprehensive content ({wc} words)"))
        elif wc >= 1000:
            sigs.append(self._sig("depth", "word_count", "warn", wc, ">=2000", f"Good but could be deeper ({wc} words)"))
        else:
            sigs.append(self._sig("depth", "word_count", "fail", wc, ">=2000", f"Thin content ({wc} words)"))

        definitions = len(re.findall(r'(?:is|are|refers to|means|defined as|known as)\s+(?:a|an|the)?\s*\w', text, re.I))
        if definitions >= 2:
            sigs.append(self._sig("depth", "definitions", "pass", definitions, ">=2", f"{definitions} definition-style sentences"))
        elif definitions >= 1:
            sigs.append(self._sig("depth", "definitions", "warn", definitions, ">=2", "Only 1 definition — add more"))
        else:
            sigs.append(self._sig("depth", "definitions", "warn", 0, ">=2", "No definitions found — AI platforms extract these"))

        statistics = len(re.findall(r'\d+\.?\d*\s*%|\$\d+|\d+\s*(?:million|billion|thousand|k\b|m\b)', text, re.I))
        if statistics >= 3:
            sigs.append(self._sig("depth", "statistics", "pass", statistics, ">=3", f"{statistics} statistics present"))
        elif statistics >= 1:
            sigs.append(self._sig("depth", "statistics", "warn", statistics, ">=3", "More statistics recommended"))
        else:
            sigs.append(self._sig("depth", "statistics", "warn", 0, ">=3", "No statistics found"))

        examples = len(re.findall(r'(?:for example|for instance|such as|e\.g\.|like|specifically|including)', text, re.I))
        if examples >= 2:
            sigs.append(self._sig("depth", "examples", "pass", examples, ">=2", f"{examples} examples found"))
        else:
            sigs.append(self._sig("depth", "examples", "warn", examples, ">=2", "Add more examples for depth"))

        comparisons = len(re.findall(r'\b(?:compared to|versus|vs\.?|better than|worse than|more than|less than|unlike|similar to|in contrast)\b', text, re.I))
        if comparisons >= 1:
            sigs.append(self._sig("depth", "comparisons", "pass", comparisons, ">=1", "Comparative content present"))
        else:
            sigs.append(self._sig("depth", "comparisons", "warn", 0, ">=1", "No comparisons found"))

        steps = bool(re.search(r'(?:step\s+\d|first|second|third|finally|to\s+do\s+this|here\'s\s+how|follow\s+these)', text, re.I))
        if steps:
            sigs.append(self._sig("depth", "process_content", "pass", "present", "present", "Step-by-step process content found"))
        else:
            sigs.append(self._sig("depth", "process_content", "warn", "missing", "present", "No process/how-to content"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _eeat_signals(self, text, wc, title, links_ext, schema, paragraphs):
        sigs = []

        has_author = bool(re.search(r'(?:written by|author|byline|contributor|bio:|about the author)', text, re.I))
        if has_author:
            sigs.append(self._sig("eeat", "author_attribution", "pass", "present", "present", "Author attribution found"))
        else:
            sigs.append(self._sig("eeat", "author_attribution", "warn", "missing", "present", "No author attribution — E-E-A-T signal"))

        has_dates = bool(re.search(r'(?:published|updated|last modified|date:|on\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})', text, re.I))
        if has_dates:
            sigs.append(self._sig("eeat", "publication_date", "pass", "present", "present", "Publication/update date found"))
        else:
            sigs.append(self._sig("eeat", "publication_date", "warn", "missing", "present", "No publication date — E-E-A-T signal"))

        sources = len(re.findall(r'(?:source:|according to|research by|study by|published in|journal of|doi:)', text, re.I))
        if sources >= 2:
            sigs.append(self._sig("eeat", "source_citations", "pass", sources, ">=2", f"{sources} source citations"))
        elif sources >= 1:
            sigs.append(self._sig("eeat", "source_citations", "warn", sources, ">=2", "More source citations recommended"))
        else:
            sigs.append(self._sig("eeat", "source_citations", "warn", 0, ">=2", "No source citations found"))

        quotes = len(re.findall(r'["""].*?["""]|said:|stated:|noted:|explained:|according to', text, re.I))
        if quotes >= 2:
            sigs.append(self._sig("eeat", "expert_quotes", "pass", quotes, ">=2", f"{quotes} expert quotes/references"))
        elif quotes >= 1:
            sigs.append(self._sig("eeat", "expert_quotes", "warn", quotes, ">=2", "More expert quotes recommended"))
        else:
            sigs.append(self._sig("eeat", "expert_quotes", "warn", 0, ">=2", "No expert quotes found"))

        types = [item.get("@type", "") for item in schema if isinstance(item, dict)]
        has_org = any(t in types for t in ["Organization", "LocalBusiness", "Person"])
        if has_org:
            sigs.append(self._sig("eeat", "org_schema", "pass", "present", "present", "Organization/Person schema present"))
        else:
            sigs.append(self._sig("eeat", "org_schema", "warn", "missing", "present", "No Organization/Person schema"))

        first_hand = bool(re.search(r'(?:we tested|our experience|in our|based on our|from our own|we found|we observed|we analyzed|we surveyed|our research)', text, re.I))
        if first_hand:
            sigs.append(self._sig("eeat", "first_hand_experience", "pass", "present", "present", "First-hand experience signals"))
        else:
            sigs.append(self._sig("eeat", "first_hand_experience", "warn", "missing", "present", "No first-hand experience signals"))

        balanced = bool(re.search(r'(?:however|on the other hand|alternatively|disadvantage|drawback|limitation|con|pros and cons)', text, re.I))
        if balanced:
            sigs.append(self._sig("eeat", "balanced_viewpoint", "pass", "present", "present", "Balanced viewpoint present"))
        else:
            sigs.append(self._sig("eeat", "balanced_viewpoint", "warn", "missing", "present", "No balanced viewpoint"))

        if wc >= 1500:
            sigs.append(self._sig("eeat", "comprehensive_coverage", "pass", wc, ">=1500", "Comprehensive topic coverage"))
        elif wc >= 800:
            sigs.append(self._sig("eeat", "comprehensive_coverage", "warn", wc, ">=1500", "Moderate coverage — expand for authority"))
        else:
            sigs.append(self._sig("eeat", "comprehensive_coverage", "fail", wc, ">=1500", "Insufficient coverage for E-E-A-T"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _media_analysis(self, images, html, wc):
        sigs = []
        img_count = len(images) if isinstance(images, list) else 0

        if img_count >= 3:
            sigs.append(self._sig("media", "image_count", "pass", img_count, ">=3", f"{img_count} images present"))
        elif img_count >= 1:
            sigs.append(self._sig("media", "image_count", "warn", img_count, ">=3", "Add more images"))
        else:
            sigs.append(self._sig("media", "image_count", "warn", 0, ">=3", "No images found"))

        imgs_with_alt = sum(1 for img in images if isinstance(img, dict) and img.get("alt"))
        if img_count > 0:
            alt_pct = (imgs_with_alt / img_count) * 100
            if alt_pct >= 80:
                sigs.append(self._sig("media", "alt_text", "pass", f"{alt_pct:.0f}%", ">=80%", "Good alt text coverage"))
            else:
                sigs.append(self._sig("media", "alt_text", "warn", f"{alt_pct:.0f}%", ">=80%", f"Only {alt_pct:.0f}% of images have alt text"))
        else:
            sigs.append(self._sig("media", "alt_text", "warn", "N/A", ">=80%", "No images to check alt text"))

        img_ratio = img_count / max(wc, 1) * 1000
        if img_ratio >= 1:
            sigs.append(self._sig("media", "image_density", "pass", f"{img_ratio:.1f}/1000w", ">=1/1000w", "Good image density"))
        else:
            sigs.append(self._sig("media", "image_density", "warn", f"{img_ratio:.1f}/1000w", ">=1/1000w", "Low image density"))

        lazy = bool(re.search(r'loading\s*=\s*["\']lazy["\']', html, re.I))
        if lazy:
            sigs.append(self._sig("media", "lazy_loading", "pass", "present", "present", "Lazy loading implemented"))
        else:
            sigs.append(self._sig("media", "lazy_loading", "warn", "missing", "present", "No lazy loading detected"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _freshness(self, text, html):
        sigs = []

        year_refs = re.findall(r'\b202[0-9]\b', text)
        if year_refs:
            latest = max(year_refs)
            sigs.append(self._sig("freshness", "year_references", "pass", latest, "current year", f"References year {latest}"))
        else:
            sigs.append(self._sig("freshness", "year_references", "warn", "none", "current year", "No year references in content"))

        has_update = bool(re.search(r'(?:updated|last updated|revised|refreshed|newly|recently|as of)', text, re.I))
        if has_update:
            sigs.append(self._sig("freshness", "update_signals", "pass", "present", "present", "Update/freshness signals found"))
        else:
            sigs.append(self._sig("freshness", "update_signals", "warn", "missing", "present", "No update signals found"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _word_quality(self, sentences, text):
        sigs = []
        wc = len(_WORD_RE.findall(text))

        passive_count = len(_PASSIVE_RE.findall(text))
        passive_pct = (passive_count / max(len(sentences), 1)) * 100
        if passive_pct <= 10:
            sigs.append(self._sig("word_quality", "passive_voice", "pass", f"{passive_pct:.0f}%", "<=10%", "Low passive voice"))
        elif passive_pct <= 20:
            sigs.append(self._sig("word_quality", "passive_voice", "warn", f"{passive_pct:.0f}%", "<=10%", f"Moderate passive voice ({passive_pct:.0f}%)"))
        else:
            sigs.append(self._sig("word_quality", "passive_voice", "fail", f"{passive_pct:.0f}%", "<=10%", f"High passive voice ({passive_pct:.0f}%)"))

        hedging = len(_HEDGING.findall(text))
        if hedging <= 2:
            sigs.append(self._sig("word_quality", "hedging_language", "pass", f"{hedging}", "<=3", "Minimal hedging language"))
        else:
            sigs.append(self._sig("word_quality", "hedging_language", "warn", f"{hedging}", "<=3", f"Too much hedging ({hedging} instances)"))

        filler = len(re.findall(r'\b(?:very|really|quite|just|basically|actually|literally|definitely|absolutely|certainly)\b', text, re.I))
        filler_pct = (filler / max(wc, 1)) * 100
        if filler_pct <= 1:
            sigs.append(self._sig("word_quality", "filler_words", "pass", f"{filler_pct:.1f}%", "<=1%", "Minimal filler words"))
        else:
            sigs.append(self._sig("word_quality", "filler_words", "warn", f"{filler_pct:.1f}%", "<=1%", f"Too many filler words ({filler_pct:.1f}%)"))

        unique_words = set(w.lower() for w in _WORD_RE.findall(text))
        lexical_diversity = len(unique_words) / max(wc, 1)
        if lexical_diversity >= 0.5:
            sigs.append(self._sig("word_quality", "lexical_diversity", "pass", f"{lexical_diversity:.2f}", ">=0.5", "Good vocabulary diversity"))
        elif lexical_diversity >= 0.35:
            sigs.append(self._sig("word_quality", "lexical_diversity", "warn", f"{lexical_diversity:.2f}", ">=0.5", "Moderate vocabulary diversity"))
        else:
            sigs.append(self._sig("word_quality", "lexical_diversity", "fail", f"{lexical_diversity:.2f}", ">=0.5", "Low vocabulary diversity — repetitive"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _spam_check(self, text, title):
        sigs = []

        spam = len(_SPAM_PATTERNS.findall(text + " " + title))
        if spam == 0:
            sigs.append(self._sig("spam_risk", "spam_signals", "pass", "0", "0", "No spam signals detected"))
        elif spam <= 2:
            sigs.append(self._sig("spam_risk", "spam_signals", "warn", spam, "0", f"{spam} spam-like phrases found"))
        else:
            sigs.append(self._sig("spam_risk", "spam_signals", "fail", spam, "0", f"{spam} spam signals — high risk"))

        superlatives = len(_SUPERLATIVES.findall(text))
        if superlatives <= 3:
            sigs.append(self._sig("spam_risk", "superlatives", "pass", superlatives, "<=3", "Acceptable use of superlatives"))
        else:
            sigs.append(self._sig("spam_risk", "superlatives", "warn", superlatives, "<=3", f"Excessive superlatives ({superlatives})"))

        exclamation = text.count("!")
        if exclamation <= 2:
            sigs.append(self._sig("spam_risk", "exclamation_marks", "pass", exclamation, "<=3", "Few exclamation marks"))
        else:
            sigs.append(self._sig("spam_risk", "exclamation_marks", "warn", exclamation, "<=3", f"Too many exclamation marks ({exclamation})"))

        score = self._compute_score(sigs)
        return {"score": score, "signals": sigs}

    def _compute_score(self, sigs):
        if not sigs:
            return 50.0
        passes = sum(1 for s in sigs if s["status"] == "pass")
        warns = sum(1 for s in sigs if s["status"] == "warn")
        total = len(sigs)
        return round((passes * 100 + warns * 50) / total, 1)

    def _sig(self, category, name, status, value, expected, detail):
        return {"category": category, "name": name, "status": status, "value": value, "expected": expected, "detail": detail}

    def _generate_issues(self, signals, wc, title):
        issues = []
        counter = 0
        issue_map = {
            "flesch_kincaid": ("HIGH", "content readability", "Simplify language: use shorter sentences, common words, and active voice to improve Flesch-Kincaid score"),
            "sentence_length": ("MEDIUM", "sentence length", "Break long sentences into 2 shorter ones (target 15-20 words per sentence)"),
            "word_count": ("HIGH", "content depth", "Expand content to 1500+ words with comprehensive topic coverage, examples, and FAQs"),
            "definitions": ("MEDIUM", "content depth", "Add definition-style sentences (e.g., 'X is a Y that Z') — AI platforms extract these"),
            "statistics": ("MEDIUM", "content depth", "Add 3+ specific statistics with sources (e.g., 'According to Gartner, 47% of...')"),
            "author_attribution": ("HIGH", "E-E-A-T", "Add author name and bio — critical for Google's E-E-A-T evaluation"),
            "publication_date": ("MEDIUM", "E-E-A-T", "Add publication/update date — freshness signal for Google and AI platforms"),
            "source_citations": ("HIGH", "E-E-A-T", "Add 2+ named source citations (e.g., 'According to McKinsey research...')"),
            "expert_quotes": ("MEDIUM", "E-E-A-T", "Add expert quotes to establish authority and first-hand experience"),
            "first_hand_experience": ("HIGH", "E-E-A-T", "Add first-hand experience signals ('We tested', 'In our experience') — Google's Helpful Content signal"),
            "alt_text": ("MEDIUM", "media", "Add descriptive alt text to all images with relevant keywords"),
            "spam_signals": ("CRITICAL", "content quality", "Remove spam-like phrases immediately — Google penalty risk"),
            "hedging_language": ("LOW", "word quality", "Replace hedging words ('maybe', 'perhaps') with confident statements"),
            "passive_voice": ("MEDIUM", "word quality", "Rewrite passive voice sentences in active voice"),
        }

        for sig in signals:
            if sig["status"] in ("fail", "warn") and sig["name"] in issue_map:
                counter += 1
                sev, element, fix = issue_map[sig["name"]]
                issues.append({
                    "id": f"CONTENT-{counter:03d}",
                    "category": sig["category"].replace("_", "-").title(),
                    "severity": sev,
                    "element": element,
                    "issue": sig["detail"],
                    "current_value": str(sig["value"])[:200],
                    "recommended_value": sig["expected"],
                    "impact_score": 90 if sev == "CRITICAL" else 70 if sev == "HIGH" else 40 if sev == "MEDIUM" else 20,
                    "effort": "Low" if "missing" in str(sig["value"]).lower() else "Medium",
                    "fix": fix,
                    "seo_justification": f"Content quality signal '{sig['name']}' directly impacts search ranking and AI citation eligibility.",
                })

        issues.sort(key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(x["severity"], 4))
        return issues

    def _paragraph_summary(self, paragraphs):
        if not paragraphs:
            return {"count": 0, "avg_words": 0, "too_long": 0, "too_short": 0}
        wc = [len(_WORD_RE.findall(p)) for p in paragraphs]
        return {
            "count": len(paragraphs),
            "avg_words": round(sum(wc) / len(wc)),
            "too_long": sum(1 for w in wc if w > 150),
            "too_short": sum(1 for w in wc if w < 30),
        }
