'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useELoadStore } from '@/stores/eloadStore';
import { ELoadTransaction } from '@/lib/types';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateDisplay, formatDate, formatTime } from '@/lib/utils';
import { useTableConfig, sortData, ColumnDef } from '@/hooks/useTableConfig';
import { ColumnConfigPanel } from '@/components/common/ColumnConfigPanel';
import { useQuickAction } from '@/hooks/useQuickAction';

type DateFilter = 'all' | 'today' | '7days' | '30days';

// Amount → computed values lookup (corrected values)
const AMOUNT_INCENTIVE_MAP: Record<number, { markedUp: number; retailer: number; dealer: number; incentive: number }> = {
  700: { markedUp: 10, retailer: 28, dealer: 21, incentive: 49 },
  300: { markedUp: 10, retailer: 15.2, dealer: 11.4, incentive: 26.6 },
  200: { markedUp: 19, retailer: 8, dealer: 6, incentive: 14 },
  50:  { markedUp: 5,  retailer: 2, dealer: 1.5, incentive: 3.5 },
};
const AMOUNT_OPTIONS = [50, 200, 300, 700];
const AMOUNT_LABELS: Record<number, string> = {
  50:  '50 (1 DAY)',
  200: '200 (7 DAYS)',
  300: '300 (15 DAYS)',
  700: '700 (30 DAYS)',
};

