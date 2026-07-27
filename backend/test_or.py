import sys, asyncio, httpx, logging
sys.path.insert(0, ".")
from app.config import settings

logging.basicConfig(level=logging.DEBUG)

async def test():
    print("API Key:", settings.OPENROUTER_API_KEY[:20] if settings.OPENROUTER_API_KEY else "EMPTY")
    print("Model:", settings.OPENROUTER_MODEL)
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": "Bearer " + settings.OPENROUTER_API_KEY,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "AI SEO Platform",
            },
            json={
                "model": settings.OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": "Return JSON only: {\"hello\": \"world\"}"}],
                "temperature": 0.3,
                "max_tokens": 3500,
            },
        )
        print("Status:", resp.status_code)
        print("Body:", resp.text[:500])

asyncio.run(test())
