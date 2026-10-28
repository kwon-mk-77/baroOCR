import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui';
import ReceiptForm, { formFromOcr } from '../components/ReceiptForm';

const dataUrlToFile = (dataUrl) => {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'receipt.jpg', { type: mime });
};

const NewReceiptPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentSite, showToast } = useApp();
  const { imagePreview, imageUrl, ocr, ocrRaw, ocrError } = state || {};

  const initial = useMemo(() => formFromOcr(ocr, currentSite?.id), [ocr, currentSite]);
  const fromOcr = Boolean(ocr);
  const filledCount = ocr ? ['vendor', 'driver_name', 'vehicle_no', 'received_date'].filter((k) => ocr[k]).length + (ocr.items?.length || 0) : 0;

  const handleSubmit = async (payload) => {
    try {
      let finalImageUrl = imageUrl || '';
      if (!finalImageUrl && imagePreview) {
        finalImageUrl = (await api.upload(dataUrlToFile(imagePreview))).image_url;
      }
      const saved = await api.createReceipt({ ...payload, image_url: finalImageUrl, ocr_raw: ocrRaw || null });
      showToast('인수증이 저장되었습니다.');
      navigate(`/receipts/${saved.id}`, { replace: true });
    } catch (e) {
      showToast(e.message || '저장에 실패했습니다.', 'error');
    }
  };

  let notice = null;
  if (fromOcr) {
    notice = (
      <div className="notice notice-info">
        <Sparkles size={18} />
        <p>AI가 <b>{filledCount}개 항목</b>을 읽었어요. <span className="mark">노란 칸</span>은 비어 있으니 확인해주세요.</p>
      </div>
    );
  } else if (ocrError) {
    notice = (
      <div className="notice notice-warn">
        <TriangleAlert size={18} />
        <p>자동 인식에 실패했어요. 사진을 보면서 직접 입력해주세요.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title={fromOcr ? '인식 결과 확인' : '인수증 입력'} back />
      <ReceiptForm
        initial={initial}
        imageSrc={imagePreview || imageUrl}
        highlightEmpty={fromOcr}
        notice={notice}
        submitLabel="저장하기"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NewReceiptPage;
