import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { CompanyProfileProvider } from './context/CompanyProfileContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { initDatabase } from './db/database.js';
import { runAutoBackup } from './utils/backupService.js';

export default function App() {
  useEffect(() => {
    initDatabase().then(() => {
      runAutoBackup();
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
