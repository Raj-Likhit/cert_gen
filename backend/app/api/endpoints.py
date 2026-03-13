import io
import os
import datetime
import jwt
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from supabase import create_client, Client
from PIL import Image
from ..core import config
from ..models import schemas
from ..services import certificate_service as service

router = APIRouter()

# Supabase Client
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# JWT Security
def verify_jwt(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not an admin")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/")
def read_root():
    return {"status": "ok", "service": "Cert-Gen-V2 (Modular)"}

@router.post("/admin/login")
def admin_login(req: schemas.LoginRequest):
    if req.password == config.ADMIN_PASSWORD:
        expiration = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        token = jwt.encode(
            {"role": "admin", "exp": expiration},
            config.JWT_SECRET,
            algorithm=config.JWT_ALGORITHM
        )
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid password")

@router.get("/admin/config")
def get_layout_config():
    return service.load_config()

@router.post("/admin/save-config", dependencies=[Depends(verify_jwt)])
async def save_layout_config(req: schemas.ConfigRequest):
    try:
        cfg = service.load_config()
        cfg['name_pos'] = {'x': req.name_x, 'y': req.name_y}
        cfg['qr_pos'] = {'x': req.qr_x, 'y': req.qr_y, 'size': req.qr_size}
        cfg['font_family'] = req.font_family
        cfg['text_color'] = req.text_color
        cfg['event_name'] = req.event_name
        cfg['is_centered'] = req.is_centered
        cfg['font_weight'] = req.font_weight
        cfg['is_italic'] = req.is_italic
        cfg['stroke_width'] = req.stroke_width
        cfg['stroke_color'] = req.stroke_color
        cfg['font_size'] = req.font_size
        service.save_config(cfg)
        return {"status": "saved", "config": cfg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/auto-detect", dependencies=[Depends(verify_jwt)])
def auto_detect_layout():
    if not os.path.exists(config.TEMPLATE_PATH):
        raise HTTPException(status_code=404, detail="Template not found.")
    with Image.open(config.TEMPLATE_PATH) as img:
        coords = service.detect_name_line_cv2(img)
        if coords:
            return {"found": True, "x": coords[0], "y": coords[1]}
        return {"found": False, "message": "No horizontal line detected."}

@router.post("/admin/preview-render", dependencies=[Depends(verify_jwt)])
async def preview_certificate(req: schemas.ConfigRequest, name: str = "John Doe"):
    if not os.path.exists(config.TEMPLATE_PATH):
        raise HTTPException(status_code=404, detail="Template not found.")
    with open(config.TEMPLATE_PATH, "rb") as f:
        template_bytes = f.read()
    cfg = {
        'name_pos': {'x': req.name_x, 'y': req.name_y},
        'qr_pos': {'x': req.qr_x, 'y': req.qr_y, 'size': req.qr_size},
        'font_family': req.font_family,
        'text_color': req.text_color,
        'is_centered': req.is_centered,
        'font_weight': req.font_weight,
        'is_italic': req.is_italic,
        'stroke_width': req.stroke_width,
        'stroke_color': req.stroke_color,
        'font_size': req.font_size
    }
    png_buffer = service.generate_certificate_png(io.BytesIO(template_bytes), name, "PREVIEW-ONLY", cfg)
    return StreamingResponse(io.BytesIO(png_buffer.getvalue()), media_type="image/png")

@router.post("/admin/upload-template")
async def upload_template(request: Request, file: UploadFile = File(...)):
    verify_jwt(request)
    if not os.path.exists("assets"):
        os.makedirs("assets")
    with open(config.TEMPLATE_PATH, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"status": "success", "filename": "template.png"}

@router.post("/admin/upload-font")
async def upload_font(request: Request, file: UploadFile = File(...)):
    verify_jwt(request)
    if not os.path.exists(config.FONTS_DIR):
        os.makedirs(config.FONTS_DIR)
    file_path = os.path.join(config.FONTS_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    service.register_custom_fonts()
    return {"status": "success", "filename": file.filename}

@router.get("/admin/fonts")
def get_fonts():
    return {"fonts": service.REGISTERED_FONTS}

@router.delete("/admin/template", dependencies=[Depends(verify_jwt)])
def delete_template():
    try:
        if os.path.exists(config.TEMPLATE_PATH):
            os.remove(config.TEMPLATE_PATH)
        if os.path.exists(config.CONFIG_PATH):
            os.remove(config.CONFIG_PATH) 
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def check_health():
    return {"status": "healthy", "timestamp": datetime.datetime.now().isoformat()}

@router.get("/verify/{serial}")
def verify_certificate(serial: str):
    res = supabase.table("Participants").select("*").eq("serial_number", serial).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Certificate not found")
    participant = res.data[0]
    cfg = service.load_config()
    participant['event_name'] = cfg.get('event_name', 'Certificate of Participation')
    return participant

@router.post("/claim")
async def claim_certificate(req: schemas.ClaimRequest):
    result, error = await service.process_claim(req.email, req.frontend_url, supabase)
    if error:
        if error == "No participant found":
            raise HTTPException(status_code=404, detail=error)
        if error == "Template not configured":
            raise HTTPException(status_code=404, detail=error)
        raise HTTPException(status_code=500, detail=error)
    return result

@router.post("/admin/batch-import", dependencies=[Depends(verify_jwt)])
async def batch_import_participants(req: schemas.BatchImportRequest):
    results = await service.process_batch_import(req.participants, supabase)
    return {
        "summary": f"Processed {len(results)} records", 
        "details": results,
        "success_count": len([r for r in results if r['status'] == 'success']),
        "error_count": len([r for r in results if r['status'] == 'error'])
    }

@router.get("/admin/participants", dependencies=[Depends(verify_jwt)])
async def get_participants():
    try:
        res = supabase.table("Participants").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
