import logging
import datetime as _dt

logger = logging.getLogger(__name__)


async def run_startup_maintenance() -> dict:
    """Runs on every boot. Recovers audits killed by a restart and reclaims disk
    space that raw page HTML consumed. Uses a single connection so PRAGMA settings
    and statements share it (SQLite journal_mode is per-connection)."""
    from sqlalchemy import text
    from app.database import engine

    result = {"stuck_audits": 0, "html_cleared": 0, "vacuum": "skipped"}

    try:
        async with engine.connect() as conn:
            now = _dt.datetime.utcnow().isoformat(timespec="seconds")

            res = await conn.execute(
                text(
                    "UPDATE audits SET status='FAILED', error_message='Audit interrupted by server restart', "
                    "completed_at=:now WHERE status NOT IN ('COMPLETED','FAILED')"
                ),
                {"now": now},
            )
            result["stuck_audits"] = res.rowcount or 0
            logger.info(f"Startup maintenance: marked {result['stuck_audits']} stuck audits as FAILED")

            # The disk is often completely full here, so a journaled UPDATE would fail
            # (it needs rollback space). Turn the journal off first; freed pages go to
            # the freelist and are reused by later INSERTs without growing the file.
            try:
                await conn.execute(text("PRAGMA journal_mode=OFF"))
                res = await conn.execute(text("UPDATE pages SET html_raw=''"))
                result["html_cleared"] = res.rowcount or 0
                logger.info(f"Startup maintenance: cleared html_raw on {result['html_cleared']} pages (journal off)")
            except Exception as e:
                result["html_error"] = str(e)
                logger.warning(f"Startup maintenance: could not clear html_raw: {e}")

            await conn.commit()

            try:
                await conn.execute(text("PRAGMA journal_mode=DELETE"))
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Startup maintenance failed: {e}")
        result["error"] = str(e)
        return result

    # VACUUM shrinks the file but needs free disk to write it; best effort only.
    try:
        async with engine.connect() as conn:
            await conn.execute(text("VACUUM"))
        result["vacuum"] = "ok"
        logger.info("Startup maintenance: VACUUM complete")
    except Exception as e:
        result["vacuum"] = f"failed (non-fatal): {e}"
        logger.warning(f"Startup maintenance: VACUUM failed (non-fatal): {e}")

    return result
