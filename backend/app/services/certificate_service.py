import io
import asyncio
import hashlib
import os
import json
import uuid
import datetime
import random
import string
import cv2
import numpy as np
from typing import Any
from PIL import Image, ImageDraw, ImageFont
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from ..core import config
import requests
import re
from supabase import create_client, Client

# Supabase Client Initialization
supabase_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# Asset Cache
REGISTERED_FONTS = [
    {"name": "Helvetica", "type": "system"},
    {"name": "Times-Roman", "type": "system"},
    {"name": "Courier", "type": "system"}
]
CACHE_TEMPLATE = None
CACHE_FONTS = {}
CACHE_CONFIG = None

from ..core.logging_config import logger

def register_custom_fonts():
    """Dynamically register all TTF/OTF files in assets/fonts/ with ReportLab"""
    logger.info(f"Scanning FONTS_DIR: {os.path.abspath(config.FONTS_DIR)}")
    if not os.path.exists(config.FONTS_DIR):
        logger.warning(f"FONTS_DIR does not exist: {config.FONTS_DIR}")
        return

    files = os.listdir(config.FONTS_DIR)
    logger.info(f"Found {len(files)} files in FONTS_DIR")
    for f in files:
        if f.lower().endswith((".ttf", ".otf")):
            try:
                name = os.path.splitext(f)[0]
                path = os.path.join(config.FONTS_DIR, f)
                pdfmetrics.registerFont(TTFont(name, path))
                if not any(font_dict['name'] == name for font_dict in REGISTERED_FONTS):
                    REGISTERED_FONTS.append({"name": name, "type": "custom", "filename": f})
                logger.info(f"Registered custom font: {name}")
            except Exception as e:
                logger.error(f"Failed to register font {f}: {e}")

# Initial Registration
def initialize_fonts():
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
        if not any(f['name'] == 'Arial' for f in REGISTERED_FONTS):
            REGISTERED_FONTS.append({"name": "Arial", "type": "system"})
    except:
        pass
    register_custom_fonts()

    register_custom_fonts()

def import_google_font(url: str):
    """
    Downloads a .ttf font from a Google Fonts URL.
    Matches CSS rules to find direct download links for truetype variants.
    """
    if not url.startswith("https://fonts.googleapis.com/css"):
        raise ValueError("Invalid Google Fonts URL")
    
    # Headers to force TTF response (Legacy Android Agents get TTF)
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        css_content = response.text
        
        # Regex to find @font-face blocks and extract family, weight, style, and URL
        blocks = re.findall(r'@font-face\s*\{(.*?)\}', css_content, re.DOTALL)
        
        downloaded = []
        for block in blocks:
            family_match = re.search(r'font-family:\s*\'?([^\';]+)\'?', block)
            style_match = re.search(r'font-style:\s*([^\';]+)', block)
            weight_match = re.search(r'font-weight:\s*([^\';]+)', block)
            url_match = re.search(r'url\((https://[^\)]+\.ttf)\)', block)
            
            if family_match and url_match:
                family_name = family_match.group(1).replace(" ", "")
                ttf_url = url_match.group(1)
                style = style_match.group(1) if style_match else "normal"
                weight = weight_match.group(1) if weight_match else "400"
                
                # Suffix mapping
                suffix = ""
                if weight in ["700", "bold"]:
                    suffix = "-Bold"
                if style == "italic":
                    suffix += "Italic" if suffix else "-Italic"
                if not suffix:
                    suffix = "-Regular"
                
                filename = f"{family_name}{suffix}.ttf"
                
                # Check if already downloaded to avoid redundant work in same session
                if any(d['filename'] == filename for d in downloaded): continue

                logger.info(f"Downloading {filename} from {ttf_url}")
                font_res = requests.get(ttf_url, timeout=10)
                font_res.raise_for_status()
                
                file_path = os.path.join(config.FONTS_DIR, filename)
                with open(file_path, "wb") as f:
                    f.write(font_res.content)
                
                # Sync to Supabase Storage
                try:
                    supabase_client.storage.from_("fonts").upload(filename, font_res.content, {"content-type": "font/ttf", "upsert": "true"})
                except Exception as se:
                    logger.error(f"Supabase Font Sync Failed for {filename}: {se}")

                downloaded.append({"name": family_name, "filename": filename, "style": style, "weight": weight})


        # Re-register
        register_custom_fonts()
        return downloaded
    except Exception as e:
        logger.error(f"Google Font Import Failed: {e}")
        raise e

