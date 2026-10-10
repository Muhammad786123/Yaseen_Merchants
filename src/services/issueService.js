import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const issueService = {
  async getAll() {
    return await db.issues.reverse().toArray();
  },

  async getById(id) {
    return await db.issues.get(id);
  },

  async add(issueData) {
    const id = issueData.id || 'iss_' + Date.now();
    const count = await db.issues.count();
    const no = issueData.no || `ISS-${String(count + 1).padStart(4, '0')}`;

    const processedItems = (issueData.items || []).map((item) => ({
      ...item,
      quality: item.quality || 'Cotton A',
      issueQty: Number(item.issueQty || item.qty || 0),
    }));

    const totalValue = Number(issueData.totalValue || 0);

    const newIssue = {
      id,
      no,
      date: issueData.date || new Date().toISOString().split('T')[0],
      fromWarehouse: (issueData.fromWarehouse || 'Raw Material Store').replace(/wirehouse/gi, 'Warehouse'),
      items: processedItems,
      totalValue,
      createdAt: issueData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.issues, db.stockEntries], async () => {
      await db.issues.add(newIssue);
    });

    await syncStockEntriesToDb();
    return newIssue;
  },

  /**
   * Atomic Update for Material Issue:
   * (1) Replaces issue record preserving id, no, createdAt
   * (2) syncStockEntriesToDb automatically recalculates moving weighted average stock
   */
  async update(id, issueData) {
    const existing = await db.issues.get(id);
    if (!existing) throw new Error('Issue record not found: ' + id);

    const processedItems = (issueData.items || []).map((item) => ({
      ...item,
      quality: item.quality || 'Cotton A',
      issueQty: Number(item.issueQty || item.qty || 0),
    }));

    const updatedIssue = {
      ...existing,
      date: issueData.date || existing.date,
      fromWarehouse: (issueData.fromWarehouse || existing.fromWarehouse || 'Raw Material Store').replace(/wirehouse/gi, 'Warehouse'),
      items: processedItems,
      totalValue: Number(issueData.totalValue !== undefined ? issueData.totalValue : existing.totalValue),
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.issues, db.stockEntries], async () => {
      await db.issues.put(updatedIssue);
    });

    await syncStockEntriesToDb();
    return updatedIssue;
  },

  /**
   * Atomic Delete for Material Issue:
   * (1) Remove record
   * (2) syncStockEntriesToDb automatically reverses stock deductions
   */
  async delete(id) {
    const existing = await db.issues.get(id);
    if (!existing) return;

    await db.transaction('rw', [db.issues, db.stockEntries], async () => {
      await db.issues.delete(id);
    });

    await syncStockEntriesToDb();
  },
};
