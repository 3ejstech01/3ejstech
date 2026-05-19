'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { useSubscribersStore } from '@/stores/subscribersStore';
import { useAuth } from '@/hooks/useAuth';
import { useELoadStore } from '@/stores/eloadStore';
import { Card } from '@/components/common/PageContainer';
import { AnimatePresence, motion } from 'framer-motion';
import { Installation } from '@/lib/types';
import { formatDateDisplay } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from '@/components/common/RechartsLazy';
import { useHistoricalDataStore } from '@/stores/historicalDataStore';

export default function DashboardPage() {
  const { user } = useAuth();
  const { subscribers: installations, fetchSubscribers } = useSubscribersStore();
  const { transactions: eloadTransactions, fetchTransactions: fetchELoad } = useELoadStore();
  const { records: historicalRecords, fetchRecords: fetchHistorical } = useHistoricalDataStore();
  const [selectedItem, setSelectedItem] = useState<Installation | null>(null);

  const currentYear = new Date().getFullYear();

  const subscriberGraphData = useMemo(() => {
    const monthly: Record<string, number> = {};
    installations.forEach(inst => {
      const raw = inst.dateInstalled as string | number;
      if (!raw && raw !== 0) return;
      let date: Date | null = null;

      if (typeof raw === 'number' || /^\d{5,6}$/.test(String(raw).trim())) {
        const serial = typeof raw === 'number' ? raw : parseInt(String(raw).trim());
        date = new Date((serial - 25569) * 86400 * 1000);
      } else {
        const s = String(raw).trim();
        if (!s) return;
        if (/^\d{4}-\d{2}/.test(s)) {
          date = new Date(s.substring(0, 10));
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const parts = s.split('/');
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else if (s.includes(' ')) {
          const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
          date = new Date(datePart);
        }
      }

      if (!date || isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [yr, mo] = month.split('-').map(Number);
        const label = isNaN(yr) || isNaN(mo) ? month
          : new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return { month, label, count };
      });
  }, [installations]);

  useEffect(() => {
    fetchSubscribers();
    fetchELoad();
    fetchHistorical();
  }, [fetchSubscribers, fetchELoad, fetchHistorical]);

  useEffect(() => {
    const handleSync = () => {
      fetchSubscribers();
      fetchELoad();
      fetchHistorical();
    };
    window.addEventListener('db-synced', handleSync);
    window.addEventListener('records-updated', handleSync);
    return () => {
      window.removeEventListener('db-synced', handleSync);
      window.removeEventListener('records-updated', handleSync);
    };
  }, [fetchSubscribers, fetchELoad, fetchHistorical]);

  const totalSubscribers = installations.length + historicalRecords.length;

  const recentEloadTransactions = useMemo(() => {
    return [...eloadTransactions]
      .sort((a, b) => {
        const dateA = a.dateLoaded ? new Date(a.dateLoaded).getTime() : 0;
        const dateB = b.dateLoaded ? new Date(b.dateLoaded).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20);
  }, [eloadTransactions]);

  const recentInstallations = useMemo(() => {
    return [...installations]
      .sort((a, b) => {
        const dateA = a.dateInstalled ? new Date(a.dateInstalled).getTime() : 0;
        const dateB = b.dateInstalled ? new Date(b.dateInstalled).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [installations]);

  const clawbackSubscribers = useMemo(() => {
    const daysFilter = 90;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysFilter);

    return installations.filter(sub => {
      let dateInstalled: Date | null = null;
      const raw = sub.dateInstalled;

      if (!raw) return false;

      if (typeof raw === 'number' || /^\d{5,6}$/.test(String(raw).trim())) {
        const serial = typeof raw === 'number' ? raw : parseInt(String(raw).trim());
        dateInstalled = new Date((serial - 25569) * 86400 * 1000);
      } else {
        const s = String(raw).trim();
        if (!s) return false;
        if (/^\d{4}-\d{2}/.test(s)) {
          dateInstalled = new Date(s.substring(0, 10));
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const parts = s.split('/');
          dateInstalled = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else if (s.includes(' ')) {
          const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
          dateInstalled = new Date(datePart);
        }
      }

      if (!dateInstalled || isNaN(dateInstalled.getTime())) return false;

      const isWithinDays = dateInstalled >= daysAgo;
      const isNotNeeded = sub.notifyStatus === 'Not Needed';
      const isNotified = sub.notifyStatus === 'Notified';
      const isNotLoaded = sub.loadStatus !== 'Account Loaded';

      return isWithinDays && !isNotNeeded && (isNotified || sub.notifyStatus === 'Not Yet Notified') && isNotLoaded;
    }).slice(0, 20);
  }, [installations]);

  const parseNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Welcome back, {user?.name}</h1>
            <p className="text-sm text-text/50 mt-1">Here is your {currentYear} performance and overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.784-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text/50 uppercase tracking-wider">Total Subscribers</p>
                  <p className="text-2xl font-bold text-text">{totalSubscribers}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75a.75.75 0 00-.75-.75H2.25" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text/50 uppercase tracking-wider">E-Load Transactions</p>
                  <p className="text-2xl font-bold text-emerald-600">{eloadTransactions.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text/50 uppercase tracking-wider">Active Installations</p>
                  <p className="text-2xl font-bold text-amber-600">{installations.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text/50 uppercase tracking-wider">Historical Records</p>
                  <p className="text-2xl font-bold text-purple-600">{historicalRecords.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text">Subscriber Installations</h2>
                <p className="text-xs text-text/40 mt-0.5">
                  Monthly new installs — all time
                  {subscriberGraphData.length > 0 && (
                    <span className="ml-1 text-indigo-500">({subscriberGraphData.length} months)</span>
                  )}
                </p>
              </div>
              {subscriberGraphData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-text/30 text-sm">
                  No installation data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={subscriberGraphData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [value, 'New Installs']}
                    />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} name="count" />
                    <Brush dataKey="label" height={20} stroke="var(--color-border)" fill="var(--color-background)" travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text">Recent E-Load Transactions</h2>
                <p className="text-xs text-text/40 mt-0.5">
                  Latest {recentEloadTransactions.length} transactions
                </p>
              </div>
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-text/40 border-b border-border">
                      <th className="pb-2 font-medium">Account #</th>
                      <th className="pb-2 font-medium">Loaded by</th>
                      <th className="pb-2 font-medium">GCash Reference</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEloadTransactions.map((t, i) => (
                      <tr key={t.id || i} className="border-b border-border/30 hover:bg-primary/5">
                        <td className="py-2 font-medium text-text">{t.accountNo || 'N/A'}</td>
                        <td className="py-2 text-text/60">{t.gcashAcct || 'N/A'}</td>
                        <td className="py-2 text-text/60 font-mono text-xs">{t.gcashReference || '-'}</td>
                        <td className="py-2 text-text/60 text-right">{formatCurrency(parseNum(t.amount))}</td>
                      </tr>
                    ))}
                    {recentEloadTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text/40">No E-Load transactions yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text">Clawback Report</h2>
                <p className="text-xs text-text/40 mt-0.5">
                  Subscribers requiring attention
                </p>
              </div>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-text/40 border-b border-border">
                      <th className="pb-2 font-medium">Subscriber</th>
                      <th className="pb-2 font-medium">Account #</th>
                      <th className="pb-2 font-medium">Contact</th>
                      <th className="pb-2 font-medium">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clawbackSubscribers.map((inst, i) => (
                      <tr key={inst.id || i} onDoubleClick={() => setSelectedItem(inst)} className="border-b border-border/30 hover:bg-primary/5 cursor-pointer">
                        <td className="py-2 font-medium text-text">{inst.subscriberName || 'N/A'}</td>
                        <td className="py-2 text-text/60">{String(inst.accountNumber || '').replace(/\.0$/, '')}</td>
                        <td className="py-2 text-text/60">{inst.contactNumber1 || '-'}</td>
                        <td className="py-2 text-text/60 max-w-[150px] truncate">{inst.address || '-'}</td>
                      </tr>
                    ))}
                    {clawbackSubscribers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-text/40">No subscribers found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
            <Card className="relative p-5 bg-surface">
              <h2 className="text-lg font-semibold text-text mb-4">Latest Installations</h2>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-text/40 border-b border-border">
                      <th className="pb-2 font-medium">Subscriber</th>
                      <th className="pb-2 font-medium">Account #</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInstallations.map((inst, i) => (
                      <tr key={inst.id || i} onDoubleClick={() => setSelectedItem(inst)} className="border-b border-border/30 hover:bg-primary/5 cursor-pointer">
                        <td className="py-2 font-medium text-text">{inst.subscriberName || 'N/A'}</td>
                        <td className="py-2 text-text/60">{String(inst.accountNumber || '').replace(/\.0$/, '')}</td>
                        <td className="py-2 text-text/60">{formatDateDisplay(inst.dateInstalled)}</td>
                      </tr>
                    ))}
                    {recentInstallations.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-text/40">No installations yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{selectedItem.subscriberName}</h2>
                  <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-text/50">Account #</p><p className="font-medium">{String(selectedItem.accountNumber || '').replace(/\.0$/, '')}</p></div>
                  <div><p className="text-xs text-text/50">Date Installed</p><p className="font-medium">{formatDateDisplay(selectedItem.dateInstalled)}</p></div>
                  <div><p className="text-xs text-text/50">Contact</p><p className="font-medium">{selectedItem.contactNumber1 || '-'}</p></div>
                  <div><p className="text-xs text-text/50">Technician</p><p className="font-medium">{selectedItem.assignedTechnician || '-'}</p></div>
                  <div className="col-span-2"><p className="text-xs text-text/50">Address</p><p className="font-medium">{selectedItem.address || '-'}</p></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutWrapper>
  );
}