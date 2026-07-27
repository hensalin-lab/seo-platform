"""Test GSC connectivity and property matching."""
import os, sys, json

sys.path.insert(0, os.path.dirname(__file__))

from app.engine.gsc_engine import GSCEngine

engine = GSCEngine()
service = engine._get_service()

if not service:
    print("ERROR: GSC service not available")
    sys.exit(1)

# Test 1: List properties
print("=== PROPERTIES VISIBLE TO SERVICE ACCOUNT ===")
sites = service.sites().list().execute()
for site in sites.get("siteEntry", []):
    print("  ", site["siteUrl"])
print("Total:", len(sites.get("siteEntry", [])))

# Test 2: Query with exact trailing slash
print("\n=== QUERY WITH TRAILING SLASH ===")
try:
    response = service.searchanalytics().query(
        siteUrl="https://www.datavicloud.ai/",
        body={
            "startDate": "2026-06-20",
            "endDate": "2026-07-20",
            "dimensions": ["query"],
            "rowLimit": 5,
            "dataState": "final",
        }
    ).execute()
    rows = response.get("rows", [])
    print(f"Rows returned: {len(rows)}")
    for row in rows[:5]:
        print(f"  Query: {row['keys'][0]}, Clicks: {row.get('clicks', 0)}, Impressions: {row.get('impressions', 0)}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Query WITHOUT trailing slash
print("\n=== QUERY WITHOUT TRAILING SLASH ===")
try:
    response = service.searchanalytics().query(
        siteUrl="https://www.datavicloud.ai",
        body={
            "startDate": "2026-06-20",
            "endDate": "2026-07-20",
            "dimensions": ["query"],
            "rowLimit": 5,
            "dataState": "final",
        }
    ).execute()
    rows = response.get("rows", [])
    print(f"Rows returned: {len(rows)}")
    for row in rows[:5]:
        print(f"  Query: {row['keys'][0]}, Clicks: {row.get('clicks', 0)}, Impressions: {row.get('impressions', 0)}")
except Exception as e:
    print(f"Error: {e}")

# Test 4: What URL the backend actually sends
print("\n=== BACKEND PROPERTY URL ===")
audit_url = "https://www.datavicloud.ai"
print(f"Website URL from audit: {audit_url}")
print(f"This matches with trailing slash: {audit_url}/")
