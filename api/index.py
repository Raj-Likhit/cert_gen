import sys
import os

# Add the project root to sys.path to resolve backend imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.main import app

# Vercel needs the app object to be named 'app' by default if it's the only one
# or we can explicitly export it.
# This makes backend/app/main.py accessible via Vercel's Python runtime.
