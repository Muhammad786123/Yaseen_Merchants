import { db } from '../db/database.js';
import { paymentService } from './paymentService.js';

export const purchaseService = {
  async getAll() {
    return await db.purchases.reverse().toArray();
  },

  async getById(id) {
    return await db.purchases.get(id);
  },

  async add(purchaseData) {
    const id = purchaseData.id || 'pur_' + Date.now();
    const count = await db.purchases.count();
    const no = purchaseData.no || `PUR-${String(count + 1).padStart(4, '0')}`;

    const total = Number(purchaseData.total || 0);
    const paid = Number(purchaseData.paid || 0);
    const balance = total - paid;

    let linkedPaymentId = null;

    // 1. Record linked payment if an amount was paid at purchase time
    if (paid > 0 && purchaseData.supplierId) {
      const paymentRecord = await paymentService.add({
        date: purchaseData.date || new Date().toISOString().split('T')[0],
        partyId: purchaseData.supplierId,
        partyName: purchaseData.supplierName,
        amount: paid,
        account: purchaseData.paymentAccount || 'Cash',
        description: `Payment against purchase invoice ${no}`,
      });
      linkedPaymentId = paymentRecord.id;
    }

    const newPurchase = {
      id,
      no,
      date: purchaseData.date || new Date().toISOString().split('T')[0],
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      warehouseId: purchaseData.warehouseId,
      warehouseName: (purchaseData.warehouseName || '').replace(/wirehouse/gi, 'Warehouse'),
      items: purchaseData.items || [],
      total,
      paid,
      balance,
      linkedPaymentId,
    };

    await db.purchases.add(newPurchase);

    // 2. Credit the FULL calculated Purchase amount to Supplier Party A/C
    if (purchaseData.supplierId) {
      const supplier = await db.parties.get(purchaseData.supplierId);
      if (supplier) {
        await db.parties.update(supplier.id, {
          balance: Number(supplier.balance || 0) + total,
        });
      }
    }

    // 3. Update stock entries keyed by (itemId + quality + warehouseId)
    if (purchaseData.items && purchaseData.items.length > 0) {
      const allStock = await db.stockEntries.toArray();

      for (const item of purchaseData.items) {
        const itemQuality = item.quality || 'Cotton A';
        const existingStock = allStock.find(
          (s) =>
            s.itemId === item.itemId &&
            s.quality === itemQuality &&
            (s.warehouseId === purchaseData.warehouseId || s.warehouseName === purchaseData.warehouseName)
        );

        if (existingStock) {
          const newQty = Number(existingStock.qty || 0) + Number(item.qty || 0);
          const newValue = Number(existingStock.value || 0) + Number(item.amount || 0);
          const newAvgRate = newQty > 0 ? newValue / newQty : Number(item.rate || existingStock.avgRate);

          await db.stockEntries.update(existingStock.id, {
            qty: newQty,
            value: newValue,
            avgRate: newAvgRate,
          });
        } else {
          await db.stockEntries.add({
            id: 'stk_' + Date.now() + Math.random().toString(36).substr(2, 4),
            itemId: item.itemId,
            itemName: item.itemName,
            quality: itemQuality,
            warehouseId: purchaseData.warehouseId,
            warehouseName: purchaseData.warehouseName,
            category: item.category || 'Raw Material',
            qty: Number(item.qty || 0),
            avgRate: Number(item.rate || 0),
            value: Number(item.amount || 0),
          });
        }
      }
    }

    return newPurchase;
  },

  async update(id, purchaseData) {
    const existing = await db.purchases.get(id);
    if (!existing) throw new Error('Purchase record not found');

    const total = Number(purchaseData.total || 0);
    const paid = Number(purchaseData.paid || 0);
    const balance = total - paid;

    const updated = {
      ...existing,
      ...purchaseData,
      total,
      paid,
      balance,
    };

    await db.purchases.put(updated);
    return updated;
  },

  async delete(id) {
    const existing = await db.purchases.get(id);
    if (existing) {
      // 1. Reverse the FULL purchase total from Supplier Party A/C
      if (existing.supplierId) {
        const supplier = await db.parties.get(existing.supplierId);
        if (supplier) {
          await db.parties.update(supplier.id, {
            balance: Math.max(0, Number(supplier.balance || 0) - Number(existing.total || 0)),
          });
        }
      }

      // 2. Delete linked payment if any
      if (existing.linkedPaymentId) {
        await paymentService.delete(existing.linkedPaymentId);
      }

      await db.purchases.delete(id);
    }
  },
};
