---
name: query-mimocode-db
description: "Query the mimocode trajectory database (mimocode.db) via Python to analyze sessions, messages, tool usage, and patterns. Handles Windows-specific gotchas: Python path, GBK encoding, and database location."
---

# Query mimocode.db

Query the mimocode trajectory database for analysis, distill passes, and debugging.

## Environment gotchas

- **Python executable**: `D:\python\python3.14t.exe` (NOT on PATH, not the Windows Store stub at `C:\Users\Administrator\AppData\Local\Microsoft\WindowsApps\python.exe`)
- **Database path**: `C:\Users\Administrator\.local\share\mimocode\mimocode.db` (SQLite, read-only)
- **GBK encoding**: Windows PowerShell stdout uses GBK; Chinese characters cause `UnicodeEncodeError`. Always wrap stdout:

```python
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, errors='replace')
```

## Quick-start script

Write a temp `.py` file and run via `D:\python\python3.14t.exe`. Do NOT use inline `python -c` — the Windows Store stub silently fails.

```python
import sqlite3, json, sys, io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, errors='replace')

DB = r'C:\Users\Administrator\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("TABLES:", [r[0] for r in cur.fetchall()])

# Recent sessions (last 30 days)
cutoff_ms = int((datetime.now() - __import__('datetime').timedelta(days=30)).timestamp() * 1000)
cur.execute("""
    SELECT id, time_created, title, directory
    FROM session WHERE time_created > ?
    ORDER BY time_created DESC
""", (cutoff_ms,))
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}")

# Tool frequency
cur.execute("""
    SELECT json_extract(p.data, '$.tool') as tool, count(*) as n
    FROM message m JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
      AND m.time_created > ?
    GROUP BY tool ORDER BY n DESC
""", (cutoff_ms,))
print("\nTool frequency:")
for r in cur.fetchall():
    print(f"  [{r[1]}x] {r[0]}")

# User messages
cur.execute("""
    SELECT m.session_id, json_extract(m.data, '$.content')
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user' AND m.time_created > ?
    ORDER BY m.time_created
""", (cutoff_ms,))
print("\nUser messages:")
for r in cur.fetchall():
    content = (r[1] or "(empty)")[:200]
    print(f"  [{r[0]}] {content}")

conn.close()
```

## Key tables

| Table | Purpose |
|-------|---------|
| `session` | Session metadata: id, title, directory, time_created |
| `message` | User/assistant turns with JSON data (role, content) |
| `part` | Message parts: text, tool calls, tool results |
| `task` / `task_event` | Task state and progress |
| `actor_registry` | Subagent/background actor history |

## Common queries

**Top tool+input combos** (find repeated workflows):
```sql
SELECT json_extract(p.data, '$.tool') as tool,
       substr(json_extract(p.data, '$.state.input'), 1, 200) as input_preview,
       count(*) as n
FROM message m JOIN part p ON p.message_id = m.id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND m.time_created > ?
GROUP BY tool, input_preview ORDER BY n DESC LIMIT 50;
```

**Repeated bash commands**:
```sql
SELECT json_extract(p.data, '$.state.input') as inp, count(*) as n
FROM message m JOIN part p ON p.message_id = m.id
WHERE json_extract(m.data, '$.role') = 'assistant'
  AND json_extract(p.data, '$.type') = 'tool'
  AND json_extract(p.data, '$.tool') = 'bash'
  AND m.time_created > ?
GROUP BY inp ORDER BY n DESC LIMIT 20;
```

## Run command

```
D:\python\python3.14t.exe <script_path>
```

Clean up temp scripts after use.
