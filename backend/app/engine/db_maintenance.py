import logging
import datetime as _dt

logger = logging.getLogger(__name__)

_TERMINAL = ("COMPLETED", "FAILED")


async def run_startup_maintenance() -> dict:
    """Runs on every boot. Recovers audits killed by a restart and reclaims disk
    space that raw page HTML consumed (SQLite never returns it without VACUUM)."""
    from sqlalchemy import update, text
    from app.database import async_session
    from app.models import Audit, Page

    result = {"stuck_audits": 0, "html_cleared": 0, "vacuum": "skipped"}

    try:
        async with async_session() as db:
            res = await db.execute(
                update(Audit)
                .where(Audit.status.not_in(list(_TERMINAL)))
                .values(
                    status="FAILED",
                    error_message="Audit interrupted by server restart",
                    completed_at=_dt.datetime.utcnow(),
                )
            )
            result["stuck_audits"] = res.rowcount or 0
            await db.commit()
            logger.info(f"Startup maintenance: marked {result['stuck_audits']} stuck audits as FAILED")

            res = await db.execute(update(Page).values(html_raw=""))
            result["html_cleared"] = res.rowcount or 0
            await db.commit()
            logger.info(f"Startup maintenance: cleared html_raw on {result['html_cleared']} pages")

            try:
                await db.execute(text("VACUUM"))
                result["vacuum"] = "ok"
                logger.info("Startup maintenance: VACUUM complete")
            except Exception:
                await db.rollback()
                result["vacuum"] = "failed (non-fatal)"
                logger.warning("Startup maintenance: VACUUM failed (non-fatal)")
    except Exception as e:
        logger.error(f"Startup maintenance failed: {e}")
        result["error"] = str(e)

    return result
