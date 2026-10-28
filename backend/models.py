from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import String, Float, Date, DateTime, Boolean, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Site(Base):
    """현장"""
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    address: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Process(Base):
    """공정 (토공사, 골조공사 ...)"""
    __tablename__ = "processes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    color: Mapped[str] = mapped_column(String(20), default="#4E5968")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Vendor(Base):
    """공급업체"""
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    phone: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Material(Base):
    """자재 마스터 (자동완성 / 통계용)"""
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    default_unit: Mapped[str] = mapped_column(String(20), default="")


class User(Base):
    """카카오 로그인 사용자"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    kakao_id: Mapped[str] = mapped_column(String(50), unique=True)
    nickname: Mapped[str] = mapped_column(String(100), default="")
    profile_image: Mapped[str] = mapped_column(Text, default="")
    role: Mapped[str] = mapped_column(String(20), default="member")      # admin | member
    status: Mapped[str] = mapped_column(String(20), default="pending")   # pending | approved | blocked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DeliveryReceipt(Base):
    """인수증 1장 (헤더)"""
    __tablename__ = "delivery_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)  # 등록자
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    process_id: Mapped[int] = mapped_column(ForeignKey("processes.id"))
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    received_date: Mapped[date] = mapped_column(Date)  # 실제 인수일 (저장일과 별도)
    driver_name: Mapped[str] = mapped_column(String(50), default="")   # 납품 기사
    vehicle_no: Mapped[str] = mapped_column(String(30), default="")    # 차량번호
    receiver_name: Mapped[str] = mapped_column(String(50), default="")  # 현장 인수자
    memo: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    ocr_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # OCR 원본 결과(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    created_by: Mapped[Optional[User]] = relationship()
    site: Mapped[Site] = relationship()
    process: Mapped[Process] = relationship()
    vendor: Mapped[Optional[Vendor]] = relationship()
    items: Mapped[list["DeliveryItem"]] = relationship(
        back_populates="receipt",
        cascade="all, delete-orphan",
        order_by="DeliveryItem.sort_order",
    )

    __table_args__ = (Index("ix_receipts_site_date", "site_id", "received_date"),)


class DeliveryItem(Base):
    """인수증의 품목 라인 (한 장에 여러 품목 가능)"""
    __tablename__ = "delivery_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    receipt_id: Mapped[int] = mapped_column(ForeignKey("delivery_receipts.id", ondelete="CASCADE"), index=True)
    material_id: Mapped[Optional[int]] = mapped_column(ForeignKey("materials.id"), nullable=True)
    material_name: Mapped[str] = mapped_column(String(200))
    spec: Mapped[str] = mapped_column(String(200), default="")
    quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="")
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_unit: Mapped[str] = mapped_column(String(10), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    receipt: Mapped[DeliveryReceipt] = relationship(back_populates="items")
    material: Mapped[Optional[Material]] = relationship()


DEFAULT_PROCESSES = [
    ("토공사", "#3182F6"),
    ("골조공사", "#6B36BA"),
    ("조적/미장공사", "#F08C00"),
    ("전기/설비공사", "#0CA678"),
    ("수장공사", "#E03131"),
    ("기타", "#4E5968"),
]


def ensure_columns(engine):
    """create_all은 기존 테이블에 컬럼을 추가하지 않으므로, 이후 버전에서 추가된 컬럼을 보정"""
    from sqlalchemy import inspect, text
    cols = {c["name"] for c in inspect(engine).get_columns("delivery_receipts")}
    if "created_by_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE delivery_receipts ADD COLUMN created_by_id INTEGER REFERENCES users(id)"))


def seed_defaults(db):
    if not db.query(Process).first():
        for i, (name, color) in enumerate(DEFAULT_PROCESSES):
            db.add(Process(name=name, color=color, sort_order=i))
    if not db.query(Site).first():
        db.add(Site(name="기본 현장"))
    db.commit()
