// src/context/CostsContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getAppCosts } from '../services/backendService';
import { AppCosts } from '../types/settings';

export interface CostsContextType {
  costs: AppCosts | null;
  isLoading: boolean;
}

export const CostsContext = createContext<CostsContextType | undefined>(undefined);

export const useCosts = (): CostsContextType => {
  const context = useContext(CostsContext);
  if (!context) {
    throw new Error('useCosts must be used within a CostsProvider');
  }
  return context;
};

export const CostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [costs, setCosts] = useState<AppCosts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const appCosts = await getAppCosts();
        setCosts(appCosts);
      } catch (error) {
        console.error("Failed to fetch app costs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCosts();
  }, []);

  return (
    <CostsContext.Provider value={{ costs, isLoading }}>
      {children}
    </CostsContext.Provider>
  );
};