import React, { useState } from 'react';
import { Hourglass, Ban, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** 로그인은 했지만 아직 승인되지 않았거나 차단된 사용자 */
const PendingPage = () => {
  const { user, checkAuth, logout } = useApp();
  const [checking, setChecking] = useState(false);
  const blocked = user.status === 'blocked';

  const recheck = async () => {
    setChecking(true);
    await checkAuth();
    setChecking(false);
  };

  return (
    <div className="page pending-page">
      <div className="state-box">
        <span className="state-icon">{blocked ? <Ban size={28} /> : <Hourglass size={28} />}</span>
        <p className="state-title">{blocked ? '사용이 제한된 계정입니다' : '관리자 승인을 기다리고 있어요'}</p>
        <p className="state-desc">
          {user.nickname}님, {blocked
            ? '자세한 내용은 현장 관리자에게 문의해주세요.'
            : '현장 관리자에게 승인을 요청해주세요. 승인되면 바로 사용할 수 있어요.'}
        </p>
        {!blocked && (
          <button className="btn btn-primary mt-3" onClick={recheck} disabled={checking}>
            <RotateCcw size={18} /> {checking ? '확인 중...' : '승인 여부 다시 확인'}
          </button>
        )}
        <button className="btn btn-gray" onClick={logout}>다른 계정으로 로그인</button>
      </div>
    </div>
  );
};

export default PendingPage;