def sync_font_to_storage(filename: str, content: bytes):
    """Sync a locally uploaded font to Supabase Storage"""
    try:
        supabase_client.storage.from_("fonts").upload(
            filename, 
            content, 
            {"content-type": "font/ttf", "upsert": "true"}
        )
        logger.info(f"Supabase Font Sync Success: {filename}")
    except Exception as e:
        logger.error(f"Supabase Font Sync Failed: {e}")

def load_assets_to_cache():
    """Industrial Optimization: Pre-loads assets to RAM to eliminate Disk I/O latency."""
    global CACHE_TEMPLATE, CACHE_FONTS, CACHE_CONFIG
    print("🚀 Initializing Industrial Asset Cache...")
    
    # Cache Config
    CACHE_CONFIG = load_config()
    print("✅ Config Cached")

    # Cache Template
    if os.path.exists(config.TEMPLATE_PATH):
        with open(config.TEMPLATE_PATH, "rb") as f:
            CACHE_TEMPLATE = f.read()
            print(f"✅ Template Cached ({len(CACHE_TEMPLATE)} bytes)")
    
    # Cache Base Fonts (Pillow objects)
    # We pre-cache common sizes to avoid repeated FreeType initialization
    common_sizes = [32, 48, 52, 64]
    for size in common_sizes:
        CACHE_FONTS[f"Helvetica-{size}-Regular"] = get_pil_font("Helvetica", size)
        CACHE_FONTS[f"Helvetica-{size}-Bold"] = get_pil_font("Helvetica", size, weight="Bold")
    
    print(f"✅ Pre-loaded {len(CACHE_FONTS)} font variants to RAM")


