import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const stockTransferService = {
  async getAll() {
    if (!db.stockTransfers) return [];
    return await db.stockTransfers.reverse().toArray();
  },

  async getById(id) {
    if (!db.stockTransfers) return null;
    return await db.stockTransfers.get(id);
  },

  async add(transferData) {
    if (!db.stockTransfers) {
      throw new Error('stockTransfers table is not available in database.');
    }

    const count = await db.stockTransfers.count();
    const id = transferData.id || 'trf_' + Date.now();
    const no = transferData.no || `TRF-${String(count + 1).padStart(4, '0')}`;

    const newTransfer = {
      id,
      no,
      date: transferData.date || new Date().toISOString().split('T')[0],
      fromWarehouseId: transferData.fromWarehouseId || transferData.fromWarehouse,
      fromWarehouseName: transferData.fromWarehouseName || transferData.fromWarehouse,
      toWarehouseId: transferData.toWarehouseId || transferData.toWarehouse,
      toWarehouseName: transferData.toWarehouseName || transferData.toWarehouse,
      itemId: transferData.itemId,
      itemName: transferData.itemName,
      quality: transferData.quality || '',
      qty: Math.abs(Number(transferData.qty || 0)),
      remarks: transferData.remarks || '',
      createdAt: transferData.createdAt || new Date().toISOString(),
      updatedAt: null,
    };

    await db.transaction('rw', [db.stockTransfers], async () => {
      await db.stockTransfers.add(newTransfer);
    });

    await syncStockEntriesToDb();
    return newTransfer;
  },

  async update(id, transferData) {
    if (!db.stockTransfers) return null;

    const existing = await db.stockTransfers.get(id);
    if (!existing) throw new Error('Transfer record not found: ' + id);

    const updated = {
      ...existing,
      date: transferData.date || existing.date,
      fromWarehouseId: transferData.fromWarehouseId || transferData.fromWarehouse || existing.fromWarehouseId,
      fromWarehouseName: transferData.fromWarehouseName || transferData.fromWarehouse || existing.fromWarehouseName,
      toWarehouseId: transferData.toWarehouseId || transferData.toWarehouse || existing.toWarehouseId,
      toWarehouseName: transferData.toWarehouseName || transferData.toWarehouse || existing.toWarehouseName,
      itemId: transferData.itemId || existing.itemId,
      itemName: transferData.itemName || existing.itemName,
      quality: transferData.quality !== undefined ? transferData.quality : existing.quality,
      qty: transferData.qty !== undefined ? Math.abs(Number(transferData.qty)) : existing.qty,
      remarks: transferData.remarks !== undefined ? transferData.remarks : existing.remarks,
      updatedAt: new Date().toISOString(),
    };

    await db.transaction('rw', [db.stockTransfers], async () => {
      await db.stockTransfers.put(updated);
    });

    await syncStockEntriesToDb();
    return updated;
  },

  async delete(id) {
    if (!db.stockTransfers) return;

    await db.transaction('rw', [db.stockTransfers], async () => {
      await db.stockTransfers.delete(id);
    });

    await syncStockEntriesToDb();
  },
};
