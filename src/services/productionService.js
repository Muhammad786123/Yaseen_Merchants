import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const productionService = {
  async getAll() {
    return await db.productions.reverse().toArray();
  },

  async getById(id) {
    return await db.productions.get(id);
  },

  async add(prdData) {
    const id = prdData.id || 'prd_' + Date.now();
    const count = await db.productions.count();
    const no = prdData.no || `PRD-${String(count + 1).padStart(4, '0')}`;

    const totalInput = Number(prdData.totalInput || 0);
    const outputQty = Number(prdData.outputQty || 0);
    const wasteQty = Number(prdData.wasteQty || 0);
    const yieldPct = totalInput > 0 ? Number(((outputQty / totalInput) * 100).toFixed(1)) : 0;

    const newPrd = {
      id,
      no,
      date: prdData.date || new Date().toISOString().split('T')[0],
      product: prdData.product || 'Processed Cotton',
      inputs: prdData.inputs || [],
      totalInput,
      outputQty,
      wasteQty,
      yieldPct,
      createdAt: prdData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.productions, db.stockEntries], async () => {
      await db.productions.add(newPrd);
    });

    await syncStockEntriesToDb();
    return newPrd;
  },

  /**
   * Atomic Update for Production Record:
   * (1) Replaces production record preserving id, no, createdAt
   * (2) syncStockEntriesToDb automatically recalculates finished product stock
   */
  async update(id, prdData) {
    const existing = await db.productions.get(id);
    if (!existing) throw new Error('Production record not found: ' + id);

    const totalInput = Number(prdData.totalInput !== undefined ? prdData.totalInput : existing.totalInput);
    const outputQty = Number(prdData.outputQty !== undefined ? prdData.outputQty : existing.outputQty);
    const wasteQty = Number(prdData.wasteQty !== undefined ? prdData.wasteQty : existing.wasteQty);
    const yieldPct = totalInput > 0 ? Number(((outputQty / totalInput) * 100).toFixed(1)) : 0;

    const updatedPrd = {
      ...existing,
      date: prdData.date || existing.date,
      product: prdData.product || existing.product,
      inputs: prdData.inputs || existing.inputs,
      totalInput,
      outputQty,
      wasteQty,
      yieldPct,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.productions, db.stockEntries], async () => {
      await db.productions.put(updatedPrd);
    });

    await syncStockEntriesToDb();
    return updatedPrd;
  },

  /**
   * Atomic Delete for Production Record:
   * (1) Remove record
   * (2) syncStockEntriesToDb automatically removes finished goods stock
   */
  async delete(id) {
    const existing = await db.productions.get(id);
    if (!existing) return;

    await db.transaction('rw', [db.productions, db.stockEntries], async () => {
      await db.productions.delete(id);
    });

    await syncStockEntriesToDb();
  },
};
