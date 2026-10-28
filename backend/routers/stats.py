from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from db import get_db
from models import Process, Vendor, DeliveryReceipt, DeliveryItem
from routers.receipts import filtered_query

router = APIRouter(prefix="/api")


@router.get("/stats/summary")
def stats_summary(
    site_id: Optional[int] = None,
    process_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    receipts = filtered_query(db, site_id, process_id, None, date_from, date_to).subquery()
    rid = receipts.c.id

    receipt_count = db.query(func.count(rid)).scalar() or 0
    vendor_count = db.query(func.count(func.distinct(receipts.c.vendor_id))).scalar() or 0

    by_process = (
        db.query(Process.id, Process.name, Process.color, func.count(rid).label("count"))
        .join(receipts, receipts.c.process_id == Process.id)
        .group_by(Process.id, Process.name, Process.color)
        .order_by(desc("count"))
        .all()
    )

    by_vendor = (
        db.query(Vendor.name, func.count(rid).label("count"))
        .join(receipts, receipts.c.vendor_id == Vendor.id)
        .group_by(Vendor.name)
        .order_by(desc("count"))
        .limit(20)
        .all()
    )

    by_material = (
        db.query(
            DeliveryItem.material_name,
            DeliveryItem.unit,
            DeliveryItem.weight_unit,
            func.sum(DeliveryItem.quantity).label("quantity"),
            func.sum(DeliveryItem.weight).label("weight"),
            func.count(func.distinct(DeliveryItem.receipt_id)).label("count"),
        )
        .join(receipts, receipts.c.id == DeliveryItem.receipt_id)
        .group_by(DeliveryItem.material_name, DeliveryItem.unit, DeliveryItem.weight_unit)
        .order_by(desc("count"), DeliveryItem.material_name)
        .all()
    )

    daily = (
        db.query(receipts.c.received_date, func.count(rid).label("count"))
        .group_by(receipts.c.received_date)
        .order_by(receipts.c.received_date)
        .all()
    )

    return {
        "receipt_count": receipt_count,
        "vendor_count": vendor_count,
        "material_count": len({m.material_name for m in by_material}),
        "by_process": [{"id": p.id, "name": p.name, "color": p.color, "count": p.count} for p in by_process],
        "by_vendor": [{"name": v.name, "count": v.count} for v in by_vendor],
        "by_material": [
            {
                "name": m.material_name,
                "unit": m.unit,
                "weight_unit": m.weight_unit,
                "quantity": m.quantity,
                "weight": m.weight,
                "count": m.count,
            }
            for m in by_material
        ],
        "daily": [{"date": d.received_date.isoformat() if hasattr(d.received_date, "isoformat") else str(d.received_date), "count": d.count} for d in daily],
    }
