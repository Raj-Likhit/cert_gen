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
    if not os.path.exists(config.FONTS_DIR):
        return

    for filename in os.listdir(config.FONTS_DIR):
        if filename.lower().endswith((".ttf", ".otf")):
            try:
                font_name = os.path.splitext(filename)[0]
                font_path = os.path.join(config.FONTS_DIR, filename)
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                if not any(f['name'] == font_name for f in REGISTERED_FONTS):
                    REGISTERED_FONTS.append({"name": font_name, "type": "custom"})
                print(f"Registered Font: {font_name} (Custom)")
            except Exception as e:
                print(f"Failed to register font {filename}: {e}")

# Initial Registration
def initialize_fonts():
    try:
        pdfmetrics.registerFont(TTFont('Arial', 'arial.ttf'))
        if not any(f['name'] == 'Arial' for f in REGISTERED_FONTS):
            REGISTERED_FONTS.append({"name": "Arial", "type": "system"})
    except:
        pass
    register_custom_fonts()

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

def generate_qr_image(data, size_px):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="transparent").convert('RGBA')
    img = img.resize((size_px, size_px), Image.Resampling.LANCZOS)
    return img

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
    qr_pos = cfg.get('qr_pos', {'x': 100, 'y': 100, 'size': 120})
    font_fam = cfg.get('font_family', 'Helvetica')
    text_color = cfg.get('text_color', '#000000')
    name_x_pt = px_to_pt(name_pos['x'])
    name_y_raw_px = name_pos['y']
    name_y_pt = ih_pt - px_to_pt(name_y_raw_px)
    weight = cfg.get('font_weight', 'Regular')
    is_italic = cfg.get('is_italic', False)
    pdf_font = 'Helvetica' # Logic simplified for brevity, ideally reuse previous complex selection
    if "serif" in font_fam.lower():
        pdf_font = 'Times-BoldItalic' if weight == "Bold" and is_italic else 'Times-Bold' if weight == "Bold" else 'Times-Italic' if is_italic else 'Times-Roman'
    elif "mono" in font_fam.lower():
        pdf_font = 'Courier-BoldOblique' if weight == "Bold" and is_italic else 'Courier-Bold' if weight == "Bold" else 'Courier-Oblique' if is_italic else 'Courier'
    else:
        pdf_font = 'Helvetica-BoldOblique' if weight == "Bold" and is_italic else 'Helvetica-Bold' if weight == "Bold" else 'Helvetica-Oblique' if is_italic else 'Helvetica'
    base_font_size = cfg.get('font_size', 48)
    font_size = int(base_font_size * 0.75)
    text_w = c.stringWidth(name, pdf_font, font_size)
    max_w_pt = px_to_pt(name_pos.get('max_width', 400))
    while text_w > max_w_pt and font_size > 8:
        font_size -= 1
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

    # Vertically center by adjusting the Y baseline by roughly half the font size
    # ReportLab doesn't have a 'middle' anchor like SVG or Pillow, so we manualy adjust.
    y_offset = font_size * 0.3 # Empirical adjustment for vertical centering
    if is_centered:
        c.drawCentredString(name_x_pt, name_y_pt - y_offset, name)
    else:
        c.drawString(name_x_pt, name_y_pt - y_offset, name)
    qr_data = f"{base_url}/verify/{serial_number}"
    qr_size_px = qr_pos.get('size', 120)
    qr_size_pt = px_to_pt(qr_size_px)
    qr_img = generate_qr_image(qr_data, qr_size_px)
    img_byte_arr = io.BytesIO()
    qr_img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    qr_x_pt = px_to_pt(qr_pos['x'])
    qr_y_pt = ih_pt - px_to_pt(qr_pos['y']) - qr_size_pt
    c.drawImage(ImageReader(img_byte_arr), qr_x_pt, qr_y_pt, width=qr_size_pt, height=qr_size_pt, mask='auto', preserveAspectRatio=True)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer

def generate_certificate_png(template_bytes_io, name, serial_number, cfg, base_url="https://certgen.io"):
    # Industrial Optimization: Use RAM-cached template if available
    if CACHE_TEMPLATE and (not template_bytes_io or template_bytes_io.getbuffer().nbytes == 0):
        base = Image.open(io.BytesIO(CACHE_TEMPLATE)).convert("RGBA")
    else:
        template_bytes_io.seek(0)
        base = Image.open(template_bytes_io).convert("RGBA")
        
    draw = ImageDraw.Draw(base)
    iw, ih = base.size
    name_pos = cfg.get('name_pos', {'x': iw/2, 'y': ih/2})
    qr_pos = cfg.get('qr_pos', {'x': 100, 'y': 100, 'size': 120})
    font_fam = cfg.get('font_family', 'Helvetica')
    text_color = cfg.get('text_color', '#000000')
    font_size = cfg.get('font_size', 48)
    weight = cfg.get('font_weight', 'Regular')
    is_italic = cfg.get('is_italic', False)
    font = get_pil_font(font_fam, font_size, weight, is_italic)
    max_w_px = name_pos.get('max_width', 400)
    if isinstance(font, ImageFont.FreeTypeFont):
         while True:
            left, top, right, bottom = draw.textbbox((0, 0), name, font=font)
            width = right - left
            if width <= max_w_px or font_size <= 10:
                break
            font_size -= 2
            font = get_pil_font(font_fam, font_size, weight, is_italic)
    is_centered = cfg.get('is_centered', False)
    stroke_width = int(cfg.get('stroke_width', 0))
    stroke_color = cfg.get('stroke_color', '#000000')
    
    # Calculate text width for precise centering
    left, top, right, bottom = draw.textbbox((0, 0), name, font=font)
    text_w = right - left
    text_h = bottom - top
    
    # Target coordinates
    render_x = int(name_pos['x'])
    render_y = int(name_pos['y'])
    # Use middle vertical alignment ('m') to match SVG 'central'
    v_anchor = "m"
    h_anchor = "m" if is_centered else "l"
    draw.text((render_x, render_y), name, font=font, fill=text_color, anchor=f"{h_anchor}{v_anchor}", stroke_width=stroke_width, stroke_fill=stroke_color)
    qr_data = f"{base_url}/verify/{serial_number}"
    qr_size = qr_pos.get('size', 120)
    qm = generate_qr_image(qr_data, qr_size)
    base.paste(qm, (int(qr_pos['x']), int(qr_pos['y'])), qm)
    out = io.BytesIO()
    base.save(out, format="PNG")
    out.seek(0)
    return out

