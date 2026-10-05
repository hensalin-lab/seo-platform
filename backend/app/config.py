import os
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


class Settings(BaseSettings):
    APP_NAME: str = "AI SEO Intelligence Platform"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite+aiosqlite:///./seo_platform.db"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def uses_transaction_pooler(self) -> bool:
        """True when DATABASE_URL points at Supabase's transaction-mode pooler.

        Supabase's session-mode pooler (port 5432) caps the free tier at a
        single client, which the connection pool plus the background workers
        exhaust immediately (EMAXCONNSESSION). The transaction-mode pooler
        (6543) serves many clients but multiplexes over a single connection, so
        server-side prepared statements must be disabled for it. That has to be
        an int in connect_args -- a URL query param arrives as a str and asyncpg
        rejects it.
        """
        return ":6543/" in self.DATABASE_URL

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GEMINI_TIMEOUT: int = 45
    GEMINI_MAX_RETRIES: int = 3

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TIMEOUT: int = 45
    OPENAI_MAX_RETRIES: int = 3

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o"
    OPENROUTER_MODEL_REWRITE: str = "qwen/qwen3-235b-a22b"
    OPENROUTER_MODEL_COMPETITOR: str = "deepseek/deepseek-chat-v3-0324"
    OPENROUTER_MODEL_FREE: str = "openrouter/free"
    # Free OpenRouter model used by the grammar-check AI ensemble. The free-tier
    # catalog churns (google/gemini-2.0-flash-exp:free was delisted), so
    # ai_validator.py falls back to newer free models if this one 404s.
    OPENROUTER_MODEL_GRAMMAR: str = "google/gemma-4-31b-it:free"
    OPENROUTER_TIMEOUT: int = 80

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_TIMEOUT: int = 30
    GROQ_MAX_RETRIES: int = 3

    CEREBRAS_API_KEY: str = ""
    CEREBRAS_MODEL: str = "gemma-4-31b"
    CEREBRAS_TIMEOUT: int = 30
    CEREBRAS_MAX_RETRIES: int = 3

    # ---- AI grammar-validation ensemble ----
    # Multiple free LLM providers judge each rule-engine correction and the
    # majority vote decides. Order controls which providers are tried first.
    GRAMMAR_AI_ENABLED: bool = True
    GRAMMAR_AI_PROVIDERS: str = "gemini,groq,openrouter"
    # How many providers must approve before a correction is accepted. With 3
    # providers the default 2 gives a true majority.
    GRAMMAR_AI_MIN_APPROVALS: int = 2
    # Per-call timeout for a single provider verdict (seconds). Kept short so a
    # slow provider can't stall interactive grammar checking.
    GRAMMAR_AI_TIMEOUT: int = 20

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    # Fast local model used in the live provider race so free/unlimited Ollama
    # suggestions finish quickly and actually get merged into results. The full
    # OLLAMA_MODEL is still used by deeper fallback paths (_ollama_simple_fixes).
    OLLAMA_MODEL_FAST: str = "qwen3:1.7b"
    OLLAMA_TIMEOUT: int = 180

    # When wait_for_local=True, how many extra seconds to wait after the first
    # cloud answer for an alive local provider to contribute its suggestions.
    LOCAL_GRACE_SECONDS: float = 40.0

    LMSTUDIO_BASE_URL: str = "http://localhost:1234/v1"
    LMSTUDIO_MODEL: str = "qwen3-8b"
    LMSTUDIO_TIMEOUT: int = 300

    VLLM_BASE_URL: str = "http://localhost:8000/v1"
    VLLM_MODEL: str = ""
    VLLM_TIMEOUT: int = 180

    LLAMACPP_BASE_URL: str = "http://localhost:8080/v1"
    LLAMACPP_MODEL: str = "local"
    LLAMACPP_TIMEOUT: int = 180

    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_AI_MODEL: str = "@cf/openai/gpt-oss-120b"
    CLOUDFLARE_AI_TIMEOUT: int = 30

    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    MISTRAL_TIMEOUT: int = 30

    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "meta/llama-3.3-70b-instruct"
    NVIDIA_TIMEOUT: int = 30

    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_MODEL: str = "Qwen/Qwen2.5-72B-Instruct"
    HUGGINGFACE_TIMEOUT: int = 30

    GITHUB_TOKEN: str = ""
    GITHUB_MODEL: str = "gpt-4o-mini"
    GITHUB_TIMEOUT: int = 30

    SAMBANOVA_API_KEY: str = ""
    SAMBANOVA_MODEL: str = "Meta-Llama-3.3-70B-Instruct"
    SAMBANOVA_TIMEOUT: int = 30

    CRAWLER_TIMEOUT: int = 15
    CRAWLER_MAX_PAGES: int = 300
    CRAWLER_MAX_DEPTH: int = 10
    CRAWLER_CONCURRENCY: int = 6
    CRAWLER_USER_AGENT: str = "SEOIntelligenceBot/2.0 (+https://seo-platform.app; SEO analysis crawler)"
    CRAWLER_VERIFY_SSL: bool = True
    CRAWLER_RESPECT_ROBOTS: bool = True
    CRAWLER_POLITE_DELAY: float = 0.2
    CRAWLER_SITEMAP_SEEDING: bool = True
    CRAWLER_SITEMAP_MAX_PAGES: int = 300
    CRAWLER_JS_RENDER: bool = False
    # Trimmed per-page payloads. These sit in RAM (many pages concurrently) on a
    # small 512MB instance; over-limit values are the biggest OOM driver and the
    # root cause of the process dying mid-crawl on large audits.
    CRAWLER_HTML_RAW_LIMIT: int = 12000
    CRAWLER_CONTENT_LIMIT: int = 50000
    CRAWLER_PAGE_TIMEOUT: int = 30
    CRAWLER_CRAWL_TIMEOUT: int = 1500
    CRAWLER_IDLE_TIMEOUT: int = 90
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://seo-platform.vercel.app",
        "https://seo-platform-xi.vercel.app",
        "https://seo-platform-e89q0082h-seo-tools1.vercel.app",
        "https://seo-platform-jr83tb3xw-seo-tools1.vercel.app",
        "https://seo-platform-de0dwy0qd-seo-tools1.vercel.app",
        "https://frontend-one-sand-27.vercel.app",
        "https://rankiq-seo-tools1.vercel.app",
    ]

    AI_TIMEOUT: int = 45
    AI_MAX_RETRIES: int = 3
    ANALYSIS_TIMEOUT: int = 600

    JWT_SECRET_KEY: str = "seo-platform-jwt-secret-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Used to encrypt OAuth tokens at rest. When unset, derived from JWT_SECRET_KEY.
    TOKEN_ENCRYPTION_KEY: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8001/api/integrations/google/callback"

    PAGESPEED_API_KEY: str = ""

    DATAFORSEO_LOGIN: str = ""
    DATAFORSEO_PASSWORD: str = ""

    SERP_API_KEY: str = ""

    GOOGLE_CSE_API_KEY: str = ""
    GOOGLE_CSE_CX: str = ""

    MOZ_ACCESS_ID: str = ""
    MOZ_SECRET_KEY: str = ""
    SE_RANKING_TOKEN: str = ""
    PROFOUND_API_KEY: str = ""
    OPEN_PAGERANK_API_KEY: str = ""
    OPEN_SERP_API_KEY: str = ""
    SERPER_API_KEY: str = ""

    GSC_SERVICE_ACCOUNT_JSON: str = ""
    GSC_PROPERTY_URL: str = ""

    INDEXNOW_KEY: str = ""

    # ---- Provider spend budgets ----
    # Per-user-per-day budgets for paid third-party providers. A value of 0
    # disables the provider (hard block); -1 means unlimited (no cap). These
    # guard against runaway spend when users bring their own paid API keys.
    PROVIDER_DAILY_BUDGET_DATAFORSEO: int = 200
    PROVIDER_DAILY_BUDGET_MOZ: int = 100
    PROVIDER_DAILY_BUDGET_PAGERANK: int = 100
    PROVIDER_DAILY_BUDGET_SERPAPI: int = 100
    PROVIDER_DAILY_BUDGET_PAGESPEED: int = 200
    PROVIDER_DAILY_BUDGET_CITATIONS: int = 100

    # Default daily budget if a provider has no explicit setting above.
    PROVIDER_DEFAULT_DAILY_BUDGET: int = 200

    # Per-endpoint request throttles (slowapi). Kept in config so operators can
    # tune without code changes.
    RATE_LIMIT_AUDIT: str = "10/minute"
    RATE_LIMIT_KEYWORD_VOLUME: str = "30/minute"
    RATE_LIMIT_SERP: str = "30/minute"
    RATE_LIMIT_BACKLINKS: str = "10/minute"
    RATE_LIMIT_PAGESPEED: str = "10/minute"
    RATE_LIMIT_BRAND_MONITOR: str = "10/minute"
    RATE_LIMIT_PROVIDER_TEST: str = "10/minute"
    RATE_LIMIT_REGISTER: str = "10/hour"
    RATE_LIMIT_AI_ANALYSIS: str = "20/minute"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    APP_URL: str = "https://rankiq-seo-tools1.vercel.app"

    WEBHOOK_SECRET: str = "webhook-secret-change-in-production"

    # When set, requests to /api/mcp must present this value via the
    # X-API-Key header (or Authorization: Bearer). Empty = MCP stays open.
    MCP_API_KEY: str = ""

    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
