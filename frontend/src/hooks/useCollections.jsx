import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/auth/AuthProvider';

const API = '/api';

export function useCollections(refetchKey = 0) {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const activeIdRef = useRef(activeCollectionId);
  activeIdRef.current = activeCollectionId;

  const setCollectionById = useCallback((id) => {
    setActiveCollectionId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('collection', id);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, []);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/collections/`);
      const data = await res.json();
      const items = data.items || [];
      setCollections(items);
      const urlParams = new URLSearchParams(window.location.search);
      const urlCollection = urlParams.get('collection');
      const currentId = activeIdRef.current;
      if (urlCollection && items.find(c => c.id === urlCollection)) {
        setCollectionById(urlCollection);
      } else if (!currentId) {
        const defaultColl = items.find(c => c.name === 'Общие');
        if (defaultColl) {
          setCollectionById(defaultColl.id);
        } else if (items.length) {
          setCollectionById(items[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    }
    setLoading(false);
  }, [user, setCollectionById]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections, refetchKey]);

  const createCollection = async (name, description) => {
    const res = await fetch(`${API}/collections/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error(await res.json().then(d => d.detail || 'Ошибка'));
    await fetchCollections();
    return await res.json();
  };

  const updateCollection = async (collectionId, updates) => {
    const res = await fetch(`${API}/collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.json().then(d => d.detail || 'Ошибка'));
    await fetchCollections();
    return await res.json();
  };

  const deleteCollection = async (collectionId) => {
    const res = await fetch(`${API}/collections/${collectionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.json().then(d => d.detail || 'Ошибка'));
    if (activeIdRef.current === collectionId) {
      setActiveCollectionId(null);
    }
    await fetchCollections();
  };

  const subscribe = async (collectionId) => {
    const res = await fetch(`${API}/collections/${collectionId}/subscribe`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.json().then(d => d.detail || 'Ошибка'));
    await fetchCollections();
  };

  const unsubscribe = async (collectionId) => {
    const res = await fetch(`${API}/collections/${collectionId}/unsubscribe`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.json().then(d => d.detail || 'Ошибка'));
    if (activeIdRef.current === collectionId) {
      setActiveCollectionId(null);
    }
    await fetchCollections();
  };

  return {
    collections,
    loading,
    activeCollectionId,
    setActiveCollectionId: setCollectionById,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    subscribe,
    unsubscribe,
  };
}
