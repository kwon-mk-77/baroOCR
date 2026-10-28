import csv
import io
import json
from datetime import date
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload, joinedload

from db import get_db
from models import Site, Process, Vendor, Material, DeliveryReceipt, DeliveryItem
from schemas import ReceiptIn
from services.ocr_service import process_receipt_image
from services.storage_service import upload_image

router = APIRouter(prefix="/api")

MAX_IMAGE_BYTES = 15 * 1024 * 1024


# ---------- 직렬화 / 공통 ----------

def item_to_dict(it: DeliveryItem):
    return {
        "id": it.id,
        "material_name": it.material_name,
        "spec": it.spec,
        "quantity": it.quantity,
        "unit": it.unit,
        "weight": it.weight,
        "weight_unit": it.weight_unit,
    }


def receipt_to_dict(r: DeliveryReceipt):
    return {
        "id": r.id,
        "site_id": r.site_id,
        "site_name": r.site.name if r.site else "",
        "process": {"id": r.process.id, "name": r.process.name, "color": r.process.color} if r.process else None,
        "vendor_name": r.vendor.name if r.vendor else "",
        "received_date": r.received_date.isoformat(),
        "driver_name": r.driver_name,
        "vehicle_no": r.vehicle_no,
        "receiver_name": r.receiver_name,
        "memo": r.memo,
        "image_url": r.image_url,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "items": [item_to_dict(it) for it in r.items],
    }


def filtered_query(
    db: Session,
    site_id: Optional[int] = None,
    process_id: Optional[int] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    query = db.query(DeliveryReceipt)
    if site_id:
        query = query.filter(DeliveryReceipt.site_id == site_id)
    if process_id:
        query = query.filter(DeliveryReceipt.process_id == process_id)
    if date_from:
        query = query.filter(DeliveryReceipt.received_date >= date_from)
    if date_to:
        query = query.filter(DeliveryReceipt.received_date <= date_to)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            DeliveryReceipt.vendor.has(Vendor.name.ilike(like)),
            DeliveryReceipt.items.any(or_(DeliveryItem.material_name.ilike(like), DeliveryItem.spec.ilike(like))),
            DeliveryReceipt.driver_name.ilike(like),
            DeliveryReceipt.vehicle_no.ilike(like),
            DeliveryReceipt.receiver_name.ilike(like),
            DeliveryReceipt.memo.ilike(like),
        ))
    return query


def _with_relations(query):
    return query.options(
        selectinload(DeliveryReceipt.items),
        joinedload(DeliveryReceipt.process),
        joinedload(DeliveryReceipt.vendor),
        joinedload(DeliveryReceipt.site),
    )


def _get_or_create(db: Session, model, name: str, **defaults):
    obj = db.query(model).filter(model.name == name).first()
    if not obj:
        obj = model(name=name, **defaults)
        db.add(obj)
        db.flush()
    return obj


def _apply_payload(db: Session, r: DeliveryReceipt, data: ReceiptIn):
    if not db.get(Site, data.site_id):
        raise HTTPException(400, "존재하지 않는 현장입니다.")
    if not db.get(Process, data.process_id):
        raise HTTPException(400, "존재하지 않는 공정입니다.")

    items = [it for it in data.items if it.material_name.strip()]
    if not items:
        raise HTTPException(400, "품목을 1개 이상 입력해주세요.")

    vendor_name = data.vendor_name.strip()
    r.site_id = data.site_id
    r.process_id = data.process_id
    r.vendor = _get_or_create(db, Vendor, vendor_name) if vendor_name else None
    r.received_date = data.received_date
    r.driver_name = data.driver_name.strip()
    r.vehicle_no = data.vehicle_no.strip()
    r.receiver_name = data.receiver_name.strip()
    r.memo = data.memo.strip()
    if data.image_url:
        r.image_url = data.image_url
    if data.ocr_raw is not None:
        r.ocr_raw = json.dumps(data.ocr_raw, ensure_ascii=False)

    r.items.clear()
    for i, it in enumerate(items):
        name = it.material_name.strip()
        material = _get_or_create(db, Material, name, default_unit=it.unit.strip())
        r.items.append(DeliveryItem(
            material=material,
            material_name=name,
            spec=it.spec.strip(),
            quantity=it.quantity,
            unit=it.unit.strip(),
            weight=it.weight,
            weight_unit=it.weight_unit.strip(),
            sort_order=i,
        ))


