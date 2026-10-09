import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import Login from '../pages/Login/Login.jsx';

import Dashboard from '../pages/Dashboard/Dashboard.jsx';
import Parties from '../pages/Parties/Parties.jsx';
import Items from '../pages/Items/Items.jsx';
import Qualities from '../pages/Qualities/Qualities.jsx';
import Warehouses from '../pages/Warehouses/Warehouses.jsx';
import Purchase from '../pages/Purchase/Purchase.jsx';
import Issue from '../pages/Issue/Issue.jsx';
import Production from '../pages/Production/Production.jsx';
import Sale from '../pages/Sale/Sale.jsx';
import Journal from '../pages/Journal/Journal.jsx';
import Stock from '../pages/Stock/Stock.jsx';
import StockLedger from '../pages/StockLedger/StockLedger.jsx';
import PartyLedger from '../pages/PartyLedger/PartyLedger.jsx';
import CashBank from '../pages/CashBank/CashBank.jsx';
import CashBook from '../pages/CashBook/CashBook.jsx';
import SalePurchaseLedger from '../pages/SalePurchaseLedger/SalePurchaseLedger.jsx';
import Receivable from '../pages/Receivable/Receivable.jsx';
import Payable from '../pages/Payable/Payable.jsx';
import Expenses from '../pages/Expenses/Expenses.jsx';
import Reports from '../pages/Reports/Reports.jsx';
import WarehouseLedger from '../pages/WarehouseLedger/WarehouseLedger.jsx';
import QualityLedger from '../pages/QualityLedger/QualityLedger.jsx';
import Settings from '../pages/Settings/Settings.jsx';

function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes wrapped in MainLayout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/parties" element={<Parties />} />
                <Route path="/items" element={<Items />} />
                <Route path="/qualities" element={<Qualities />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/purchase" element={<Purchase />} />
                <Route path="/issue" element={<Issue />} />
                <Route path="/production" element={<Production />} />
                <Route path="/sale" element={<Sale />} />
                <Route path="/receipt" element={<Navigate to="/cash-book" replace />} />
                <Route path="/payment" element={<Navigate to="/cash-book" replace />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/stock-ledger" element={<StockLedger />} />
                <Route path="/item-ledger" element={<StockLedger />} />
                <Route path="/warehouse-ledger" element={<WarehouseLedger />} />
                <Route path="/quality-ledger" element={<QualityLedger />} />
                <Route path="/cash-book" element={<CashBook />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/party-ledger" element={<PartyLedger />} />
                <Route path="/sale-purchase-ledger" element={<SalePurchaseLedger />} />
                <Route path="/cash-bank" element={<CashBank />} />
                <Route path="/receivable" element={<Receivable />} />
                <Route path="/payable" element={<Payable />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

