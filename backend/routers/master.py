from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from db import get_db
from models import Site, Process, Vendor, Material, DeliveryReceipt, DeliveryItem
from schemas import SiteIn, SiteUpdate

router = APIRouter(prefix="/api")


def site_to_dict(s: Site, receipt_count: int = 0):
    return {"id": s.id, "name": s.name, "address": s.address, "is_active": s.is_active, "receipt_count": receipt_count}


# ---------- 현장 ----------

@router.get("/sites")
def list_sites(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = (
        db.query(Site, func.count(DeliveryReceipt.id))
        .outerjoin(DeliveryReceipt, DeliveryReceipt.site_id == Site.id)
        .group_by(Site.id)
        .order_by(Site.is_active.desc(), Site.created_at)
    )
    if not include_inactive:
        query = query.filter(Site.is_active.is_(True))
    return [site_to_dict(s, c) for s, c in query.all()]


@router.post("/sites")
def create_site(data: SiteIn, db: Session = Depends(get_db)):
    name = data.name.strip()
    if db.query(Site).filter(Site.name == name).first():
        raise HTTPException(400, "이미 같은 이름의 현장이 있습니다.")
    site = Site(name=name, address=data.address.strip())
    db.add(site)
    db.commit()
    return site_to_dict(site)


@router.patch("/sites/{site_id}")
def update_site(site_id: int, data: SiteUpdate, db: Session = Depends(get_db)):
    site = db.get(Site, site_id)
    if not site:
        raise HTTPException(404, "현장을 찾을 수 없습니다.")
    if data.name is not None:
        name = data.name.strip()
        dup = db.query(Site).filter(Site.name == name, Site.id != site_id).first()
        if dup:
            raise HTTPException(400, "이미 같은 이름의 현장이 있습니다.")
        site.name = name
    if data.address is not None:
        site.address = data.address.strip()
    if data.is_active is not None:
        if not data.is_active and db.query(Site).filter(Site.is_active.is_(True), Site.id != site_id).count() == 0:
            raise HTTPException(400, "최소 1개의 현장은 사용 중이어야 합니다.")
        site.is_active = data.is_active
    db.commit()
    return site_to_dict(site)


# ---------- 공정 / 업체 / 자재 (자동완성) ----------

@router.get("/processes")
def list_processes(db: Session = Depends(get_db)):
    rows = db.query(Process).order_by(Process.sort_order).all()
    return [{"id": p.id, "name": p.name, "color": p.color} for p in rows]


@router.get("/vendors")
def list_vendors(q: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    usage = func.count(DeliveryReceipt.id).label("usage")
    query = (
        db.query(Vendor.id, Vendor.name, usage)
        .outerjoin(DeliveryReceipt, DeliveryReceipt.vendor_id == Vendor.id)
        .group_by(Vendor.id, Vendor.name)
    )
    if q:
        query = query.filter(Vendor.name.ilike(f"%{q.strip()}%"))
    rows = query.order_by(desc("usage"), Vendor.name).limit(limit).all()
    return [{"id": r.id, "name": r.name, "usage": r.usage} for r in rows]


@router.get("/materials")
def list_materials(q: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    usage = func.count(DeliveryItem.id).label("usage")
    query = (
        db.query(Material.id, Material.name, Material.default_unit, usage)
        .outerjoin(DeliveryItem, DeliveryItem.material_id == Material.id)
        .group_by(Material.id, Material.name, Material.default_unit)
    )
    if q:
        query = query.filter(Material.name.ilike(f"%{q.strip()}%"))
    rows = query.order_by(desc("usage"), Material.name).limit(limit).all()
    return [{"id": r.id, "name": r.name, "default_unit": r.default_unit, "usage": r.usage} for r in rows]
