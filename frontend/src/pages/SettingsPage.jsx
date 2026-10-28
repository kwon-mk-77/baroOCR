import React, { useEffect, useState } from 'react';
import { Plus, Check, Pencil, Archive, RotateCcw, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { prefs } from '../lib/prefs';
import { BottomNav, BottomSheet } from '../components/ui';
import UserManagement from '../components/UserManagement';

const SettingsPage = () => {
  const { user, logout, currentSite, setSiteId, refreshSites, showToast } = useApp();
  const [allSites, setAllSites] = useState([]);
  const [editing, setEditing] = useState(null); // { id?, name, address }
  const [saving, setSaving] = useState(false);
  const [receiverName, setReceiverName] = useState(() => prefs.get('receiverName', ''));

  const loadAll = () => api.sites(true).then(setAllSites).catch(() => {});
  useEffect(() => { loadAll(); }, []);

  const afterChange = async () => {
    await Promise.all([loadAll(), refreshSites()]);
  };

  const saveSite = async (e) => {
    e.preventDefault();
    if (!editing.name.trim()) return;
    setSaving(true);
    try {
      const body = { name: editing.name.trim(), address: editing.address.trim() };
      if (editing.id) {
        await api.updateSite(editing.id, body);
        showToast('현장 정보가 수정되었습니다.');
      } else {
        const created = await api.createSite(body);
        setSiteId(created.id);
        showToast(`'${created.name}' 현장이 추가되었습니다.`);
      }
      setEditing(null);
      await afterChange();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (site) => {
    try {
      await api.updateSite(site.id, { is_active: !site.is_active });
      showToast(site.is_active ? '현장을 보관했습니다.' : '현장을 다시 사용합니다.');
      await afterChange();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveReceiver = () => {
    prefs.set('receiverName', receiverName.trim());
    showToast('기본 인수자가 저장되었습니다.');
  };

  const active = allSites.filter((s) => s.is_active);
  const archived = allSites.filter((s) => !s.is_active);

  return (
    <div className="page with-nav">
      <header className="header">
        <div className="header-left"><h1 className="header-title">설정</h1></div>
      </header>

      <div className="content">
        <section className="card profile-card">
          <span className="avatar large">
            {user.profile_image ? <img src={user.profile_image} alt="" /> : user.nickname.slice(0, 1)}
          </span>
          <div className="user-row-main">
            <p className="option-title">{user.nickname}</p>
            <p className="option-sub">카카오 로그인 · {user.role === 'admin' ? '관리자' : '일반 사용자'}</p>
          </div>
          <button className="btn btn-gray btn-sm" onClick={logout}>
            <LogOut size={16} /> 로그아웃
          </button>
        </section>

        {user.role === 'admin' && <UserManagement />}

        <section className="card">
          <div className="section-head">
            <h3 className="section-title">현장 관리</h3>
            <button className="link-btn" onClick={() => setEditing({ name: '', address: '' })}>
              <Plus size={16} /> 현장 추가
            </button>
          </div>
          <ul className="option-list">
            {active.map((s) => (
              <li key={s.id} className="site-row">
                <button type="button" className={`option ${s.id === currentSite?.id ? 'active' : ''}`} onClick={() => setSiteId(s.id)}>
                  <div>
                    <p className="option-title">{s.name}</p>
                    <p className="option-sub">{s.address ? `${s.address} · ` : ''}인수증 {s.receipt_count}건</p>
                  </div>
                  {s.id === currentSite?.id && <Check size={20} />}
                </button>
                <button className="icon-btn small" onClick={() => setEditing({ id: s.id, name: s.name, address: s.address })} aria-label="수정">
                  <Pencil size={18} />
                </button>
                <button className="icon-btn small" onClick={() => toggleActive(s)} aria-label="보관">
                  <Archive size={18} />
                </button>
              </li>
            ))}
          </ul>
          {archived.length > 0 && (
            <>
              <p className="sub-heading">보관된 현장</p>
              <ul className="option-list muted">
                {archived.map((s) => (
                  <li key={s.id} className="site-row">
                    <div className="option">
                      <div>
                        <p className="option-title">{s.name}</p>
                        <p className="option-sub">인수증 {s.receipt_count}건</p>
                      </div>
                    </div>
                    <button className="icon-btn small" onClick={() => toggleActive(s)} aria-label="다시 사용">
                      <RotateCcw size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card">
          <h3 className="section-title">기본 인수자</h3>
          <p className="help-text">새 인수증을 등록할 때 인수자 칸에 자동으로 채워집니다.</p>
          <div className="input-group">
            <input className="input" value={receiverName} placeholder="이름" onChange={(e) => setReceiverName(e.target.value)} />
            <button className="btn btn-primary" onClick={saveReceiver}>저장</button>
          </div>
        </section>

        <p className="app-version">바로인수 v2.0</p>
      </div>

      <BottomSheet open={Boolean(editing)} title={editing?.id ? '현장 수정' : '현장 추가'} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={saveSite}>
            <div className="field">
              <label className="label">현장명 <em>*</em></label>
              <input className="input" autoFocus value={editing.name} placeholder="예: 판교 오피스텔 신축공사"
                onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">주소</label>
              <input className="input" value={editing.address} placeholder="선택 입력"
                onChange={(e) => setEditing((s) => ({ ...s, address: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving || !editing.name.trim()}>
              {editing.id ? '수정하기' : '추가하기'}
            </button>
          </form>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
