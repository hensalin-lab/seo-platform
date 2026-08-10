import os
import sys
import sqlite3

url = os.environ.get("DATABASE_URL", "")
path = os.environ.get("DB_PATH", "")
if not path:
    if url.startswith("sqlite"):
        rest = url.split(":///", 1)[1]
        path = rest
if not path or not os.path.exists(path):
    print(f"DB not found at path={path!r} url={url!r}")
    sys.exit(1)

email = os.environ.get("RESET_EMAIL")
new_pw = os.environ.get("RESET_PASSWORD")
if not email or not new_pw:
    print("Set RESET_EMAIL and RESET_PASSWORD environment variables.")
    sys.exit(1)

from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"])
hashed = pwd.hash(new_pw)

con = sqlite3.connect(path)
try:
    cur = con.cursor()
    cur.execute("UPDATE users SET hashed_password=?, updated_at=datetime('now') WHERE email=?", (hashed, email))
    con.commit()
    print(f"rows updated: {cur.rowcount} for {email}")
    cur.execute("SELECT email, substr(hashed_password,1,7), role FROM users WHERE email=?", (email,))
    print("after:", cur.fetchone())
finally:
    con.close()
