import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

const CameraPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await fetch(`/api/ocr`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('OCR API failed');
      }
      
      const data = await response.json();
      
      navigate('/edit', { 
        state: { 
          ocrData: data, 
          imagePreview
        } 
      });
    } catch (error) {
      alert("OCR 처리 중 오류가 발생했습니다. 수동 입력으로 전환합니다.");
      navigate('/edit', { state: { imagePreview, ocrData: {} } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: 0, backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>
      {loading && (
        <div className="loading-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff' }}>
          <Sparkles size={48} className="mb-4 text-primary" style={{ animation: 'pulse 2s infinite' }} />
          <p className="font-bold text-xl text-white">AI가 문서를 읽는 중...</p>
        </div>
      )}

      {/* Header for Camera */}
      <div className="header" style={{ backgroundColor: 'transparent', color: '#fff', borderBottom: 'none' }}>
        <ArrowLeft className="header-icon" color="#fff" size={28} onClick={() => navigate(-1)} />
        <div style={{ width: 28 }}></div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 20px 20px' }}>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />

        {!imagePreview ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 className="text-2xl font-bold mb-2">인수증을 스캔하세요</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>글자가 잘 보이도록 밝은 곳에서 촬영해주세요</p>
            </div>

            {/* Viewfinder Frame */}
            <div style={{
              width: '85%',
              aspectRatio: '3/4',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '24px',
              position: 'relative',
              marginBottom: 40
            }}>
              {/* Corner Accents */}
              <div style={{ position: 'absolute', top: -2, left: -2, width: 40, height: 40, borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderTopLeftRadius: 24 }}></div>
              <div style={{ position: 'absolute', top: -2, right: -2, width: 40, height: 40, borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderTopRightRadius: 24 }}></div>
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: 40, height: 40, borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderBottomLeftRadius: 24 }}></div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 40, height: 40, borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderBottomRightRadius: 24 }}></div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between w-full" style={{ padding: '0 20px', paddingBottom: 40 }}>
              <div 
                onClick={handleCaptureClick} // 갤러리/카메라 앱 선택 팝업 오픈용으로 동일 사용
                style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ImageIcon size={28} color="#fff" />
              </div>
              
              <div 
                onClick={handleCaptureClick}
                style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #fff', padding: 4, cursor: 'pointer' }}
              >
                <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '50%' }}></div>
              </div>
              
              <div style={{ width: 56, height: 56 }}></div> {/* Spacer for balance */}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              flex: 1, 
              backgroundImage: `url(${imagePreview})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '24px'
            }} />
            
            {/* Toss Style Floating Action Button for Result */}
            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440, zIndex: 50 }}>
              <div className="flex gap-3">
                <button 
                  className="btn" 
                  onClick={handleCaptureClick}
                  style={{ flex: 1, padding: '18px', borderRadius: '16px', fontSize: '1.1rem', backgroundColor: '#333', color: '#fff' }}
                >
                  다시 찍기
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={processOCR}
                  style={{ flex: 2, padding: '18px', borderRadius: '16px', fontSize: '1.1rem', boxShadow: '0 8px 24px rgba(49, 130, 246, 0.3)' }}
                >
                  <Sparkles size={20} style={{ marginRight: 8 }} />
                  AI 분석 시작
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPage;
