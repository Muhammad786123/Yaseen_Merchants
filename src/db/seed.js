// Initial seed data for offline IndexedDB initialization

export const initialParties = [
  { id: 'p1', name: 'Al-Hamd Textile Traders', type: 'Supplier', phone: '0300-4521876', city: 'Faisalabad', openingBalance: 100000, balance: 220000 },
  { id: 'p2', name: 'New Asia Fabric Waste', type: 'Supplier', phone: '0321-6745321', city: 'Lahore', openingBalance: 50000, balance: 185000 },
  { id: 'p3', name: 'Malik Waste Traders', type: 'Supplier', phone: '0333-8821654', city: 'Gujranwala', openingBalance: 80000, balance: 160000 },
  { id: 'p4', name: 'Ahmed Textile Mills', type: 'Customer', phone: '0312-9934521', city: 'Lahore', openingBalance: 0, balance: -95000 },
  { id: 'p5', name: 'Star Fabric Traders', type: 'Customer', phone: '0345-7765432', city: 'Karachi', openingBalance: 0, balance: -125000 },
  { id: 'p6', name: 'Rehman Textile Group', type: 'Both', phone: '0311-5512347', city: 'Faisalabad', openingBalance: 30000, balance: 45000 },
  { id: 'p7', name: 'Gulshan Waste Dealers', type: 'Supplier', phone: '0300-2234561', city: 'Karachi', openingBalance: 60000, balance: 98000 },
  { id: 'p8', name: 'Kashmir Fiber Traders', type: 'Supplier', phone: '0333-4412876', city: 'Gujranwala', openingBalance: 25000, balance: 72000 },
  { id: 'p9', name: 'Pak Cotton Exports', type: 'Customer', phone: '0321-8834512', city: 'Lahore', openingBalance: 0, balance: -58000 },
  { id: 'p10', name: 'Faisal Recycling Co', type: 'Both', phone: '0300-6612345', city: 'Faisalabad', openingBalance: 15000, balance: 28000 },
  { id: 'p11', name: 'Shafiq Cloth House', type: 'Customer', phone: '0345-9923456', city: 'Karachi', openingBalance: 0, balance: -42000 },
  { id: 'p12', name: 'Crescent Fabric Mills', type: 'Customer', phone: '0312-7712345', city: 'Lahore', openingBalance: 0, balance: -88000 },
  { id: 'p13', name: 'Green Fibre Traders', type: 'Supplier', phone: '0333-2245678', city: 'Gujranwala', openingBalance: 40000, balance: 115000 },
  { id: 'p14', name: 'Horizon Textile Waste', type: 'Supplier', phone: '0300-5567891', city: 'Faisalabad', openingBalance: 70000, balance: 135000 },
  { id: 'p15', name: 'National Cloth Traders', type: 'Customer', phone: '0321-3312654', city: 'Lahore', openingBalance: 0, balance: -66000 },
];

export const initialQualities = [
  { id: 'q1', name: 'Cotton A', description: 'Premium cotton waste, high purity' },
  { id: 'q2', name: 'Cotton B', description: 'Standard cotton waste, mixed fibers' },
  { id: 'q3', name: 'Polyester A', description: 'Premium polyester waste' },
  { id: 'q4', name: 'Mixed', description: 'Mixed fabric waste, various compositions' },
  { id: 'q5', name: 'Denim', description: 'Denim fabric waste, heavy weight' },
  { id: 'q6', name: 'White Cutting', description: 'White fabric cuttings, clean' },
  { id: 'q7', name: 'Colored Cutting', description: 'Colored fabric cuttings, assorted' },
];

