"""Add indexes for search performance."""
from sqlalchemy import text


def upgrade():
    try:
        from app.db.session import get_engine
        eng = get_engine()
        with eng.connect() as conn:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_opls_title ON opls (title)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_opls_description ON opls (description)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_opls_created_at ON opls (created_at DESC)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_steps_opl_id ON steps (opl_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_steps_step_number ON steps (opl_id, step_number)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_photos_step_id ON photos (step_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tag_links_opl ON opl_tag_links (opl_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tag_links_tag ON opl_tag_links (tag_id)"))
            conn.commit()
    except Exception:
        pass
