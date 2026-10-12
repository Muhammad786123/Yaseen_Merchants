import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';
import { partyService } from './partyService.js';

export const paymentService = {
  async getAll() {
    return await db.payments.reverse().toArray();
  },

  async add(paymentData) {
    const id = paymentData.id || 'pay_' + Date.now();
    const count = await db.payments.count();
    const no = paymentData.no || `PAY-${String(count + 1).padStart(4, '0')}`;
    const amount = Number(paymentData.amount || 0);

    const newPayment = {
      id,
      no,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      partyId: paymentData.partyId,
      partyName: paymentData.partyName,
      amount,
      account: paymentData.account || 'Cash',
      description: paymentData.description || '',
      createdAt: paymentData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction('rw', [db.payments, db.parties, db.cashBookEntries, db.accounts], async () => {
      await db.payments.add(newPayment);

      // Supplier party balance: payment (cash out) => party.balance = balance - amount
      if (paymentData.partyId) {
        const party = await db.parties.get(paymentData.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) - amount,
          });
        }
      }

      // Cash movement vs Bank movement
      if (paymentData.account === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
          date: newPayment.date,
          type: 'Payment',
          partyId: paymentData.partyId,
          partyName: paymentData.partyName,
          debit: amount,
          credit: 0,
          description: paymentData.description || `Cash payment ${no} to ${paymentData.partyName}`,
          linkedTransactionId: id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) - amount,
          });
        }
      } else {
        const accountObj = await db.accounts.where({ name: paymentData.account }).first();
        if (accountObj) {
          await db.accounts.update(accountObj.id, {
            balance: Number(accountObj.balance || 0) - amount,
          });
        }
      }
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
    return newPayment;
  },

  async update(id, paymentData) {
    const existing = await db.payments.get(id);
    if (!existing) throw new Error('Payment not found: ' + id);

    const oldAmount = Number(existing.amount || 0);
    const newAmount = Number(paymentData.amount || 0);
    const newAccount = paymentData.account || existing.account || 'Cash';

    const updated = {
      ...existing,
      date: paymentData.date || existing.date,
      partyId: paymentData.partyId || existing.partyId,
      partyName: paymentData.partyName || existing.partyName,
      amount: newAmount,
      account: newAccount,
      description: paymentData.description !== undefined ? paymentData.description : existing.description,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.payments, db.parties, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse old party balance: was reduced, so add it back
      if (existing.partyId) {
        const oldParty = await db.parties.get(existing.partyId);
        if (oldParty) {
          await db.parties.update(oldParty.id, {
            balance: Number(oldParty.balance || 0) + oldAmount,
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
            balance: Number(oldBank.balance || 0) + oldAmount,
          });
        }
      }

      // 2. Apply new party balance
      if (updated.partyId) {
        const newParty = await db.parties.get(updated.partyId);
        if (newParty) {
          await db.parties.update(newParty.id, {
            balance: Number(newParty.balance || 0) - newAmount,
          });
        }
      }

      // Apply new Cash Book entry / Account balance
      if (newAccount === 'Cash') {
        await db.cashBookEntries.add({
          id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
          date: updated.date,
          type: 'Payment',
          partyId: updated.partyId,
          partyName: updated.partyName,
          debit: newAmount,
          credit: 0,
          description: updated.description || `Cash payment ${existing.no} to ${updated.partyName}`,
          linkedTransactionId: existing.id,
        });

        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) - newAmount,
          });
        }
      } else {
        const newBank = await db.accounts.where({ name: newAccount }).first();
        if (newBank) {
          await db.accounts.update(newBank.id, {
            balance: Number(newBank.balance || 0) - newAmount,
          });
        }
      }

      // 3. Save updated payment
      await db.payments.put(updated);
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
    return updated;
  },

  async delete(id) {
    const existing = await db.payments.get(id);
    if (!existing) return;

    const amount = Number(existing.amount || 0);

    await db.transaction('rw', [db.payments, db.parties, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse party balance
      if (existing.partyId) {
        const party = await db.parties.get(existing.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) + amount,
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
            balance: Number(bank.balance || 0) + amount,
          });
        }
      }

      // 3. Delete payment
      await db.payments.delete(id);
    });

    await partyService.recalculateAllBalances();
    await cashBookService.recalculateCashBalance();
  },
};
