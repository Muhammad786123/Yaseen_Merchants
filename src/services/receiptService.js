import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';

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
    };

    await db.receipts.add(newReceipt);

    // Update customer party balance (reduces customer receivable debt)
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
      await cashBookService.addEntry({
        date: newReceipt.date,
        type: 'Receipt',
        partyId: receiptData.partyId,
        partyName: receiptData.partyName,
        debit: 0,
        credit: amount,
        description: receiptData.description || `Cash receipt ${no} from ${receiptData.partyName}`,
        linkedTransactionId: id,
      });
    } else {
      // Update specific bank account balance
      const accountObj = await db.accounts.where({ name: receiptData.account }).first();
      if (accountObj) {
        await db.accounts.update(accountObj.id, {
          balance: Number(accountObj.balance || 0) + amount,
        });
      }
    }

    return newReceipt;
  },

  async delete(id) {
    return await db.receipts.delete(id);
  },
};
