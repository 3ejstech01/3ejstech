'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { User } from '@/stores/usersStore';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { GoogleSheetsConfig } from '@/components/settings/GoogleSheetsConfig';
import { useUsersStore } from '@/stores/usersStore';
import { syncFromRemote } from '@/lib/unified-db';
import { saveRecordSnapshot } from '@/lib/sync-queue';

type TabType = 'themes' | 'data' | 'users' | 'sheets';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('themes');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { users, fetchUsers, addUser, updateUser, deleteUser, isSubmitting } = useUsersStore();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: '', role: UserRole.VIEW_ONLY as UserRole });

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleSaveUser = async () => {
    if (!userForm.username.trim()) return;
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ username: '', role: UserRole.VIEW_ONLY });

    if (editingUser) {
      const ok = await updateUser(editingUser.id, userForm.username, undefined, userForm.role);
      if (ok) alert('User updated successfully');
    } else {
      const ok = await addUser(userForm.username, '', userForm.role);
      if (ok) alert('User added successfully');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncFromRemote();
      setSyncMsg('Synced from database successfully');
    } catch (e) {
      setSyncMsg('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleClearLocalDB = async () => {
    const ok = confirm('WARNING: This will delete ALL local data from your browser. You will need to re-sync. Continue?');
    if (!ok) return;
    
    setClearing(true);
    try {
      if (!window.indexedDB) {
        alert('IndexedDB is not available in this browser.');
        return;
      }
      
      const request = window.indexedDB.deleteDatabase('3jes_local_db');
      
      request.onerror = () => {
        alert('Failed to delete local database. You may need to manually clear it from browser settings.');
        setClearing(false);
      };
      
      request.onsuccess = async () => {
        alert('Local database deleted successfully. Please reload the page to re-sync.');
        window.location.reload();
      };
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setClearing(false);
    }
  };

  const handleArchivePreviousYears = async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (!confirm(`Archive all installations from years before ${currentYear}? This will move them to historical data.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentYear }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully archived ${result.archivedCount} installations from years before ${currentYear}`);
      } else {
        alert('Archive failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Archive failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <LayoutWrapper>
        <PageContainer title="Settings" subtitle="Application settings and configuration">
          <Card>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-text mb-2">Admin Access Required</h2>
              <p className="text-text/50">You do not have permission to access this page.</p>
            </motion.div>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Settings" subtitle="Application settings and configuration">
        <div className="flex gap-2 mb-6">
          {[
            { key: 'themes' as TabType, label: 'Themes' },
            { key: 'sheets' as TabType, label: 'Google Sheets' },
            { key: 'data' as TabType, label: 'Data' },
            { key: 'users' as TabType, label: 'Users' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-text/60 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'themes' && (
            <motion.div
              key="themes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <ThemeCustomizer />
            </motion.div>
          )}

          {activeTab === 'sheets' && (
            <motion.div
              key="sheets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Google Sheets Configuration</h3>
                <GoogleSheetsConfig />
              </Card>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Sync from Database</h2>
                    <p className="text-sm text-text/50">Pull latest data from the cloud</p>
                  </div>
                </div>

                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Syncing...
                    </span>
                  ) : (
                    'Sync from Database'
                  )}
                </button>

                {syncMsg && (
                  <p className="mt-3 text-sm text-text/50">{syncMsg}</p>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Archive Previous Years</h2>
                    <p className="text-sm text-text/50">Move old installations to historical data</p>
                  </div>
                </div>

                <button
                  onClick={handleArchivePreviousYears}
                  disabled={archiving}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {archiving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Archiving...
                    </span>
                  ) : (
                    'Archive Previous Years'
                  )}
                </button>

                <p className="mt-3 text-sm text-text/50">
                  This will move all installations from years before {new Date().getFullYear()} to the historical data table.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Clear Local Database</h2>
                    <p className="text-sm text-text/50">Delete all local data and re-sync</p>
                  </div>
                </div>

                <button
                  onClick={handleClearLocalDB}
                  disabled={clearing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Clearing...
                    </span>
                  ) : (
                    'Clear Local Database'
                  )}
                </button>

                <p className="mt-3 text-sm text-text/50">
                  This will permanently delete all local data from your browser. The app will reload and fetch fresh data.
                </p>
              </Card>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text">User Management</h2>
                      <p className="text-sm text-text/50">Manage user accounts and roles</p>
                    </div>
                  </div>
                  <Button onClick={() => setShowUserModal(true)}>
                    Add User
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text/50">Username</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text/50">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text/50">Created</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-text/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-background/50">
                          <td className="px-4 py-3 text-sm text-text font-medium">{u.username}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              u.role === UserRole.ADMIN ? 'bg-purple-500/20 text-purple-400' :
                              u.role === UserRole.TECHNICIAN ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { if (u.updatedAt) saveRecordSnapshot('users', u.id, u.updatedAt); setEditingUser(u); setUserForm({ username: u.username, role: u.role }); setShowUserModal(true); }}
                              className="text-blue-400 hover:text-blue-300 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user?')) {
                                  deleteUser(u.id, u.username).then(() => {
                                    alert('User deleted successfully');
                                  }).catch((err) => {
                                    alert('Failed to delete user: ' + (err.message || err));
                                  });
                                }
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {showUserModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-text">
                          {editingUser ? 'Edit User' : 'Add New User'}
                        </h3>
                        <button onClick={() => { setShowUserModal(false); setEditingUser(null); setUserForm({ username: '', role: UserRole.VIEW_ONLY }); }} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center hover:bg-background/80">
                          <svg className="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text/70 mb-1">Username</label>
                          <input
                            type="text"
                            value={userForm.username}
                            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text/70 mb-1">Role</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-text"
                          >
                            <option value={UserRole.ADMIN}>Admin</option>
                            <option value={UserRole.TECHNICIAN}>Technician</option>
                            <option value={UserRole.VIEW_ONLY}>View Only</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <Button onClick={handleSaveUser} disabled={isSubmitting} className="flex-1">
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Saving...
                            </span>
                          ) : editingUser ? 'Update' : 'Add User'}
                        </Button>
                        <Button variant="secondary" onClick={() => { setShowUserModal(false); setEditingUser(null); setUserForm({ username: '', role: UserRole.VIEW_ONLY }); }} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </LayoutWrapper>
  );
}