def px_to_pt(px):
    return px * 0.75

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def detect_name_line_cv2(pil_image):
    try:
        import numpy as np
        import cv2
        open_cv_image = np.array(pil_image.convert('RGB')) 
        open_cv_image = open_cv_image[:, :, ::-1].copy() 
        h, w = open_cv_image.shape[:2]
        
        # Focus on the likely name zone (middle 40-75% vertical)
        roi_start_y = int(h * 0.35)
        roi_end_y = int(h * 0.8)
        roi = open_cv_image[roi_start_y:roi_end_y, :]
        
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        
        # Target horizontal lines (underlines)
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 20, 1))
        detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        
        cnts, _ = cv2.findContours(detect_horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_line = None
        max_score = -1
        
        for c in cnts:
            x, y, cw, ch = cv2.boundingRect(c)
            # Line must be at least 10% of image width
            if cw > (w * 0.10) and cw > 2 * ch:
                line_center_x = x + cw / 2
                dist_from_v_center = abs(line_center_x - (w / 2))
                
                # Higher score for wider lines and lines closer to the horizontal center
                # Width bonus: (cw/w) * 1000
                # Center penalty: -(dist_from_v_center/w) * 2000 (penalty is high to force centering)
                score = (cw / w) * 1000 - (dist_from_v_center / w) * 2000
                
                if score > max_score:
                    max_score = score
                    best_line = (x, y, cw, ch)
                    
        if best_line:
            lx, ly, lcw, lch = best_line
            # Precise Center of the detected line
            target_x = lx + lcw // 2
            
            # If the best line is close enough to the absolute center, just snap to absolute center
            if abs(target_x - (w // 2)) < (w * 0.05):
                target_x = w // 2
                
            # Vertical: place exactly on the line (new baseline anchor handles the rest)
            target_y = roi_start_y + ly 
            return (int(target_x), int(target_y))
            
        return None
    except Exception as e:
        print(f"CV2 Enhanced Error: {e}")
        return None

def get_pil_font(family, size, weight='Regular', is_italic=False):
    variant = weight
    if is_italic:
        variant = "Bold Italic" if weight == "Bold" else "Italic"
    suffixes = {
        "Regular": ["", "-Regular", "Reg"],
        "Bold": ["-Bold", "bd", "b"],
        "Italic": ["-Italic", "i", "-Ital"],
        "Bold Italic": ["-BoldItalic", "bi", "-BoldItal"]
    }
    search_names = []
    for s in suffixes.get(variant, [""]):
        search_names.extend([f"{family}{s}.ttf", f"{family}{s}.otf"])
    if os.path.exists(family): return ImageFont.truetype(family, size)
    for name in search_names:
        path = os.path.join(config.FONTS_DIR, name)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    sys_paths = ["C:\\Windows\\Fonts\\", "/usr/share/fonts/truetype/liberation/", "/System/Library/Fonts/"]
    for sp in sys_paths:
        for name in search_names:
            full_p = os.path.join(sp, name)
            if os.path.exists(full_p):
                return ImageFont.truetype(full_p, size)
    try:
        if weight == "Bold": return ImageFont.truetype("arialbd.ttf", size)
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def generate_certificate_pdf(template_bytes_io, name, serial_number, cfg, base_url="https://certgen.io"):
    # Target use of CACHE_TEMPLATE if provided template_bytes_io is empty/generic
    actual_content = template_bytes_io
    if CACHE_TEMPLATE and (not template_bytes_io or template_bytes_io.getbuffer().nbytes == 0):
        actual_content = io.BytesIO(CACHE_TEMPLATE)

    buffer = io.BytesIO()
    img_reader = ImageReader(actual_content)
    iw_px, ih_px = img_reader.getSize()
    iw_pt, ih_pt = px_to_pt(iw_px), px_to_pt(ih_px)
    c = canvas.Canvas(buffer, pagesize=(iw_pt, ih_pt))
    c.drawImage(img_reader, 0, 0, width=iw_pt, height=ih_pt)
    name_pos = cfg.get('name_pos', {'x': iw_px/2, 'y': ih_px/2})
    font_fam = cfg.get('font_family', 'Helvetica')
    text_color = cfg.get('text_color', '#000000')
    name_x_pt = px_to_pt(name_pos['x'])
    name_y_raw_px = name_pos['y']
    name_y_pt = ih_pt - px_to_pt(name_y_raw_px)
    weight = cfg.get('font_weight', 'Regular')
    is_italic = cfg.get('is_italic', False)
    # --- Robust Font Resolution ---
    pdf_font = 'Helvetica'
    weight = cfg.get('font_weight', 'Regular')
    is_italic = cfg.get('is_italic', False)
    
    # Standard 14/Common Aliases Mapping
    family_map = {
        "times new roman": "Times",
        "times-roman": "Times",
        "serif": "Times",
        "arial": "Helvetica",
        "sans-serif": "Helvetica",
        "courier new": "Courier",
        "mono": "Courier"
    }
    
    base_family = family_map.get(font_fam.lower(), font_fam)
    
    # Determine Variant Suffix
    variant = "Regular"
    if weight == "Bold" and is_italic: variant = "BoldItalic"
    elif weight == "Bold": variant = "Bold"
    elif is_italic: variant = "Italic"

    # Greedy Search in Registered Fonts
    registered_fonts = pdfmetrics.getRegisteredFontNames()
    font_lookup_lower = {f.lower(): f for f in registered_fonts}
    
    # Try 1: Exact Family-Variant (e.g., SpaceGrotesk-Bold)
    targets = [
        f"{base_family}-{variant}",
        f"{base_family}{variant}",
        f"{base_family}_{variant}",
        f"{base_family} {variant}",
        base_family if variant == "Regular" else None
    ]
    
    found = False
    for t in filter(None, targets):
        if t.lower() in font_lookup_lower:
            pdf_font = font_lookup_lower[t.lower()]
            found = True
            break
            
    # Try 2: Standard Fallbacks if custom fails
    if not found:
        # Check if the base family itself is registered (synthetic fallback)
        if base_family.lower() in font_lookup_lower:
            pdf_font = font_lookup_lower[base_family.lower()]
            found = True
            logger.info(f"Using synthetic fallback for {base_family}-{variant} via base font {pdf_font}")
        elif base_family.lower() in ["times", "helvetica", "courier"]:
            # ReportLab standard font naming: Helvetica-Bold, Times-Italic, etc.
            sep = "-" if base_family.lower() != "times" or variant != "Regular" else ""
            if base_family.lower() == "times" and variant == "Regular": 
                pdf_font = "Times-Roman"
            else:
                pdf_font = f"{base_family.capitalize()}{sep}{variant}"
            # Final sanity check for standard names
            if pdf_font not in registered_fonts:
                # Last resort standard mapping
                mapping = {"Bold": "Bold", "Italic": "Oblique", "BoldItalic": "BoldOblique"}
                pdf_font = f"{base_family.capitalize()}-{mapping.get(variant, '')}".strip('-')
        else:
            logger.warning(f"Font variant '{base_family}-{variant}' not found. Falling back to Helvetica.")
            pdf_font = 'Helvetica-Bold' if weight == "Bold" else 'Helvetica'
    
    logger.info(f"Resolved PDF Font: {pdf_font} for requested {font_fam} ({weight})")
    # --- End Font Resolution ---

    base_font_size = cfg.get('font_size', 48) or 48
    # Scaling Factor: 1.333 to match Browser (96dpi) vs PDF (72dpi)
    font_size = int(base_font_size * 1.333) 
    
    # Calculate text width and handle wrapping/scaling
    text_w = c.stringWidth(name, pdf_font, font_size)
    
    # Allow 90% of page width instead of hardcoded 400pt
    available_w = iw_pt * 0.9
    
    while text_w > available_w and font_size > 12:
        font_size -= 2
        text_w = c.stringWidth(name, pdf_font, font_size)
        
    c.setFont(pdf_font, font_size)
    r, g, b = hex_to_rgb(text_color)
    c.setFillColorRGB(r/255.0, g/255.0, b/255.0)
    is_centered = cfg.get('is_centered', False)
    # ReportLab y uses bottom-left origin.
    # name_y_pt is the distance from BOTTOM of page in points.
    
    # Calculate more accurate baseline offset using font metrics
    try:
        face = pdfmetrics.getFont(pdf_font).face
        # face.ascent is based on 1000 units per em
        ascent = (face.ascent * font_size) / 1000.0
    except:
        # Fallback if font metrics missing
        ascent = font_size * 0.8

    # Handle Outline (Stroke)
    stroke_w = cfg.get('stroke_width', 0)
    stroke_c = cfg.get('stroke_color', '#000000')
    if stroke_w > 0:
        sr, sg, sb = hex_to_rgb(stroke_c)
        c.setStrokeColorRGB(sr/255.0, sg/255.0, sb/255.0)
        c.setLineWidth(stroke_w / 2) # Divide by 2 to match SVG behavior typically
        c._code.append("2 Tr") # Fill and Stroke
    else:
        c._code.append("0 Tr") # Fill only

    # --- Apply Synthetic Styles if needed ---
    needs_synthetic_italic = is_italic and "italic" not in pdf_font.lower() and "oblique" not in pdf_font.lower()
    needs_synthetic_bold = weight == "Bold" and "bold" not in pdf_font.lower()

    if needs_synthetic_italic or needs_synthetic_bold:
        c.saveState()
        if needs_synthetic_italic:
            # Skew the coordinate system for italics (approx 0.2 radians)
            c.transform(1, 0, 0.2, 1, 0, 0)
        
        if needs_synthetic_bold:
            # Embolden using a small stroke
            c._code.append("2 Tr") # Fill and Stroke
            c.setStrokeColorRGB(r/255.0, g/255.0, b/255.0)
            c.setLineWidth(font_size * 0.03) # 3% of font size for moderate bolding

    if is_centered:
        c.drawCentredString(name_x_pt, name_y_pt, name)
    else:
        c.drawString(name_x_pt, name_y_pt, name)
    
    if needs_synthetic_italic or needs_synthetic_bold:
        c.restoreState()

    
    # Reset render mode for following prints
    c._code.append("0 Tr")

    # Dynamic Header: Event Name
    event_name = cfg.get('event_name', 'Certificate of Participation')
    header_font_size = 20
    c.setFont('Helvetica-Bold', header_font_size)
    c.setFillColorRGB(0, 0, 0) # Black for header
    # Pos: Top center
    c.drawCentredString(iw_pt / 2, ih_pt - 100, event_name.upper())

    # Dynamic Footer: Verification URL & Unique Code
    verify_pos = cfg.get('verify_pos', {'x': 250, 'y': 100})
    verify_x_pt = px_to_pt(verify_pos['x'])
    verify_y_pt = ih_pt - px_to_pt(verify_pos['y'])
    
    # We use a slightly smaller font size for the verification URL, based on the main font size
    footer_font_size = max(10, int(font_size * 0.35))
    c.setFont(pdf_font, footer_font_size)
    c.setFillColorRGB(0.2, 0.2, 0.2) 
    
    # Single Verification line: certgen.io/verify/ABCDEFG
    verify_url = f"{base_url}/verify/{serial_number}".replace("http://", "").replace("https://", "")
    
    if is_centered:
        c.drawCentredString(verify_x_pt, verify_y_pt, verify_url)
    else:
        c.drawString(verify_x_pt, verify_y_pt, verify_url)


    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


def generate_serial():
    """Generates a unique 7-character alphanumeric code for verification."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=7))


# Global semaphores for resource throttling - Increased for event-grade throughput
RENDER_SEMAPHORE = asyncio.Semaphore(15)
STORAGE_SEMAPHORE = asyncio.Semaphore(20)

async def process_claim(email: str, frontend_url: str, supabase: Any):
    email = email.strip().lower()
    logger.info(f"Processing claim for email: {email}")
    # Use .ilike for case-insensitive robust matching
    res = supabase.table("Participants").select("*").ilike("email", email).execute()
    
    if not res.data:
        logger.warning(f"Claim failed: No participant found for {email}")
        return None, "No participant found"

    participant = res.data[0]
    if participant.get("is_claimed") and participant.get("cert_url"):
        logger.info(f"Returning existing claim for {email}")
        return {
            "cert_url": participant.get("cert_url"),
            "verification_code": participant.get("verification_code"),
            "name": participant.get("full_name")
        }, None

    serial = participant.get('verification_code') or generate_serial()

    name = participant['full_name']
    base_url = frontend_url.rstrip('/')
    
    # Asset Loading
    template_io = io.BytesIO(CACHE_TEMPLATE) if CACHE_TEMPLATE else None
    if not template_io:
        if not os.path.exists(config.TEMPLATE_PATH):
            return None, "Template not configured"
        with open(config.TEMPLATE_PATH, "rb") as f:
            template_io = io.BytesIO(f.read())

    cfg = load_config()
    loop = asyncio.get_event_loop()
    
    try:
        # Step 1: Parallel Rendering - Create fresh copies for thread safety
        def render_pdf_job():
            tio = io.BytesIO(template_io.getvalue())
            return generate_certificate_pdf(tio, name, serial, cfg, base_url)
            
        async with RENDER_SEMAPHORE:
            pdf_task = loop.run_in_executor(None, render_pdf_job)
            pdf_buffer = await pdf_task
        
        

        
        # Step 2: Parallel Uploading
        def upload_f(fname, data, ctype):
             supabase.storage.from_("certificates").upload(path=fname, file=data, file_options={"content-type": ctype, "upsert": "true"})
             return supabase.storage.from_("certificates").get_public_url(fname)

        async with STORAGE_SEMAPHORE:
            pdf_fut = loop.run_in_executor(None, upload_f, f"{serial}.pdf", pdf_buffer.getvalue(), "application/pdf")
            pdf_public_url = await pdf_fut
        
        # Step 3: Database Update
        update_data = {
            "is_claimed": True,
            "claimed_at": datetime.datetime.now().isoformat(),
            "cert_url": pdf_public_url,
            "verification_code": serial
        }
        supabase.table("Participants").update(update_data).eq("email", email).execute()
        
        logger.info(f"Successfully processed claim for {email}")
        return {
            "cert_url": pdf_public_url,
            "verification_code": serial,
            "name": name
        }, None


    except Exception as e:
        logger.error(f"Claim generation error for {email}: {str(e)}")
        return None, str(e)

async def process_batch_import(participants: list, supabase: Any):
    """
    Handles high-throughput batch import with parallel database operations.
    Throttled by semaphore to prevent socket exhaustion on Windows (WinError 10035).
    """
    import asyncio
    
    # Throttle to 5 concurrent requests to stabilize on Windows
    sem = asyncio.Semaphore(5)
    
    async def process_p(p):
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                def db_op():
                    existing = supabase.table("Participants").select("verification_code").eq("email", p.email).execute()
                    serial = existing.data[0].get('verification_code') if existing.data else generate_serial()
                    data = {"full_name": p.name, "email": p.email, "verification_code": serial}
                    supabase.table("Participants").upsert(data, on_conflict="email").execute()
                    return serial


                serial = await loop.run_in_executor(None, db_op)
                return {"email": p.email, "status": "success", "serial": serial}
            except Exception as e:
                logger.error(f"Batch import error for {p.email}: {str(e)}")
                return {"email": p.email, "status": "error", "error": str(e)}

    results = await asyncio.gather(*(process_p(p) for p in participants))
    return results

def load_config():
    global CACHE_CONFIG
    if CACHE_CONFIG:
        return CACHE_CONFIG

    # Primary: Load from Supabase
    try:
        res = supabase_client.table("LayoutConfig").select("config").limit(1).execute()
        if res.data and res.data[0].get("config"):
            cfg = res.data[0]["config"]
            # Sync to local for resilience
            save_config_local(cfg)
            CACHE_CONFIG = cfg
            return cfg
    except Exception as e:
        logger.warning(f"Supabase Config Load Failed, falling back to local: {e}")

    # Fallback: Load from local file
    if os.path.exists(config.CONFIG_PATH):
        try:
            with open(config.CONFIG_PATH, "r") as f:
                cfg = json.load(f)
                CACHE_CONFIG = cfg
                return cfg
        except:
            pass
    
    return {
        'name_pos': {'x': 500, 'y': 400, 'max_width': 400},
        'verify_pos': {'x': 250, 'y': 100},
        'page_size': [1000, 800],
        'font_family': 'Helvetica',
        'text_color': '#000000',
        'event_name': 'Certificate of Participation',
        'is_centered': True,
        'font_weight': 'Regular',
        'is_italic': False,
        'stroke_width': 0,
        'stroke_color': '#000000',
        'font_size': 48
    }

def save_config_local(cfg):
    with open(config.CONFIG_PATH, "w") as f:
        json.dump(cfg, f)

def save_config(cfg):
    global CACHE_CONFIG
    CACHE_CONFIG = cfg
    
    # 1. Save Local
    save_config_local(cfg)
    
    # 2. Sync to Supabase
    try:
        res = supabase_client.table("LayoutConfig").select("id").limit(1).execute()
        if res.data:
            supabase_client.table("LayoutConfig").update({"config": cfg}).eq("id", res.data[0]["id"]).execute()
        else:
            supabase_client.table("LayoutConfig").insert({"config": cfg}).execute()
        logger.info("Supabase Config Synced")
    except Exception as e:
        logger.error(f"Supabase Config Sync Failed: {e}")

# Industrial Initialization
initialize_fonts()
load_assets_to_cache()
# Trigger Reload
# Trigger Reload 2
# Final Fix Trigger
# QR Decommissioned 
