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
      createdAt: adjData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    if (db.stockAdjustments) {
      await db.stockAdjustments.add(record);
    }

    await syncStockEntriesToDb();
    return record;
  },

  /**
   * Updates an existing manual stock adjustment record.
   */
  async update(id, adjData) {
    if (!db.stockAdjustments) return null;
    const existing = await db.stockAdjustments.get(id);
    if (!existing) throw new Error('Stock adjustment not found: ' + id);

    const isReduce = adjData.type === 'REDUCE' || Number(adjData.qty) < 0;
    const qty = Math.abs(Number(adjData.qty !== undefined ? adjData.qty : existing.qty));
    const rate = Number(adjData.rate !== undefined ? adjData.rate : existing.rate);
    const amount = qty * rate;

    const updated = {
      ...existing,
      date: adjData.date || existing.date,
      type: isReduce ? 'REDUCE' : 'ADD',
      adjustmentType: adjData.adjustmentType || existing.adjustmentType,
      itemId: adjData.itemId || existing.itemId,
      itemName: adjData.itemName || existing.itemName,
      quality: adjData.quality || existing.quality,
      warehouseId: adjData.warehouseId || existing.warehouseId,
      warehouseName: adjData.warehouseName || existing.warehouseName,
      qty,
      rate,
      amount,
      reason: adjData.reason || adjData.note || existing.reason,
      note: adjData.reason || adjData.note || existing.note,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.stockAdjustments.put(updated);
    await syncStockEntriesToDb();
    return updated;
  },

  async delete(id) {
    if (db.stockAdjustments) {
      await db.stockAdjustments.delete(id);
      await syncStockEntriesToDb();
    }
  },
};
