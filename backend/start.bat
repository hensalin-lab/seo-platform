@echo off
echo Starting AI SEO Intelligence Platform Backend...
pip install -r requirements.txt --quiet 2>nul
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
