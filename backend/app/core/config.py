import os
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=env_path)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Security
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not all([SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, ADMIN_PASSWORD]):
    raise RuntimeError("CRITICAL: Missing required environment variables. check your .env file.")

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
