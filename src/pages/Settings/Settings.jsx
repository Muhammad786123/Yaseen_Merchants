import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import CompanyLogo from '../../components/common/CompanyLogo.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';
import { db, clearAllDatabaseData } from '../../db/database.js';
import {
  exportDatabaseToJson,
  restoreDatabaseFromJson,
  runAutoBackup,
  getAutoBackups,
  restoreAutoBackup,
  deleteAutoBackup,
  validateBackupData,
} from '../../utils/backupService.js';
import { rebuildBalancesFromVouchers } from '../../utils/balanceRebuildService.js';
import {
  Plus,
  Save,
  Trash2,
  Building,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Download,
  Upload,
  Database,
  Clock,
  CheckCircle2,
  FileJson,
  RotateCcw,
  HardDrive,
  Info,
  Calendar,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

const defaultNumbering = [
  { module: 'Purchase', prefix: 'PUR', digits: 4, next: 1 },
  { module: 'Sale', prefix: 'SAL', digits: 4, next: 1 },
  { module: 'Issue', prefix: 'ISS', digits: 4, next: 1 },
  { module: 'Production', prefix: 'PRD', digits: 4, next: 1 },
  { module: 'Receipt', prefix: 'RCT', digits: 4, next: 1 },
  { module: 'Payment', prefix: 'PAY', digits: 4, next: 1 },
];

const initialUsersList = [
  { id: 'u1', name: 'Shahid Yaseen', email: 'shahid@yaseenmerchants.com', role: 'Admin', status: 'Active' },
];

function formatBackupDate(isoStr) {
  if (!isoStr) return 'Never';
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return isoStr;
  return dt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'company';
  const { showToast } = useApp();
  const { profile, updateProfile, reloadProfile, defaultLogo } = useCompanyProfile();

  const [companyName, setCompanyName] = useState(profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant');
  const [companyTagline, setCompanyTagline] = useState(profile?.tagline || 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant');
  const [companyCity, setCompanyCity] = useState(profile?.address || 'Faisalabad, Pakistan');
  const [companyPhone, setCompanyPhone] = useState(profile?.phone || '+92 300 1234567');
  const [fiscalYear, setFiscalYear] = useState(profile?.fiscalYear || '2026-2027');
  const [logoPreview, setLogoPreview] = useState(profile?.logoUrl || '');
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = useRef(null);

  // Sync profile whenever it updates from database
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.legalName || '');
      setCompanyTagline(profile.tagline || '');
      setCompanyCity(profile.address || '');
      setCompanyPhone(profile.phone || '');
      setFiscalYear(profile.fiscalYear || '2026-2027');
      setLogoPreview(profile.logoUrl || '');
    }
  }, [profile]);

  const [numbering, setNumbering] = useState(defaultNumbering);
  const [users, setUsers] = useState(initialUsersList);
  const [showAddUser, setShowAddUser] = useState(false);

  // User form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Manager');

  // Backup & Restore State
  const fileInputRef = useRef(null);
  const [dbStats, setDbStats] = useState({
    parties: 0,
    purchases: 0,
    sales: 0,
    receipts: 0,
    payments: 0,
    issues: 0,
    productions: 0,
    items: 0,
    total: 0,
  });
  const [autoBackupsList, setAutoBackupsList] = useState([]);
  const [lastManualBackup, setLastManualBackup] = useState(
    localStorage.getItem('yaseen_last_manual_backup') || ''
  );
  const [lastAutoBackup, setLastAutoBackup] = useState(
    localStorage.getItem('yaseen_last_auto_backup') || ''
  );
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(
    localStorage.getItem('yaseen_auto_backup_enabled') !== 'false'
  );
  const [autoBackupFreq, setAutoBackupFreq] = useState(
    localStorage.getItem('yaseen_auto_backup_freq') || 'session'
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Complete Database Reset State
  const navigate = useNavigate();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmPhrase, setResetConfirmPhrase] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const hasRecentBackup = () => {
    if (!lastManualBackup) return false;
    const backupTime = new Date(lastManualBackup).getTime();
    if (isNaN(backupTime)) return false;
    return Date.now() - backupTime < 24 * 60 * 60 * 1000;
  };

  const handleConfirmCompleteReset = async () => {
    if (resetConfirmPhrase.trim().toUpperCase() !== 'DELETE ALL DATA') return;
    setIsResetting(true);
    try {
      await clearAllDatabaseData();
      await reloadProfile();
      await loadDbStatsAndBackups();
      showToast('All transaction, stock, and ledger data has been completely wiped. System is in a clean baseline state.');
      setShowResetModal(false);
      setResetConfirmPhrase('');
      navigate('/dashboard');
    } catch (err) {
      console.error('Reset failed:', err);
      showToast('Database reset failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const [isRebuildingBalances, setIsRebuildingBalances] = useState(false);

  const handleRebuildBalances = async () => {
    setIsRebuildingBalances(true);
    try {
      const stats = await rebuildBalancesFromVouchers();
      await loadDbStatsAndBackups();
      showToast(
        `Balances successfully rebuilt! (${stats.partiesUpdated} parties updated, ${stats.cashEntriesCreated} cash entries created, ${stats.capitalEntriesCreated} capital entries created)`
      );
    } catch (err) {
      console.error('Rebuild failed:', err);
      showToast('Failed to rebuild balances: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsRebuildingBalances(false);
    }
  };

  // Modals for confirmation
  const [pendingFileRestore, setPendingFileRestore] = useState(null);
  const [pendingAutoRestore, setPendingAutoRestore] = useState(null);

  const loadDbStatsAndBackups = async () => {
    try {
      const parties = await db.parties.count();
      const purchases = await db.purchases.count();
      const sales = await db.sales.count();
      const receipts = await db.receipts.count();
      const payments = await db.payments.count();
      const issues = await db.issues.count();
      const productions = await db.productions.count();
      const items = await db.items.count();
      const total =
        parties + purchases + sales + receipts + payments + issues + productions + items;

      setDbStats({
        parties,
        purchases,
        sales,
        receipts,
        payments,
        issues,
        productions,
        items,
        total,
      });

      const backups = await getAutoBackups();
      setAutoBackupsList(backups);

      setLastManualBackup(localStorage.getItem('yaseen_last_manual_backup') || '');
      setLastAutoBackup(localStorage.getItem('yaseen_last_auto_backup') || '');
    } catch (err) {
      console.error('Error loading backup stats:', err);
    }
  };

  useEffect(() => {
    loadDbStatsAndBackups();
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showToast('Business legal name cannot be empty', 'warning');
      return;
    }
    setIsSavingCompany(true);
    try {
      await updateProfile({
        legalName: companyName.trim(),
        tagline: companyTagline.trim(),
        address: companyCity.trim(),
        phone: companyPhone.trim(),
        fiscalYear: fiscalYear.trim(),
        logoUrl: logoPreview || '',
      });
      showToast('Company profile settings saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save company profile: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target.result);
      showToast('New logo selected. Click "Save Company Profile" to apply across the app.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoPreview('');
    if (logoInputRef.current) logoInputRef.current.value = '';
    showToast('Reset to default logo. Click "Save Company Profile" to apply.');
  };

  const handleSaveNumbering = () => {
    showToast('Document numbering configurations saved!');
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!userName) return;

    const newUser = {
      id: 'u_' + Date.now(),
      name: userName,
      email: userEmail || `${userName.toLowerCase().replace(/\s+/g, '')}@sy-cotton.com`,
      role: userRole,
      status: 'Active',
    };

    setUsers([...users, newUser]);
    showToast('New user added successfully!');
    setUserName('');
    setUserEmail('');
    setShowAddUser(false);
  };

  const handleDeleteUser = (id) => {
    setUsers(users.filter((u) => u.id !== id));
    showToast('User deleted!');
  };

  // --- Backup Handlers ---
  const handleManualExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportDatabaseToJson();
      setLastManualBackup(res.exportedAt);
      showToast(`Backup downloaded: ${res.filename} (${res.totalRecords} records)`);
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);
        const validation = validateBackupData(parsed);

        if (!validation.valid) {
          showToast(validation.error, 'error');
          return;
        }

        setPendingFileRestore({
          filename: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          bundle: parsed,
          recordsCount: parsed.totalRecords || Object.values(parsed.data || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0),
          exportedAt: parsed.exportedAt || 'Unknown',
        });
      } catch (err) {
        showToast('Invalid backup file. Could not parse JSON format.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmFileRestore = async () => {
    if (!pendingFileRestore?.bundle) return;
    setIsRestoring(true);
    try {
      const result = await restoreDatabaseFromJson(pendingFileRestore.bundle);
      showToast(`Database restored successfully! (${result.totalRestored} records restored)`);
      setPendingFileRestore(null);
      await reloadProfile();
      await loadDbStatsAndBackups();
    } catch (err) {
      showToast('Restore failed: ' + (err.message || 'Error parsing backup data'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleTriggerAutoSnapshot = async () => {
    try {
      const snap = await runAutoBackup(true);
      if (snap) {
        showToast('Snapshot saved to browser storage!');
        await loadDbStatsAndBackups();
      }
    } catch (err) {
      showToast('Snapshot failed: ' + err.message, 'error');
    }
  };

  const handleConfirmAutoRestore = async () => {
    if (!pendingAutoRestore) return;
    setIsRestoring(true);
    try {
      const result = await restoreAutoBackup(pendingAutoRestore.id);
      showToast(`Snapshot restored successfully! (${result.totalRestored} records restored)`);
      setPendingAutoRestore(null);
      await reloadProfile();
      await loadDbStatsAndBackups();
    } catch (err) {
      showToast('Snapshot restore failed: ' + err.message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = async (id) => {
    try {
      await deleteAutoBackup(id);
      showToast('Snapshot removed.');
      await loadDbStatsAndBackups();
    } catch (err) {
      showToast('Failed to delete snapshot: ' + err.message, 'error');
    }
  };

  const handleToggleAutoBackup = (enabled) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('yaseen_auto_backup_enabled', enabled ? 'true' : 'false');
    showToast(enabled ? 'Auto-backup enabled' : 'Auto-backup disabled');
  };

  const handleFrequencyChange = (freq) => {
    setAutoBackupFreq(freq);
    localStorage.setItem('yaseen_auto_backup_freq', freq);
    showToast(`Auto-backup set to: ${freq === 'session' ? 'Every session' : freq === 'daily' ? 'Daily' : 'Weekly'}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure company profile, document numbering, user access, and data backups"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-xl border border-[#E0DBD3] w-fit">
        <button
          onClick={() => handleTabChange('company')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'company'
              ? 'bg-[#1E3A5F] text-white shadow-xs'
              : 'text-gray-600 hover:bg-[#F5F4F0]'
          }`}
        >
          Company Profile
        </button>
        <button
          onClick={() => handleTabChange('numbering')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'numbering'
              ? 'bg-[#1E3A5F] text-white shadow-xs'
              : 'text-gray-600 hover:bg-[#F5F4F0]'
          }`}
        >
          Document Numbering
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-[#1E3A5F] text-white shadow-xs'
              : 'text-gray-600 hover:bg-[#F5F4F0]'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => handleTabChange('backup')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-[#1E3A5F] text-white shadow-xs'
              : 'text-gray-600 hover:bg-[#F5F4F0]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Data Backup &amp; Restore
        </button>
      </div>

      {/* ── COMPANY PROFILE TAB ────────────────────────────────────────────── */}
      {activeTab === 'company' && (
        <div className="space-y-6 max-w-2xl">
          <form onSubmit={handleSaveCompany} className="space-y-5">
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E0DBD3]">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-[#E0DBD3] bg-[#FAF9F7] p-1.5 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview || profile?.logoUrl || defaultLogo}
                      alt="Company Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1E3A5F]">Official Business Branding</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Logo and business details dynamically printed on all vouchers, statements, and sidebar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Change Logo
                  </Button>
                  {(logoPreview || profile?.logoUrl) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleResetLogo}
                      title="Reset to default logo"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Full Legal / Business Name"
                  value={companyName}
                  onChange={setCompanyName}
                  placeholder="e.g. Shahid Yaseen Cotton Waste Merchant"
                  required
                />

                <Input
                  label="Business Tagline / Subtitle"
                  value={companyTagline}
                  onChange={setCompanyTagline}
                  placeholder="e.g. Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Location / Address"
                    value={companyCity}
                    onChange={setCompanyCity}
                    placeholder="e.g. Faisalabad, Pakistan"
                    required
                  />
                  <Input
                    label="Primary Telephone / Mobile"
                    value={companyPhone}
                    onChange={setCompanyPhone}
                    placeholder="e.g. +92 300 1234567"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Active Fiscal Accounting Year"
                    value={fiscalYear}
                    onChange={setFiscalYear}
                    placeholder="e.g. 2026-2027"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1 italic">
                    The active financial cycle referenced on ledgers, financial statements, and printable documentation.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                disabled={isSavingCompany}
              >
                {isSavingCompany ? 'Saving Profile...' : 'Save Company Profile'}
              </Button>
              <span className="text-xs text-gray-500">
                Updates appear instantly everywhere in the app.
              </span>
            </div>
          </form>
        </div>
      )}

      {/* ── DOCUMENT NUMBERING TAB ────────────────────────────────────────── */}
      {activeTab === 'numbering' && (
        <div className="space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {numbering.map((n, idx) => (
              <Card key={n.module} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E0DBD3]">
                    <span className="font-bold text-sm text-[#1E3A5F]">{n.module} Voucher</span>
                    <Badge variant="blue">{n.prefix}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Prefix</label>
                      <input
                        type="text"
                        className="w-16 px-2 py-1.5 text-xs border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
                        value={n.prefix}
                        onChange={(e) => {
                          const updated = [...numbering];
                          updated[idx].prefix = e.target.value.toUpperCase();
                          setNumbering(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Next Number</label>
                      <input
                        type="number"
                        className="w-20 px-2 py-1.5 text-xs border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
                        value={n.next}
                        onChange={(e) => {
                          const updated = [...numbering];
                          updated[idx].next = Number(e.target.value);
                          setNumbering(updated);
                        }}
                      />
                    </div>
                    <div className="ml-auto">
                      <span className="text-[10px] text-gray-400 block mb-1">Preview</span>
                      <div className="font-mono text-xs font-bold text-[#C97B2E] bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                        {n.prefix}-{String(n.next).padStart(n.digits, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button variant="primary" icon={Save} onClick={handleSaveNumbering}>
            Save Numbering Settings
          </Button>
        </div>
      )}

      {/* ── USER MANAGEMENT TAB ───────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">System user accounts and access permissions.</p>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddUser(true)}>
              Add New User
            </Button>
          </div>

          <Table headers={['User Name', 'Email Address', 'Role', 'Status', 'Actions']}>
            {users.map((u) => (
              <TR key={u.id}>
                <TD className="font-semibold text-gray-900">{u.name}</TD>
                <TD mono>{u.email}</TD>
                <TD>
                  <Badge variant={u.role === 'Admin' ? 'red' : 'blue'}>{u.role}</Badge>
                </TD>
                <TD>
                  <Badge variant={u.status === 'Active' ? 'green' : 'gray'}>{u.status}</Badge>
                </TD>
                <TD>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>

          <Modal
            isOpen={showAddUser}
            onClose={() => setShowAddUser(false)}
            title="Create New User Account"
          >
            <form onSubmit={handleAddUser} className="space-y-4">
              <Input
                label="Full Name"
                value={userName}
                onChange={setUserName}
                placeholder="e.g. Imran Hussain"
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={userEmail}
                onChange={setUserEmail}
                placeholder="user@yaseenmerchants.com"
              />
              <Select
                label="User Role"
                value={userRole}
                onChange={setUserRole}
                options={[
                  { value: 'Admin', label: 'Administrator' },
                  { value: 'Manager', label: 'Manager' },
                  { value: 'Accountant', label: 'Accountant' },
                  { value: 'Operator', label: 'Operator' },
                ]}
              />
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
                <Button variant="secondary" onClick={() => setShowAddUser(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save User Account
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* ── DATA BACKUP & RESTORE TAB ───────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-4xl">
          {/* Warning Banner if No Manual Backup Downloaded Yet */}
          {!lastManualBackup && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">No Manual Backup Downloaded Yet!</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your accounting data currently lives only inside this browser on this computer.
                  We strongly recommend downloading a backup copy regularly to safeguard your business
                  records against browser data resets or hardware issues.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={handleManualExport}
                  disabled={isExporting}
                  className="mt-3 bg-amber-700 hover:bg-amber-800 border-amber-800 text-white"
                >
                  {isExporting ? 'Generating Backup...' : 'Download Your First Backup Now'}
                </Button>
              </div>
            </div>
          )}

          {/* Database Overview Banner */}
          <div className="bg-[#1E3A5F] text-white p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold uppercase tracking-wider">
                <HardDrive className="w-4 h-4" />
                <span>Local Offline Database (IndexedDB)</span>
              </div>
              <h3 className="text-lg font-bold mt-1">Yaseen Merchants ERP Storage</h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Contains active business ledgers, parties, warehouse inventories, and transaction vouchers.
              </p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[11px] text-gray-300 block uppercase">Total Records</span>
                <span className="text-xl font-black font-mono text-emerald-400">{dbStats.total}</span>
              </div>
              <div className="border-l border-white/20 pl-6">
                <span className="text-[11px] text-gray-300 block uppercase">Last Export</span>
                <span className="text-xs font-bold font-mono text-white">
                  {lastManualBackup ? formatBackupDate(lastManualBackup) : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Manual Export & Manual Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: MANUAL EXPORT */}
            <Card className="p-6 flex flex-col justify-between space-y-4 border-[#E0DBD3] bg-white">
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[#E0DBD3]">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E3A5F]">Manual Backup (Export)</h4>
                    <p className="text-[11px] text-gray-500">Download JSON file to your device</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Generates an offline JSON file containing all parties, vouchers, line items, stock
                  entries, and system settings. Save this file to your computer, USB drive, or cloud storage.
                </p>

                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E0DBD3] space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Parties / Customers:</span>
                    <strong className="text-gray-900 font-mono">{dbStats.parties}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Purchases &amp; Sales:</span>
                    <strong className="text-gray-900 font-mono">{dbStats.purchases + dbStats.sales}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Vouchers (Receipt/Payment):</span>
                    <strong className="text-gray-900 font-mono">{dbStats.receipts + dbStats.payments}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleManualExport}
                  disabled={isExporting}
                  className="w-full justify-center"
                >
                  {isExporting ? 'Generating Backup...' : 'Download Backup File'}
                </Button>
              </div>
            </Card>

            {/* CARD 2: MANUAL RESTORE */}
            <Card className="p-6 flex flex-col justify-between space-y-4 border-[#E0DBD3] bg-white">
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[#E0DBD3]">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-700 border border-blue-200">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1E3A5F]">Restore from Backup</h4>
                    <p className="text-[11px] text-gray-500">Import a previously downloaded .json file</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Select a valid <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">.json</code> backup
                  file to restore your database. The system will inspect and validate the data before confirming.
                </p>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Restoring replaces current database records with the imported file. Make sure to download a current backup first!
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="secondary"
                  icon={Upload}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-center bg-gray-50 hover:bg-gray-100"
                >
                  Select Backup File to Restore...
                </Button>
              </div>
            </Card>
          </div>

          {/* CARD 3: AUTOMATIC BACKUPS & SNAPSHOTS */}
          <Card className="p-6 border-[#E0DBD3] space-y-5 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E0DBD3]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-700 border border-purple-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#1E3A5F]">Automatic Backup Snapshots</h4>
                  <p className="text-[11px] text-gray-500">
                    Background snapshots saved directly into IndexedDB (kept up to {5} versions)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleTriggerAutoSnapshot}
                  className="text-xs"
                >
                  Create Snapshot Now
                </Button>
              </div>
            </div>

            {/* Auto Backup Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Automatic Backup Status
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoBackupEnabled}
                      onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E3A5F]"></div>
                  </label>
                  <span className="text-xs font-semibold text-gray-700">
                    {autoBackupEnabled ? 'Enabled (Active)' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Backup Frequency
                </span>
                <select
                  value={autoBackupFreq}
                  disabled={!autoBackupEnabled}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-[#E0DBD3] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1E3A5F] disabled:opacity-50"
                >
                  <option value="session">Every session (on app open)</option>
                  <option value="daily">Daily (every 24 hours)</option>
                  <option value="weekly">Weekly (every 7 days)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Last Auto-Backup
                </span>
                <div className="text-xs font-mono font-bold text-[#1E3A5F] pt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formatBackupDate(lastAutoBackup)}</span>
                </div>
              </div>
            </div>

            {/* List of Recent Auto Backups */}
            <div className="space-y-3 pt-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span>Recent Browser Snapshots ({autoBackupsList.length})</span>
              </h5>

              {autoBackupsList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#E0DBD3] rounded-xl text-xs text-gray-400">
                  No automated snapshots recorded yet. Click &quot;Create Snapshot Now&quot; to generate one.
                </div>
              ) : (
                <div className="space-y-2">
                  {autoBackupsList.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex flex-wrap items-center justify-between p-3 rounded-xl border border-[#E0DBD3] bg-white hover:border-[#1E3A5F]/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-600 border border-gray-200">
                          <FileJson className="w-4 h-4 text-[#1E3A5F]" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#1E3A5F]">
                            Snapshot — {formatBackupDate(snap.timestamp)}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Total Records: <strong>{snap.totalRecords || 0}</strong>
                            {snap.itemCounts && (
                              <span className="ml-2 text-gray-400">
                                ({snap.itemCounts.parties || 0} parties, {snap.itemCounts.purchases || 0} purchases, {snap.itemCounts.sales || 0} sales)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPendingAutoRestore(snap)}
                          className="text-xs hover:border-[#1E3A5F] hover:text-[#1E3A5F]"
                        >
                          Restore This
                        </Button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Caveat Note */}
            <div className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span>
                <strong>Important note on browser storage:</strong> Auto-backups are stored inside your browser&apos;s local IndexedDB.
                They protect against user errors while working, but will <em>not</em> survive if you clear your browser cookies/site data
                or switch computers. Use <strong>Manual Backup (Export)</strong> above to download physical files to an external drive.
              </span>
            </div>
          </Card>

          {/* ── JOURNAL POSTING & BALANCE REBUILD MAINTENANCE CARD ─────────── */}
          <Card className="p-6 border-blue-200 bg-blue-50/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-100 text-[#1E3A5F] rounded-xl shrink-0 mt-0.5">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E3A5F]">
                    Journal Voucher Posting &amp; Balance Rebuild
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Synchronize party, cash, bank, and capital ledger balances from all recorded vouchers.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                icon={RefreshCw}
                disabled={isRebuildingBalances}
                onClick={handleRebuildBalances}
                className="bg-[#1E3A5F] hover:bg-[#152843] text-white shrink-0 font-bold cursor-pointer"
              >
                {isRebuildingBalances ? 'Rebuilding Balances...' : 'Rebuild Balances from Vouchers'}
              </Button>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-blue-900">
                <Info className="w-4 h-4 shrink-0" />
                <span>Notice on Existing Data &amp; Journal Voucher Corrections:</span>
              </div>
              <p className="text-blue-900/90 leading-relaxed">
                Journal Vouchers posted prior to this update used inverted party balance signs and bypassed direct Capital / Cash Book integration. If you have legacy test vouchers (like JV-0001), you can either click <strong>&quot;Rebuild Balances from Vouchers&quot;</strong> above to auto-correct all party signs and inject missing Cash Book/Capital lines, or use <strong>&quot;Clear Complete Data&quot;</strong> below to reset to a clean baseline and re-enter vouchers with 100% Trial Balance equilibrium.
              </p>
            </div>
          </Card>

          {/* ── DANGER ZONE: DATABASE RESET & MAINTENANCE ─────────────────── */}
          <Card className="p-6 border-red-200 bg-red-50/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-red-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-950">
                    Database Reset &amp; Maintenance (Clear Complete Data)
                  </h3>
                  <p className="text-xs text-red-700/80 mt-0.5">
                    Permanently wipe all business records, transactions, parties, and stock to start from a clean baseline.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                icon={Trash2}
                onClick={() => {
                  setResetConfirmPhrase('');
                  setShowResetModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 border-red-700 text-white shrink-0 font-bold cursor-pointer"
              >
                Clear Complete Data
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="flex items-start gap-2 bg-white/90 p-3 rounded-lg border border-red-100 shadow-2xs">
                <span className="text-red-600 font-bold shrink-0">Wiped:</span>
                <span>All purchases, sales, production, issues, stock, parties, vouchers, cash book, and ledger entries.</span>
              </div>
              <div className="flex items-start gap-2 bg-white/90 p-3 rounded-lg border border-emerald-100 shadow-2xs">
                <span className="text-emerald-700 font-bold shrink-0">Preserved:</span>
                <span>Company profile, document numbering prefixes, user logins, and account structures (reset to zero).</span>
              </div>
            </div>
          </Card>

          {/* CONFIRMATION MODAL: FILE RESTORE */}
          <Modal
            isOpen={!!pendingFileRestore}
            onClose={() => !isRestoring && setPendingFileRestore(null)}
            title="Confirm Database Restore from File"
          >
            {pendingFileRestore && (
              <div className="space-y-4">
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block text-sm text-red-800 mb-1">Warning: Irreversible Action</strong>
                    This will replace all current data in the application with the records from the backup file.
                    This cannot be undone. Are you sure you wish to continue?
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-3.5 rounded-xl border border-[#E0DBD3] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">File Name:</span>
                    <strong className="text-gray-800 font-mono">{pendingFileRestore.filename}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">File Size:</span>
                    <span className="text-gray-800 font-mono">{pendingFileRestore.sizeKb}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Exported At:</span>
                    <span className="text-gray-800">{formatBackupDate(pendingFileRestore.exportedAt)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-500 font-bold">Total Records in File:</span>
                    <span className="text-emerald-700 font-black font-mono text-sm">
                      {pendingFileRestore.recordsCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DBD3]">
                  <Button
                    variant="secondary"
                    disabled={isRestoring}
                    onClick={() => setPendingFileRestore(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isRestoring}
                    onClick={handleConfirmFileRestore}
                    className="bg-red-600 hover:bg-red-700 border-red-700 text-white"
                  >
                    {isRestoring ? 'Restoring Database...' : 'Yes, Replace & Restore All Data'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* CONFIRMATION MODAL: AUTO-BACKUP RESTORE */}
          <Modal
            isOpen={!!pendingAutoRestore}
            onClose={() => !isRestoring && setPendingAutoRestore(null)}
            title="Restore from Auto-Backup Snapshot"
          >
            {pendingAutoRestore && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block text-sm text-amber-800 mb-1">Confirm Snapshot Revert</strong>
                    Restoring this snapshot will roll back current tables to the state recorded on{' '}
                    <strong>{formatBackupDate(pendingAutoRestore.timestamp)}</strong> ({pendingAutoRestore.totalRecords} records).
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DBD3]">
                  <Button
                    variant="secondary"
                    disabled={isRestoring}
                    onClick={() => setPendingAutoRestore(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isRestoring}
                    onClick={handleConfirmAutoRestore}
                  >
                    {isRestoring ? 'Reverting...' : 'Confirm and Revert to Snapshot'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* CONFIRMATION MODAL: COMPLETE DATABASE RESET (DANGER ZONE) */}
          <Modal
            isOpen={showResetModal}
            onClose={() => !isResetting && setShowResetModal(false)}
            title="Permanently Clear Complete Database"
          >
            <div className="space-y-4">
              {/* Danger Warning Banner */}
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1">
                  <strong className="block text-sm text-red-800 font-bold">
                    Warning: Irreversible Data Deletion
                  </strong>
                  <p>
                    This action will permanently delete every business transaction, party, item, warehouse, and ledger entry from this device.
                    <strong> This action cannot be undone.</strong>
                  </p>
                </div>
              </div>

              {/* Table breakdown list */}
              <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E0DBD3] text-xs space-y-2">
                <div className="font-bold text-gray-800 border-b border-gray-200 pb-1 flex justify-between">
                  <span>Scope of Wipe</span>
                  <span className="text-red-600 uppercase font-mono text-[10px]">Permanent</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600 text-[11px]">
                  <div>• Parties, Suppliers &amp; Customers</div>
                  <div>• Items &amp; Qualities Master</div>
                  <div>• All Warehouses &amp; Stock Entries</div>
                  <div>• Purchases &amp; Sales Invoices</div>
                  <div>• Issue &amp; Production Slips</div>
                  <div>• Receipts &amp; Payment Vouchers</div>
                  <div>• Expense Records &amp; Transfers</div>
                  <div>• Cash Book &amp; Mall A/C Ledgers</div>
                </div>
                <div className="pt-1.5 border-t border-gray-200 text-[11px] text-emerald-800 font-medium">
                  ✓ Preserved: Company Profile, Document Numbering, and User Logins. Account structures (Cash, Meezan, HBL, UBL) remain intact with zero balances.
                </div>
              </div>

              {/* Backup Recommendation Prompt */}
              {!hasRecentBackup() ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="block text-xs font-bold text-amber-900">
                        No Recent Backup Downloaded
                      </strong>
                      You have not exported a manual backup file recently. We strongly recommend downloading a backup first before clearing all data.
                    </div>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Download}
                      disabled={isExporting}
                      onClick={async () => {
                        await handleManualExport();
                      }}
                      className="bg-white border-amber-400 text-amber-900 hover:bg-amber-100 text-xs font-semibold"
                    >
                      {isExporting ? 'Downloading Backup...' : 'Download Backup First'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Recent backup safely downloaded on {formatBackupDate(lastManualBackup)}.</span>
                </div>
              )}

              {/* Phrase Confirmation Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-gray-800">
                  To confirm reset, type <span className="font-mono text-red-600 font-black tracking-wider">DELETE ALL DATA</span> in the box below:
                </label>
                <input
                  type="text"
                  value={resetConfirmPhrase}
                  onChange={(e) => setResetConfirmPhrase(e.target.value)}
                  placeholder="Type DELETE ALL DATA"
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-red-200 rounded-lg outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 bg-white"
                  autoComplete="off"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DBD3]">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isResetting}
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmPhrase('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={resetConfirmPhrase.trim().toUpperCase() !== 'DELETE ALL DATA' || isResetting}
                  onClick={handleConfirmCompleteReset}
                  className="bg-red-600 hover:bg-red-700 border-red-700 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Wiping Database...' : 'Permanently Wipe & Reset Database'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
