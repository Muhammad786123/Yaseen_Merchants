import { db } from '../db/database.js';
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
    const received = Number(saleData.received !== undefined ? saleData.received : (saleData.receivedAmount || 0));
    const balance = total - received;
    const receivedAccount = saleData.receivedAccount || saleData.paidAccount || 'Cash';

    let newSale = null;

    await db.transaction(
      'rw',
      [db.sales, db.parties, db.receipts, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        let linkedReceiptId = null;

        // 1. Record linked receipt if an amount was received at sale time
        if (received > 0 && saleData.customerId) {
          const recId = 'rec_' + Date.now();
          const recCount = await db.receipts.count();
          const recNo = `RCT-${String(recCount + 1).padStart(4, '0')}`;

          const receiptRecord = {
            id: recId,
            no: recNo,
            date: saleData.date || new Date().toISOString().split('T')[0],
            partyId: saleData.customerId,
            partyName: saleData.customerName,
            amount: received,
            account: receivedAccount,
            description: `Receipt against sale invoice ${no}`,
          };
          await db.receipts.add(receiptRecord);
          linkedReceiptId = recId;

          // Receipt increases customer party balance (reduces debt)
          const customer = await db.parties.get(saleData.customerId);
          if (customer) {
            await db.parties.update(customer.id, {
              balance: Number(customer.balance || 0) + received,
            });
          }

          // Cash or Bank movement
          if (receivedAccount === 'Cash') {
            await db.cashBookEntries.add({
              id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
              date: receiptRecord.date,
              type: 'Receipt',
              partyId: saleData.customerId,
              partyName: saleData.customerName,
              debit: 0,
              credit: received,
              description: `Cash receipt ${recNo} for sale ${no}`,
              linkedTransactionId: recId,
            });

            const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
            if (cashAcc) {
              await db.accounts.update(cashAcc.id, {
                balance: Number(cashAcc.balance || 0) + received,
              });
            }
          } else {
            const bankAcc = await db.accounts.where({ name: receivedAccount }).first();
            if (bankAcc) {
              await db.accounts.update(bankAcc.id, {
                balance: Number(bankAcc.balance || 0) + received,
              });
            }
          }
        }

        newSale = {
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
          receivedAccount,
          linkedReceiptId,
          createdAt: saleData.createdAt || new Date().toISOString(),
          updatedAt: null,
          editCount: 0,
        };

        await db.sales.add(newSale);

        // 2. Debit FULL calculated Sale amount to Customer Party A/C
        if (saleData.customerId) {
          const customer = await db.parties.get(saleData.customerId);
          if (customer) {
            await db.parties.update(customer.id, {
              balance: Number(customer.balance || 0) - total,
            });
          }
        }
      }
    );

    await syncStockEntriesToDb();
    return newSale;
  },

  /**
   * Atomic Update for Sale Invoice:
   * (1) Reverse old effect on party (customer balance + oldTotal)
   * (2) Reverse/replace linked receipt & Cash Book entry & account balance
   * (3) Apply new total to customer (customer balance - newTotal)
   * (4) Preserve id, no, createdAt; set updatedAt and editCount
   * (5) Re-sync stock
   */
  async update(id, saleData) {
    const existing = await db.sales.get(id);
    if (!existing) throw new Error('Sale record not found: ' + id);

    const newTotal = Number(saleData.total || 0);
    const newReceived = Number(saleData.received !== undefined ? saleData.received : (saleData.receivedAmount || 0));
    const newBalance = newTotal - newReceived;
    const newReceivedAccount = saleData.receivedAccount || saleData.paidAccount || existing.receivedAccount || 'Cash';

    let updatedSale = null;

    await db.transaction(
      'rw',
      [db.sales, db.parties, db.receipts, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        // Step 1: Reverse old sale total from previous customer
        if (existing.customerId) {
          const oldCustomer = await db.parties.get(existing.customerId);
          if (oldCustomer) {
            await db.parties.update(oldCustomer.id, {
              balance: Number(oldCustomer.balance || 0) + Number(existing.total || 0),
            });
          }
        }

        // Step 2: Reverse old linked receipt (if any)
        if (existing.linkedReceiptId) {
          const oldRec = await db.receipts.get(existing.linkedReceiptId);
          if (oldRec) {
            // Restore customer balance: receipt increased it, so subtract it
            const p = await db.parties.get(oldRec.partyId);
            if (p) {
              await db.parties.update(p.id, {
                balance: Number(p.balance || 0) - Number(oldRec.amount || 0),
              });
            }

            // Restore Cash Book & Cash account balance
            if (oldRec.account === 'Cash') {
              const cbEntries = await db.cashBookEntries
                .where({ linkedTransactionId: oldRec.id })
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
              const bankAcc = await db.accounts.where({ name: oldRec.account }).first();
              if (bankAcc) {
                await db.accounts.update(bankAcc.id, {
                  balance: Number(bankAcc.balance || 0) - Number(oldRec.amount || 0),
                });
              }
            }

            await db.receipts.delete(oldRec.id);
          }
        }

        // Step 3: Create new linked receipt if newReceived > 0
        let newLinkedReceiptId = null;
        if (newReceived > 0 && saleData.customerId) {
          const recId = 'rec_' + Date.now();
          const recCount = await db.receipts.count();
          const recNo = `RCT-${String(recCount + 1).padStart(4, '0')}`;

          const receiptRecord = {
            id: recId,
            no: recNo,
            date: saleData.date || existing.date,
            partyId: saleData.customerId,
            partyName: saleData.customerName,
            amount: newReceived,
            account: newReceivedAccount,
            description: `Receipt against sale invoice ${existing.no}`,
          };
          await db.receipts.add(receiptRecord);
          newLinkedReceiptId = recId;

          // Receipt increases customer balance
          const customer = await db.parties.get(saleData.customerId);
          if (customer) {
            await db.parties.update(customer.id, {
              balance: Number(customer.balance || 0) + newReceived,
            });
          }

          // Cash or Bank movement
          if (newReceivedAccount === 'Cash') {
            await db.cashBookEntries.add({
              id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
              date: receiptRecord.date,
              type: 'Receipt',
              partyId: saleData.customerId,
              partyName: saleData.customerName,
              debit: 0,
              credit: newReceived,
              description: `Cash receipt ${recNo} for sale ${existing.no}`,
              linkedTransactionId: recId,
            });

            const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
            if (cashAcc) {
              await db.accounts.update(cashAcc.id, {
                balance: Number(cashAcc.balance || 0) + newReceived,
              });
            }
          } else {
            const bankAcc = await db.accounts.where({ name: newReceivedAccount }).first();
            if (bankAcc) {
              await db.accounts.update(bankAcc.id, {
                balance: Number(bankAcc.balance || 0) + newReceived,
              });
            }
          }
        }

        // Step 4: Apply new sale total to target customer Party A/C
        if (saleData.customerId) {
          const targetCustomer = await db.parties.get(saleData.customerId);
          if (targetCustomer) {
            await db.parties.update(targetCustomer.id, {
              balance: Number(targetCustomer.balance || 0) - newTotal,
            });
          }
        }

        // Step 5: Save updated sale record preserving id, no, createdAt
        updatedSale = {
          ...existing,
          date: saleData.date || existing.date,
          customerId: saleData.customerId,
          customerName: saleData.customerName,
          warehouseId: saleData.warehouseId,
          warehouseName: (saleData.warehouseName || '').replace(/wirehouse/gi, 'Warehouse'),
          items: saleData.items || [],
          total: newTotal,
          received: newReceived,
          balance: newBalance,
          receivedAccount: newReceivedAccount,
          linkedReceiptId: newLinkedReceiptId,
          updatedAt: new Date().toISOString(),
          editCount: (Number(existing.editCount) || 0) + 1,
        };

        await db.sales.put(updatedSale);
      }
    );

    await syncStockEntriesToDb();
    return updatedSale;
  },

  /**
   * Atomic Delete for Sale Invoice:
   * (1) Reverse FULL sale total from Customer Party A/C (no clamp)
   * (2) Reverse & delete linked receipt and its Cash Book entry & account balance
   * (3) Remove sale record
   * (4) Re-sync stock
   */
  async delete(id) {
    const existing = await db.sales.get(id);
    if (!existing) return;

    await db.transaction(
      'rw',
      [db.sales, db.parties, db.receipts, db.cashBookEntries, db.accounts, db.stockEntries],
      async () => {
        // 1. Reverse customer party balance without clamp
        if (existing.customerId) {
          const customer = await db.parties.get(existing.customerId);
          if (customer) {
            await db.parties.update(customer.id, {
              balance: Number(customer.balance || 0) + Number(existing.total || 0),
            });
          }
        }

        // 2. Reverse & delete linked receipt
        if (existing.linkedReceiptId) {
          const oldRec = await db.receipts.get(existing.linkedReceiptId);
          if (oldRec) {
            const p = await db.parties.get(oldRec.partyId);
            if (p) {
              await db.parties.update(p.id, {
                balance: Number(p.balance || 0) - Number(oldRec.amount || 0),
              });
            }

            if (oldRec.account === 'Cash') {
              const cbEntries = await db.cashBookEntries
                .where({ linkedTransactionId: oldRec.id })
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
              const bankAcc = await db.accounts.where({ name: oldRec.account }).first();
              if (bankAcc) {
                await db.accounts.update(bankAcc.id, {
                  balance: Number(bankAcc.balance || 0) - Number(oldRec.amount || 0),
                });
              }
            }

            await db.receipts.delete(oldRec.id);
          }
        }

        // 3. Delete sale record
        await db.sales.delete(id);
      }
    );

    await syncStockEntriesToDb();
  },
};