export const initialItems = [
  { id: 'i1', code: 'RM-001', name: 'Cotton Waste', category: 'Raw Material', quality: 'Cotton A', unit: 'KG', defaultRate: 85 },
  { id: 'i2', code: 'RM-002', name: 'Polyester Waste', category: 'Raw Material', quality: 'Polyester A', unit: 'KG', defaultRate: 70 },
  { id: 'i3', code: 'RM-003', name: 'Mixed Fabric Waste', category: 'Raw Material', quality: 'Mixed', unit: 'KG', defaultRate: 55 },
  { id: 'i4', code: 'RM-004', name: 'Denim Waste', category: 'Raw Material', quality: 'Denim', unit: 'KG', defaultRate: 65 },
  { id: 'i5', code: 'RM-005', name: 'Cutting Waste', category: 'Raw Material', quality: 'White Cutting', unit: 'KG', defaultRate: 45 },
  { id: 'i6', code: 'RM-006', name: 'Colored Cutting Waste', category: 'Raw Material', quality: 'Colored Cutting', unit: 'KG', defaultRate: 40 },
  { id: 'i7', code: 'RM-007', name: 'Synthetic Waste', category: 'Raw Material', quality: 'Mixed', unit: 'KG', defaultRate: 50 },
  { id: 'i8', code: 'RM-008', name: 'Wool Waste', category: 'Raw Material', quality: 'Cotton B', unit: 'KG', defaultRate: 95 },
  { id: 'i9', code: 'FP-001', name: 'Processed Cotton', category: 'Finished Product', quality: 'Cotton A', unit: 'KG', defaultRate: 145 },
  { id: 'i10', code: 'FP-002', name: 'Processed Polyester', category: 'Finished Product', quality: 'Polyester A', unit: 'KG', defaultRate: 120 },
  { id: 'i11', code: 'FP-003', name: 'Mixed Fabric Product', category: 'Finished Product', quality: 'Mixed', unit: 'KG', defaultRate: 100 },
  { id: 'i12', code: 'FP-004', name: 'Recycled Textile Product', category: 'Finished Product', quality: 'Mixed', unit: 'KG', defaultRate: 110 },
  { id: 'i13', code: 'FP-005', name: 'Cotton Fiber Ball', category: 'Finished Product', quality: 'Cotton B', unit: 'KG', defaultRate: 130 },
  { id: 'i14', code: 'RM-009', name: 'Rayon Waste', category: 'Raw Material', quality: 'Mixed', unit: 'KG', defaultRate: 48 },
  { id: 'i15', code: 'FP-006', name: 'Denim Recycled Product', category: 'Finished Product', quality: 'Denim', unit: 'KG', defaultRate: 115 },
];

export const initialWarehouses = [
  { id: 'w1', name: 'Raw Material Store', type: 'Raw Material', location: 'Block A, Main Gate' },
  { id: 'w2', name: 'Waste Store', type: 'Raw Material', location: 'Block B, Side Gate' },
  { id: 'w3', name: 'Production Area', type: 'Production', location: 'Central Hall' },
  { id: 'w4', name: 'Finished Goods Store', type: 'Finished Product', location: 'Block C, Loading Bay' },
];

export const initialStockEntries = [
  { id: 'stk1', itemId: 'i1', itemName: 'Cotton Waste', quality: 'Cotton A', warehouseId: 'w1', warehouseName: 'Raw Material Store', qty: 1240, avgRate: 87.5, value: 108500, category: 'Raw Material' },
  { id: 'stk2', itemId: 'i1', itemName: 'Cotton Waste', quality: 'Cotton B', warehouseId: 'w2', warehouseName: 'Waste Store', qty: 680, avgRate: 75, value: 51000, category: 'Raw Material' },
  { id: 'stk3', itemId: 'i2', itemName: 'Polyester Waste', quality: 'Polyester A', warehouseId: 'w1', warehouseName: 'Raw Material Store', qty: 920, avgRate: 72, value: 66240, category: 'Raw Material' },
  { id: 'stk4', itemId: 'i3', itemName: 'Mixed Fabric Waste', quality: 'Mixed', warehouseId: 'w2', warehouseName: 'Waste Store', qty: 540, avgRate: 55, value: 29700, category: 'Raw Material' },
  { id: 'stk5', itemId: 'i4', itemName: 'Denim Waste', quality: 'Denim', warehouseId: 'w1', warehouseName: 'Raw Material Store', qty: 380, avgRate: 65, value: 24700, category: 'Raw Material' },
  { id: 'stk6', itemId: 'i5', itemName: 'Cutting Waste', quality: 'White Cutting', warehouseId: 'w2', warehouseName: 'Waste Store', qty: 760, avgRate: 45, value: 34200, category: 'Raw Material' },
  { id: 'stk7', itemId: 'i6', itemName: 'Colored Cutting Waste', quality: 'Colored Cutting', warehouseId: 'w2', warehouseName: 'Waste Store', qty: 420, avgRate: 40, value: 16800, category: 'Raw Material' },
  { id: 'stk8', itemId: 'i9', itemName: 'Processed Cotton', quality: 'Cotton A', warehouseId: 'w4', warehouseName: 'Finished Goods Store', qty: 520, avgRate: 115, value: 59800, category: 'Finished Product' },
  { id: 'stk9', itemId: 'i10', itemName: 'Processed Polyester', quality: 'Polyester A', warehouseId: 'w4', warehouseName: 'Finished Goods Store', qty: 380, avgRate: 108, value: 41040, category: 'Finished Product' },
  { id: 'stk10', itemId: 'i11', itemName: 'Mixed Fabric Product', quality: 'Mixed', warehouseId: 'w4', warehouseName: 'Finished Goods Store', qty: 290, avgRate: 98, value: 28420, category: 'Finished Product' },
  { id: 'stk11', itemId: 'i12', itemName: 'Recycled Textile Product', quality: 'Mixed', warehouseId: 'w4', warehouseName: 'Finished Goods Store', qty: 410, avgRate: 105, value: 43050, category: 'Finished Product' },
  { id: 'stk12', itemId: 'i8', itemName: 'Wool Waste', quality: 'Cotton B', warehouseId: 'w1', warehouseName: 'Raw Material Store', qty: 95, avgRate: 95, value: 9025, category: 'Raw Material' },
];

