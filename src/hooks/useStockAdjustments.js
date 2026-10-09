import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { stockAdjustmentService } from '../services/stockAdjustmentService.js';

export function useStockAdjustments() {
  const stockAdjustments = useLiveQuery(() => {
    if (!db.stockAdjustments) return [];
    return db.stockAdjustments.reverse().toArray();
  }, []) || [];

  return {
    stockAdjustments,
    loading: stockAdjustments === undefined,
    addStockAdjustment: stockAdjustmentService.add,
    deleteStockAdjustment: stockAdjustmentService.delete,
  };
}
