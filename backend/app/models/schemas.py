from pydantic import BaseModel
from typing import Optional, List

class GenerateRequest(BaseModel):
    name: str
    email: str
    event_id: Optional[str] = "default"

class ConfigRequest(BaseModel):
    name_x: int
    name_y: int
    font_family: Optional[str] = "Helvetica"
    text_color: Optional[str] = "#000000"
    event_name: Optional[str] = "Certificate of Participation"
    is_centered: Optional[bool] = False
    font_weight: Optional[str] = "Regular"
    is_italic: Optional[bool] = False
    stroke_width: Optional[int] = 0
    stroke_color: Optional[str] = "#000000"
    font_size: Optional[int] = 48
    font_url: Optional[str] = None
    font_filename: Optional[str] = None

class LoginRequest(BaseModel):
    password: str

class ParticipantRow(BaseModel):
    name: str
    email: str

class BatchImportRequest(BaseModel):
    participants: List[ParticipantRow]

class ClaimRequest(BaseModel):
    email: str
    frontend_url: Optional[str] = "http://localhost:5173"