export const initialPurchases = [
  { id: 'pur1', no: 'PUR-0001', date: '2026-09-01', supplierId: 'p1', supplierName: 'Al-Hamd Textile Traders', warehouseId: 'w1', warehouseName: 'Raw Material Store', items: [{ itemId: 'i1', itemName: 'Cotton Waste', quality: 'Cotton A', qty: 500, rate: 80, amount: 40000 }, { itemId: 'i1', itemName: 'Cotton Waste', quality: 'Cotton A', qty: 300, rate: 100, amount: 30000 }], total: 70000, paid: 30000, balance: 40000 },
  { id: 'pur2', no: 'PUR-0002', date: '2026-09-02', supplierId: 'p2', supplierName: 'New Asia Fabric Waste', warehouseId: 'w1', warehouseName: 'Raw Material Store', items: [{ itemId: 'i2', itemName: 'Polyester Waste', quality: 'Polyester A', qty: 400, rate: 70, amount: 28000 }], total: 28000, paid: 28000, balance: 0 },
  { id: 'pur3', no: 'PUR-0003', date: '2026-09-03', supplierId: 'p3', supplierName: 'Malik Waste Traders', warehouseId: 'w2', warehouseName: 'Waste Store', items: [{ itemId: 'i3', itemName: 'Mixed Fabric Waste', quality: 'Mixed', qty: 600, rate: 55, amount: 33000 }, { itemId: 'i6', itemName: 'Colored Cutting Waste', quality: 'Colored Cutting', qty: 200, rate: 40, amount: 8000 }], total: 41000, paid: 20000, balance: 21000 },
  { id: 'pur4', no: 'PUR-0004', date: '2026-09-04', supplierId: 'p1', supplierName: 'Al-Hamd Textile Traders', warehouseId: 'w1', warehouseName: 'Raw Material Store', items: [{ itemId: 'i4', itemName: 'Denim Waste', quality: 'Denim', qty: 300, rate: 65, amount: 19500 }], total: 19500, paid: 0, balance: 19500 },
  { id: 'pur5', no: 'PUR-0005', date: '2026-09-05', supplierId: 'p7', supplierName: 'Gulshan Waste Dealers', warehouseId: 'w2', warehouseName: 'Waste Store', items: [{ itemId: 'i5', itemName: 'Cutting Waste', quality: 'White Cutting', qty: 800, rate: 45, amount: 36000 }], total: 36000, paid: 36000, balance: 0 },
];

