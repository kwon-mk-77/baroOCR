import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ZoomIn, Check, LoaderCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { prefs } from '../lib/prefs';
import { todayISO, toNumberOrNull } from '../lib/format';
import { ChipGroup, ImageViewer } from './ui';

const UNITS = ['개', 'EA', '포', '본', '장', '매', '㎥', '㎡', 'm', 'kg', 'ton', '대', '식', '롤', 'BOX', 'SET', 'L'];
const WEIGHT_UNITS = ['ton', 'kg'];

let keySeq = 0;
const newKey = () => `item-${++keySeq}`;

const toStr = (v) => (v === null || v === undefined ? '' : String(v));

const blankItem = () => ({
  key: newKey(), material_name: '', spec: '', quantity: '', unit: '', weight: '', weight_unit: '',
});

const mapItems = (items) =>
  items?.length
    ? items.map((it) => ({
      key: newKey(),
      material_name: it.material_name || '',
      spec: it.spec || '',
      quantity: toStr(it.quantity),
      unit: it.unit || '',
      weight: toStr(it.weight),
      weight_unit: it.weight_unit || '',
    }))
    : [blankItem()];

/** 새 인수증 폼 (OCR 결과가 있으면 채워 넣음) */
export const formFromOcr = (ocr, siteId) => ({
  site_id: siteId,
  received_date: ocr?.received_date || todayISO(),
  process_id: prefs.get('lastProcessId') || null,
  vendor_name: ocr?.vendor || '',
  driver_name: ocr?.driver_name || '',
  vehicle_no: ocr?.vehicle_no || '',
  receiver_name: ocr?.receiver_name || prefs.get('receiverName', ''),
  memo: '',
  items: mapItems(ocr?.items),
});

/** 기존 인수증 -> 수정 폼 */
export const formFromReceipt = (r) => ({
  site_id: r.site_id,
  received_date: r.received_date,
  process_id: r.process?.id || null,
  vendor_name: r.vendor_name,
  driver_name: r.driver_name,
  vehicle_no: r.vehicle_no,
  receiver_name: r.receiver_name,
  memo: r.memo,
  items: mapItems(r.items),
});

const validate = (form) => {
  const errors = {};
  if (!form.process_id) errors.process_id = '공정을 선택해주세요.';
  if (!form.received_date) errors.received_date = '인수일을 입력해주세요.';
  if (!form.vendor_name.trim()) errors.vendor_name = '공급업체를 입력해주세요.';

  const filled = form.items.filter((it) => it.material_name.trim() || it.quantity || it.weight);
  if (!filled.length) errors.items = '품목을 1개 이상 입력해주세요.';
  form.items.forEach((it) => {
    if (!filled.includes(it)) return;
    if (!it.material_name.trim()) errors[`${it.key}.material_name`] = '자재명을 입력해주세요.';
    if (!it.quantity && !it.weight) errors[`${it.key}.amount`] = '수량 또는 중량을 입력해주세요.';
    if (it.quantity && toNumberOrNull(it.quantity) === null) errors[`${it.key}.amount`] = '수량은 숫자로 입력해주세요.';
    if (it.weight && toNumberOrNull(it.weight) === null) errors[`${it.key}.amount`] = '중량은 숫자로 입력해주세요.';
  });
  return errors;
};

const toPayload = (form, extra) => ({
  ...extra,
  site_id: form.site_id,
  process_id: form.process_id,
  received_date: form.received_date,
  vendor_name: form.vendor_name.trim(),
  driver_name: form.driver_name.trim(),
  vehicle_no: form.vehicle_no.trim(),
  receiver_name: form.receiver_name.trim(),
  memo: form.memo.trim(),
  items: form.items
    .filter((it) => it.material_name.trim())
    .map((it) => ({
      material_name: it.material_name.trim(),
      spec: it.spec.trim(),
      quantity: toNumberOrNull(it.quantity),
      unit: it.unit.trim(),
      weight: toNumberOrNull(it.weight),
      weight_unit: it.weight_unit.trim(),
    })),
});

