const qs = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const str = s.toString();
  return str ? `?${str}` : '';
};

async function request(path, { method = 'GET', body, form } = {}) {
  const opts = { method, headers: {} };
  if (form) {
    opts.body = form;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, opts);
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === 'string') message = data.detail;
      else if (Array.isArray(data.detail)) message = '입력값을 다시 확인해주세요.';
    } catch { /* 본문이 JSON이 아님 */ }
    throw new Error(message);
  }
  return res.json();
}

const imageForm = (file) => {
  const form = new FormData();
  form.append('image', file);
  return form;
};

export const api = {
  sites: (includeInactive = false) => request(`/sites${qs({ include_inactive: includeInactive || undefined })}`),
  createSite: (data) => request('/sites', { method: 'POST', body: data }),
  updateSite: (id, data) => request(`/sites/${id}`, { method: 'PATCH', body: data }),

  processes: () => request('/processes'),
  vendors: () => request('/vendors'),
  materials: () => request('/materials'),

  ocr: (file) => request('/ocr', { method: 'POST', form: imageForm(file) }),
  upload: (file) => request('/uploads', { method: 'POST', form: imageForm(file) }),

  receipts: (params) => request(`/receipts${qs(params)}`),
  receipt: (id) => request(`/receipts/${id}`),
  createReceipt: (data) => request('/receipts', { method: 'POST', body: data }),
  updateReceipt: (id, data) => request(`/receipts/${id}`, { method: 'PUT', body: data }),
  deleteReceipt: (id) => request(`/receipts/${id}`, { method: 'DELETE' }),

  stats: (params) => request(`/stats/summary${qs(params)}`),
  exportUrl: (params) => `/api/receipts/export.csv${qs(params)}`,
};
