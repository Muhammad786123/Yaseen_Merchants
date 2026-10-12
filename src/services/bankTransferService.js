import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';

export const bankTransferService = {
  async getAll() {
    if (!db.bankTransfers) return [];
    const transfers = await db.bankTransfers.toArray();
    return transfers.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },

  async add(data) {
    const isDeposit = data.type === 'Deposit';
    let cbEntry;
    if (isDeposit) {
      cbEntry = await cashBookService.depositToBank(data);
    } else {
      cbEntry = await cashBookService.withdrawFromBank(data);
    }
    const transfer = await db.bankTransfers.get(cbEntry?.linkedTransactionId);
    return transfer || cbEntry;
  },

  async update(id, data) {
    const existing = await db.bankTransfers.get(id);
    if (!existing) throw new Error('Bank transfer not found');

    const oldAmount = Number(existing.amount || 0);
    const newAmount = Number(data.amount || 0);
    const newType = data.type || existing.type;
    const newBankId = data.bankAccountId || existing.bankAccountId;
    const newBankName = data.bankAccountName || existing.bankAccountName;

    await db.transaction('rw', [db.bankTransfers, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse old transfer
      const oldBank = existing.bankAccountId
        ? await db.accounts.get(existing.bankAccountId)
        : await db.accounts.where({ name: existing.bankAccountName }).first();
      if (oldBank) {
        if (existing.type === 'Deposit') {
          await db.accounts.update(oldBank.id, {
            balance: Number(oldBank.balance || 0) - oldAmount,
          });
        } else {
          await db.accounts.update(oldBank.id, {
            balance: Number(oldBank.balance || 0) + oldAmount,
          });
        }
      }

      // Reverse linked Cash Book entry
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

      // 2. Apply new transfer
      const newBank = newBankId
        ? await db.accounts.get(newBankId)
        : await db.accounts.where({ name: newBankName }).first();
      if (newBank) {
        if (newType === 'Deposit') {
          await db.accounts.update(newBank.id, {
            balance: Number(newBank.balance || 0) + newAmount,
          });
        } else {
          await db.accounts.update(newBank.id, {
            balance: Math.max(0, Number(newBank.balance || 0) - newAmount),
          });
        }
      }

      // Add new Cash Book entry
      await db.cashBookEntries.add({
        id: 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4),
        date: data.date || existing.date,
        type: newType,
        bankAccountId: newBankId,
        bankAccountName: newBankName,
        debit: newType === 'Deposit' ? newAmount : 0,
        credit: newType === 'Withdrawal' ? newAmount : 0,
        description:
          data.description ||
          (newType === 'Deposit'
            ? `Cash deposited to ${newBankName}`
            : `Cash withdrawn from ${newBankName}`),
        linkedTransactionId: existing.id,
      });

      if (cashAcc) {
        const cashDelta = newType === 'Deposit' ? -newAmount : newAmount;
        await db.accounts.update(cashAcc.id, {
          balance: Number(cashAcc.balance || 0) + cashDelta,
        });
      }

      // 3. Update transfer record
      const updated = {
        ...existing,
        date: data.date || existing.date,
        type: newType,
        bankAccountId: newBankId,
        bankAccountName: newBankName,
        amount: newAmount,
        description: data.description || existing.description,
        updatedAt: new Date().toISOString(),
        editCount: (Number(existing.editCount) || 0) + 1,
      };
      await db.bankTransfers.put(updated);
    });

    await cashBookService.recalculateCashBalance();
  },

  async delete(id) {
    const existing = await db.bankTransfers.get(id);
    if (!existing) return;

    const amount = Number(existing.amount || 0);

    await db.transaction('rw', [db.bankTransfers, db.cashBookEntries, db.accounts], async () => {
      // 1. Reverse Bank balance
      const bank = existing.bankAccountId
        ? await db.accounts.get(existing.bankAccountId)
        : await db.accounts.where({ name: existing.bankAccountName }).first();
      if (bank) {
        if (existing.type === 'Deposit') {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) - amount,
          });
        } else {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) + amount,
          });
        }
      }

      // 2. Reverse linked Cash Book entry
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

      // 3. Delete transfer
      await db.bankTransfers.delete(id);
    });

    await cashBookService.recalculateCashBalance();
  },
};
