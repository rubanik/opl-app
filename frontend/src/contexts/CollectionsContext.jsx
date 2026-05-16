import { createContext, useContext } from 'react';
import { useCollections } from '../hooks/useCollections';

export const CollectionsContext = createContext(null);

export function CollectionsProvider({ children }) {
  const collections = useCollections();
  return (
    <CollectionsContext.Provider value={collections}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollectionsContext() {
  return useContext(CollectionsContext);
}
