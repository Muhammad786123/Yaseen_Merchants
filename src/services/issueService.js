import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const issueService = {
  async getAll() {
    return await db.issues.reverse().toArray();
  },

  async add(issueData) {
    const id = issueData.id || 'iss_' + Date.now();
    const count = await db.issues.count();
    const no = issueData.no || `ISS-${String(count + 1).padStart(4, '0')}`;

    let totalValue = 0;
    const processedItems = [];

    // Deduct stock quantity matching item + quality + warehouse
    if (issueData.items && issueData.items.length > 0) {
      const allStock = await db.stockEntries.toArray();

      for (const item of issueData.items) {
        const itemQuality = item.quality || 'Cotton A';

        // Find matching stock record by itemId + quality + warehouse
        const stock = allStock.find(
          (s) =>
            s.itemId === item.itemId &&
            s.quality === itemQuality &&
            (s.warehouseName === issueData.fromWarehouse || s.warehouseId === issueData.fromWarehouse)
        ) || allStock.find((s) => s.itemId === item.itemId && s.quality === itemQuality)
          || allStock.find((s) => s.itemId === item.itemId);

        const currentAvgRate = stock ? Number(stock.avgRate || 0) : 0;
        const issueQty = Number(item.issueQty || 0);
        const derivedValue = issueQty * currentAvgRate;

        totalValue += derivedValue;

        processedItems.push({
          ...item,
          quality: itemQuality,
          rate: currentAvgRate, // derived average rate
          value: derivedValue,  // derived total value
        });

        if (stock) {
          const newQty = Math.max(0, Number(stock.qty || 0) - issueQty);
          const newValue = newQty * currentAvgRate;
          await db.stockEntries.update(stock.id, { qty: newQty, value: newValue });
          stock.qty = newQty;
          stock.value = newValue;
        }
      }
    }

    const newIssue = {
      id,
      no,
      date: issueData.date || new Date().toISOString().split('T')[0],
      fromWarehouse: issueData.fromWarehouse || 'Raw Material Store',
      items: processedItems,
      totalValue,
    };

    await db.issues.add(newIssue);
    await syncStockEntriesToDb();
    return newIssue;
  },

  async delete(id) {
    const issue = await db.issues.get(id);
    if (!issue) return;

    // Reverse stock deduction on delete
    if (issue.items && issue.items.length > 0) {
      const allStock = await db.stockEntries.toArray();

      for (const item of issue.items) {
        const itemQuality = item.quality || 'Cotton A';
        const stock = allStock.find(
          (s) =>
            s.itemId === item.itemId &&
            s.quality === itemQuality &&
            (s.warehouseName === issue.fromWarehouse || s.warehouseId === issue.fromWarehouse)
        ) || allStock.find((s) => s.itemId === item.itemId && s.quality === itemQuality)
          || allStock.find((s) => s.itemId === item.itemId);

        if (stock) {
          const restoreQty = Number(stock.qty || 0) + Number(item.issueQty || 0);
          const restoreValue = restoreQty * Number(stock.avgRate || 0);
          await db.stockEntries.update(stock.id, { qty: restoreQty, value: restoreValue });
        }
      }
    }

    const res = await db.issues.delete(id);
    await syncStockEntriesToDb();
    return res;
  },
};

