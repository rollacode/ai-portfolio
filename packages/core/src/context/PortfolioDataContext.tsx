'use client';

import { createContext, useContext } from 'react';
import type { PortfolioData } from '../types/portfolio';

const PortfolioDataContext = createContext<PortfolioData | null>(null);

export function PortfolioDataProvider({
  data,
  children,
}: {
  data: PortfolioData;
  children: React.ReactNode;
}) {
  return (
    <PortfolioDataContext.Provider value={data}>
      {children}
    </PortfolioDataContext.Provider>
  );
}

export function usePortfolioData(): PortfolioData {
  const ctx = useContext(PortfolioDataContext);
  if (!ctx) {
    throw new Error('usePortfolioData must be used within PortfolioDataProvider');
  }
  return ctx;
}
