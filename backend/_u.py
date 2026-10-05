import asyncio
from sqlalchemy import text

from app.database import engine


async def main():
    async with engine.connect() as c:
        rows = (await c.execute(text(
            "select id, email, username, role, is_active, "
            "length(hashed_password) as pwlen, left(hashed_password, 7) as pwhead, "
            "created_at from users order by created_at"
        ))).mappings().all()
        print("users:", len(rows))
        for r in rows:
            print(dict(r))


asyncio.run(main())
