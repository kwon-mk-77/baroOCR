import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

const dataURLtoFile = (dataurl, filename) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
};

const PROCESS_OPTIONS = [
  "토공사", "골조공사", "조적/미장공사", "전기/설비공사", "수장공사", "기타"
];

const EditPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { ocrData, imagePreview } = location.state || {};
  
  const [formData, setFormData] = useState({
    item: '',
    vendor: '',
    spec: '',
    quantity: '',
    driver: '',
    process: ''
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!imagePreview) {
      alert("이미지 정보가 없습니다. 처음부터 다시 시도해주세요.");
      navigate('/menu');
    }
    if (ocrData) {
      setFormData(prev => ({
        ...prev,
        item: ocrData.item || '',
        vendor: ocrData.vendor || '',
        spec: ocrData.spec || '',
        quantity: ocrData.quantity || '',
        driver: ocrData.driver || ''
      }));
    }
  }, [ocrData, imagePreview, navigate]);

  const validate = () => {
    const newErrors = {};
    if (!formData.item.trim()) newErrors.item = "품목은 필수입니다.";
    if (!formData.vendor.trim()) newErrors.vendor = "공급업체는 필수입니다.";
    if (!formData.quantity.trim()) newErrors.quantity = "수량/중량은 필수입니다.";
    if (!formData.process) newErrors.process = "공정을 선택해주세요.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      const file = dataURLtoFile(imagePreview, 'receipt.jpg');
      const submitData = new FormData();
      
      submitData.append('image', file);
      submitData.append('item', formData.item);
      submitData.append('vendor', formData.vendor);
      submitData.append('spec', formData.spec);
      submitData.append('quantity', formData.quantity);
      submitData.append('driver', formData.driver);
      submitData.append('process', formData.process);

      const response = await fetch(`/api/receipts`, {
        method: 'POST',
        body: submitData
      });
      
      if (!response.ok) {
        throw new Error('Save failed');
      }
      alert('저장되었습니다!');
      navigate('/menu');
    } catch (error) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ padding: 0 }}>
      {saving && (
        <div className="loading-overlay">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-semibold text-lg text-black">저장 중입니다</p>
        </div>
      )}

      {/* Toss Header */}
      <div className="header">
        <ArrowLeft className="header-icon" size={24} onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold">인수증 확인</h1>
        <div style={{ width: 24 }}></div> {/* spacer */}
      </div>

      <div style={{ padding: '0 20px 100px 20px', overflowY: 'auto' }}>
        <div style={{ 
          height: '180px', 
          backgroundImage: `url(${imagePreview})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)'
        }} />
        
        <div className="card" style={{ padding: '24px 20px' }}>
          <div className="form-group">
            <label className="form-label">공정 구분 <span className="text-primary">*</span></label>
            <select 
              name="process" 
              className={`form-select ${errors.process ? 'error' : ''}`}
              value={formData.process}
              onChange={handleChange}
            >
              <option value="">선택해주세요</option>
              {PROCESS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.process && <p className="form-error">{errors.process}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">자재명 <span className="text-primary">*</span></label>
            <input 
              name="item"
              type="text" 
              className={`form-input ${errors.item ? 'error' : ''}`}
              value={formData.item}
              onChange={handleChange}
              placeholder="예: 철근"
            />
            {errors.item && <p className="form-error">{errors.item}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">공급업체 <span className="text-primary">*</span></label>
            <input 
              name="vendor"
              type="text" 
              className={`form-input ${errors.vendor ? 'error' : ''}`}
              value={formData.vendor}
              onChange={handleChange}
            />
            {errors.vendor && <p className="form-error">{errors.vendor}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">규격</label>
            <input 
              name="spec"
              type="text" 
              className="form-input"
              value={formData.spec}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">수량/중량 <span className="text-primary">*</span></label>
            <input 
              name="quantity"
              type="text" 
              className={`form-input ${errors.quantity ? 'error' : ''}`}
              value={formData.quantity}
              onChange={handleChange}
            />
            {errors.quantity && <p className="form-error">{errors.quantity}</p>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">운반기사</label>
            <input 
              name="driver"
              type="text" 
              className="form-input"
              value={formData.driver}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Large Sticky Bottom Button */}
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440, zIndex: 50 }}>
          <button 
            className="btn btn-primary btn-block" 
            onClick={handleSave} 
            style={{ padding: '18px', borderRadius: '16px', fontSize: '1.1rem', boxShadow: '0 8px 24px rgba(49, 130, 246, 0.3)' }}
          >
            <Check size={24} style={{ marginRight: 8 }} />
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPage;
