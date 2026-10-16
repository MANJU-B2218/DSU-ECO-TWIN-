import os
import sys

# Ensure project root directory is on Python search path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from database import init_db

# Auto-initialize SQLite database on Vercel cold start
try:
    init_db()
except Exception as err:
    print(f"[WARN] Vercel serverless init_db notice: {err}")

# Vercel Python runtime entrypoints (supports both 'app' and 'handler' WSGI signatures)
handler = app
app = app
