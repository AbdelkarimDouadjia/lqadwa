"""Restore a provider SQL export into a new, isolated local SQLite database."""
import pathlib
import sqlite3
import sys
import tempfile

source = pathlib.Path(sys.argv[1]).resolve(strict=True)
folder = pathlib.Path(tempfile.mkdtemp(prefix='export-restore-', dir=source.parent))
with sqlite3.connect(folder / 'restored.sqlite') as restored:
    restored.executescript(source.read_text(encoding='utf-8'))
    assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert restored.execute('PRAGMA foreign_key_check').fetchall() == []
    for table in ('profiles', 'registered_pharmacies', 'reservations', 'mobile_sessions', 'closed_accounts'):
        assert restored.execute('SELECT count(*) FROM sqlite_master WHERE type=\'table\' AND name=?', (table,)).fetchone()[0] == 1, table
    assert restored.execute('SELECT count(*) FROM d1_migrations').fetchone()[0] == 9
print('PASS: hosted D1 export restored in isolated SQLite; integrity, foreign keys, application tables and nine migrations verified. Live database unchanged.')
