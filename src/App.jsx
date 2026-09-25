import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { initDatabase } from './db/database.js';

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
