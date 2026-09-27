"""Consistent backup + restore check of LOCAL SQLite/D1 fixtures only.
No production credentials, export, restoration or backup-retention claim.
"""
import pathlib
import sqlite3
import tempfile

root = pathlib.Path(__file__).resolve().parent.parent
files = list((root / '.wrangler/state/v3/d1').rglob('*.sqlite'))
sources = [p for p in files if p.name != 'metadata.sqlite']
assert len(sources) == 1, 'Select a single local application DB before running this check'
folder = pathlib.Path(tempfile.mkdtemp(prefix='db-restore-', dir=root / '.sites-runtime'))
with sqlite3.connect(sources[0].as_uri() + '?mode=ro', uri=True) as source:
    with sqlite3.connect(folder / 'backup.sqlite') as backup:
        source.backup(backup)
with sqlite3.connect(folder / 'backup.sqlite') as backup:
    with sqlite3.connect(folder / 'restored.sqlite') as restored:
        backup.backup(restored)
with sqlite3.connect(folder / 'restored.sqlite') as restored:
    assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert restored.execute('PRAGMA foreign_key_check').fetchall() == []
    assert restored.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('closed_accounts','mobile_sessions','reservations')").fetchone()[0] == 3
print('PASS: consistent LOCAL SQLite backup/restore, integrity and foreign keys. Hosted recovery still requires a provider-level exercise.')
