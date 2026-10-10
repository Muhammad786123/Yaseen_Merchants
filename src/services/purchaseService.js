import { db } from '../db/database.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

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
    const paid = Number(purchaseData.paid !== undefined ? purchaseData.paid : (purchaseData.paidAmount || 0));
    const balance = total - paid;
    const paymentAccount = purchaseData.paymentAccount || purchaseData.paidAccount || 'Cash';

    let newPurchase = null;

    await db.transaction(
      'rw',
      [db.purchases, db.parties, db.payments, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        let linkedPaymentId = null;

        // 1. Record linked payment if an amount was paid at purchase time
        if (paid > 0 && purchaseData.supplierId) {
          const payId = 'pay_' + Date.now();
          const payCount = await db.payments.count();
          const payNo = `PAY-${String(payCount + 1).padStart(4, '0')}`;

          const paymentRecord = {
            id: payId,
            no: payNo,
            date: purchaseData.date || new Date().toISOString().split('T')[0],
            partyId: purchaseData.supplierId,
            partyName: purchaseData.supplierName,
            amount: paid,
            account: paymentAccount,
            description: `Payment against purchase invoice ${no}`,
          };
          await db.payments.add(paymentRecord);
          linkedPaymentId = payId;

          // Payment reduces supplier debt (supplier balance - paid)
          const supplier = await db.parties.get(purchaseData.supplierId);
          if (supplier) {
            await db.parties.update(supplier.id, {
              balance: Number(supplier.balance || 0) - paid,
            });
          }

          // Cash or Bank movement
          if (paymentAccount === 'Cash') {
            await db.cashBookEntries.add({
              id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
              date: paymentRecord.date,
              type: 'Payment',
              partyId: purchaseData.supplierId,
              partyName: purchaseData.supplierName,
              debit: paid,
              credit: 0,
              description: `Cash payment ${payNo} for purchase ${no}`,
              linkedTransactionId: payId,
            });

            const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
            if (cashAcc) {
              await db.accounts.update(cashAcc.id, {
                balance: Number(cashAcc.balance || 0) - paid,
              });
            }
          } else {
            const bankAcc = await db.accounts.where({ name: paymentAccount }).first();
            if (bankAcc) {
              await db.accounts.update(bankAcc.id, {
                balance: Number(bankAcc.balance || 0) - paid,
              });
            }
          }
        }

        newPurchase = {
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
          paymentAccount,
          linkedPaymentId,
          createdAt: purchaseData.createdAt || new Date().toISOString(),
          updatedAt: null,
          editCount: 0,
        };

        await db.purchases.add(newPurchase);

        // 2. Credit FULL calculated Purchase amount to Supplier Party A/C
        if (purchaseData.supplierId) {
          const supplier = await db.parties.get(purchaseData.supplierId);
          if (supplier) {
            await db.parties.update(supplier.id, {
              balance: Number(supplier.balance || 0) + total,
            });
          }
        }
      }
    );

    await syncStockEntriesToDb();
    return newPurchase;
  },

  /**
   * Atomic Update for Purchase Invoice:
   * (1) Reverse old effect on party (balance - oldTotal)
   * (2) Reverse/replace linked payment & Cash Book entry & account balance
   * (3) Apply new total to supplier (balance + newTotal)
   * (4) Preserve id, no, createdAt; set updatedAt and editCount
   * (5) Re-sync stock
   */
  async update(id, purchaseData) {
    const existing = await db.purchases.get(id);
    if (!existing) throw new Error('Purchase record not found: ' + id);

    const newTotal = Number(purchaseData.total || 0);
    const newPaid = Number(purchaseData.paid !== undefined ? purchaseData.paid : (purchaseData.paidAmount || 0));
    const newBalance = newTotal - newPaid;
    const newPaymentAccount = purchaseData.paymentAccount || purchaseData.paidAccount || existing.paymentAccount || 'Cash';

    let updatedPurchase = null;

    await db.transaction(
      'rw',
      [db.purchases, db.parties, db.payments, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        // Step 1: Reverse old purchase total from previous supplier
        if (existing.supplierId) {
          const oldSupplier = await db.parties.get(existing.supplierId);
          if (oldSupplier) {
            await db.parties.update(oldSupplier.id, {
              balance: Number(oldSupplier.balance || 0) - Number(existing.total || 0),
            });
          }
        }

        // Step 2: Reverse old linked payment (if any)
        if (existing.linkedPaymentId) {
          const oldPay = await db.payments.get(existing.linkedPaymentId);
          if (oldPay) {
            // Restore party balance: payment reduced it, so add it back
            const p = await db.parties.get(oldPay.partyId);
            if (p) {
              await db.parties.update(p.id, {
                balance: Number(p.balance || 0) + Number(oldPay.amount || 0),
              });
            }

            // Restore Cash Book & Cash account balance
            if (oldPay.account === 'Cash') {
              const cbEntries = await db.cashBookEntries
                .where({ linkedTransactionId: oldPay.id })
                .toArray();
              const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
              if (cashAcc) {
                let netAdj = 0;
                for (const cb of cbEntries) {
                  netAdj += Number(cb.debit || 0) - Number(cb.credit || 0);
                }
                await db.accounts.update(cashAcc.id, {
                  balance: Number(cashAcc.balance || 0) + netAdj,
                });
              }
              for (const cb of cbEntries) {
                await db.cashBookEntries.delete(cb.id);
              }
            } else {
              // Restore Bank account balance
              const bankAcc = await db.accounts.where({ name: oldPay.account }).first();
              if (bankAcc) {
                await db.accounts.update(bankAcc.id, {
                  balance: Number(bankAcc.balance || 0) + Number(oldPay.amount || 0),
                });
              }
            }

            await db.payments.delete(oldPay.id);
          }
        }

        // Step 3: Create new linked payment if newPaid > 0
        let newLinkedPaymentId = null;
        if (newPaid > 0 && purchaseData.supplierId) {
          const payId = 'pay_' + Date.now();
          const payCount = await db.payments.count();
          const payNo = `PAY-${String(payCount + 1).padStart(4, '0')}`;

          const paymentRecord = {
            id: payId,
            no: payNo,
            date: purchaseData.date || existing.date,
            partyId: purchaseData.supplierId,
            partyName: purchaseData.supplierName,
            amount: newPaid,
            account: newPaymentAccount,
            description: `Payment against purchase invoice ${existing.no}`,
          };
          await db.payments.add(paymentRecord);
          newLinkedPaymentId = payId;

          // Payment reduces supplier debt
          const supplier = await db.parties.get(purchaseData.supplierId);
          if (supplier) {
            await db.parties.update(supplier.id, {
              balance: Number(supplier.balance || 0) - newPaid,
            });
          }

          // Cash or Bank movement
          if (newPaymentAccount === 'Cash') {
            await db.cashBookEntries.add({
              id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
              date: paymentRecord.date,
              type: 'Payment',
              partyId: purchaseData.supplierId,
              partyName: purchaseData.supplierName,
              debit: newPaid,
              credit: 0,
              description: `Cash payment ${payNo} for purchase ${existing.no}`,
              linkedTransactionId: payId,
            });

            const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
            if (cashAcc) {
              await db.accounts.update(cashAcc.id, {
                balance: Number(cashAcc.balance || 0) - newPaid,
              });
            }
          } else {
            const bankAcc = await db.accounts.where({ name: newPaymentAccount }).first();
            if (bankAcc) {
              await db.accounts.update(bankAcc.id, {
                balance: Number(bankAcc.balance || 0) - newPaid,
              });
            }
          }
        }

        // Step 4: Apply new purchase total to target supplier Party A/C
        if (purchaseData.supplierId) {
          const targetSupplier = await db.parties.get(purchaseData.supplierId);
          if (targetSupplier) {
            await db.parties.update(targetSupplier.id, {
              balance: Number(targetSupplier.balance || 0) + newTotal,
            });
          }
        }

        // Step 5: Save updated purchase record preserving id, no, createdAt
        updatedPurchase = {
          ...existing,
          date: purchaseData.date || existing.date,
          supplierId: purchaseData.supplierId,
          supplierName: purchaseData.supplierName,
          warehouseId: purchaseData.warehouseId,
          warehouseName: (purchaseData.warehouseName || '').replace(/wirehouse/gi, 'Warehouse'),
          items: purchaseData.items || [],
          total: newTotal,
          paid: newPaid,
          balance: newBalance,
          paymentAccount: newPaymentAccount,
          linkedPaymentId: newLinkedPaymentId,
          updatedAt: new Date().toISOString(),
          editCount: (Number(existing.editCount) || 0) + 1,
        };

        await db.purchases.put(updatedPurchase);
      }
    );

    await syncStockEntriesToDb();
    return updatedPurchase;
  },

  /**
   * Atomic Delete for Purchase Invoice:
   * (1) Reverse FULL purchase total from Supplier Party A/C (no clamp)
   * (2) Reverse & delete linked payment and its Cash Book entry & account balance
   * (3) Remove purchase record
   * (4) Re-sync stock
   */
  async delete(id) {
    const existing = await db.purchases.get(id);
    if (!existing) return;

    await db.transaction(
      'rw',
      [db.purchases, db.parties, db.payments, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        // 1. Reverse supplier party balance without clamp
        if (existing.supplierId) {
          const supplier = await db.parties.get(existing.supplierId);
          if (supplier) {
            await db.parties.update(supplier.id, {
              balance: Number(supplier.balance || 0) - Number(existing.total || 0),
            });
          }
        }

        // 2. Reverse & delete linked payment
        if (existing.linkedPaymentId) {
          const oldPay = await db.payments.get(existing.linkedPaymentId);
          if (oldPay) {
            const p = await db.parties.get(oldPay.partyId);
            if (p) {
              await db.parties.update(p.id, {
                balance: Number(p.balance || 0) + Number(oldPay.amount || 0),
              });
            }

            if (oldPay.account === 'Cash') {
              const cbEntries = await db.cashBookEntries
                .where({ linkedTransactionId: oldPay.id })
                .toArray();
              const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
              if (cashAcc) {
                let netAdj = 0;
                for (const cb of cbEntries) {
                  netAdj += Number(cb.debit || 0) - Number(cb.credit || 0);
                }
                await db.accounts.update(cashAcc.id, {
                  balance: Number(cashAcc.balance || 0) + netAdj,
                });
              }
              for (const cb of cbEntries) {
                await db.cashBookEntries.delete(cb.id);
              }
            } else {
              const bankAcc = await db.accounts.where({ name: oldPay.account }).first();
              if (bankAcc) {
                await db.accounts.update(bankAcc.id, {
                  balance: Number(bankAcc.balance || 0) + Number(oldPay.amount || 0),
                });
              }
            }

            await db.payments.delete(oldPay.id);
          }
        }

        // 3. Delete purchase record
        await db.purchases.delete(id);
      }
    );

    await syncStockEntriesToDb();
  },
};
