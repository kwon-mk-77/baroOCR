import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Image as ImageIcon, Camera } from 'lucide-react';

const CameraPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setCameraError(false);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match the actual video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
          stopCamera();
        };
        reader.readAsDataURL(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setSelectedFile(null);
    startCamera();
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
    <div className="page" style={{ padding: 0, backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {loading && (
        <div className="loading-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', zIndex: 100 }}>
          <Sparkles size={48} className="mb-4 text-primary" style={{ animation: 'pulse 2s infinite' }} />
          <p className="font-bold text-xl text-white">AI가 문서를 읽는 중...</p>
        </div>
      )}

      {/* Header */}
      <div className="header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, backgroundColor: 'transparent', color: '#fff', borderBottom: 'none' }}>
        <ArrowLeft className="header-icon" color="#fff" size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} onClick={() => { stopCamera(); navigate(-1); }} />
        <div style={{ width: 28 }}></div>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!imagePreview ? (
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          
          {cameraError ? (
            <div style={{ textAlign: 'center', padding: 20, zIndex: 10 }}>
              <p className="mb-4 text-lg">카메라를 실행할 수 없습니다.</p>
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '12px' }}>
                사진 앨범에서 선택
              </button>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          )}

          {/* Overlay elements */}
          {!cameraError && cameraActive && (
            <>
              {/* Top texts */}
              <div style={{ position: 'absolute', top: 90, width: '100%', textAlign: 'center', zIndex: 10 }}>
                <h2 className="text-2xl font-bold mb-2 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>인수증을 스캔하세요</h2>
                <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.1rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>글자가 잘 보이도록 밝은 곳에서 촬영해주세요</p>
              </div>

              {/* Center Camera Icon (Watermark) */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 5
              }}>
                <Camera size={80} color="#fff" style={{ opacity: 0.4 }} />
              </div>

              {/* Centered Capture Button at Bottom */}
              <div style={{ 
                position: 'absolute', 
                bottom: 40, 
                left: 0, 
                right: 0, 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10 
              }}>
                {/* 갤러리 앨범 아이콘 (좌측에 배치) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'absolute', left: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.7 }}
                >
                  <ImageIcon size={32} color="#fff" />
                </div>

                {/* 중앙 캡처 촬영 버튼 */}
                <div 
                  onClick={captureFromVideo}
                  style={{ width: 76, height: 76, borderRadius: '50%', border: '4px solid #fff', padding: 3, cursor: 'pointer', backgroundColor: 'transparent' }}
                >
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '50%', transition: 'transform 0.1s', ':active': { transform: 'scale(0.95)' } }}></div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Preview Screen after capture
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', paddingTop: 80 }}>
          <div style={{ 
            flex: 1, 
            backgroundImage: `url(${imagePreview})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '24px'
          }} />
          
          {/* Action Buttons for Result */}
          <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 440, zIndex: 50 }}>
            <div className="flex gap-3">
              <button 
                className="btn" 
                onClick={handleRetake}
                style={{ flex: 1, padding: '16px', borderRadius: '16px', fontSize: '1.05rem', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}
              >
                다시 찍기
              </button>
              <button 
                className="btn btn-primary" 
                onClick={processOCR}
                style={{ flex: 2, padding: '16px', borderRadius: '16px', fontSize: '1.05rem', boxShadow: '0 8px 24px rgba(49, 130, 246, 0.3)' }}
              >
                <Sparkles size={20} style={{ marginRight: 8 }} />
                AI 분석 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPage;

