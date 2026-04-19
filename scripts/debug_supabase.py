import asyncio
import os
import sys
import io

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.services import certificate_service
c = certificate_service.supabase

res_select = c.table("LayoutConfig").select("id, config").limit(1).execute()
cfg = res_select.data[0]["config"]

# Reset config to center
cfg['name_pos'] = {'x': 400, 'y': 300}
c.table("LayoutConfig").update({"config": cfg}).eq("id", res_select.data[0]["id"]).execute()
print("Reset complete")
