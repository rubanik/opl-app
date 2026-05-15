import { useState, useCallback, useContext } from 'react';
import { AuthContext } from '../components/auth/AuthProvider';

const API = '/api';

export function useApi() {
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const auth = useContext(AuthContext);

  const request = useCallback(async (path, options = {}, retryOn401 = true) => {
    const url = path.startsWith('http') ? path : `${API}${path}`;
    const isFormData = options.body instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 401 && retryOn401 && auth) {
        auth.setAuthOpen?.(true);
        auth.setRequireAuth?.(true);
        throw new Error('Необходима авторизация');
      }

      if (!res.ok) {
        let msg = `Ошибка ${res.status}`;
        try {
          const data = await res.json();
          msg = data.detail || data.message || msg;
        } catch { /* not json */ }
        setToast({ open: true, msg, severity: 'error' });
        throw new Error(msg);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return res;
    } catch (err) {
      if (err.message !== 'Необходима авторизация') {
        if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
          setToast({ open: true, msg: 'Нет соединения с сервером', severity: 'error' });
        }
      }
      throw err;
    }
  }, [auth]);

  const get = useCallback((path, options = {}) => request(path, { method: 'GET', ...options }), [request]);
  const post = useCallback((path, body, options = {}) =>
    request(path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), ...options }), [request]);
  const patch = useCallback((path, body, options = {}) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }), [request]);
  const put = useCallback((path, body, options = {}) =>
    request(path, { method: 'PUT', body: JSON.stringify(body), ...options }), [request]);
  const del = useCallback((path, options = {}) => request(path, { method: 'DELETE', ...options }), [request]);

  return { get, post, patch, put, del, toast, setToast };
}
