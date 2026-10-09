import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const stockAdjustmentService = {
  async getAll() {
    if (!db.stockAdjustments) return [];
    return await db.stockAdjustments.reverse().toArray();
  },

  async getById(id) {
    if (!db.stockAdjustments) return null;
    return await db.stockAdjustments.get(id);
  },

  /**
   * Adds a manual stock adjustment record (pure inventory adjustment).
   * Critically: does NOT touch Party A/C, Cash Book, or Mall A/C.
   */
  async add(adjData) {
    const id = adjData.id || 'adj_' + Date.now();
    const count = db.stockAdjustments ? await db.stockAdjustments.count() : 0;
    const isReduce = adjData.type === 'REDUCE' || Number(adjData.qty) < 0;
    const prefix = isReduce ? 'ADJ-OUT' : 'ADJ-IN';
    const no = adjData.no || `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const qty = Math.abs(Number(adjData.qty || 0));
    const rate = Number(adjData.rate || 0);
    const amount = qty * rate;

    const record = {
      id,
      no,
      date: adjData.date || new Date().toISOString().split('T')[0],
      type: isReduce ? 'REDUCE' : 'ADD',
      adjustmentType: adjData.adjustmentType || (isReduce ? 'Stock Reduction' : 'Opening Balance'),
      itemId: adjData.itemId,
      itemName: adjData.itemName,
      quality: adjData.quality || 'Cotton A',
      warehouseId: adjData.warehouseId,
      warehouseName: adjData.warehouseName,
      qty,
      rate,
      amount,
      reason: adjData.reason || adjData.note || 'Manual Stock Adjustment',
      note: adjData.reason || adjData.note || 'Manual Stock Adjustment',
      createdAt: new Date().toISOString(),
    };

    if (db.stockAdjustments) {
      await db.stockAdjustments.add(record);
    }

    // Automatically recalculate and sync stock status entries
    await syncStockEntriesToDb();

    return record;
  },

  async delete(id) {
    if (db.stockAdjustments) {
      await db.stockAdjustments.delete(id);
      await syncStockEntriesToDb();
    }
  },
};
