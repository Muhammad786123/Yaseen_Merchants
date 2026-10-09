import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const productionService = {
  async getAll() {
    return await db.productions.reverse().toArray();
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
    };

    await db.productions.add(newPrd);

    // Update finished goods stock entry for output product matching (product + quality + Finished Goods Store)
    const allStock = await db.stockEntries.toArray();
    const targetProduct = prdData.product || 'Processed Cotton';
    const quality = prdData.quality || 'Cotton A';

    const existingStock = allStock.find(
      (s) =>
        s.itemName === targetProduct &&
        s.category === 'Finished Product'
    );

    if (existingStock) {
      const newQty = Number(existingStock.qty || 0) + outputQty;
      const newValue = newQty * Number(existingStock.avgRate || 115);
      await db.stockEntries.update(existingStock.id, {
        qty: newQty,
        value: newValue,
      });
    }

    await syncStockEntriesToDb();
    return newPrd;
  },

  async delete(id) {
    const res = await db.productions.delete(id);
    await syncStockEntriesToDb();
    return res;
  },
};
