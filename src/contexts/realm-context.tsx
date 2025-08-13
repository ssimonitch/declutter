"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface RealmContextType {
  currentRealmId: string | null;
  setCurrentRealmId: (realmId: string | null) => void;
  isLoading: boolean;
}

const RealmContext = createContext<RealmContextType | undefined>(undefined);

const REALM_STORAGE_KEY = "suzumemo-current-realm-id";

interface RealmProviderProps {
  children: ReactNode;
}

export function RealmProvider({ children }: RealmProviderProps) {
  const [currentRealmId, setCurrentRealmIdState] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load realm ID from localStorage on mount (CSR only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedRealmId = localStorage.getItem(REALM_STORAGE_KEY);
        if (storedRealmId && storedRealmId !== "null") {
          setCurrentRealmIdState(storedRealmId);
        }
      } catch (error) {
        console.warn("Failed to load realm ID from localStorage:", error);
      }
      setIsLoading(false);
    }
  }, []);

  // Persist realm ID to localStorage when it changes
  const setCurrentRealmId = useCallback((realmId: string | null) => {
    setCurrentRealmIdState(realmId);

    if (typeof window !== "undefined") {
      try {
        if (realmId === null) {
          localStorage.removeItem(REALM_STORAGE_KEY);
        } else {
          localStorage.setItem(REALM_STORAGE_KEY, realmId);
        }
      } catch (error) {
        console.warn("Failed to save realm ID to localStorage:", error);
      }
    }
  }, []);

  const value: RealmContextType = {
    currentRealmId,
    setCurrentRealmId,
    isLoading,
  };

  return (
    <RealmContext.Provider value={value}>{children}</RealmContext.Provider>
  );
}

export function useRealm(): RealmContextType {
  const context = useContext(RealmContext);
  if (context === undefined) {
    throw new Error("useRealm must be used within a RealmProvider");
  }
  return context;
}

// Convenience hook to get just the current realm ID
export function useCurrentRealmId(): string | null {
  const { currentRealmId } = useRealm();
  return currentRealmId;
}
