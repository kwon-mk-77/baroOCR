from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class SiteIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address: str = ""


class SiteUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    address: Optional[str] = None
    is_active: Optional[bool] = None


class ItemIn(BaseModel):
    material_name: str = Field(min_length=1, max_length=200)
    spec: str = ""
    quantity: Optional[float] = None
    unit: str = ""
    weight: Optional[float] = None
    weight_unit: str = ""


class ReceiptIn(BaseModel):
    site_id: int
    process_id: int
    vendor_name: str = ""
    received_date: date
    driver_name: str = ""
    vehicle_no: str = ""
    receiver_name: str = ""
    memo: str = ""
    image_url: str = ""
    ocr_raw: Optional[dict] = None
    items: list[ItemIn] = Field(min_length=1)
