import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Key, Mail, ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!supabase) {
      setErrorMsg('Vercel 대시보드 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) 설정이 누락되어 있습니다. Vercel 설정에 이를 추가해야 로그인이 가능합니다.');
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg('Supabase 설정(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)이 Vercel 환경 변수에 설정되지 않았습니다. Vercel 대시보드에서 환경 변수를 등록해 주세요.');
      return;
    }
    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // 회원가입 진행
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        // 만약 이메일 인증 기능이 꺼져있다면 가입 후 즉시 로그인되므로 세션 체크
        if (data?.session) {
          setSuccessMsg('회원가입 및 로그인이 완료되었습니다!');
          setTimeout(() => navigate('/menu'), 1000);
        } else {
          setSuccessMsg('회원가입 성공! 가입하신 이메일로 발송된 확인 메일을 체크해 주세요.');
        }
      } else {
        // 로그인 진행
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        navigate('/menu');
      }
    } catch (error) {
      setErrorMsg(error.message || '인증에 실패하였습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.loginCard}>
        {/* Logo/Icon section */}
        <div style={styles.logoSection}>
          <div style={styles.iconCircle}>
            <ShieldCheck size={36} color="#3182F6" />
          </div>
          <h1 style={styles.title}>baroOCR</h1>
          <p style={styles.subtitle}>
            {isSignUp ? '간편하게 가입하고 OCR을 시작하세요' : '로그인 후 OCR 서비스를 이용해 보세요'}
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleAuth} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>이메일 주소</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#9ca3af" style={styles.inputIcon} />
              <input
                type="email"
                placeholder="example@toss.im"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <div style={styles.inputWrapper}>
              <Key size={18} color="#9ca3af" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}
          {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? '#93c5fd' : '#3182F6',
              transform: loading ? 'scale(1)' : 'scale(1)',
            }}
          >
            {loading ? (
              '처리 중...'
            ) : isSignUp ? (
              <>
                <UserPlus size={18} style={{ marginRight: 8 }} />
                회원가입 하기
              </>
            ) : (
              <>
                <LogIn size={18} style={{ marginRight: 8 }} />
                안전하게 로그인
              </>
            )}
          </button>
        </form>

        {/* Toggle mode link */}
        <div style={styles.toggleFooter}>
          <span style={styles.footerText}>
            {isSignUp ? '이미 계정이 있으신가요?' : '아직 회원이 아니신가요?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={styles.toggleButton}
          >
            {isSignUp ? '로그인 하러가기' : '회원가입 하러가기'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Toss/Glassmorphism Styled Components
const styles = {
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#F3F4F6', // 소프트 화이트/그레이 배경
    fontFamily: '"Pretendard", -apple-system, sans-serif',
    padding: '20px',
    boxSizing: 'border-box',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '24px', // 둥근 토스 스타일 라운딩
    padding: '40px 32px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(0, 0, 0, 0.02)',
    boxSizing: 'border-box',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  iconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#F2F8FF',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center',
    margin: 0,
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4B5563',
    paddingLeft: '4px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 48px',
    borderRadius: '14px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#FAFAFA',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    // 포커스 스타일은 별도로 지정
    ':focus': {
      border: '1px solid #3182F6',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 3px rgba(49, 130, 246, 0.1)',
    }
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  submitButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 6px -1px rgba(49, 130, 246, 0.2)',
  },
  toggleFooter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginTop: '28px',
    borderTop: '1px solid #F3F4F6',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '13px',
    color: '#9CA3AF',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#3182F6',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  }
};

export default LoginPage;
