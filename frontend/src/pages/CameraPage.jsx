import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Image as ImageIcon, RotateCcw, Keyboard } from 'lucide-react';
import { api } from '../lib/api';

const MAX_DIMENSION = 1920;

const fitSize = (width, height) => {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return { width, height };
  return width > height
    ? { width: MAX_DIMENSION, height: Math.round((height * MAX_DIMENSION) / width) }
    : { width: Math.round((width * MAX_DIMENSION) / height), height: MAX_DIMENSION };
};

/** 이미지/비디오 프레임을 최대 1920px JPEG로 축소 */
const drawToJpeg = (source, srcWidth, srcHeight) =>
  new Promise((resolve) => {
    const { width, height } = fitSize(srcWidth, srcHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(source, 0, 0, width, height);
    canvas.toBlob((blob) => {
      resolve({
        file: new File([blob], 'receipt.jpg', { type: 'image/jpeg' }),
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      });
    }, 'image/jpeg', 0.85);
  });

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });

const CameraPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null); // { file, dataUrl }
  const [loading, setLoading] = useState(false);
  const [cameraState, setCameraState] = useState('starting'); // starting | active | error

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // 미리보기가 없을 때만 카메라를 켜고, 화면을 벗어나면 반드시 끔
  useEffect(() => {
    if (captured) return undefined;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error'); // http 접속 등 카메라 API를 쓸 수 없는 환경
      return undefined;
    }
    setCameraState('starting');

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState('active');
      })
      .catch(() => !cancelled && setCameraState('error'));

    return () => { cancelled = true; stopCamera(); };
  }, [captured, stopCamera]);

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCaptured(await drawToJpeg(video, video.videoWidth, video.videoHeight));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const img = await loadImage(file);
    setCaptured(await drawToJpeg(img, img.width, img.height));
  };

  const goToForm = (state) => navigate('/new', { replace: true, state: { imagePreview: captured.dataUrl, ...state } });

  const processOCR = async () => {
    if (!captured) return;
    setLoading(true);
    try {
      const res = await api.ocr(captured.file);
      goToForm({
        imageUrl: res.image_url,
        ocr: res.result,
        ocrRaw: res.raw,
        ocrError: res.ok ? null : res.error,
      });
    } catch (err) {
      // 업로드 자체가 실패한 경우: 저장할 때 다시 업로드
      goToForm({ ocrError: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="camera-page">
      {loading && (
        <div className="scan-overlay">
          <div className="scan-visual">
            <div className="scan-paper">
              <i style={{ width: '60%' }} /><i style={{ width: '85%' }} /><i style={{ width: '45%' }} />
              <i style={{ width: '90%' }} /><i style={{ width: '70%' }} />
              <div className="scan-beam" />
            </div>
            <div className="scan-ring" />
          </div>
          <h3>AI가 인수증을 읽고 있어요</h3>
          <p>업체, 품목, 수량을 찾는 중입니다 (5~15초)</p>
        </div>
      )}

      <div className="camera-header">
        <button className="icon-btn light" onClick={() => navigate(-1)} aria-label="뒤로가기">
          <ArrowLeft size={28} />
        </button>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} hidden onChange={handleFileChange} />

      {!captured ? (
        <div className="camera-view">
          {cameraState === 'error' ? (
            <div className="camera-fallback">
              <p>카메라를 사용할 수 없습니다.<br />브라우저의 카메라 권한을 확인하거나 사진을 선택해주세요.</p>
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
                <ImageIcon size={20} /> 사진 선택
              </button>
              <button onClick={() => navigate('/new', { replace: true })} className="btn btn-ghost-light">
                <Keyboard size={18} /> 직접 입력하기
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <div className="camera-guide">
                <p className="camera-guide-title">인수증을 네모 칸에 맞춰주세요</p>
                <p className="camera-guide-desc">밝은 곳에서 글자가 잘 보이게 찍어주세요</p>
                <div className="camera-frame"><span /><span /><span /><span /></div>
              </div>
              <div className="camera-controls">
                <button className="camera-side-btn" onClick={() => fileInputRef.current?.click()} aria-label="앨범에서 선택">
                  <ImageIcon size={26} />
                  <span>앨범</span>
                </button>
                <button className="shutter" onClick={captureFromVideo} disabled={cameraState !== 'active'} aria-label="촬영">
                  <span />
                </button>
                <button className="camera-side-btn" onClick={() => navigate('/new', { replace: true })} aria-label="직접 입력">
                  <Keyboard size={26} />
                  <span>직접입력</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="camera-preview">
          <img src={captured.dataUrl} alt="촬영한 인수증" />
          <div className="camera-preview-actions">
            <button className="btn btn-glass" onClick={() => setCaptured(null)}>
              <RotateCcw size={18} /> 다시 찍기
            </button>
            <button className="btn btn-primary grow-2" onClick={processOCR}>
              <Sparkles size={20} /> AI 분석 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPage;
