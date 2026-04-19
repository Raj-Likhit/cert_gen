import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(BASE_DIR, '.env')

# Only try to load from file if it exists; otherwise rely on system env vars (standard for Vercel)
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # Optional: trigger load_dotenv without path to pick up any other locations
    load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Security
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Critical Check: Fail early if variables aren't found in file OR environment
missing_vars = []
if not SUPABASE_URL: missing_vars.append("SUPABASE_URL")
if not SUPABASE_KEY: missing_vars.append("SUPABASE_KEY")
if not JWT_SECRET: missing_vars.append("JWT_SECRET")
if not ADMIN_PASSWORD: missing_vars.append("ADMIN_PASSWORD")

if missing_vars:
    raise RuntimeError(f"CRITICAL: Missing required environment variables: {', '.join(missing_vars)}. Check your Vercel settings or .env file.")

# Paths
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
CONFIG_PATH = os.path.join(ASSETS_DIR, "layout_config.json")
TEMPLATE_PATH = os.path.join(ASSETS_DIR, "template.png")

# Serverless/Vercel Support: Fallback to /tmp for writable font storage
is_serverless = os.getenv("VERCEL") or os.getenv("NOW_REGION")
if is_serverless:
    FONTS_DIR = "/tmp/fonts"
else:
    FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")

os.makedirs(FONTS_DIR, exist_ok=True)