export const initialIssues = [
  { id: 'iss1', no: 'ISS-0001', date: '2026-09-03', fromWarehouse: 'Raw Material Store', toArea: 'Production Area', items: [{ itemId: 'i1', itemName: 'Cotton Waste', quality: 'Cotton A', availableQty: 800, issueQty: 300, rate: 87.5, value: 26250 }], totalValue: 26250 },
  { id: 'iss2', no: 'ISS-0002', date: '2026-09-05', fromWarehouse: 'Raw Material Store', toArea: 'Production Area', items: [{ itemId: 'i2', itemName: 'Polyester Waste', quality: 'Polyester A', availableQty: 400, issueQty: 200, rate: 72, value: 14400 }], totalValue: 14400 },
  { id: 'iss3', no: 'ISS-0003', date: '2026-09-07', fromWarehouse: 'Waste Store', toArea: 'Production Area', items: [{ itemId: 'i3', itemName: 'Mixed Fabric Waste', quality: 'Mixed', availableQty: 600, issueQty: 250, rate: 55, value: 13750 }, { itemId: 'i6', itemName: 'Colored Cutting Waste', quality: 'Colored Cutting', availableQty: 200, issueQty: 100, rate: 40, value: 4000 }], totalValue: 17750 },
];

export const initialProductions = [
  { id: 'prd1', no: 'PRD-0001', date: '2026-09-04', product: 'Processed Cotton', inputs: [{ itemName: 'Cotton Waste A', quality: 'Cotton A', qty: 300 }], totalInput: 300, outputQty: 265, wasteQty: 35, yieldPct: 88.3 },
  { id: 'prd2', no: 'PRD-0002', date: '2026-09-06', product: 'Processed Polyester', inputs: [{ itemName: 'Polyester Waste A', quality: 'Polyester A', qty: 200 }], totalInput: 200, outputQty: 178, wasteQty: 22, yieldPct: 89 },
  { id: 'prd3', no: 'PRD-0003', date: '2026-09-08', product: 'Mixed Fabric Product', inputs: [{ itemName: 'Mixed Fabric Waste', quality: 'Mixed', qty: 250 }, { itemName: 'Colored Cutting Waste', quality: 'Colored Cutting', qty: 100 }], totalInput: 350, outputQty: 305, wasteQty: 45, yieldPct: 87.1 },
];

export const initialSales = [
  { id: 'sal1', no: 'SAL-0001', date: '2026-09-05', customerId: 'p4', customerName: 'Ahmed Textile Mills', warehouseId: 'w4', warehouseName: 'Finished Goods Store', items: [{ itemId: 'i9', itemName: 'Processed Cotton', quality: 'Cotton A', qty: 200, rate: 145, amount: 29000 }], total: 29000, received: 15000, balance: 14000 },
  { id: 'sal2', no: 'SAL-0002', date: '2026-09-07', customerId: 'p5', customerName: 'Star Fabric Traders', warehouseId: 'w4', warehouseName: 'Finished Goods Store', items: [{ itemId: 'i10', itemName: 'Processed Polyester', quality: 'Polyester A', qty: 150, rate: 120, amount: 18000 }], total: 18000, received: 18000, balance: 0 },
  { id: 'sal3', no: 'SAL-0003', date: '2026-09-09', customerId: 'p9', customerName: 'Pak Cotton Exports', warehouseId: 'w4', warehouseName: 'Finished Goods Store', items: [{ itemId: 'i11', itemName: 'Mixed Fabric Product', quality: 'Mixed', qty: 180, rate: 100, amount: 18000 }, { itemId: 'i12', itemName: 'Recycled Textile Product', quality: 'Mixed', qty: 100, rate: 110, amount: 11000 }], total: 29000, received: 10000, balance: 19000 },
];

export const initialReceipts = [
  { id: 'rec1', no: 'RCT-0001', date: '2026-09-05', partyId: 'p4', partyName: 'Ahmed Textile Mills', amount: 15000, account: 'Meezan Bank', description: 'Payment against SAL-0001' },
  { id: 'rec2', no: 'RCT-0002', date: '2026-09-07', partyId: 'p5', partyName: 'Star Fabric Traders', amount: 18000, account: 'HBL', description: 'Full payment SAL-0002' },
  { id: 'rec3', no: 'RCT-0003', date: '2026-09-09', partyId: 'p9', partyName: 'Pak Cotton Exports', amount: 10000, account: 'Cash', description: 'Advance against SAL-0003' },
];

export const initialPayments = [
  { id: 'pay1', no: 'PAY-0001', date: '2026-09-01', partyId: 'p1', partyName: 'Al-Hamd Textile Traders', amount: 30000, account: 'Meezan Bank', description: 'Advance against PUR-0001' },
  { id: 'pay2', no: 'PAY-0002', date: '2026-09-02', partyId: 'p2', partyName: 'New Asia Fabric Waste', amount: 28000, account: 'HBL', description: 'Full payment PUR-0002' },
  { id: 'pay3', no: 'PAY-0003', date: '2026-09-03', partyId: 'p3', partyName: 'Malik Waste Traders', amount: 20000, account: 'Cash', description: 'Partial against PUR-0003' },
];

