import { db } from '../db/database.js';

export const cashBookService = {
  async getAll() {
    const entries = await db.cashBookEntries.toArray();
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
    let running = Number(cashAcc?.openingBalance || 0);
    const calculated = entries.map((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      running = running - debit + credit;
      return {
        ...entry,
        balance: running,
      };
    });

    return calculated.reverse();
  },

  async addEntry(entryData) {
    const id = entryData.id || 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const debit = Number(entryData.debit || 0);
    const credit = Number(entryData.credit || 0);

    const newEntry = {
      id,
      date: entryData.date || new Date().toISOString().split('T')[0],
      type: entryData.type || 'General',
      partyId: entryData.partyId || null,
      partyName: entryData.partyName || null,
      bankAccountId: entryData.bankAccountId || null,
      bankAccountName: entryData.bankAccountName || null,
      debit,
      credit,
      description: entryData.description || '',
      linkedTransactionId: entryData.linkedTransactionId || null,
    };

    await db.cashBookEntries.add(newEntry);

    // Update physical Cash account balance in accounts table
    const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
    if (cashAcc) {
      await db.accounts.update(cashAcc.id, {
        balance: Number(cashAcc.balance || 0) - debit + credit,
      });
    }

    // Update Party balance if manual entry (not linked to another voucher)
    if (newEntry.partyId && !newEntry.linkedTransactionId) {
      const party = await db.parties.get(newEntry.partyId);
      if (party) {
        await db.parties.update(party.id, {
          balance: Number(party.balance || 0) - debit + credit,
        });
      }
    }

    return newEntry;
  },

  /**
   * Cash -> Bank Deposit
   * Physical Cash decreases (Debit in Cash Book), Bank Account balance increases.
   * Does NOT touch any Party balance.
   */
  async depositToBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    // 1. Create single linked Bank Transfer record
    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash deposited to ${bankAccountName}`,
    });

    // 2. Increase target Bank account balance
    const targetBank = await db.accounts.get(bankAccountId);
    if (targetBank) {
      await db.accounts.update(targetBank.id, {
        balance: Number(targetBank.balance || 0) + numAmount,
      });
    } else {
      const bankByName = await db.accounts.where({ name: bankAccountName }).first();
      if (bankByName) {
        await db.accounts.update(bankByName.id, {
          balance: Number(bankByName.balance || 0) + numAmount,
        });
      }
    }

    // 3. Create Cash Book entry (Cash Out)
    return await this.addEntry({
      date,
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      debit: numAmount,
      credit: 0,
      description: description || `Deposit to ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  /**
   * Bank -> Cash Withdrawal
   * Physical Cash increases (Credit in Cash Book), Bank Account balance decreases.
   * Does NOT touch any Party balance.
   */
  async withdrawFromBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    // 1. Create single linked Bank Transfer record
    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash withdrawn from ${bankAccountName}`,
    });

    // 2. Decrease target Bank account balance
    const targetBank = await db.accounts.get(bankAccountId);
    if (targetBank) {
      await db.accounts.update(targetBank.id, {
        balance: Math.max(0, Number(targetBank.balance || 0) - numAmount),
      });
    } else {
      const bankByName = await db.accounts.where({ name: bankAccountName }).first();
      if (bankByName) {
        await db.accounts.update(bankByName.id, {
          balance: Math.max(0, Number(bankByName.balance || 0) - numAmount),
        });
      }
    }

    // 3. Create Cash Book entry (Cash In)
    return await this.addEntry({
      date,
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      debit: 0,
      credit: numAmount,
      description: description || `Withdrawal from ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  /**
   * Cash Given to Party (Advance, Loan, or Payment)
   * Physical Cash decreases (Debit in Cash Book), Party balance changes.
   */
  async giveCashToParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);
    return await this.addEntry({
      date,
      type: 'CashGiven',
      partyId,
      partyName,
      debit: numAmount,
      credit: 0,
      description: description || `Cash given to ${partyName}`,
    });
  },

  /**
   * Cash Received from Party (Receipt or Refund)
   * Physical Cash increases (Credit in Cash Book), Party balance changes.
   */
  async receiveCashFromParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);
    return await this.addEntry({
      date,
      type: 'CashReceived',
      partyId,
      partyName,
      debit: 0,
      credit: numAmount,
      description: description || `Cash received from ${partyName}`,
    });
  },

  /**
   * Update manual Cash Book entry:
   * (1) Checks if linked to another voucher; if so, rejects direct edit.
   * (2) Reverses old entry's effect on Cash account balance (balance + debit - credit).
   *     If linked to party, reverses party balance (given: balance + amount; received: balance - amount).
   *     If linked to bank, reverses bank balance.
   * (3) Applies new entry's effect on Cash, Party, and Bank balances.
   * (4) Updates record preserving id, createdAt, setting updatedAt and editCount.
   */
  async update(id, data) {
    const existing = await db.cashBookEntries.get(id);
    if (!existing) throw new Error('Cash Book entry not found: ' + id);

    if (existing.linkedTransactionId) {
      throw new Error('This entry was created by another voucher and cannot be edited directly. Please edit the original voucher.');
    }

    const newDebit = Number(data.debit || 0);
    const newCredit = Number(data.credit || 0);

    const updated = {
      ...existing,
      date: data.date || existing.date,
      partyId: data.partyId !== undefined ? data.partyId : existing.partyId,
      partyName: data.partyName !== undefined ? data.partyName : existing.partyName,
      bankAccountId: data.bankAccountId !== undefined ? data.bankAccountId : existing.bankAccountId,
      bankAccountName: data.bankAccountName !== undefined ? data.bankAccountName : existing.bankAccountName,
      debit: newDebit,
      credit: newCredit,
      description: data.description !== undefined ? data.description : existing.description,
      type: data.type || existing.type,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.cashBookEntries, db.parties, db.accounts], async () => {
      // 1. Reverse old Cash account effect
      const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
      if (cashAcc) {
        await db.accounts.update(cashAcc.id, {
          balance: Number(cashAcc.balance || 0) + Number(existing.debit || 0) - Number(existing.credit || 0),
        });
      }

      // 2. Reverse old Party effect (if any)
      if (existing.partyId) {
        const oldParty = await db.parties.get(existing.partyId);
        if (oldParty) {
          // Cash Given (debit): balance was reduced, so add back. Cash Received (credit): balance was increased, so subtract.
          await db.parties.update(oldParty.id, {
            balance: Number(oldParty.balance || 0) + Number(existing.debit || 0) - Number(existing.credit || 0),
          });
        }
      }

      // 3. Reverse old Bank effect (if any)
      if (existing.bankAccountId || existing.bankAccountName) {
        const oldBank =
          (existing.bankAccountId ? await db.accounts.get(existing.bankAccountId) : null) ||
          (existing.bankAccountName ? await db.accounts.where({ name: existing.bankAccountName }).first() : null);
        if (oldBank) {
          await db.accounts.update(oldBank.id, {
            balance: Number(oldBank.balance || 0) - Number(existing.debit || 0) + Number(existing.credit || 0),
          });
        }
      }

      // 4. Apply new Cash account effect
      const refreshedCash = await db.accounts.where({ name: 'Cash' }).first();
      if (refreshedCash) {
        await db.accounts.update(refreshedCash.id, {
          balance: Number(refreshedCash.balance || 0) - newDebit + newCredit,
        });
      }

      // 5. Apply new Party effect (if any)
      if (updated.partyId) {
        const newParty = await db.parties.get(updated.partyId);
        if (newParty) {
          await db.parties.update(newParty.id, {
            balance: Number(newParty.balance || 0) - newDebit + newCredit,
          });
        }
      }

      // 6. Apply new Bank effect (if any)
      if (updated.bankAccountId || updated.bankAccountName) {
        const newBank =
          (updated.bankAccountId ? await db.accounts.get(updated.bankAccountId) : null) ||
          (updated.bankAccountName ? await db.accounts.where({ name: updated.bankAccountName }).first() : null);
        if (newBank) {
          await db.accounts.update(newBank.id, {
            balance: Number(newBank.balance || 0) + newDebit - newCredit,
          });
        }
      }

      // 7. Update cashBookEntries table
      await db.cashBookEntries.put(updated);
    });

    return updated;
  },

  /**
   * Delete manual Cash Book entry:
   * (1) Rejects if linked to another voucher.
   * (2) Reverses effect on Cash account, Party, and Bank balances.
   * (3) Deletes record.
   */
  async delete(id) {
    const existing = await db.cashBookEntries.get(id);
    if (!existing) return;

    if (existing.linkedTransactionId) {
      throw new Error('This entry was created by another voucher and cannot be deleted directly. Please delete from the original voucher.');
    }

    await db.transaction('rw', [db.cashBookEntries, db.parties, db.accounts], async () => {
      // 1. Reverse Cash account effect
      const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
      if (cashAcc) {
        await db.accounts.update(cashAcc.id, {
          balance: Number(cashAcc.balance || 0) + Number(existing.debit || 0) - Number(existing.credit || 0),
        });
      }

      // 2. Reverse Party effect
      if (existing.partyId) {
        const party = await db.parties.get(existing.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) + Number(existing.debit || 0) - Number(existing.credit || 0),
          });
        }
      }

      // 3. Reverse Bank effect
      if (existing.bankAccountId || existing.bankAccountName) {
        const bank =
          (existing.bankAccountId ? await db.accounts.get(existing.bankAccountId) : null) ||
          (existing.bankAccountName ? await db.accounts.where({ name: existing.bankAccountName }).first() : null);
        if (bank) {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) - Number(existing.debit || 0) + Number(existing.credit || 0),
          });
        }
      }

      // 4. Delete record
      await db.cashBookEntries.delete(id);
    });
  },
};
