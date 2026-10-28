-- 바로인수 DB 스키마 (PostgreSQL / Supabase)
-- 백엔드가 시작될 때 SQLAlchemy가 자동으로 생성하므로 직접 실행할 필요는 없습니다.
-- Supabase SQL Editor에서 미리 만들어 두고 싶을 때 참고용으로 사용하세요.

create table if not exists sites (
  id          serial primary key,
  name        varchar(100) not null unique,          -- 현장명
  address     varchar(255) not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists processes (
  id          serial primary key,
  name        varchar(50) not null unique,           -- 공정명
  color       varchar(20) not null default '#4E5968',
  sort_order  integer not null default 0
);

create table if not exists vendors (
  id          serial primary key,
  name        varchar(200) not null unique,          -- 공급업체
  phone       varchar(50) not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists materials (
  id            serial primary key,
  name          varchar(200) not null unique,        -- 자재명 (자동완성/통계 기준)
  default_unit  varchar(20) not null default ''
);

create table if not exists delivery_receipts (
  id             serial primary key,
  site_id        integer not null references sites(id),
  process_id     integer not null references processes(id),
  vendor_id      integer references vendors(id),
  received_date  date not null,                      -- 실제 인수일
  driver_name    varchar(50) not null default '',    -- 납품 기사
  vehicle_no     varchar(30) not null default '',    -- 차량번호
  receiver_name  varchar(50) not null default '',    -- 현장 인수자
  memo           text not null default '',
  image_url      text not null default '',
  ocr_raw        text,                               -- AI 인식 원본(JSON)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists ix_receipts_site_date on delivery_receipts (site_id, received_date);

create table if not exists delivery_items (
  id             serial primary key,
  receipt_id     integer not null references delivery_receipts(id) on delete cascade,
  material_id    integer references materials(id),
  material_name  varchar(200) not null,
  spec           varchar(200) not null default '',
  quantity       double precision,                   -- 숫자로 저장해 합계 계산 가능
  unit           varchar(20) not null default '',
  weight         double precision,
  weight_unit    varchar(10) not null default '',
  sort_order     integer not null default 0
);
create index if not exists ix_delivery_items_receipt_id on delivery_items (receipt_id);
