'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { motion } from 'framer-motion';
import { localDb } from '@/lib/database';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReportTab = 'subscriber' | 'eload';
type ELoadPeriod = 'daily' | 'monthly' | 'yearly';

interface ELoadRow {
id: string;
gcashAccount: string;
dateLoaded?: string;
date_loaded?: string;
gcashReference: string;
timeLoaded: string;
amount: number;
accountNumber: string;
remarks?: string;
markedUp?: number;
marked_up?: number;
incentive?: number;
retailer?: number;
dealer?: number;
createdAt: string;
updatedAt: string;
}

interface ELoadStats {
  totalLoads: number;
  totalAmount: number;
  totalIncentive: number;
  totalMarkedUp: number;
}

interface Installation {
  id: string;
  no: string;
  dateInstalled: string;
  subscriberName: string;
  accountNumber: string;
  contactNumber1: string;
  address: string;
  assignedTechnician: string;
  status: string;
  created_at?: string;
}

interface DailyStats {
  date: string;
  total: number;
  completed: number;
  pending: number;
}

// Amount → computed values lookup
const AMOUNT_COMPUTED: Record<number, { markedUp: number; retailer: number; dealer: number; incentive: number }> = {
  700: { markedUp: 10, retailer: 28,   dealer: 21,  incentive: 49   },
  300: { markedUp: 10, retailer: 15.2, dealer: 11.4, incentive: 26.6 },
  200: { markedUp: 19, retailer: 8,    dealer: 6,   incentive: 14   },
  50:  { markedUp: 5,  retailer: 2,    dealer: 1.5, incentive: 3.5  },
};

