import logging
import datetime as _dt

logger = logging.getLogger(__name__)


def _db_path_from_url() -> str:
    from sqlalchemy.engine.url import make_url
    from app.config import settings

    try:
        return make_url(settings.DATABASE_URL).database
    except Exception:
        return ""


async def _swap_compact(db_path: str, engine) -> str:
    """Compacts a SQLite DB by VACUUM INTO the container's ephemeral disk and
    swapping the file back. Used when the volume has no free space for an
    in-place VACUUM. The backup is kept on the ephemeral disk during this boot
    so a mid-swap failure can restore the original file."""
    import os
    import shutil
    import sqlite3
    import tempfile

    tmp_dir = tempfile.gettempdir()
    compact = os.path.join(tmp_dir, "seo_platform_compact.db")
    backup = os.path.join(tmp_dir, "seo_platform_backup.db")
    for p in (compact, backup):
        if os.path.exists(p):
            try:
                os.remove(p)
            except OSError:
                pass

    if not os.path.exists(db_path):
        return f"db file missing: {db_path}"

    await engine.dispose()

    try:
        src = sqlite3.connect(db_path, timeout=60)
        try:
            src.execute("VACUUM INTO '%s'" % compact.replace("'", "''"))
        finally:
            src.close()
    except Exception as e:
        return f"VACUUM INTO failed: {e}"

    if not os.path.exists(compact) or os.path.getsize(compact) == 0:
        return "VACUUM INTO produced no file"

    try:
        chk = sqlite3.connect(compact, timeout=60)
        try:
            integrity = chk.execute("PRAGMA integrity_check").fetchone()
            tables = chk.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()
        finally:
            chk.close()
    except Exception as e:
        return f"compact check failed: {e}"

    if not integrity or integrity[0] != "ok":
        return f"compact integrity_check = {integrity}"
    if not tables or tables[0] == 0:
        return "compact has no tables"

    old_size = os.path.getsize(db_path)
    new_size = os.path.getsize(compact)
    if new_size >= old_size * 0.9:
        return f"compact not smaller ({old_size} -> {new_size}); skipping"

    for suffix in ("-wal", "-shm"):
        extra = db_path + suffix
        if os.path.exists(extra):
            try:
                os.remove(extra)
            except OSError:
                pass

    try:
        shutil.copy2(db_path, backup)
        os.remove(db_path)
        shutil.move(compact, db_path)
    except Exception as e:
        try:
            if not os.path.exists(db_path) and os.path.exists(backup):
                shutil.copy2(backup, db_path)
        except Exception:
            pass
        return f"swap failed (restore attempted): {e}"

    try:
        chk = sqlite3.connect(db_path, timeout=60)
        try:
            ok = chk.execute("PRAGMA integrity_check").fetchone()
            t = chk.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()
        finally:
            chk.close()
        if not ok or ok[0] != "ok":
            return f"post-swap integrity failed: {ok}"
        if not t or t[0] == 0:
            return "post-swap has no tables"
    except Exception as e:
        return f"post-swap open failed: {e}"

    return f"swapped {old_size} -> {new_size} bytes (freed {old_size - new_size})"


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
        logger.warning("Startup maintenance: attempting VACUUM INTO + file swap to reclaim disk")
        db_path = _db_path_from_url()
        if not db_path:
            result["swap"] = "could not resolve DB path from DATABASE_URL"
        else:
            result["swap"] = await _swap_compact(db_path, engine)
            logger.info(f"Startup maintenance: swap result: {result['swap']}")

    return result