def generate_serial(org="ORG"):
    year = datetime.datetime.now().year
    rand = ''.join(random.choices(string.hexdigits.upper(), k=6))
    return f"{org}-{year}-{rand}"

# Global semaphores for resource throttling on Windows
RENDER_SEMAPHORE = asyncio.Semaphore(3)
STORAGE_SEMAPHORE = asyncio.Semaphore(2)

async def process_claim(email: str, frontend_url: str, supabase: Any):
    
    logger.info(f"Processing claim for email: {email}")
    res = supabase.table("Participants").select("*").eq("email", email).execute()
    
    if not res.data:
        logger.warning(f"Claim failed: No participant found for {email}")
        return None, "No participant found"

    participant = res.data[0]
    if participant.get("is_claimed") and participant.get("cert_url") and participant.get("cert_png_url"):
        logger.info(f"Returning existing claim for {email}")
        return {
            "cert_url": participant.get("cert_url"),
            "cert_png_url": participant.get("cert_png_url"),
            "serial_number": participant.get("serial_number"),
            "name": participant.get("full_name")
        }, None

    serial = participant.get('serial_number') or generate_serial()
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
            
        def render_png_job():
            tio = io.BytesIO(template_io.getvalue())
            return generate_certificate_png(tio, name, serial, cfg, base_url)

        async with RENDER_SEMAPHORE:
            pdf_task = loop.run_in_executor(None, render_pdf_job)
            png_task = loop.run_in_executor(None, render_png_job)
            pdf_buffer, png_buffer = await asyncio.gather(pdf_task, png_task)
        
        # Immutable Verification (Hash-Lock)
        pdf_hash = hashlib.sha256(pdf_buffer.getvalue()).hexdigest()
        
        # Step 2: Parallel Uploading
        def upload_f(fname, data, ctype):
             supabase.storage.from_("certificates").upload(path=fname, file=data, file_options={"content-type": ctype, "upsert": "true"})
             return supabase.storage.from_("certificates").get_public_url(fname)

        async with STORAGE_SEMAPHORE:
            pdf_fut = loop.run_in_executor(None, upload_f, f"{serial}.pdf", pdf_buffer.getvalue(), "application/pdf")
            png_fut = loop.run_in_executor(None, upload_f, f"{serial}.png", png_buffer.getvalue(), "image/png")
            pdf_public_url, png_public_url = await asyncio.gather(pdf_fut, png_fut)
        
        # Step 3: Database Update
        update_data = {
            "is_claimed": True,
            "claimed_at": datetime.datetime.now().isoformat(),
            "cert_url": pdf_public_url,
            "cert_png_url": png_public_url,
            "serial_number": serial,
            "cert_hash": pdf_hash
        }
        supabase.table("Participants").update(update_data).eq("email", email).execute()
        
        logger.info(f"Successfully processed claim for {email}")
        return {
            "cert_url": pdf_public_url,
            "cert_png_url": png_public_url,
            "serial_number": serial,
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
                    existing = supabase.table("Participants").select("serial_number").eq("email", p.email).execute()
                    serial = existing.data[0].get('serial_number') if existing.data else generate_serial()
                    data = {"full_name": p.name, "email": p.email, "serial_number": serial}
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

    if os.path.exists(config.CONFIG_PATH):
        try:
            with open(config.CONFIG_PATH, "r") as f:
                cfg = json.load(f)
                # Defaults
                keys = ["event_name", "font_family", "text_color", "is_centered", "font_weight", "is_italic", "stroke_width", "stroke_color", "font_size"]
                defaults = ["Certificate of Participation", "Helvetica", "#000000", True, "Regular", False, 0, "#000000", 48]
                for k, d in zip(keys, defaults):
                    if k not in cfg: cfg[k] = d
                CACHE_CONFIG = cfg
                return cfg
        except:
            pass
    return {
        'name_pos': {'x': 500, 'y': 400, 'max_width': 400},
        'qr_pos': {'x': 800, 'y': 100, 'size': 120},
        'page_size': (1000, 800),
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

def save_config(cfg):
    global CACHE_CONFIG
    CACHE_CONFIG = cfg
    with open(config.CONFIG_PATH, "w") as f:
        json.dump(cfg, f)

# Industrial Initialization
initialize_fonts()
load_assets_to_cache()