function normalizeDate(dateStr: string | number): string {
  if (!dateStr && dateStr !== 0) return '';
  
  let date: Date | null = null;
  
  // Excel serial date (number like 45325)
  if (typeof dateStr === 'number' || /^\d{5,6}$/.test(String(dateStr).trim())) {
    const serial = typeof dateStr === 'number' ? dateStr : parseInt(String(dateStr).trim());
    date = new Date((serial - 25569) * 86400 * 1000);
  } else {
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      date = new Date(s.split('T')[0]);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
      try { date = new Date(s); } catch { return ''; }
    } else if (s.includes(' ')) {
      try { date = new Date(s); } catch { return ''; }
    }
  }
  
  if (!date || isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function applyFormula(record: ELoadRow): { markedUp: number; retailer: number; dealer: number; incentive: number } {
  // If stored values are present and non-zero, use them
  if (record.incentive && record.retailer && record.dealer && record.marked_up) {
    return {
      markedUp: parseFloat(String(record.marked_up)) || 0,
      retailer: parseFloat(String(record.retailer)) || 0,
      dealer: parseFloat(String(record.dealer)) || 0,
      incentive: parseFloat(String(record.incentive)) || 0,
    };
  }
  const amt = parseFloat(String(record.amount)) || 0;
  if (AMOUNT_COMPUTED[amt]) return AMOUNT_COMPUTED[amt];
  // Fuzzy match for old amounts (55→50, 210→200, 390→300, 710→700)
  const amounts = Object.keys(AMOUNT_COMPUTED).map(Number);
  const closest = amounts.reduce((prev, curr) =>
    Math.abs(curr - amt) < Math.abs(prev - amt) ? curr : prev
  );
  if (Math.abs(closest - amt) <= 15) return AMOUNT_COMPUTED[closest];
  return { markedUp: 0, retailer: 0, dealer: 0, incentive: 0 };
}

function formatDisplayDate(dateStr: string | number | undefined): string {
  if (!dateStr && dateStr !== 0) return '-';
  try {
    const s = String(dateStr).trim();
    if (!s) return '-';
    const num = parseInt(s, 10);
    if (!isNaN(num) && num > 25569 && num < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + num * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    const d = new Date(s.split('T')[0] + 'T00:00:00');
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return String(dateStr); }
}

export default function ReportingPage() {
  const { user } = useAuth();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [historicalData, setHistoricalData] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('subscriber');
  const [eloadPeriod, setEloadPeriod] = useState<ELoadPeriod>('monthly');
  const [eloadSelectedDate, setEloadSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [eloadRecords, setEloadRecords] = useState<ELoadRow[]>([]);
  const [eloadLoading, setEloadLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.VIEW_ONLY || user.role === UserRole.TECHNICIAN);

  const fetchInstallations = useCallback(async () => {
    try {
      // Fetch from both installations and historicaldata tables
      const [installData, historicalDataRaw] = await Promise.all([
        localDb.getAll<Record<string, unknown>>('installations'),
        localDb.getAll<Record<string, unknown>>('historicaldata')
      ]);
      
      const mappedInstall = installData.map((inst: Record<string, unknown>) => ({
        id: String(inst.id ?? ''),
        no: String(inst.no ?? ''),
        dateInstalled: (String(inst.dateInstalled ?? '') || '').split('T')[0],
        subscriberName: String(inst.subscriberName ?? ''),
        accountNumber: String(inst.accountNumber ?? '').replace(/\.0$/, ''),
        contactNumber1: String(inst.contactNumber1 ?? ''),
        address: String(inst.address ?? ''),
        assignedTechnician: String(inst.assignedTechnician ?? ''),
        status: String(inst.status ?? 'pending'),
        created_at: String(inst.created_at ?? ''),
      }));
      
const mappedHistorical = historicalDataRaw.map((inst: Record<string, unknown>) => ({
        id: String(inst.id ?? ''),
        no: String(inst.joNumber ?? ''),
        dateInstalled: (String(inst.dateInstalled ?? '') || '').split('T')[0],
        subscriberName: String(inst.subscriberName ?? ''),
        accountNumber: String(inst.accountNumber ?? '').replace(/\.0$/, ''),
        contactNumber1: String(inst.contactNumber1 ?? ''),
        address: String(inst.address ?? ''),
        assignedTechnician: String(inst.assignedTechnician ?? ''),
        status: String(inst.status ?? 'completed'),
        created_at: String(inst.createdAt ?? ''),
      }));
      
      setInstallations([...mappedInstall, ...mappedHistorical]);
      setHistoricalData(mappedHistorical);
    } catch (err) {
      console.error('Error fetching installations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchELoadRecords = useCallback(async () => {
    setEloadLoading(true);
    try {
      const data = await localDb.getAll<ELoadRow>('eload');
      const processed = data.map(record => {
        const computed = applyFormula(record);
        // Store date in both camelCase and snake_case for easier filtering
        const normalizedDate = normalizeDate(record.date_loaded || record.dateLoaded || '');
        return {
          ...record,
          amount: parseFloat(String(record.amount)) || 0,
          marked_up: computed.markedUp,
          incentive: computed.incentive,
          retailer: computed.retailer,
          dealer: computed.dealer,
          date_loaded: normalizedDate,
          dateLoaded: normalizedDate, // camelCase for easier access
        };
      });
      setEloadRecords(processed);
    } catch (err) {
      console.error('Error fetching E-Load records:', err);
    } finally {
      setEloadLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchInstallations(); }, [fetchInstallations]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeReportTab === 'eload') fetchELoadRecords(); }, [activeReportTab, fetchELoadRecords]);

  useEffect(() => {
    const handleSync = () => { fetchInstallations(); if (activeReportTab === 'eload') fetchELoadRecords(); };
    window.addEventListener('db-synced', handleSync);
    return () => window.removeEventListener('db-synced', handleSync);
  }, [activeReportTab, fetchInstallations, fetchELoadRecords]);

  // ── Subscriber date range ──────────────────────────────────────────────────
  const getDateRange = useMemo(() => {
    const now = new Date(selectedDate);
    let startDate: Date, endDate: Date, label: string;
    switch (period) {
      case 'daily':
        startDate = new Date(now); endDate = new Date(now);
        label = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        break;
      case 'weekly': {
        startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay());
        endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
        label = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        break;
      }
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        label = now.getFullYear().toString();
    }
    return { startDate, endDate, label };
  }, [period, selectedDate]);

  // ── E-Load date range ──────────────────────────────────────────────────────
  const getELoadDateRange = useMemo(() => {
    const now = new Date(eloadSelectedDate);
    let startDate: Date, endDate: Date, label: string;
    switch (eloadPeriod) {
      case 'daily':
        startDate = new Date(now); endDate = new Date(now);
        label = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        label = now.getFullYear().toString();
    }
    return { startDate, endDate, label };
  }, [eloadPeriod, eloadSelectedDate]);

  const filteredInstallations = useMemo(() => {
    return installations.filter(inst => {
      const raw = inst.dateInstalled as string | number;
      if (!raw && raw !== 0) return false;
      let date: Date | null = null;
      
      if (typeof raw === 'number' || /^\d{5,6}$/.test(String(raw).trim())) {
        const serial = typeof raw === 'number' ? raw : parseInt(String(raw).trim());
        date = new Date((serial - 25569) * 86400 * 1000);
      } else {
        const s = String(raw).trim();
        if (s.includes('T')) {
          date = new Date(s.split('T')[0]);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          date = new Date(s);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const [m, d, y] = s.split('/');
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else if (s.includes(' ')) {
          const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
          date = new Date(datePart);
        }
      }
      
      if (!date || isNaN(date.getTime())) return false;
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return dateOnly >= getDateRange.startDate && dateOnly <= getDateRange.endDate;
    });
  }, [installations, getDateRange]);

  const stats = useMemo(() => {
    const total = filteredInstallations.length;
    const completed = filteredInstallations.filter(i => i.status === 'completed').length;
    const pending = filteredInstallations.filter(i => i.status === 'pending').length;
    return { total, completed, pending };
  }, [filteredInstallations]);

  

  const filteredELoadRecords = useMemo(() => {
    return eloadRecords.filter(r => {
      // Handle both camelCase (from store) and snake_case (from DB)
      const raw = (r.dateLoaded || r.date_loaded) as string | number | undefined;
      if (!raw && raw !== 0) return false;
      let date: Date | null = null;
      
      if (typeof raw === 'number' || /^\d{5,6}$/.test(String(raw).trim())) {
        const serial = typeof raw === 'number' ? raw : parseInt(String(raw).trim());
        date = new Date((serial - 25569) * 86400 * 1000);
      } else {
        const s = String(raw).trim();
        if (s.includes('T')) {
          date = new Date(s.split('T')[0]);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          date = new Date(s);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const [m, d, y] = s.split('/');
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else if (s.includes(' ')) {
          const datePart = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
          date = new Date(datePart);
        }
      }
      
      if (!date || isNaN(date.getTime())) return false;
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return dateOnly >= getELoadDateRange.startDate && dateOnly <= getELoadDateRange.endDate;
    });
  }, [eloadRecords, getELoadDateRange]);

const eloadStats = useMemo((): ELoadStats => {
let totalLoads = 0, totalAmount = 0, totalIncentive = 0, totalMarkedUp = 0;
filteredELoadRecords.forEach(r => {
totalLoads++;
totalAmount += parseFloat(String(r.amount)) || 0;
totalIncentive += parseFloat(String(r.incentive)) || 0;
totalMarkedUp += parseFloat(String(r.markedUp ?? r.marked_up)) || 0;
});
return { totalLoads, totalAmount, totalIncentive, totalMarkedUp };
}, [filteredELoadRecords]);

  const navigateDate = (dir: number) => {
    const c = new Date(selectedDate);
    if (period === 'daily') c.setDate(c.getDate() + dir);
    else if (period === 'weekly') c.setDate(c.getDate() + dir * 7);
    else if (period === 'monthly') c.setMonth(c.getMonth() + dir);
    else c.setFullYear(c.getFullYear() + dir);
    setSelectedDate(c.toISOString().split('T')[0]);
  };

  const navigateELoadPeriod = (dir: number) => {
    const c = new Date(eloadSelectedDate);
    if (eloadPeriod === 'daily') c.setDate(c.getDate() + dir);
    else if (eloadPeriod === 'monthly') c.setMonth(c.getMonth() + dir);
    else c.setFullYear(c.getFullYear() + dir);
    setEloadSelectedDate(c.toISOString().split('T')[0]);
  };

  const handlePrint = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head><title>3EJS Report</title>
      <style>body{font-family:sans-serif;padding:24px;color:#1e293b}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:center;font-size:13px}th{background:#f8fafc;font-weight:600}
      h1{font-size:22px;margin-bottom:4px}.footer{margin-top:24px;font-size:11px;color:#94a3b8}</style>
      </head><body>
      <h1>3EJS Tech — ${activeReportTab === 'eload' ? 'E-Load' : 'Subscriber'} Report</h1>
      <p style="color:#64748b;font-size:14px;">${activeReportTab === 'eload' ? getELoadDateRange.label : getDateRange.label}</p>
      ${activeReportTab === 'eload' ? `
        <div style="display:flex;gap:24px;margin:16px 0;">
          <div><strong>${eloadStats.totalLoads}</strong> Loads</div>
          <div><strong>₱${eloadStats.totalAmount.toLocaleString()}</strong> Amount</div>
          <div><strong>₱${eloadStats.totalIncentive.toLocaleString()}</strong> Incentive</div>
          <div><strong>₱${eloadStats.totalMarkedUp.toLocaleString()}</strong> Marked Up</div>
        </div>
<table><thead><tr><th>Date</th><th>GCash Account</th><th>Account No.</th><th>Amount</th></tr></thead>
<tbody>${filteredELoadRecords.map(r => `<tr>
<td>${formatDisplayDate(r.dateLoaded || '')}</td>
<td>${r.gcashAccount || '-'}</td>
<td>${String(r.accountNumber || '').replace(/\.0$/, '')}</td>
<td>₱${(parseFloat(String(r.amount)) || 0).toLocaleString()}</td>
</tr>`).join('')}</tbody></table>
      ` : `
        <div style="display:flex;gap:24px;margin:16px 0;">
          <div><strong>${stats.total}</strong> Total</div>
          <div><strong>${stats.completed}</strong> Completed</div>
          <div><strong>${stats.pending}</strong> Pending</div>
        </div>
        <table><thead><tr><th>Date</th><th>Subscriber</th><th>Account</th><th>Address</th><th>Contact</th></tr></thead>
        <tbody>${filteredInstallations.map(i => `<tr>
          <td>${formatDisplayDate(i.dateInstalled)}</td>
          <td>${i.subscriberName || '-'}</td>
          <td>${i.accountNumber || '-'}</td>
          <td>${i.address || '-'}</td>
          <td>${i.contactNumber1 || '-'}</td>
        </tr>`).join('')}</tbody></table>
      `}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | 3EJS Tech Reports</p>
      </body></html>`);
    pw.document.close();
    pw.print();
  };

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Reports" subtitle="Analytics and statistics">
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-text">Access Denied</h3>
              <p className="text-text/50 mt-2">You don&apos;t have permission to view reports.</p>
            </div>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Reports" subtitle="Analytics and statistics">

        {/* Tab Switcher */}
        <Card className="!p-3 mb-6">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['subscriber', 'eload'] as ReportTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveReportTab(tab)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 border-0 ${
                  activeReportTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-text/60 hover:bg-slate-200'
                }`}>
                {tab === 'subscriber' ? 'Subscriber Report' : 'E-Load Report'}
              </button>
            ))}
          </div>
        </Card>

        {/* ── SUBSCRIBER REPORT ─────────────────────────────────────────────── */}
        {activeReportTab === 'subscriber' && (
          <div className="space-y-6" ref={printRef}>
            {/* Controls */}
            <Card className="!p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex bg-slate-100 rounded-xl p-1">
                  {(['daily','weekly','monthly','yearly'] as ReportPeriod[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-0 ${period === p ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-text/60 hover:bg-slate-200'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg border border-border hover:bg-background border-0">
                    <svg className="w-5 h-5 text-text/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border text-text text-sm" />
                  <button onClick={() => navigateDate(1)} className="p-2 rounded-lg border border-border hover:bg-background border-0">
                    <svg className="w-5 h-5 text-text/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium flex items-center gap-2 border-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print
                  </button>
                </div>
              </div>
            </Card>

            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{getDateRange.label}</h2>
            </div>

            {/* Installation Records Table */}
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-base font-bold text-text">Installation Records</h3>
              </div>
              {loading ? <div className="text-center py-8 text-text/40">Loading...</div>
                : filteredInstallations.length === 0 ? <div className="text-center py-8 text-text/40">No installations found for this period</div>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-background">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider">Subscriber</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider">Account</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider">Address</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInstallations.slice(0, 50).map((inst) => (
                          <tr key={inst.id} className="border-b border-border/50 hover:bg-background transition-colors">
                            <td className="px-4 py-3 text-sm text-text/70 text-left">{formatDisplayDate(inst.dateInstalled)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-text text-left">{inst.subscriberName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-text/70 font-mono text-left">{inst.accountNumber || '-'}</td>
                            <td className="px-4 py-3 text-sm text-text/70 text-left">{inst.address || '-'}</td>
                            <td className="px-4 py-3 text-sm text-text/70 text-left">{inst.contactNumber1 || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredInstallations.length > 50 && (
                      <p className="text-center text-xs text-text/40 py-3">Showing 50 of {filteredInstallations.length} records</p>
                    )}
                  </div>
                )}
            </Card>
          </div>
        )}

        {/* ── E-LOAD REPORT ─────────────────────────────────────────────────── */}
        {activeReportTab === 'eload' && (
          <div className="space-y-6">
            {/* Controls */}
            <Card className="!p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex bg-slate-100 rounded-xl p-1">
                  {(['daily','monthly','yearly'] as ELoadPeriod[]).map(p => (
                    <button key={p} onClick={() => setEloadPeriod(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-0 ${eloadPeriod === p ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-text/60 hover:bg-slate-200'}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigateELoadPeriod(-1)} className="p-2 rounded-lg border border-border hover:bg-background border-0">
                    <svg className="w-5 h-5 text-text/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <input type="date" value={eloadSelectedDate} onChange={e => setEloadSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border text-text text-sm" />
                  <button onClick={() => navigateELoadPeriod(1)} className="p-2 rounded-lg border border-border hover:bg-background border-0">
                    <svg className="w-5 h-5 text-text/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium flex items-center gap-2 border-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print
                  </button>
                </div>
              </div>
            </Card>

            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                E-Load Report — {getELoadDateRange.label}
              </h2>
            </div>

            {/* E-Load Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Loads', value: eloadStats.totalLoads, color: 'text-blue-500', prefix: '' },
                { label: 'Total Amount', value: eloadStats.totalAmount.toLocaleString(), color: 'text-emerald-500', prefix: '₱' },
                { label: 'Total Incentive', value: eloadStats.totalIncentive.toLocaleString(), color: 'text-purple-500', prefix: '₱' },
                { label: 'Total Marked Up', value: eloadStats.totalMarkedUp.toLocaleString(), color: 'text-orange-500', prefix: '₱' },
              ].map(s => (
                <Card key={s.label} className="text-center p-4">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.prefix}{s.value}</div>
                  <p className="text-xs text-text/50 mt-1 uppercase tracking-wider">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* E-Load Records Table */}
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-base font-bold text-text">E-Load Records</h3>
                <p className="text-xs text-text/40 mt-0.5">{filteredELoadRecords.length} transactions for this period</p>
              </div>
              {eloadLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              ) : filteredELoadRecords.length === 0 ? (
                <div className="text-center py-12 text-text/40">No E-Load records found for this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-background">
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text/50 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text/50 uppercase tracking-wider">GCash (Loaded by)</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text/50 uppercase tracking-wider">Account No.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-text/50 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredELoadRecords.slice(0, 100).map((r, i) => (
                        <tr key={r.id || i} className="border-b border-border/50 hover:bg-background transition-colors">
<td className="px-4 py-3 text-sm text-center text-text/70 whitespace-nowrap">{formatDisplayDate(r.dateLoaded || '')}</td>
<td className="px-4 py-3 text-sm text-center font-mono text-text">{r.gcashAccount || '-'}</td>
<td className="px-4 py-3 text-sm text-center font-mono text-text/70">{String(r.accountNumber || '').replace(/\.0$/, '') || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-emerald-600">₱{(parseFloat(String(r.amount)) || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredELoadRecords.length > 100 && (
                    <p className="text-center text-xs text-text/40 py-3">Showing 100 of {filteredELoadRecords.length} records</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

      </PageContainer>
    </LayoutWrapper>
  );
}