const eloadColumns: ColumnDef<ELoadTransaction>[] = [
  { key: 'gcashAcct', label: 'Service', sortable: true, sortValue: (r) => r.gcashAcct || '', render: (r) => r.gcashAcct || '-', className: 'text-left whitespace-nowrap font-mono' },
  { key: 'dateLoaded', label: 'Date', sortable: true, sortValue: (r) => r.dateLoaded || '', render: (r) => formatDateDisplay(r.dateLoaded || ''), className: 'text-left whitespace-nowrap' },
  { key: 'amount', label: 'Amount', sortable: true, sortValue: (r) => String(r.amount || 0), render: (r) => <span className="font-semibold text-emerald-600">₱{(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>, className: 'text-left whitespace-nowrap' },
  { key: 'gcashReference', label: 'GCash Reference', sortable: true, sortValue: (r) => r.gcashReference || '', render: (r) => r.gcashReference || '-', className: 'text-left whitespace-nowrap font-mono text-xs' },
  { key: 'accountNo', label: 'Account', sortable: true, sortValue: (r) => r.accountNo || '', render: (r) => r.accountNo || '-', className: 'text-left whitespace-nowrap' },
  { key: 'remarks', label: 'Remarks', sortable: true, sortValue: (r) => r.remarks || '', render: (r) => r.remarks || '-', className: 'text-left whitespace-nowrap' },
];

export default function ELoadPage() {
  const { user } = useAuth();
  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.E_LOAD);
  
  const { transactions, isLoading, isSubmitting, addTransaction, updateTransaction, deleteTransaction, fetchTransactions: fetchFromStore } = useELoadStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = useCallback(async () => {
    const state = useELoadStore.getState();
    if (state.isLoading) return;
    const now = Date.now();
    if (state.lastFetched && (now - state.lastFetched) < 120000 && state.transactions.length > 0) return;
    await fetchFromStore();
  }, [fetchFromStore]);

  useEffect(() => {
    if (hasAccess) fetchTransactions();
  }, [hasAccess, fetchTransactions]);

  const { openNewELoad, setOpenNewELoad: setQuickOpenELoad } = useQuickAction();
  const [showForm, setShowForm] = useState(false);
  const prevOpenNewELoad = useRef<boolean | null>(null);

  useEffect(() => {
    if (openNewELoad && prevOpenNewELoad.current !== true) {
      setShowForm(true);
      setQuickOpenELoad(false);
    }
    prevOpenNewELoad.current = openNewELoad;
  }, [openNewELoad, setQuickOpenELoad]);

  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);
  const sevenDaysAgo = new Date(todayDate.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(todayDate.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const tableConfig = useTableConfig<ELoadTransaction>('eload', eloadColumns);
  const { config, visibleColumns, toggleColumn, moveColumn, toggleSort, resetConfig } = tableConfig;

  const dateFilteredTransactions = useMemo(() => {
    if (dateFilter === 'all') return transactions;
    return transactions.filter(t => {
      const d = t.dateLoaded || '';
      if (!d) return false;
      // Normalize to YYYY-MM-DD for reliable comparison
      const normalized = d.includes('/') 
        ? new Date(d).toISOString().split('T')[0] 
        : d.split('T')[0];
      if (dateFilter === 'today') return normalized === today;
      if (dateFilter === '7days') return normalized >= sevenDaysAgo && normalized <= today;
      if (dateFilter === '30days') return normalized >= thirtyDaysAgo && normalized <= today;
      return true;
    });
  }, [transactions, dateFilter, today, sevenDaysAgo, thirtyDaysAgo]);

  const filteredTransactions = useMemo(() => {
    let result = dateFilteredTransactions;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        (t.gcashAcct || '').toLowerCase().includes(q) ||
        (t.accountNo || '').toLowerCase().includes(q) ||
        (t.gcashReference || '').toLowerCase().includes(q) ||
        (t.remarks || '').toLowerCase().includes(q) ||
        String(t.incentive || '').includes(q)
      );
    }
    return sortData(result, config.sortKey, config.sortDirection, eloadColumns);
  }, [dateFilteredTransactions, searchTerm, config.sortKey, config.sortDirection]);

  const [editingTransaction, setEditingTransaction] = useState<ELoadTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<ELoadTransaction | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ELoadTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refDuplicateError, setRefDuplicateError] = useState<string>('');
  const [formData, setFormData] = useState({
    gcashAcct: '',
    dateLoaded: new Date().toISOString().split('T')[0],
    gcashReference: '',
    time: new Date().toTimeString().slice(0, 5),
    amount: 700,
    accountNo: '',
    remarks: '',
    markedUp: AMOUNT_INCENTIVE_MAP[700].markedUp,
    retailer: AMOUNT_INCENTIVE_MAP[700].retailer,
    dealer: AMOUNT_INCENTIVE_MAP[700].dealer,
    incentive: AMOUNT_INCENTIVE_MAP[700].incentive,
  });

  // When amount changes, auto-compute incentive/retailer/dealer/markedUp
  const handleAmountChange = (amt: number) => {
    const computed = AMOUNT_INCENTIVE_MAP[amt] || { markedUp: 0, retailer: 0, dealer: 0, incentive: 0 };
    setFormData(prev => ({ ...prev, amount: amt, markedUp: computed.markedUp, retailer: computed.retailer, dealer: computed.dealer, incentive: computed.incentive }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Duplicate reference check (only for new transactions, not edits)
    const isEditing = !!(editingTransaction && editingTransaction.id);
    if (!isEditing && formData.gcashReference) {
      const duplicate = transactions.find(
        t => t.gcashReference && t.gcashReference === formData.gcashReference
      );
      if (duplicate) {
        setRefDuplicateError(`Reference "${formData.gcashReference}" already exists.`);
        return;
      }
    }

    const transactionData = {
      gcashAcct: formData.gcashAcct,
      dateLoaded: formData.dateLoaded,
      gcashReference: formData.gcashReference,
      time: formData.time,
      amount: formData.amount,
      accountNo: formData.accountNo,
      remarks: formData.remarks,
      markedUp: formData.markedUp,
      retailer: formData.retailer,
      dealer: formData.dealer,
      incentive: formData.incentive,
    };

    setShowForm(false);
    setEditingTransaction(null);
    setRefDuplicateError('');
    setFormData({
      gcashAcct: '',
      dateLoaded: new Date().toISOString().split('T')[0],
      gcashReference: '',
      time: new Date().toTimeString().slice(0, 5),
      amount: 700,
      accountNo: '',
      remarks: '',
      markedUp: AMOUNT_INCENTIVE_MAP[700].markedUp,
      retailer: AMOUNT_INCENTIVE_MAP[700].retailer,
      dealer: AMOUNT_INCENTIVE_MAP[700].dealer,
      incentive: AMOUNT_INCENTIVE_MAP[700].incentive,
    });

    if (isEditing) {
      await updateTransaction(editingTransaction!.id!, transactionData);
    } else {
      await addTransaction(transactionData);
      // Show success toast for new entries
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    await deleteTransaction(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    setViewingTransaction(null);
  };

  const parseNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + parseNum(t.amount), 0);
  const uniqueAccounts = new Set(filteredTransactions.map(t => t.accountNo)).size;
  const totalIncentive = filteredTransactions.reduce((sum, t) => sum + parseNum(t.incentive), 0);

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Access Denied">
          <Card>
            <p className="text-red-600 text-center py-4">You don&apos;t have access to this module. Only Admins and E-Load staff can access it.</p>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="E-Load System" subtitle="Track GCash loads and prepaid transactions">
        <div className="space-y-6">
          {/* Filter + Search + Actions bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-3 py-2 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search GCash, account, ref, remarks, incentive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
                />
              </div>
              <ColumnConfigPanel
                columns={eloadColumns}
                config={config}
                onToggleColumn={toggleColumn}
                onMoveColumn={moveColumn}
                onReset={resetConfig}
              />
            </div>
            <Button onClick={() => setShowForm(true)}>+ Add E-Load</Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-xs text-text/40 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-text mt-1">{filteredTransactions.length}</p>
              <p className="text-xs text-emerald-500 mt-1">₱{totalAmount.toLocaleString()}</p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-text/40 uppercase tracking-wider">Accounts</p>
              <p className="text-2xl font-bold text-text mt-1">{uniqueAccounts}</p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-text/40 uppercase tracking-wider">Total Incentive</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">₱{totalIncentive.toLocaleString()}</p>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="!p-0 overflow-hidden">
            {isLoading && transactions.length === 0 ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-300">
                      {visibleColumns.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => col.sortable && toggleSort(col.key)}
                          className={`px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider select-none ${col.sortable ? 'cursor-pointer hover:text-text' : ''}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {col.sortable && config.sortKey === col.key && (
                              <svg className={`w-3 h-3 transition-transform ${config.sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                            {col.sortable && config.sortKey !== col.key && (
                              <svg className="w-3 h-3 text-text/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        onDoubleClick={() => setViewingTransaction(transaction)}
                        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        {visibleColumns.map((col) => (
                          <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                            {col.render(transaction)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-text/40">
                    {isLoading ? 'Loading transactions...' : 'No transactions found'}
                  </div>
                )}
              </div>
            )}
            {filteredTransactions.length > 0 && (
              <div className="px-4 py-3 border-t border-border/50 text-xs text-text/40 text-center">
                Double-click a row to view full details
              </div>
            )}
          </Card>
        </div>

        {/* View Detail Modal */}
        {viewingTransaction && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setViewingTransaction(null)}
          >
            <div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">₱{(viewingTransaction.amount || 0).toLocaleString()}</h2>
                      <p className="text-white/70 text-sm">{formatDate(viewingTransaction.dateLoaded || '')} at {formatTime(viewingTransaction.time || '')}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingTransaction(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-3 border border-border bg-emerald-500/5">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">GCash Account</p>
                    <p className="font-mono font-medium text-text">{viewingTransaction.gcashAcct || '-'}</p>
                  </div>
                  <div className="rounded-xl p-3 border border-border bg-blue-500/5">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">Account No.</p>
                    <p className="font-mono font-medium text-text">{viewingTransaction.accountNo || '-'}</p>
                  </div>
                  <div className="rounded-xl p-3 border border-border bg-purple-500/5 col-span-2">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">Reference</p>
                    <p className="font-mono font-medium text-text text-sm break-all">{viewingTransaction.gcashReference || '-'}</p>
                  </div>
                  <div className="rounded-xl p-3 border border-border bg-slate-500/5">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">Time</p>
                    <p className="font-medium text-text">{formatTime(viewingTransaction.time || '')}</p>
                  </div>
                  <div className="rounded-xl p-3 border border-border bg-emerald-500/5">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">Amount</p>
                    <p className="font-semibold text-emerald-600">₱{(viewingTransaction.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {viewingTransaction.accountNo && (
                  <div className="rounded-xl p-3 border border-border">
                    <p className="text-xs text-text/40 uppercase tracking-wider mb-1">Load History for this Account</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {transactions
                        .filter(t => t.accountNo === viewingTransaction.accountNo)
                        .slice(0, 10)
                        .map(t => (
                          <div key={t.id} className="flex justify-between text-sm">
                            <span className="text-text/60">{formatDateDisplay(t.dateLoaded || '')} {formatTime(t.time || '')}</span>
                            <span className="font-medium text-emerald-600">₱{(t.amount || 0).toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border flex gap-3">
                {user?.role === UserRole.ADMIN && (
                  <>
                    <Button onClick={() => {
                      setViewingTransaction(null);
                      setEditingTransaction(viewingTransaction);
                      const amt = viewingTransaction.amount || 710;
                      const computed = AMOUNT_INCENTIVE_MAP[amt] || { markedUp: viewingTransaction.markedUp || 0, retailer: viewingTransaction.retailer || 0, dealer: viewingTransaction.dealer || 0, incentive: viewingTransaction.incentive || 0 };
setFormData({
                        ...formData,
                        gcashAcct: viewingTransaction.gcashAcct || '',
                        dateLoaded: viewingTransaction.dateLoaded || new Date().toISOString().split('T')[0],
                        gcashReference: viewingTransaction.gcashReference || '',
                        time: viewingTransaction.time || '',
                        amount: amt,
                        accountNo: viewingTransaction.accountNo || '',
                        remarks: viewingTransaction.remarks || '',
                        markedUp: viewingTransaction.markedUp ?? computed.markedUp,
                        retailer: viewingTransaction.retailer ?? computed.retailer,
                        dealer: viewingTransaction.dealer ?? computed.dealer,
                        incentive: viewingTransaction.incentive ?? computed.incentive,
                      });
                      setShowForm(true);
                    }} variant="secondary" className="flex-1">Edit</Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(viewingTransaction)} className="flex-1">Delete</Button>
                  </>
                )}
                <Button onClick={() => setViewingTransaction(null)} className="flex-1">Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowForm(false); setEditingTransaction(null); setRefDuplicateError(''); }}
          >
            <div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{editingTransaction ? 'Edit Transaction' : 'Add E-Load'}</h3>
                  <button onClick={() => { setShowForm(false); setEditingTransaction(null); setRefDuplicateError(''); }} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">GCash Account</label>
                    <input type="text" value={formData.gcashAcct} onChange={(e) => setFormData({ ...formData, gcashAcct: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="09123456789" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Account No.</label>
                    <input type="text" value={formData.accountNo} onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="SUB001" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Date</label>
                    <input type="date" value={formData.dateLoaded} onChange={(e) => setFormData({ ...formData, dateLoaded: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Time</label>
                    <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Reference</label>
                    <input type="text" value={formData.gcashReference} onChange={(e) => { setFormData({ ...formData, gcashReference: e.target.value }); setRefDuplicateError(''); }} className={`w-full px-3 py-2.5 rounded-xl bg-background border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${refDuplicateError ? 'border-red-500 focus:ring-red-500/30' : 'border-border'}`} placeholder="REF123456789" required />
                    {refDuplicateError && (
                      <p className="mt-1 text-xs text-red-500">{refDuplicateError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Amount (₱)</label>
                    <select
                      value={formData.amount}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    >
                      {AMOUNT_OPTIONS.map(amt => (
                        <option key={amt} value={amt}>{AMOUNT_LABELS[amt]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Remarks</label>
                  <input type="text" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. TOPER" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : editingTransaction ? 'Update' : 'Add'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setShowForm(false); setEditingTransaction(null); setRefDuplicateError(''); }} className="flex-1">Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-text mb-1">Delete Transaction?</h3>
                <p className="text-text/50 text-sm mb-1">
                  ₱{(deleteTarget.amount || 0).toLocaleString()} — {deleteTarget.gcashAcct}
                </p>
                 <p className="text-text/40 text-xs mb-6">This will remove the record from the site and cloud database (Supabase). This cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text/70 hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Deleting...
                      </>
                    ) : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 z-50"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">E-Load transaction added!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutWrapper>
  );
}

