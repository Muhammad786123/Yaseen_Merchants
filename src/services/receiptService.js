import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';
import { partyService } from './partyService.js';

export const receiptService = {
  async getAll() {
    return await db.receipts.reverse().toArray();
  },

  async add(receiptData) {
    const id = receiptData.id || 'rec_' + Date.now();
    const count = await db.receipts.count();
    const no = receiptData.no || `RCT-${String(count + 1).padStart(4, '0')}`;
    const amount = Number(receiptData.amount || 0);

    const newReceipt = {
      id,
      no,
      date: receiptData.date || new Date().toISOString().split('T')[0],
      partyId: receiptData.partyId,
      partyName: receiptData.partyName,
      amount,
      account: receiptData.account || 'Cash',
      description: receiptData.description || '',
      createdAt: receiptData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.receipts, db.parties, db.cashBookEntries, db.accounts], async () => {
      await db.receipts.add(newReceipt);

      // Customer party balance: receipt (cash in) => party.balance = balance + amount
      if (receiptData.partyId) {
        const party = await db.parties.get(receiptData.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) + amount,
          });
        }
      }

      // Cash movement vs Bank movement
      if (receiptData.account === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
          date: newReceipt.date,
          type: 'Receipt',
          partyId: receiptData.partyId,
          partyName: receiptData.partyName,
          debit: 0,
          credit: amount,
          description: receiptData.description || `Cash receipt ${no} from ${receiptData.partyName}`,
          linkedTransactionId: id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + amount,
          });
        }
      } else {
        const accountObj = await db.accounts.where({ name: receiptData.account }).first();
        if (accountObj) {
          await db.accounts.update(accountObj.id, {
            balance: Number(accountObj.balance || 0) + amount,
          });
        }
      }
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
    return newReceipt;
  },

  async update(id, receiptData) {
    const existing = await db.receipts.get(id);
    if (!existing) throw new Error('Receipt not found: ' + id);

    const oldAmount = Number(existing.amount || 0);
    const newAmount = Number(receiptData.amount || 0);
    const newAccount = receiptData.account || existing.account || 'Cash';

    const updated = {
      ...existing,
      date: receiptData.date || existing.date,
      partyId: receiptData.partyId || existing.partyId,
      partyName: receiptData.partyName || existing.partyName,
      amount: newAmount,
      account: newAccount,
      description: receiptData.description !== undefined ? receiptData.description : existing.description,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.receipts, db.parties, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse old party balance
      if (existing.partyId) {
        const oldParty = await db.parties.get(existing.partyId);
        if (oldParty) {
          await db.parties.update(oldParty.id, {
            balance: Number(oldParty.balance || 0) - oldAmount,
          });
        }
      }

      // Reverse old Cash Book entry / Account balance
      if (existing.account === 'Cash') {
        const cbEntries = await db.cashBookEntries
          .where({ linkedTransactionId: existing.id })
          .toArray();
        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          let net = 0;
          for (const cb of cbEntries) {
            net += Number(cb.debit || 0) - Number(cb.credit || 0);
          }
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + net,
          });
        }
        for (const cb of cbEntries) {
          await db.cashBookEntries.delete(cb.id);
        }
      } else {
        const oldBank = await db.accounts.where({ name: existing.account }).first();
        if (oldBank) {
          await db.accounts.update(oldBank.id, {
            balance: Number(oldBank.balance || 0) - oldAmount,
          });
        }
      }

      // 2. Apply new party balance
      if (updated.partyId) {
        const newParty = await db.parties.get(updated.partyId);
        if (newParty) {
          await db.parties.update(newParty.id, {
            balance: Number(newParty.balance || 0) + newAmount,
          });
        }
      }

      // Apply new Cash Book entry / Account balance
      if (newAccount === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
          date: updated.date,
          type: 'Receipt',
          partyId: updated.partyId,
          partyName: updated.partyName,
          debit: 0,
          credit: newAmount,
          description: updated.description || `Cash receipt ${existing.no} from ${updated.partyName}`,
          linkedTransactionId: existing.id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + newAmount,
          });
        }
      } else {
        const newBank = await db.accounts.where({ name: newAccount }).first();
        if (newBank) {
          await db.accounts.update(newBank.id, {
            balance: Number(newBank.balance || 0) + newAmount,
          });
        }
      }

      // 3. Save updated receipt
      await db.receipts.put(updated);
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
    return updated;
  },

  async delete(id) {
    const existing = await db.receipts.get(id);
    if (!existing) return;

    const amount = Number(existing.amount || 0);

    await db.transaction('rw', [db.receipts, db.parties, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse party balance
      if (existing.partyId) {
        const party = await db.parties.get(existing.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) - amount,
          });
        }
      }

      // 2. Reverse Cash Book / Account balance
      if (existing.account === 'Cash') {
        const cbEntries = await db.cashBookEntries
          .where({ linkedTransactionId: existing.id })
          .toArray();
        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          let net = 0;
          for (const cb of cbEntries) {
            net += Number(cb.debit || 0) - Number(cb.credit || 0);
          }
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + net,
          });
        }
        for (const cb of cbEntries) {
          await db.cashBookEntries.delete(cb.id);
        }
      } else {
        const bank = await db.accounts.where({ name: existing.account }).first();
        if (bank) {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) - amount,
          });
        }
      }

      // 3. Delete receipt
      await db.receipts.delete(id);
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
  },
};
