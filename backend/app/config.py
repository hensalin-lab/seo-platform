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
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

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
    OPENROUTER_TIMEOUT: int = 80

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT: int = 30
    GROQ_MAX_RETRIES: int = 3

    CEREBRAS_API_KEY: str = ""
    CEREBRAS_MODEL: str = "gemma-4-31b"
    CEREBRAS_TIMEOUT: int = 30
    CEREBRAS_MAX_RETRIES: int = 3

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
    CRAWLER_MAX_PAGES: int = 100
    CRAWLER_MAX_DEPTH: int = 10
    CRAWLER_CONCURRENCY: int = 15
    CRAWLER_USER_AGENT: str = "SEOIntelligenceBot/2.0 (+https://seo-platform.app; SEO analysis crawler)"
    CRAWLER_VERIFY_SSL: bool = True
    CRAWLER_RESPECT_ROBOTS: bool = True
    CRAWLER_POLITE_DELAY: float = 0.2
    CRAWLER_SITEMAP_SEEDING: bool = True
    CRAWLER_SITEMAP_MAX_PAGES: int = 300
    CRAWLER_JS_RENDER: bool = False
    CRAWLER_HTML_RAW_LIMIT: int = 40000

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
    ]

    AI_TIMEOUT: int = 45
    AI_MAX_RETRIES: int = 3
    ANALYSIS_TIMEOUT: int = 600

    JWT_SECRET_KEY: str = "seo-platform-jwt-secret-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8001/api/oauth/callback"

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

    GSC_SERVICE_ACCOUNT_JSON: str = ""
    GSC_PROPERTY_URL: str = ""

    INDEXNOW_KEY: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    APP_URL: str = "https://seo-platform-xi.vercel.app"

    WEBHOOK_SECRET: str = "webhook-secret-change-in-production"

    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
