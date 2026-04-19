import asyncio
import os
import sys

# Ensure backend path is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.services import certificate_service

fonts = [
    "https://fonts.googleapis.com/css?family=Inter:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Open+Sans:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Montserrat:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Poppins:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Lato:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Playfair+Display:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Merriweather:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Lora:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=EB+Garamond:400,400i,700,700i",
    "https://fonts.googleapis.com/css?family=Cinzel:400,700",
    "https://fonts.googleapis.com/css?family=Great+Vibes",
    "https://fonts.googleapis.com/css?family=Dancing+Script:400,700",
    "https://fonts.googleapis.com/css?family=Pinyon+Script",
    "https://fonts.googleapis.com/css?family=Cormorant+Garamond:400,400i,700,700i"
]

for url in fonts:
    print(f"Importing {url} ...")
    try:
        res = certificate_service.import_google_font(url)
        print(f"  -> Imported {len(res)} variants.")
    except Exception as e:
        print(f"  -> Failed: {e}")

print("Done importing fonts.")
