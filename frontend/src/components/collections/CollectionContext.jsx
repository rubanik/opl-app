import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const API = '/api';

const CollectionContext = createContext(null);

export function CollectionProvider({ children }) {
  const [collections, setCollections] = useState([]);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/collections/`);
      if (!res.ok) throw new Error('Failed to fetch collections');
      const data = await res.json();
      setCollections(data);

      // Restore active from localStorage or pick first
      const stored = localStorage.getItem('opl_active_collection');
      if (stored) {
        const exists = data.find(c => c.id === stored);
        if (exists) {
          setActiveCollectionId(stored);
        } else if (data.length > 0) {
          setActiveCollectionId(data[0].id);
        }
      } else if (data.length > 0) {
        setActiveCollectionId(data[0].id);
      } else {
        setActiveCollectionId(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const switchCollection = useCallback((id) => {
    setActiveCollectionId(id);
    localStorage.setItem('opl_active_collection', id);
  }, []);

  const createCollection = async (title, description) => {
    const res = await fetch(`${API}/collections/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error('Failed to create collection');
    const newColl = await res.json();
    setCollections(prev => [newColl, ...prev]);
    setActiveCollectionId(newColl.id);
    localStorage.setItem('opl_active_collection', newColl.id);
    return newColl;
  };

  const updateCollection = async (id, data) => {
    const res = await fetch(`${API}/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update collection');
    const updated = await res.json();
    setCollections(prev => prev.map(c => c.id === id ? updated : c));
  };

  const deleteCollection = async (id) => {
    const res = await fetch(`${API}/collections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete collection');
    setCollections(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeCollectionId === id) {
        setActiveCollectionId(next.length > 0 ? next[0].id : null);
        localStorage.setItem('opl_active_collection', next.length > 0 ? next[0].id : '');
      }
      return next;
    });
  };

  const addOplToCollection = async (collectionId, oplId) => {
    const res = await fetch(`${API}/collections/${collectionId}/opls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opl_id: oplId }),
    });
    if (!res.ok) throw new Error('Failed to add OPL to collection');
    return res.json();
  };

  const activeCollection = collections.find(c => c.id === activeCollectionId) || null;

  return (
    <CollectionContext.Provider
      value={{
        collections,
        activeCollection,
        activeCollectionId,
        switchCollection,
        createCollection,
        updateCollection,
        deleteCollection,
        addOplToCollection,
        loading,
        error,
        refreshCollections: fetchCollections,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error('useCollection must be used within CollectionProvider');
  }
  return ctx;
}

export const useCollectionContext = useCollection;

export default CollectionContext;
