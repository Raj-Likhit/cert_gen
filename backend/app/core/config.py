import os
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
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
CONFIG_PATH = os.getenv("CONFIG_PATH", "assets/layout_config.json")
TEMPLATE_PATH = os.getenv("TEMPLATE_PATH", "assets/template.png")
FONTS_DIR = os.getenv("FONTS_DIR", "assets/fonts")
