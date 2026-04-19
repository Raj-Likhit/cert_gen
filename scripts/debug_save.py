import asyncio
import os
import sys

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.services import certificate_service

# Load config
cfg = certificate_service.load_config()
print("Original DB config:", cfg.get('name_pos'))

# Modify config
cfg['name_pos'] = {'x': 123, 'y': 456}
certificate_service.save_config(cfg)

# clear cache
certificate_service.CACHE_CONFIG = None

# Load config again
new_cfg = certificate_service.load_config()
print("New DB config:", new_cfg.get('name_pos'))
