import React, { useEffect, useState } from 'react';
import { UserCheck, Ban, ShieldCheck, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

const STATUS_LABEL = { pending: '승인 대기', approved: '사용 중', blocked: '차단됨' };

/** 관리자 전용: 사용자 승인 / 차단 / 관리자 지정 */
export default function UserManagement() {
  const { user: me, showToast } = useApp();
  const [users, setUsers] = useState(null);

  const load = () => api.users().then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const update = async (u, data, message) => {
    try {
      await api.updateUser(u.id, data);
      showToast(message);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  if (!users) return null;
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <section className="card">
      <h3 className="section-title">
        사용자 관리 {pendingCount > 0 && <span className="count warn">승인 대기 {pendingCount}</span>}
      </h3>
      <ul className="option-list">
        {users.map((u) => (
          <li key={u.id} className="user-row">
            <span className="avatar">
              {u.profile_image ? <img src={u.profile_image} alt="" /> : u.nickname.slice(0, 1)}
            </span>
            <div className="user-row-main">
              <p className="option-title">
                {u.nickname}{u.id === me.id && ' (나)'}
                {u.role === 'admin' && <span className="role-tag">관리자</span>}
              </p>
              <p className={`option-sub status-${u.status}`}>{STATUS_LABEL[u.status]}</p>
            </div>
            {u.id !== me.id && (
              <div className="user-row-actions">
                {u.status !== 'approved' && (
                  <button className="btn btn-primary btn-sm" onClick={() => update(u, { status: 'approved' }, `${u.nickname}님을 승인했습니다.`)}>
                    <UserCheck size={16} /> 승인
                  </button>
                )}
                {u.status === 'approved' && (
                  <button className="icon-btn small" aria-label={u.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                    title={u.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                    onClick={() => update(u, { role: u.role === 'admin' ? 'member' : 'admin' },
                      u.role === 'admin' ? '관리자 권한을 해제했습니다.' : '관리자로 지정했습니다.')}>
                    {u.role === 'admin' ? <ShieldCheck size={18} /> : <Shield size={18} />}
                  </button>
                )}
                {u.status !== 'blocked' && (
                  <button className="icon-btn small" aria-label="차단" title="차단"
                    onClick={() => update(u, { status: 'blocked' }, `${u.nickname}님을 차단했습니다.`)}>
                    <Ban size={18} />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
