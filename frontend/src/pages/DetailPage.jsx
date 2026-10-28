import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Download, ZoomIn, LoaderCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { formatDateFull, formatQty, receiptTitle } from '../lib/format';
import { PageHeader, ProcessBadge, Spinner, EmptyState, ConfirmDialog, ImageViewer } from '../components/ui';

const cell = { border: '1px solid #000', padding: '3mm 4mm' };
const headCell = { ...cell, backgroundColor: '#f0f0f0', fontWeight: 'bold' };

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewImage, setViewImage] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    api.receipt(id).then(setReceipt).catch((e) => setError(e.message));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteReceipt(id);
      showToast('삭제되었습니다.');
      navigate('/list', { replace: true });
    } catch (e) {
      showToast(e.message, 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handlePdf = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      // PDF 라이브러리는 용량이 커서 필요할 때만 불러옴
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
      pdf.save(`인수증_${receipt.received_date}_${receiptTitle(receipt)}.pdf`);
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      showToast('PDF 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="page">
        <PageHeader title="인수증 상세" back="/list" />
        <EmptyState title="인수증을 찾을 수 없습니다" description={error} />
      </div>
    );
  }
  if (!receipt) return <div className="page"><PageHeader title="인수증 상세" back="/list" /><Spinner /></div>;

  const infoRows = [
    ['현장', receipt.site_name],
    ['납품 기사', receipt.driver_name],
    ['차량번호', receipt.vehicle_no],
    ['인수자', receipt.receiver_name],
  ];

  return (
    <div className="page">
      <PageHeader
        title="인수증 상세"
        back
        right={(
          <>
            <button className="icon-btn" onClick={() => navigate(`/receipts/${id}/edit`)} aria-label="수정"><Pencil size={22} /></button>
            <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="삭제"><Trash2 size={22} /></button>
          </>
        )}
      />

      <div className="content with-bottom-bar">
        <section className="card">
          <div className="detail-top">
            <ProcessBadge process={receipt.process} />
            <span className="text-secondary">{formatDateFull(receipt.received_date)}</span>
          </div>
          <p className="detail-vendor">{receipt.vendor_name || '업체 미입력'}</p>
          <p className="detail-title">{receiptTitle(receipt)}</p>
        </section>

        <section className="card">
          <h3 className="section-title">품목 <span className="count">{receipt.items.length}</span></h3>
          <div className="item-table">
            {receipt.items.map((it) => (
              <div key={it.id} className="item-table-row">
                <div>
                  <p className="item-name">{it.material_name}</p>
                  {it.spec && <p className="item-spec">{it.spec}</p>}
                </div>
                <div className="item-amounts">
                  {it.quantity !== null && <p className="item-qty">{formatQty(it.quantity, it.unit)}</p>}
                  {it.weight !== null && <p className="item-weight">{formatQty(it.weight, it.weight_unit)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">납품 정보</h3>
          <dl className="info-list">
            {infoRows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>
            ))}
          </dl>
          {receipt.memo && <p className="memo">{receipt.memo}</p>}
        </section>

        {receipt.image_url && (
          <section className="card">
            <h3 className="section-title">원본 사진</h3>
            <button type="button" className="form-image tall" onClick={() => setViewImage(true)}>
              <img src={receipt.image_url} alt="인수증 원본" />
              <span className="form-image-zoom"><ZoomIn size={16} /> 크게 보기</span>
            </button>
          </section>
        )}
      </div>

      <div className="bottom-bar">
        <button className="btn btn-dark btn-block btn-lg" onClick={handlePdf} disabled={exporting}>
          {exporting ? <LoaderCircle size={22} className="spin" /> : <Download size={22} />}
          PDF로 저장
        </button>
      </div>

      {/* PDF 출력용 숨김 영역 */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef} style={{ width: '210mm', minHeight: '297mm', padding: '18mm', backgroundColor: '#fff', color: '#000', fontFamily: 'Pretendard, sans-serif', fontSize: '11pt' }}>
          <h1 style={{ textAlign: 'center', fontSize: '22pt', marginBottom: '8mm', borderBottom: '2px solid #000', paddingBottom: '4mm' }}>자재 인수증</h1>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
            <tbody>
              <tr>
                <td style={{ ...headCell, width: '18%' }}>인수일</td><td style={{ ...cell, width: '32%' }}>{formatDateFull(receipt.received_date)}</td>
                <td style={{ ...headCell, width: '18%' }}>현장</td><td style={{ ...cell, width: '32%' }}>{receipt.site_name}</td>
              </tr>
              <tr>
                <td style={headCell}>공정</td><td style={cell}>{receipt.process?.name}</td>
                <td style={headCell}>공급업체</td><td style={cell}>{receipt.vendor_name || '-'}</td>
              </tr>
              <tr>
                <td style={headCell}>납품 기사</td><td style={cell}>{receipt.driver_name || '-'}</td>
                <td style={headCell}>차량번호</td><td style={cell}>{receipt.vehicle_no || '-'}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
            <thead>
              <tr>
                <th style={{ ...headCell, width: '8%' }}>No</th><th style={headCell}>자재명</th><th style={headCell}>규격</th>
                <th style={headCell}>수량</th><th style={headCell}>중량</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((it, i) => (
                <tr key={it.id}>
                  <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td><td style={cell}>{it.material_name}</td>
                  <td style={cell}>{it.spec || '-'}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatQty(it.quantity, it.unit) || '-'}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatQty(it.weight, it.weight_unit) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {receipt.memo && <p style={{ marginBottom: '6mm' }}><b>메모:</b> {receipt.memo}</p>}

          {receipt.image_url && (
            <img src={receipt.image_url} alt="" crossOrigin="anonymous"
              style={{ maxWidth: '100%', maxHeight: '110mm', display: 'block', margin: '0 auto 10mm', border: '1px solid #ccc' }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', width: '60mm' }}>
              <p style={{ marginBottom: '12mm' }}>인수자: {receipt.receiver_name || ''}</p>
              <div style={{ borderBottom: '1px solid #000' }} />
              <p style={{ marginTop: '2mm', fontSize: '9pt', color: '#666' }}>(인 또는 서명)</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="인수증을 삭제할까요?"
        message="삭제한 인수증은 복구할 수 없습니다."
        confirmLabel="삭제"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      {viewImage && <ImageViewer src={receipt.image_url} onClose={() => setViewImage(false)} />}
    </div>
  );
};

export default DetailPage;
