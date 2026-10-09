import { db } from '../db/database.js';
import { receiptService } from './receiptService.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const saleService = {
  async getAll() {
    return await db.sales.reverse().toArray();
  },

  async getById(id) {
    return await db.sales.get(id);
  },

  async add(saleData) {
    const id = saleData.id || 'sal_' + Date.now();
    const count = await db.sales.count();
    const no = saleData.no || `SAL-${String(count + 1).padStart(4, '0')}`;

    const total = Number(saleData.total || 0);
    const received = Number(saleData.received || 0);
    const balance = total - received;

    let linkedReceiptId = null;

    // 1. Record linked receipt if an amount was received at sale time
    if (received > 0 && saleData.customerId) {
      const receiptRecord = await receiptService.add({
        date: saleData.date || new Date().toISOString().split('T')[0],
        partyId: saleData.customerId,
        partyName: saleData.customerName,
        amount: received,
        account: saleData.receivedAccount || 'Cash',
        description: `Receipt against sale invoice ${no}`,
      });
      linkedReceiptId = receiptRecord.id;
    }

    const newSale = {
      id,
      no,
      date: saleData.date || new Date().toISOString().split('T')[0],
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      warehouseId: saleData.warehouseId,
      warehouseName: (saleData.warehouseName || '').replace(/wirehouse/gi, 'Warehouse'),
      items: saleData.items || [],
      total,
      received,
      balance,
      linkedReceiptId,
    };

    await db.sales.add(newSale);

    // 2. Debit the FULL calculated Sale amount to Customer Party A/C
    if (saleData.customerId) {
      const customer = await db.parties.get(saleData.customerId);
      if (customer) {
        await db.parties.update(customer.id, {
          balance: Number(customer.balance || 0) - total,
        });
      }
    }

    // 3. Update stock entries for Stock items (skipping Service lines)
    if (saleData.items && saleData.items.length > 0) {
      const allStock = await db.stockEntries.toArray();

      for (const item of saleData.items) {
        // Service lines never touch stock
        if (item.type === 'service') continue;

        const itemQuality = item.quality || 'Cotton A';
        const existingStock = allStock.find(
          (s) =>
            s.itemId === item.itemId &&
            s.quality === itemQuality &&
            (s.warehouseId === saleData.warehouseId || s.warehouseName === saleData.warehouseName)
        );

        if (existingStock) {
          const newQty = Math.max(0, Number(existingStock.qty || 0) - Number(item.qty || 0));
          // Value is reduced proportionally at the existing average cost rate
          const newValue = newQty * Number(existingStock.avgRate || 0);

          await db.stockEntries.update(existingStock.id, {
            qty: newQty,
            value: newValue,
          });
        }
      }
    }

    await syncStockEntriesToDb();
    return newSale;
  },

  async update(id, saleData) {
    const existing = await db.sales.get(id);
    if (!existing) throw new Error('Sale record not found');

    const total = Number(saleData.total || 0);
    const received = Number(saleData.received || 0);
    const balance = total - received;

    const updated = {
      ...existing,
      ...saleData,
      total,
      received,
      balance,
    };

    await db.sales.put(updated);
    await syncStockEntriesToDb();
    return updated;
  },

  async delete(id) {
    const existing = await db.sales.get(id);
    if (existing) {
      // 1. Reverse FULL sale total from Customer Party A/C
      if (existing.customerId) {
        const customer = await db.parties.get(existing.customerId);
        if (customer) {
          await db.parties.update(customer.id, {
            balance: Number(customer.balance || 0) + Number(existing.total || 0),
          });
        }
      }

      // 2. Delete linked receipt if any
      if (existing.linkedReceiptId) {
        await receiptService.delete(existing.linkedReceiptId);
      }

      await db.sales.delete(id);
      await syncStockEntriesToDb();
    }
  },
};
