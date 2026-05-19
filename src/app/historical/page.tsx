'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useHistoricalDataStore } from '@/stores/historicalDataStore';
import { useELoadStore } from '@/stores/eloadStore';
import { HistoricalDataRow } from '@/lib/types';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateDisplay, formatTime } from '@/lib/utils';
import { normalizeAccountNumber } from '@/lib/mappers';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const tableColumns = [
  { key: 'dateInstalled', label: 'Date Installed', sortable: true },
  { key: 'accountNumber', label: 'Account Number', sortable: true },
  { key: 'subscriberName', label: 'Subscriber Name', sortable: true },
  { key: 'address', label: 'Address', sortable: false, width: 'w-[250px]' },
  { key: 'contactNumber1', label: 'Contact #1', sortable: false },
  { key: 'contactNumber2', label: 'Contact #2', sortable: false },
];

export default function HistoricalDataPage() {
  const { user } = useAuth();
  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN || user.role === UserRole.E_LOAD || user.role === UserRole.VIEW_ONLY);

  const { records, fetchRecords, isLoading, error, lastFetched } = useHistoricalDataStore();
  const { transactions, fetchTransactions } = useELoadStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [viewingRecord, setViewingRecord] = useState<HistoricalDataRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch eload transactions if not already loaded
  useEffect(() => {
    if (transactions.length === 0) {
      fetchTransactions();
    }
  }, [fetchTransactions, transactions.length]);

  // Fetch records on mount
  useEffect(() => {
    if (hasAccess && !lastFetched) {
      fetchRecords();
    }
  }, [hasAccess, fetchRecords, lastFetched]);

  // Extract available years from dates
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach(r => {
      if (r.dateInstalled) {
        try {
          const d = new Date(r.dateInstalled);
          if (!isNaN(d.getTime())) {
            years.add(String(d.getFullYear()));
          }
        } catch { /* ignore */ }
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let result = records;

    // Text search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.subscriberName || '').toLowerCase().includes(q) ||
        String(r.accountNumber || '').toLowerCase().includes(q) ||
        (r.joNumber || '').toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q) ||
        (r.contactNumber1 || '').includes(q) ||
        (r.contactNumber2 || '').includes(q) ||
        (r.gcashHandler || '').toLowerCase().includes(q) ||
        (r.gcashReference || '').toLowerCase().includes(q) ||
        (r.remarks || '').toLowerCase().includes(q)
      );
    }

    // Month filter
    if (monthFilter) {
      const monthIdx = parseInt(monthFilter);
      result = result.filter(r => {
        if (!r.dateInstalled) return false;
        try {
          const d = new Date(r.dateInstalled);
          return !isNaN(d.getTime()) && d.getMonth() === monthIdx;
        } catch { return false; }
      });
    }

    // Year filter
    if (yearFilter) {
      result = result.filter(r => {
        if (!r.dateInstalled) return false;
        try {
          const d = new Date(r.dateInstalled);
          return !isNaN(d.getTime()) && String(d.getFullYear()) === yearFilter;
        } catch { return false; }
      });
    }

    return result;
  }, [records, searchTerm, monthFilter, yearFilter]);

  const handleViewDetail = (record: HistoricalDataRow) => {
    setViewingRecord(record);
    setShowDetailModal(true);
  };

  // Get e-load transactions for the viewing account
  const accountEloadTransactions = useMemo(() => {
    if (!viewingRecord?.accountNumber) return [];
    const normalizedAcct = normalizeAccountNumber(viewingRecord.accountNumber);
    return transactions.filter(t => normalizeAccountNumber(t.accountNo || '') === normalizedAcct);
  }, [viewingRecord, transactions]);

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Access Denied">
          <Card>
            <p className="text-red-600 text-center py-4">You don&apos;t have permission to view this module.</p>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Historical Data" subtitle="Browse and search subscriber installation records">
        <div className="space-y-6">
          {/* Filter + Search bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, account, JO#, address, phone, GCash, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-primary/30 w-72"
                />
              </div>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text/50">{filteredRecords.length} records</span>
              {isLoading && !records.length && <span className="text-sm text-primary/60">Loading...</span>}
              {!isLoading && !records.length && (
                <button 
                  onClick={() => fetchRecords()} 
                  className="text-sm text-primary hover:underline"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Data Table */}
          <Card className="!p-0 overflow-hidden">
            {isLoading && !records.length ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-300">
                      {tableColumns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider select-none cursor-pointer hover:text-text ${col.width || ''}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        onDoubleClick={() => handleViewDetail(record)}
                        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm">{formatDateDisplay(record.dateInstalled || '')}</td>
                        <td className="px-4 py-3 text-sm font-mono">{String(record.accountNumber || '').replace(/\.0$/, '') || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium">{record.subscriberName || '-'}</td>
                        <td className="px-4 py-3 text-sm max-w-[250px] truncate">{record.address || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono">{record.contactNumber1 || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono">{record.contactNumber2 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecords.length === 0 && (
                  <div className="text-center py-12 text-text/40">
                    No records found matching your criteria
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {viewingRecord && showDetailModal && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDetailModal(false)}
            >
              <div
                className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{viewingRecord.subscriberName || 'Unknown Subscriber'}</h2>
                      <p className="text-white/70 text-sm">
                        Account #{String(viewingRecord.accountNumber || '').replace(/\.0$/, '')} &bull; JO# {viewingRecord.joNumber || 'N/A'}
                      </p>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Subscriber Information */}
                  <div>
                    <h3 className="font-semibold text-text uppercase tracking-wider mb-3 flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </span>
                      Subscriber Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: 'Subscriber Name', value: viewingRecord.subscriberName },
                        { label: 'Account Number', value: String(viewingRecord.accountNumber || '').replace(/\.0$/, '') },
                        { label: 'Date Installed', value: formatDateDisplay(viewingRecord.dateInstalled || '') },
                        { label: 'Address', value: viewingRecord.address, span2: true },
                        { label: 'Contact #1', value: viewingRecord.contactNumber1 },
                        { label: 'Contact #2', value: viewingRecord.contactNumber2 },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-lg p-3 border border-border bg-background/50 ${item.span2 ? 'col-span-2' : ''}`}>
                          <p className="text-xs text-text/40 mb-1">{item.label}</p>
                          <p className="font-medium text-text">{item.value || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* E-Load Transactions List */}
                  <div>
                    <h3 className="font-semibold text-text uppercase tracking-wider mb-3 flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-purple-500/15 flex items-center justify-center">
                        <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </span>
                      E-Load Transactions ({accountEloadTransactions.length})
                    </h3>
                    {accountEloadTransactions.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {accountEloadTransactions.map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-3 border border-border bg-background/50 rounded-lg text-sm">
                            <div className="flex-1">
                              <span className="text-text/60">{formatDateDisplay(t.dateLoaded || '')}</span>
                            </div>
                            <div className="flex-1 text-center">
                              <span className="font-medium text-emerald-600">₱{(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex-1 text-center">
                              <span className="font-mono text-text/70">{t.gcashAcct || '-'}</span>
                            </div>
                            <div className="flex-1 text-right">
                              <span className="text-text/50 text-xs">{t.remarks || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text/40">No e-load transactions found for this account.</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowDetailModal(false)} className="flex-1">Close</Button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </PageContainer>
    </LayoutWrapper>
  );
}