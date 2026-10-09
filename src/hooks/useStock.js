import { useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { computeStockPositions, syncStockEntriesToDb } from '../utils/stockUtils.js';

export function useStock() {
  const purchases = useLiveQuery(() => db.purchases.toArray(), []) || [];
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const issues = useLiveQuery(() => db.issues.toArray(), []) || [];
  const productions = useLiveQuery(() => db.productions.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray(), []) || [];
  const stockAdjustments = useLiveQuery(() => (db.stockAdjustments ? db.stockAdjustments.toArray() : []), []) || [];

  // Compute live stock positions directly from transaction history
  const stockEntries = useMemo(() => {
    return computeStockPositions(purchases, sales, issues, productions, items, warehouses, stockAdjustments);
  }, [purchases, sales, issues, productions, items, warehouses, stockAdjustments]);

  // Keep db.stockEntries in sync for background queries and export tools
  useEffect(() => {
    if (stockEntries && stockEntries.length > 0) {
      syncStockEntriesToDb();
    }
  }, [stockEntries.length, purchases.length, sales.length, issues.length, productions.length, stockAdjustments.length]);

  return {
    stockEntries,
    loading: purchases === undefined,
    syncStockEntries: syncStockEntriesToDb,
  };
}
