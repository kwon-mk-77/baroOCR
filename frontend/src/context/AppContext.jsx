import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { prefs } from '../lib/prefs';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sites, setSites] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [siteId, setSiteIdState] = useState(() => prefs.get('siteId'));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // API에서 401을 받으면 로그인 화면으로
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const approved = user?.status === 'approved';

  const load = useCallback(async () => {
    setReady(false);
    setLoadError('');
    try {
      const [s, p] = await Promise.all([api.sites(), api.processes()]);
      setSites(s);
      setProcesses(p);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { if (approved) load(); }, [approved, load]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setUser(null);
  }, []);

  const refreshSites = useCallback(async () => {
    const list = await api.sites();
    setSites(list);
    return list;
  }, []);

  const setSiteId = useCallback((id) => {
    setSiteIdState(id);
    prefs.set('siteId', id);
  }, []);

  // 저장된 현장이 비활성화/삭제됐으면 첫 번째 현장으로 대체
  const currentSite = useMemo(
    () => sites.find((s) => s.id === siteId) || sites[0] || null,
    [sites, siteId],
  );

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const value = {
    user, authChecked, checkAuth, logout,
    ready, loadError, reload: load,
    sites, refreshSites, currentSite, setSiteId,
    processes,
    showToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast && (
        <div key={toast.key} className={`toast toast-${toast.type}`} role="status">
          {toast.type === 'error' ? <TriangleAlert size={18} /> : <CircleCheck size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
