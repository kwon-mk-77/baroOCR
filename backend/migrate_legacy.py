"""
기존(v1) Supabase `receipts` 테이블 데이터를 새 구조(delivery_receipts / delivery_items)로 옮기는 1회성 스크립트.

사용법 (backend 폴더에서):
    python migrate_legacy.py            # 미리보기 (DB에 쓰지 않음)
    python migrate_legacy.py --commit   # 실제 이전
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

import httpx

from db import Base, engine, SessionLocal
from models import Site, Process, Vendor, Material, DeliveryReceipt, DeliveryItem, seed_defaults
from services.parsing import split_number_unit, parse_date
from services.storage_service import _auth_headers


def get_or_create(db, model, name, **defaults):
    obj = db.query(model).filter(model.name == name).first()
    if not obj:
        obj = model(name=name, **defaults)
        db.add(obj)
        db.flush()
    return obj


def main(commit: bool):
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY")
    if not (url and key):
        sys.exit("SUPABASE_URL / SUPABASE_KEY 가 필요합니다.")

    resp = httpx.get(f"{url.rstrip('/')}/rest/v1/receipts", params={"select": "*"}, headers=_auth_headers(key), timeout=30.0)
    resp.raise_for_status()
    legacy = resp.json() or []
    print(f"기존 인수증 {len(legacy)}건 발견")

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_defaults(db)
        site = db.query(Site).order_by(Site.id).first()
        processes = {p.name: p for p in db.query(Process).all()}

        for row in legacy:
            qty, qty_unit = split_number_unit(row.get("quantity"))
            weight, w_unit = split_number_unit(row.get("weight"))
            received = parse_date((row.get("createdAt") or "")[:10]) or date.today()
            process = processes.get(row.get("process")) or processes["기타"]
            name = (row.get("item") or "").strip() or "(품목 미상)"
            vendor_name = (row.get("vendor") or "").strip()

            r = DeliveryReceipt(
                site_id=site.id,
                process_id=process.id,
                vendor=get_or_create(db, Vendor, vendor_name) if vendor_name else None,
                received_date=received,
                receiver_name=(row.get("driver") or "").strip(),  # v1 화면에서 '인수자'로 표시되던 필드
                image_url=row.get("imageUrl") or "",
                memo=f"v1 이전 데이터 (원본 ID: {row.get('id')})",
            )
            r.items.append(DeliveryItem(
                material=get_or_create(db, Material, name, default_unit=qty_unit),
                material_name=name,
                spec=(row.get("spec") or "").strip(),
                quantity=qty,
                unit=qty_unit,
                weight=weight,
                weight_unit=w_unit,
            ))
            db.add(r)
            print(f"  {received} | {process.name} | {vendor_name} | {name} {row.get('quantity')}")

        if commit:
            db.commit()
            print("이전 완료.")
        else:
            db.rollback()
            print("미리보기만 실행했습니다. 실제 이전하려면 --commit 옵션을 붙이세요.")


if __name__ == "__main__":
    main(commit="--commit" in sys.argv)
