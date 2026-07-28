import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Audit, AuditScore

logger = logging.getLogger(__name__)


class HistoricalTracker:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_trends(self, website_url: str, limit: int = 50) -> dict:
        result = await self.db.execute(
            select(Audit, AuditScore)
            .outerjoin(AuditScore, Audit.id == AuditScore.audit_id)
            .where(Audit.website_url == website_url, Audit.status == "COMPLETED")
            .order_by(Audit.created_at.desc())
            .limit(limit)
        )
        rows = result.all()
        if not rows:
            return {"data_points": [], "trend": "stable", "changes": []}

        data_points = []
        for audit, score in rows:
            data_points.append({
                "audit_id": audit.id,
                "date": audit.created_at.isoformat() if audit.created_at else "",
                "overall_score": score.overall_score if score else 0,
                "seo_score": score.seo_score if score else 0,
                "technical_score": score.technical_score if score else 0,
                "aeo_score": score.aeo_score if score else 0,
                "geo_score": score.geo_score if score else 0,
                "content_score": score.content_score if score else 0,
                "ai_visibility_score": score.ai_visibility_score if score else 0,
            })

        trend = "stable"
        if len(data_points) >= 2:
            diff = data_points[0]["overall_score"] - data_points[1]["overall_score"]
            if diff > 5:
                trend = "improving"
            elif diff < -5:
                trend = "declining"

        changes = []
        if len(data_points) >= 2:
            for key in ["seo_score", "technical_score", "aeo_score", "geo_score", "content_score", "ai_visibility_score"]:
                diff = data_points[0].get(key, 0) - data_points[1].get(key, 0)
                if abs(diff) > 1:
                    changes.append({
                        "metric": key.replace("_score", ""),
                        "change": round(diff, 1),
                        "direction": "up" if diff > 0 else "down",
                    })

        return {
            "data_points": data_points,
            "trend": trend,
            "changes": changes,
            "total_audits": len(data_points),
        }

    async def detect_regressions(self, website_url: str) -> list:
        result = await self.db.execute(
            select(Audit, AuditScore)
            .outerjoin(AuditScore, Audit.id == AuditScore.audit_id)
            .where(Audit.website_url == website_url, Audit.status == "COMPLETED")
            .order_by(Audit.created_at.desc())
            .limit(10)
        )
        rows = result.all()
        regressions = []
        for i in range(len(rows) - 1):
            curr_audit, curr_score = rows[i]
            prev_audit, prev_score = rows[i + 1]
            if curr_score and prev_score:
                for metric in ["overall_score", "seo_score", "technical_score", "content_score"]:
                    curr_val = getattr(curr_score, metric, 0)
                    prev_val = getattr(prev_score, metric, 0)
                    if curr_val < prev_val - 10:
                        regressions.append({
                            "metric": metric.replace("_score", ""),
                            "from": round(prev_val, 1),
                            "to": round(curr_val, 1),
                            "audit_id": curr_audit.id,
                            "date": curr_audit.created_at.isoformat() if curr_audit.created_at else "",
                        })
        return regressions
