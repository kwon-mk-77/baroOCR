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
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "이미지 고화질 전처리 중...",
    "Upstage 레이아웃 엔진 분석 중...",
    "문서 내 텍스트 및 표 구조 추출 중...",
    "Solar Pro AI 핵심 자재 정보 매핑 중...",
    "인수증 데이터 변환 완료 단계..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 5);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 4096 },
          height: { ideal: 2160 }
        }
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

  const compressImage = (fileOrBlob) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1920;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], "image.jpg", { type: 'image/jpeg' });
          resolve({ file: compressedFile, dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
        }, 'image/jpeg', 0.8);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(fileOrBlob);
    });
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    let width = video.videoWidth;
    let height = video.videoHeight;
    const MAX_DIMENSION = 1920;
    
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(dataUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const { file: compressedFile, dataUrl } = await compressImage(file);
      setSelectedFile(compressedFile);
      setImagePreview(dataUrl);
      stopCamera();
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: '#fff',
          padding: '24px'
        }}>
          {/* Custom style for keyframes */}
          <style>{`
            @keyframes scan {
              0% { top: 0%; opacity: 0.3; }
              50% { top: 100%; opacity: 1; }
              100% { top: 0%; opacity: 0.3; }
            }
            @keyframes pulse-glow {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4)); }
              50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.8)); }
            }
            @keyframes spin-circle {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fade-in-out {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `}</style>

          {/* Futuristic Scanning UI Container */}
          <div style={{ position: 'relative', width: '200px', height: '240px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Glowing Holographic Receipt Outline */}
            <div style={{
              width: '140px',
              height: '190px',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              animation: 'pulse-glow 3s infinite ease-in-out',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px'
            }}>
              {/* Dummy receipt lines for effect */}
              <div style={{ height: '4px', backgroundColor: 'rgba(59, 130, 246, 0.3)', width: '60%', borderRadius: '2px' }} />
              <div style={{ height: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', width: '80%', borderRadius: '2px' }} />
              <div style={{ height: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', width: '40%', borderRadius: '2px' }} />
              <div style={{ height: '4px', backgroundColor: 'rgba(59, 130, 246, 0.3)', width: '90%', borderRadius: '2px' }} />
              <div style={{ height: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', width: '70%', borderRadius: '2px' }} />
              
              {/* Vertical Laser Scanner Beam */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(to right, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                boxShadow: '0 0 12px 3px rgba(59, 130, 246, 0.8)',
                animation: 'scan 2.5s infinite linear'
              }} />
            </div>

            {/* Orbit HUD Ring */}
            <div style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              border: '2px dashed rgba(96, 165, 250, 0.2)',
              borderRadius: '50%',
              animation: 'spin-circle 20s infinite linear'
            }} />
            
            {/* Inner HUD Ring */}
            <div style={{
              position: 'absolute',
              width: '170px',
              height: '170px',
              border: '2px dashed rgba(59, 130, 246, 0.3)',
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin-circle 8s infinite linear reverse'
            }} />
          </div>

          {/* Loading step indicator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {loadingMessages.map((_, idx) => (
              <div 
                key={idx} 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: idx === loadingStep ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                  boxShadow: idx === loadingStep ? '0 0 10px #3b82f6' : 'none',
                  transition: 'all 0.3s ease'
                }} 
              />
            ))}
          </div>

          {/* Title and message */}
          <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '-0.025em', marginBottom: '12px', color: '#fff' }}>
            AI 문서 분석 중
          </h3>
          <p style={{ 
            fontSize: '1.05rem', 
            color: 'rgba(255, 255, 255, 0.75)', 
            animation: 'fade-in-out 1.5s infinite ease-in-out',
            textAlign: 'center',
            minHeight: '24px',
            fontWeight: '500'
          }}>
            {loadingMessages[loadingStep]}
          </p>
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
                <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.1rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>글자가 잘 보이도록 밝은 곳에서 촬영하세요</p>
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

