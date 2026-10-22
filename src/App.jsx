import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { CompanyProfileProvider } from './context/CompanyProfileContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { initDatabase } from './db/database.js';
import { runAutoBackup } from './utils/backupService.js';
import { cashService } from './services/cashService.js';
import { syncStockEntriesToDb } from './utils/stockUtils.js';
import { repairIssueTotalValues } from './services/issueService.js';
import { accountService } from './services/accountService.js';

export default function App() {
  useEffect(() => {
    initDatabase().then(() => {
      runAutoBackup();
      accountService.resolveLegacyAccountIds().catch((err) => {
        console.error('Failed to resolve legacy account ids on startup:', err);
      });
      cashService.repairJournalCashRows().catch((err) => {
        console.error('Failed to repair journal cash rows on startup:', err);
      });
      syncStockEntriesToDb().catch((err) => {
        console.error('Failed to sync stock entries on startup:', err);
      });
      repairIssueTotalValues().catch((err) => {
        console.error('Failed to repair issue total values on startup:', err);
      });
    });
  }, []);

  return (
    <AppProvider>
      <CompanyProfileProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </CompanyProfileProvider>
    </AppProvider>
  );
}
