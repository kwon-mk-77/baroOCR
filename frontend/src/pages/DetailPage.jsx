import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await fetch(`/api/receipts/${id}`);
        if (response.ok) {
          const data = await response.json();
          setReceipt(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handlePrint = async () => {
    if (!printRef.current || !receipt) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { 
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`인수증_${receipt.item}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF 생성 오류:", err);
      alert("PDF 출력 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return <div className="page text-center" style={{ paddingTop: '50px' }}><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>;
  }

  if (!receipt) {
    return <div className="page text-center text-secondary" style={{ paddingTop: '50px' }}>인수증을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="header">
        <ArrowLeft className="header-icon" size={24} onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold">인수증 상세</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div style={{ padding: '0 20px 100px 20px', overflowY: 'auto' }}>
        
        {/* The hidden element to be printed to PDF */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={printRef} style={{ width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24pt', marginBottom: '10mm', borderBottom: '2px solid #000', paddingBottom: '5mm' }}>자재 인수증</h1>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10mm', fontSize: '12pt' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', width: '20%', fontWeight: 'bold' }}>저장일</td>
                  <td style={{ border: '1px solid #000', padding: '4mm', width: '30%' }}>{formatDate(receipt.createdAt)}</td>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', width: '20%', fontWeight: 'bold' }}>공정</td>
                  <td style={{ border: '1px solid #000', padding: '4mm', width: '30%' }}>{receipt.process}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>품목</td>
                  <td style={{ border: '1px solid #000', padding: '4mm' }}>{receipt.item}</td>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>공급업체</td>
                  <td style={{ border: '1px solid #000', padding: '4mm' }}>{receipt.vendor}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>규격</td>
                  <td style={{ border: '1px solid #000', padding: '4mm' }}>{receipt.spec || '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>수량/중량</td>
                  <td style={{ border: '1px solid #000', padding: '4mm' }}>{receipt.quantity}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4mm', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>운반기사</td>
                  <td style={{ border: '1px solid #000', padding: '4mm' }} colSpan="3">{receipt.driver || '-'}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginBottom: '5mm', fontSize: '14pt' }}>원본 이미지</h3>
            {receipt.imageUrl ? (
              <img src={receipt.imageUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '100mm', display: 'block', margin: '0 auto', marginBottom: '20mm', border: '1px solid #ccc' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ height: '50mm', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20mm' }}>이미지 없음</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10mm' }}>
              <div style={{ textAlign: 'center', width: '60mm' }}>
                <p style={{ marginBottom: '15mm', fontSize: '12pt' }}>인수자 서명</p>
                <div style={{ borderBottom: '1px solid #000', width: '100%' }}></div>
                <p style={{ marginTop: '2mm', fontSize: '10pt', color: '#666' }}>(인 또는 서명)</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile View */}
        <div className="card mt-2">
          <div className="flex justify-between items-center mb-4">
            <span className="badge">{receipt.process}</span>
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>{formatDate(receipt.createdAt)}</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-6">{receipt.item}</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            <div className="flex justify-between items-center border-b" style={{ borderColor: 'var(--border-color)', paddingBottom: '16px' }}>
              <span className="text-secondary font-semibold">공급업체</span>
              <span className="text-black font-bold text-lg">{receipt.vendor}</span>
            </div>
            
            <div className="flex justify-between items-center border-b" style={{ borderColor: 'var(--border-color)', paddingBottom: '16px' }}>
              <span className="text-secondary font-semibold">수량/중량</span>
              <span className="text-primary font-bold text-lg">{receipt.quantity}</span>
            </div>
            
            <div className="flex justify-between items-center border-b" style={{ borderColor: 'var(--border-color)', paddingBottom: '16px' }}>
              <span className="text-secondary font-semibold">규격</span>
              <span className="text-black font-semibold text-lg">{receipt.spec || '-'}</span>
            </div>
            
            <div className="flex justify-between items-center border-b" style={{ borderColor: 'var(--border-color)', paddingBottom: '16px' }}>
              <span className="text-secondary font-semibold">운반기사</span>
              <span className="text-black font-semibold text-lg">{receipt.driver || '-'}</span>
            </div>
          </div>
          
          {receipt.imageUrl && (
            <div>
              <p className="text-secondary font-semibold mb-3">첨부 이미지</p>
              <img 
                src={receipt.imageUrl} 
                alt="Receipt" 
                style={{ width: '100%', borderRadius: 'var(--radius-md)' }} 
              />
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440, zIndex: 50 }}>
          <button 
            className="btn btn-secondary btn-block" 
            onClick={handlePrint} 
            style={{ padding: '18px', borderRadius: '16px', fontSize: '1.1rem', backgroundColor: '#191F28', color: 'white', boxShadow: '0 8px 24px rgba(25, 31, 40, 0.3)' }}
          >
            <Download size={24} style={{ marginRight: 8 }} />
            PDF 보고서 다운로드
          </button>
        </div>

      </div>
    </div>
  );
};

export default DetailPage;