export const initialExpenses = [
  { id: 'exp1', date: '2026-09-01', description: 'Labour Wages - Production', category: 'Labour', amount: 45000, account: 'Cash' },
  { id: 'exp2', date: '2026-09-01', description: 'Electricity Bill', category: 'Utilities', amount: 12000, account: 'HBL' },
  { id: 'exp3', date: '2026-09-03', description: 'Transport - Faisalabad', category: 'Transport', amount: 5000, account: 'Cash' },
  { id: 'exp4', date: '2026-09-05', description: 'Machine Maintenance', category: 'Maintenance', amount: 8500, account: 'Meezan Bank' },
];

export const initialAccounts = [
  { id: 'cash', name: 'Cash', balance: 185400, accountType: 'Cash' },
  { id: 'meezan', name: 'Meezan Bank', balance: 342000, accountType: 'Bank' },
  { id: 'hbl', name: 'HBL', balance: 218500, accountType: 'Bank' },
  { id: 'ubl', name: 'UBL', balance: 156000, accountType: 'Bank' },
];

export const initialCashBookEntries = [
  {
    id: 'cb1',
    date: '2026-09-01',
    type: 'Expense',
    partyId: null,
    partyName: null,
    bankAccountId: null,
    bankAccountName: null,
    debit: 45000,
    credit: 0,
    balance: 205000,
    description: 'Labour Wages - Production',
    linkedTransactionId: 'exp1',
  },
  {
    id: 'cb2',
    date: '2026-09-03',
    type: 'Expense',
    partyId: null,
    partyName: null,
    bankAccountId: null,
    bankAccountName: null,
    debit: 5000,
    credit: 0,
    balance: 200000,
    description: 'Transport - Faisalabad',
    linkedTransactionId: 'exp3',
  },
  {
    id: 'cb3',
    date: '2026-09-03',
    type: 'Payment',
    partyId: 'p3',
    partyName: 'Malik Waste Traders',
    bankAccountId: null,
    bankAccountName: null,
    debit: 20000,
    credit: 0,
    balance: 180000,
    description: 'Cash payment against PUR-0003',
    linkedTransactionId: 'pay3',
  },
  {
    id: 'cb4',
    date: '2026-09-09',
    type: 'Receipt',
    partyId: 'p9',
    partyName: 'Pak Cotton Exports',
    bankAccountId: null,
    bankAccountName: null,
    debit: 0,
    credit: 10000,
    balance: 190000,
    description: 'Cash advance against SAL-0003',
    linkedTransactionId: 'rec3',
  },
  {
    id: 'cb5',
    date: '2026-09-10',
    type: 'Deposit',
    partyId: null,
    partyName: null,
    bankAccountId: 'meezan',
    bankAccountName: 'Meezan Bank',
    debit: 10000,
    credit: 0,
    balance: 180000,
    description: 'Cash deposited into Meezan Bank',
    linkedTransactionId: 'trf1',
  },
];

export const initialBankTransfers = [
  {
    id: 'trf1',
    no: 'TRF-0001',
    date: '2026-09-10',
    type: 'Deposit',
    bankAccountId: 'meezan',
    bankAccountName: 'Meezan Bank',
    amount: 10000,
    description: 'Cash deposited into Meezan Bank',
  },
];

export const initialUsers = [
  { id: 'u1', name: 'Shahid Yaseen', email: 'shahid@yaseenmerchants.com', role: 'Admin', status: 'Active' },
  { id: 'u2', name: 'Muhammad Bilal', email: 'bilal@yaseenmerchants.com', role: 'Manager', status: 'Active' },
  { id: 'u3', name: 'Accountant Staff', email: 'accounts@yaseenmerchants.com', role: 'Accountant', status: 'Active' },
];

export const initialSettings = [
  { id: 's1', key: 'companyName', value: 'Shahid Yaseen Cotton Waste Merchant' },
  { id: 's2', key: 'city', value: 'Faisalabad, Pakistan' },
  { id: 's3', key: 'phone', value: '+92 300 1234567' },
  { id: 's4', key: 'fiscalYear', value: '2026-2027' },
];
