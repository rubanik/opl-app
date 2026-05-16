import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/auth/AuthProvider';

const API = '/api';

export function useCollections(refetchKey = 0) {
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);

  const fetchCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/collections/`);
      const data = await res.json();
      setCollections(data.items || []);
      if (!activeCollectionId && data.items?.length) {
        const defaultColl = data.items.find(c => c.name === 'Общие');
        setActiveCollectionId(defaultColl?.id || data.items[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    }
    setLoading(false);
  }, [user, activeCollectionId]);

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
    if (activeCollectionId === collectionId) {
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
    if (activeCollectionId === collectionId) {
      setActiveCollectionId(null);
    }
    await fetchCollections();
  };

  return {
    collections,
    loading,
    activeCollectionId,
    setActiveCollectionId,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    subscribe,
    unsubscribe,
  };
}