def _load(db: Session, receipt_id: int) -> DeliveryReceipt:
    r = _with_relations(db.query(DeliveryReceipt)).filter(DeliveryReceipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "인수증을 찾을 수 없습니다.")
    return r


# ---------- 이미지 / OCR ----------

async def _read_image(image: UploadFile) -> bytes:
    contents = await image.read()
    if not contents:
        raise HTTPException(400, "이미지가 비어 있습니다.")
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "이미지 용량이 너무 큽니다. (최대 15MB)")
    return contents


@router.post("/uploads")
async def upload_endpoint(image: UploadFile = File(...)):
    contents = await _read_image(image)
    url = await run_in_threadpool(upload_image, contents, image.filename, image.content_type)
    return {"image_url": url}


@router.post("/ocr")
async def ocr_endpoint(image: UploadFile = File(...)):
    """이미지 저장 + AI 인식. 인식에 실패해도 이미지 URL은 돌려줘서 수동 입력이 가능하게 함."""
    contents = await _read_image(image)
    image_url = await run_in_threadpool(upload_image, contents, image.filename, image.content_type)
    try:
        result, raw = await process_receipt_image(contents, image.filename or "receipt.jpg", image.content_type)
        return {"image_url": image_url, "ok": True, "result": result, "raw": raw}
    except Exception as e:
        print(f"OCR Error: {e}")
        return {"image_url": image_url, "ok": False, "error": str(e), "result": None, "raw": None}


# ---------- 인수증 CRUD ----------

@router.get("/receipts")
def list_receipts(
    site_id: Optional[int] = None,
    process_id: Optional[int] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 30,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    base = filtered_query(db, site_id, process_id, q, date_from, date_to)
    total = base.count()
    rows = (
        _with_relations(base)
        .order_by(DeliveryReceipt.received_date.desc(), DeliveryReceipt.id.desc())
        .offset(offset)
        .limit(min(limit, 200))
        .all()
    )
    return {"total": total, "items": [receipt_to_dict(r) for r in rows]}


def _fmt_num(n):
    if n is None:
        return ""
    return str(int(n)) if float(n).is_integer() else str(n)


@router.get("/receipts/export.csv")
def export_receipts(
    site_id: Optional[int] = None,
    process_id: Optional[int] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    rows = (
        _with_relations(filtered_query(db, site_id, process_id, q, date_from, date_to))
        .order_by(DeliveryReceipt.received_date, DeliveryReceipt.id)
        .all()
    )
    buf = io.StringIO()
    buf.write("﻿")  # 엑셀에서 한글이 깨지지 않도록 BOM 추가
    writer = csv.writer(buf)
    writer.writerow(["인수일", "현장", "공정", "공급업체", "자재명", "규격", "수량", "단위", "중량", "중량단위",
                     "기사", "차량번호", "인수자", "메모", "인수증번호"])
    for r in rows:
        for it in r.items:
            writer.writerow([
                r.received_date.isoformat(), r.site.name if r.site else "", r.process.name if r.process else "",
                r.vendor.name if r.vendor else "", it.material_name, it.spec,
                _fmt_num(it.quantity), it.unit, _fmt_num(it.weight), it.weight_unit,
                r.driver_name, r.vehicle_no, r.receiver_name, r.memo, r.id,
            ])

    filename = f"인수내역_{date.today().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.get("/receipts/{receipt_id}")
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    return receipt_to_dict(_load(db, receipt_id))


@router.post("/receipts")
def create_receipt(data: ReceiptIn, db: Session = Depends(get_db)):
    r = DeliveryReceipt()
    _apply_payload(db, r, data)
    db.add(r)
    db.commit()
    return receipt_to_dict(_load(db, r.id))


@router.put("/receipts/{receipt_id}")
def update_receipt(receipt_id: int, data: ReceiptIn, db: Session = Depends(get_db)):
    r = _load(db, receipt_id)
    _apply_payload(db, r, data)
    db.commit()
    return receipt_to_dict(_load(db, receipt_id))


@router.delete("/receipts/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    r = db.get(DeliveryReceipt, receipt_id)
    if not r:
        raise HTTPException(404, "인수증을 찾을 수 없습니다.")
    db.delete(r)
    db.commit()
    return {"status": "success"}
