// Initial seed data for offline IndexedDB initialization (Clean baseline - no dummy transactions/parties)

export const initialParties = [];
export const initialQualities = [];
export const initialItems = [];
export const initialWarehouses = [];
export const initialStockEntries = [];
export const initialPurchases = [];
export const initialIssues = [];
export const initialProductions = [];
export const initialSales = [];
export const initialReceipts = [];
export const initialPayments = [];
export const initialExpenses = [];

export const initialAccounts = [
  { id: 'cash', name: 'Cash', balance: 0, accountType: 'Cash' },
  { id: 'meezan', name: 'Meezan Bank', balance: 0, accountType: 'Bank' },
  { id: 'hbl', name: 'HBL', balance: 0, accountType: 'Bank' },
  { id: 'ubl', name: 'UBL', balance: 0, accountType: 'Bank' },
];

export const initialCashBookEntries = [];
export const initialBankTransfers = [];

export const initialUsers = [
  { id: 'u1', name: 'Shahid Yaseen', email: 'shahid@yaseenmerchants.com', role: 'Admin', status: 'Active' },
];

export const initialSettings = [
  { id: 's1', key: 'companyName', value: 'Shahid Yaseen Cotton Waste Merchant' },
  { id: 's2', key: 'city', value: 'Faisalabad, Pakistan' },
  { id: 's3', key: 'phone', value: '+92 300 1234567' },
  { id: 's4', key: 'fiscalYear', value: '2026-2027' },
  {
    id: 's5',
    key: 'companyProfile',
    value: {
      legalName: 'Shahid Yaseen Cotton Waste Merchant',
      tagline: 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant',
      address: 'Faisalabad, Pakistan',
      phone: '+92 300 1234567',
      fiscalYear: '2026-2027',
      logoUrl: '',
    },
  },
];
