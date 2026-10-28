import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { PageHeader, Spinner, EmptyState } from '../components/ui';
import ReceiptForm, { formFromReceipt } from '../components/ReceiptForm';

const EditReceiptPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.receipt(id).then(setReceipt).catch((e) => setError(e.message));
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      await api.updateReceipt(id, { ...payload, image_url: receipt.image_url });
      showToast('수정되었습니다.');
      navigate(`/receipts/${id}`, { replace: true });
    } catch (e) {
      showToast(e.message || '수정에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="page">
      <PageHeader title="인수증 수정" back />
      {error ? (
        <EmptyState title="인수증을 불러올 수 없습니다" description={error} />
      ) : !receipt ? (
        <Spinner />
      ) : (
        <ReceiptForm
          initial={formFromReceipt(receipt)}
          imageSrc={receipt.image_url}
          submitLabel="수정 완료"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default EditReceiptPage;