export default function ReceiptForm({ initial, imageSrc, highlightEmpty, notice, submitLabel, onSubmit, extraPayload }) {
  const { processes, sites } = useApp();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewImage, setViewImage] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    api.vendors().then(setVendors).catch(() => {});
    api.materials().then(setMaterials).catch(() => {});
  }, []);

  const clearError = (key) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    clearError(name);
  };

  const setItem = (key, name, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it) => {
        if (it.key !== key) return it;
        const next = { ...it, [name]: value };
        // 자재를 목록에서 고르면 평소 쓰던 단위를 자동으로 채움
        if (name === 'material_name' && !it.unit) {
          const m = materials.find((x) => x.name === value);
          if (m?.default_unit) next.unit = m.default_unit;
        }
        return next;
      }),
    }));
    clearError(`${key}.${name === 'quantity' || name === 'weight' ? 'amount' : name}`);
    clearError('items');
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (key) => setForm((f) => ({
    ...f,
    items: f.items.length > 1 ? f.items.filter((it) => it.key !== key) : [blankItem()],
  }));

  const needsCheck = (value) => (highlightEmpty && !String(value || '').trim() ? 'needs-check' : '');
  const cls = (errorKey, value) => `input ${errors[errorKey] ? 'has-error' : ''} ${needsCheck(value)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector('.has-error, .field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setSaving(true);
    try {
      prefs.set('lastProcessId', form.process_id);
      if (form.receiver_name.trim()) prefs.set('receiverName', form.receiver_name.trim());
      await onSubmit(toPayload(form, extraPayload));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-page" onSubmit={handleSubmit} noValidate>
      {imageSrc && (
        <button type="button" className="form-image" onClick={() => setViewImage(true)}>
          <img src={imageSrc} alt="인수증" />
          <span className="form-image-zoom"><ZoomIn size={16} /> 원본 크게 보기</span>
        </button>
      )}

      {notice}

      {/* 기본 정보 */}
      <section className="card">
        <h3 className="section-title">기본 정보</h3>

        {sites.length > 1 && (
          <div className="field">
            <label className="label">현장</label>
            <select className="input" value={form.site_id || ''} onChange={(e) => setField('site_id', Number(e.target.value))}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label className="label">공정 <em>*</em></label>
          <ChipGroup
            scroll={false}
            value={form.process_id}
            onChange={(v) => setField('process_id', v)}
            options={processes.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
          />
          {errors.process_id && <p className="field-error">{errors.process_id}</p>}
        </div>

        <div className="field-row">
          <div className="field">
            <label className="label">인수일 <em>*</em></label>
            <input type="date" className={cls('received_date', form.received_date)} value={form.received_date}
              onChange={(e) => setField('received_date', e.target.value)} />
            {errors.received_date && <p className="field-error">{errors.received_date}</p>}
          </div>
        </div>

        <div className="field">
          <label className="label">공급업체 <em>*</em></label>
          <input className={cls('vendor_name', form.vendor_name)} value={form.vendor_name} list="vendor-list"
            placeholder="예: (주)한국레미콘" onChange={(e) => setField('vendor_name', e.target.value)} />
          <datalist id="vendor-list">{vendors.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          {errors.vendor_name && <p className="field-error">{errors.vendor_name}</p>}
        </div>
      </section>

      {/* 품목 */}
      <section className="card">
        <div className="section-head">
          <h3 className="section-title">품목 <span className="count">{form.items.length}</span></h3>
        </div>
        {errors.items && <p className="field-error mb-2">{errors.items}</p>}

        <datalist id="material-list">{materials.map((m) => <option key={m.id} value={m.name} />)}</datalist>
        <datalist id="unit-list">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        <datalist id="weight-unit-list">{WEIGHT_UNITS.map((u) => <option key={u} value={u} />)}</datalist>

        {form.items.map((it, idx) => (
          <div key={it.key} className="item-card">
            <div className="item-card-head">
              <span className="item-index">품목 {idx + 1}</span>
              <button type="button" className="icon-btn small" onClick={() => removeItem(it.key)} aria-label="품목 삭제">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="field-row">
              <div className="field grow-2">
                <label className="label">자재명 <em>*</em></label>
                <input className={cls(`${it.key}.material_name`, it.material_name)} value={it.material_name}
                  list="material-list" placeholder="예: 철근" onChange={(e) => setItem(it.key, 'material_name', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">규격</label>
                <input className="input" value={it.spec} placeholder="예: HD13" onChange={(e) => setItem(it.key, 'spec', e.target.value)} />
              </div>
            </div>
            {errors[`${it.key}.material_name`] && <p className="field-error">{errors[`${it.key}.material_name`]}</p>}

            <div className="field-row">
              <div className="field">
                <label className="label">수량</label>
                <div className="input-group">
                  <input className={cls(`${it.key}.amount`, it.quantity || it.weight)} inputMode="decimal" value={it.quantity}
                    placeholder="0" onChange={(e) => setItem(it.key, 'quantity', e.target.value)} />
                  <input className="input unit" value={it.unit} list="unit-list" placeholder="단위"
                    onChange={(e) => setItem(it.key, 'unit', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="label">중량</label>
                <div className="input-group">
                  <input className="input" inputMode="decimal" value={it.weight} placeholder="0"
                    onChange={(e) => setItem(it.key, 'weight', e.target.value)} />
                  <input className="input unit" value={it.weight_unit} list="weight-unit-list" placeholder="ton"
                    onChange={(e) => setItem(it.key, 'weight_unit', e.target.value)} />
                </div>
              </div>
            </div>
            {errors[`${it.key}.amount`] && <p className="field-error">{errors[`${it.key}.amount`]}</p>}
          </div>
        ))}

        <button type="button" className="btn btn-outline btn-block" onClick={addItem}>
          <Plus size={18} /> 품목 추가
        </button>
      </section>

      {/* 납품 정보 */}
      <section className="card">
        <h3 className="section-title">납품 정보</h3>
        <div className="field-row">
          <div className="field">
            <label className="label">납품 기사</label>
            <input className="input" value={form.driver_name} onChange={(e) => setField('driver_name', e.target.value)} />
          </div>
          <div className="field">
            <label className="label">차량번호</label>
            <input className="input" value={form.vehicle_no} placeholder="12가3456" onChange={(e) => setField('vehicle_no', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label">인수자 (현장 확인자)</label>
          <input className="input" value={form.receiver_name} onChange={(e) => setField('receiver_name', e.target.value)} />
        </div>
        <div className="field mb-0">
          <label className="label">메모</label>
          <textarea className="input" rows={2} value={form.memo} placeholder="특이사항 (파손, 반품, 추가 요청 등)"
            onChange={(e) => setField('memo', e.target.value)} />
        </div>
      </section>

      <div className="bottom-bar">
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
          {saving ? <LoaderCircle size={22} className="spin" /> : <Check size={22} />}
          {saving ? '저장 중...' : submitLabel}
        </button>
      </div>

      {viewImage && <ImageViewer src={imageSrc} onClose={() => setViewImage(false)} />}
    </form>
  );
}
