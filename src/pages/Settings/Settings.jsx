import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Plus, Save, Trash2 } from 'lucide-react';

const defaultNumbering = [
  { module: 'Purchase', prefix: 'PUR', digits: 4, next: 21 },
  { module: 'Sale', prefix: 'SAL', digits: 4, next: 16 },
  { module: 'Issue', prefix: 'ISS', digits: 4, next: 11 },
  { module: 'Production', prefix: 'PRD', digits: 4, next: 11 },
  { module: 'Receipt', prefix: 'RCT', digits: 4, next: 16 },
  { module: 'Payment', prefix: 'PAY', digits: 4, next: 16 },
];

const initialUsersList = [
  { id: 'u1', name: 'Shahid Yaseen', email: 'shahid@yaseenmerchants.com', role: 'Admin', status: 'Active' },
  { id: 'u2', name: 'Muhammad Bilal', email: 'bilal@yaseenmerchants.com', role: 'Manager', status: 'Active' },
  { id: 'u3', name: 'Accountant Staff', email: 'accounts@yaseenmerchants.com', role: 'Accountant', status: 'Active' },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'numbering';
  const { showToast } = useApp();

  const [numbering, setNumbering] = useState(defaultNumbering);
  const [users, setUsers] = useState(initialUsersList);
  const [showAddUser, setShowAddUser] = useState(false);

  // User form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Manager');

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
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
      email: userEmail || `${userName.toLowerCase().replace(/\s+/g, '')}@yaseenmerchants.com`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure document numbering series and user access control"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-[#E0DBD3] w-fit">
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
      </div>

      {activeTab === 'numbering' && (
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs text-gray-500">
            Configure automatic sequence prefixes and numbers for each module.
          </p>

          <div className="space-y-3">
            {numbering.map((n, idx) => (
              <Card key={n.module} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="w-28 font-bold text-[#1E3A5F] text-sm">{n.module}</div>
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">Prefix</span>
                      <input
                        className="w-20 px-2 py-1.5 text-xs font-mono border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
                        value={n.prefix}
                        onChange={(e) => {
                          const updated = [...numbering];
                          updated[idx].prefix = e.target.value;
                          setNumbering(updated);
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">Digits</span>
                      <input
                        type="number"
                        className="w-16 px-2 py-1.5 text-xs border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
                        value={n.digits}
                        onChange={(e) => {
                          const updated = [...numbering];
                          updated[idx].digits = Number(e.target.value);
                          setNumbering(updated);
                        }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">Next Number</span>
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
    </div>
  );
}
