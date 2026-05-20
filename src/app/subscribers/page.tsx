'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useQuickAction } from '@/hooks/useQuickAction';
import { useSubscribersStore } from '@/stores/subscribersStore';
import { useTechniciansStore } from '@/stores/techniciansStore';
import { UserRole, Installation } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';
import { formatDateDisplay, excelSerialToDate } from '@/lib/utils';
import { useTableConfig, ColumnDef } from '@/hooks/useTableConfig';
import { ColumnConfigPanel } from '@/components/common/ColumnConfigPanel';
import { getEloadTransactionsByAccount } from '@/lib/database';

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500, 0];

const initialFormData = {
  primary: '',
  dateInstalled: new Date().toISOString().split('T')[0],
  agentName: '3EJS',
  joNumber: '',
  accountNumber: '',
  subscriberName: '',
  contactNumber1: '',
  contactNumber2: '',
  address: '',
  houseLongitude: '',
  houseLatitude: '',
  port: '',
  napBoxLongitude: '',
  napBoxLatitude: '',
  assignedTechnician: '',
  status: 'pending' as const,
  modemSerial: '',
  reelNo: '',
  start: '',
  end: '',
  fiberOpticCable: '',
  mechanicalConnector: '',
  sClamp: '',
  patchcordApsc: '',
  houseBracket: '',
  midspan: '',
  cableClip: '',
  ftthTerminalBox: '',
  doubleSidedTape: '',
  cableTieWrap: '',
  notifyStatus: 'Not Yet Notified' as const,
  loadStatus: 'Not yet Loaded' as const,
};

const subscriberColumns: ColumnDef<Installation>[] = [
  { key: 'dateInstalled', label: 'Date Installed', sortable: false, sortValue: (r) => r.dateInstalled || '', render: (r) => formatDateDisplay(r.dateInstalled), className: 'whitespace-nowrap' },
  { key: 'joNumber', label: 'JO Number', sortable: false, sortValue: (r) => r.joNumber || '', render: (r) => r.joNumber || '-' },
  { key: 'accountNumber', label: 'Account Number', sortable: false, sortValue: (r) => String(r.accountNumber || '').replace(/\.0$/, ''), render: (r) => String(r.accountNumber || '').replace(/\.0$/, '') },
  { key: 'subscriberName', label: 'Subscriber Name', sortable: false, sortValue: (r) => (r.subscriberName || '').toLowerCase(), render: (r) => r.subscriberName || '-', className: 'font-medium' },
  { key: 'contactNumber1', label: 'Contact #1', sortable: false, sortValue: (r) => r.contactNumber1 || '', render: (r) => r.contactNumber1 || '-' },
  { key: 'contactNumber2', label: 'Contact #2', sortable: false, sortValue: (r) => r.contactNumber2 || '', render: (r) => r.contactNumber2 || '-' },
  { key: 'address', label: 'Address', sortable: false, sortValue: (r) => (r.address || '').toLowerCase(), render: (r) => r.address || '-', className: 'max-w-[300px] whitespace-normal' },
];

export default function SubscribersPage() {
  const { user } = useAuth();
  const { subscribers, setSubscribers, isLoading, isSubmitting, setSubmitting, setLoading, setError, addSubscriber, updateSubscriber, deleteSubscriber } = useSubscribersStore();
  const { technicians, fetchTechnicians } = useTechniciansStore();
  const [editingSubscriber, setEditingSubscriber] = useState<Installation | null>(null);
  const [viewingSubscriber, setViewingSubscriber] = useState<Installation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formDataTechs, setFormDataTechs] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Installation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateSortDir, setDateSortDir] = useState<'desc' | 'asc'>('desc');
  const [eloadTransactions, setEloadTransactions] = useState<any[]>([]);
  const [isLoadingEload, setIsLoadingEload] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  const filteredTechnicians = technicians.filter(tech => 
    tech.name.toLowerCase().includes(techSearch.toLowerCase())
  );

  const handleTechnicianToggle = (techName: string) => {
    setFormDataTechs(prev => {
      if (prev.includes(techName)) {
        return prev.filter(t => t !== techName);
      } else {
        return [...prev, techName];
      }
    });
  };

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const { openNewInstallation, setOpenNewInstallation: setQuickOpenInstallation } = useQuickAction();
  const prevOpenNewInstallation = useRef<boolean | null>(null);

  useEffect(() => {
    if (openNewInstallation && prevOpenNewInstallation.current !== true) {
      setShowForm(true);
      setQuickOpenInstallation(false);
    }
    prevOpenNewInstallation.current = openNewInstallation;
  }, [openNewInstallation, setQuickOpenInstallation]);

  const tableConfig = useTableConfig<Installation>('subscribers', subscriberColumns, 'dateInstalled', 'desc');
  const { config, visibleColumns, toggleColumn, moveColumn, toggleSort, resetConfig } = tableConfig;

  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN || user.role === UserRole.VIEW_ONLY);

  const fetchSubscribers = useCallback(async (force = false) => {
    const now = Date.now();
    const lastFetched = useSubscribersStore.getState().lastFetched;
    if (!force && subscribers.length > 0 && lastFetched && (now - lastFetched) < 120000) return;
    await useSubscribersStore.getState().fetchSubscribers();
  }, [subscribers.length]);

  useEffect(() => {
    if (hasAccess) fetchSubscribers();
  }, [hasAccess, fetchSubscribers]);

  const filteredSubscribers = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStart = today.getTime();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = subscribers.filter(sub => {
      const matchesSearch = sub.subscriberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.contactNumber1?.includes(searchTerm) ||
                            sub.contactNumber2?.includes(searchTerm) ||
                            sub.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.joNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;

      const dateStr = sub.dateInstalled;
      if (!dateStr) return false;
      const dateInstalled = new Date(dateStr);
      if (isNaN(dateInstalled.getTime())) return false;
      const dateTime = dateInstalled.getTime();

      switch (dateFilter) {
        case 'today':
          return dateTime >= todayStart;
        case '7days':
          return dateTime >= sevenDaysAgo.getTime();
        case '30days':
          return dateTime >= thirtyDaysAgo.getTime();
        default:
          return true;
      }
    });
    return [...filtered].sort((a, b) => {
      const parseDate = (s: string) => {
        if (!s) return 0;
        const cleaned = s.replace(/GMT[+-]\d{4}.*/i, '').replace(/\(.*\)/, '').trim();
        const d = new Date(cleaned);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      const ta = parseDate(a.dateInstalled || '');
      const tb = parseDate(b.dateInstalled || '');
      if (dateSortDir === 'desc') return ta - tb;
      return tb - ta;
    });
  }, [subscribers, searchTerm, dateFilter, dateSortDir]);

  const paginatedSubscribers = useMemo(() => {
    if (pageSize === 0) return filteredSubscribers;
    const start = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, currentPage, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredSubscribers.length / pageSize);

  const handleEdit = (subscriber: Installation) => {
    setEditingSubscriber({ ...subscriber });
  };

  const handleSave = async () => {
    if (!editingSubscriber) return;
    try {
      await axios.patch(`/api/installations/${editingSubscriber.id}`, {
        accountNumber: editingSubscriber.accountNumber,
        subscriberName: editingSubscriber.subscriberName,
        contactNumber1: editingSubscriber.contactNumber1,
        contactNumber2: editingSubscriber.contactNumber2,
        assignedTechnician: editingSubscriber.assignedTechnician,
        status: editingSubscriber.status,
        dateInstalled: (editingSubscriber.dateInstalled || '').split('T')[0],
        agentName: editingSubscriber.agentName,
        joNumber: editingSubscriber.joNumber,
        address: editingSubscriber.address,
        port: editingSubscriber.port,
        houseLatitude: editingSubscriber.houseLatitude,
        houseLongitude: editingSubscriber.houseLongitude,
        napBoxLonglat: editingSubscriber.napBoxLonglat,
        modemSerial: editingSubscriber.modemSerial,
        reelNo: editingSubscriber.reelNo,
        start: editingSubscriber.start,
        end: editingSubscriber.end,
        fiberOpticCable: editingSubscriber.fiberOpticCable,
        mechanicalConnector: editingSubscriber.mechanicalConnector,
        sClamp: editingSubscriber.sClamp,
        patchcordApsc: editingSubscriber.patchcordApsc,
        houseBracket: editingSubscriber.houseBracket,
        midspan: editingSubscriber.midspan,
        cableClip: editingSubscriber.cableClip,
        ftthTerminalBox: editingSubscriber.ftthTerminalBox,
        doubleSidedTape: editingSubscriber.doubleSidedTape,
        cableTieWrap: editingSubscriber.cableTieWrap,
        notifyStatus: editingSubscriber.notifyStatus || null,
        loadStatus: editingSubscriber.loadStatus || null,
      });
      updateSubscriber(editingSubscriber.id, editingSubscriber);
      setEditingSubscriber(null);
    } catch (error) {
      console.error('Error updating subscriber:', error);
    }
  };

  const handleSearch = useCallback((value: string) => { setSearchTerm(value); setCurrentPage(1); }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const submissionData = {
      primary: formData.subscriberName,
      dateInstalled: formData.dateInstalled,
      agentName: formData.agentName,
      joNumber: formData.joNumber,
      accountNumber: formData.accountNumber,
      subscriberName: formData.subscriberName,
      contactNumber1: formData.contactNumber1,
      contactNumber2: formData.contactNumber2,
      address: formData.address,
      houseLongitude: '',
      houseLatitude: '',
      port: '',
      napBoxLongitude: '',
      napBoxLatitude: '',
      assignedTechnician: formDataTechs.join(', '),
      status: formData.status || 'pending',
      modemSerial: formData.modemSerial,
      reelNo: formData.reelNo,
      start: formData.start,
      end: formData.end,
      fiberOpticCable: formData.fiberOpticCable,
      mechanicalConnector: formData.mechanicalConnector,
      sClamp: formData.sClamp,
      patchcordApsc: formData.patchcordApsc,
      houseBracket: formData.houseBracket,
      midspan: formData.midspan,
      cableClip: formData.cableClip,
      ftthTerminalBox: formData.ftthTerminalBox,
      doubleSidedTape: formData.doubleSidedTape,
      cableTieWrap: formData.cableTieWrap,
      notifyStatus: formData.notifyStatus || 'Not Yet Notified',
      loadStatus: formData.loadStatus || 'Not yet Loaded',
      id: `INST-${Date.now()}`,
      no: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      monthInstalled: new Date().toLocaleString('default', { month: 'long' }),
      yearInstalled: new Date().getFullYear().toString(),
      loadExpire: formData.dateInstalled ? new Date(new Date(formData.dateInstalled).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
      subsName: formData.subscriberName,
    };

    try {
      await addSubscriber(submissionData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setShowForm(false);
      setFormData(initialFormData);
      setFormDataTechs([]);
    } catch (error) {
      console.error('Error creating installation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteSubscriber(deleteTarget.id, deleteTarget.joNumber);
    setIsDeleting(false);
    setDeleteTarget(null);
    setViewingSubscriber(null);
  };

  const handleNotifyStatusChange = async (subscriberId: string, newStatus: 'Not Yet Notified' | 'Notified') => {
    setIsUpdatingStatus(true);
    try {
      await updateSubscriber(subscriberId, { notifyStatus: newStatus });
      await axios.patch(`/api/installations/${subscriberId}`, { notifyStatus: newStatus });
    } catch (error) {
      console.error('Error updating notify status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLoadStatusChange = async (subscriberId: string, newStatus: 'Not yet Loaded' | 'Account Loaded') => {
    setIsUpdatingStatus(true);
    try {
      await updateSubscriber(subscriberId, { loadStatus: newStatus });
      await axios.patch(`/api/installations/${subscriberId}`, { loadStatus: newStatus });
    } catch (error) {
      console.error('Error updating load status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (viewingSubscriber?.accountNumber) {
      setIsLoadingEload(true);
      getEloadTransactionsByAccount(viewingSubscriber.accountNumber)
        .then(setEloadTransactions)
        .catch(err => console.error('Error fetching E-Load transactions:', err))
        .finally(() => setIsLoadingEload(false));
    } else {
      setEloadTransactions([]);
    }
  }, [viewingSubscriber?.accountNumber]);

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Subscribers" subtitle="Manage your subscriber records">
          <Card>
            <p className="text-red-600 text-center py-4">You don&apos;t have permission to view this module.</p>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Subscribers" subtitle={`${filteredSubscribers.length} total subscribers`}>
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, account, or phone..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'today', '7days', '30days'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setDateFilter(filter); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      dateFilter === filter
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-background border border-border text-text/60 hover:bg-primary/10'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : filter === '7days' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={dateSortDir}
                  onChange={(e) => { setDateSortDir(e.target.value as 'desc' | 'asc'); setCurrentPage(1); }}
                  className="px-4 py-3 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="desc">Date: Latest First</option>
                  <option value="asc">Date: Oldest First</option>
                </select>
                <Button onClick={() => setShowForm(true)}>+ New Installation</Button>
                <ColumnConfigPanel
                columns={subscriberColumns}
                config={config}
                onToggleColumn={toggleColumn}
                onMoveColumn={moveColumn}
                onReset={resetConfig}
              />
              </div>
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            {isLoading && subscribers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-text/50">Loading subscribers...</p>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background flex items-center justify-center">
                  <svg className="w-8 h-8 text-text/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-text/50">No subscribers found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        {visibleColumns.map((col) => (
                          <th
                            key={col.key}
                            className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap select-none"
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSubscribers.map((sub) => (
                        <tr
                          key={sub.id}
                          onDoubleClick={() => setViewingSubscriber(sub)}
                          className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          {visibleColumns.map((col) => (
                            <td key={col.key} className={`px-5 py-3 text-sm align-top ${col.className || ''} ${col.className?.includes('font-') ? '' : 'text-text/70'}`}>
                              {col.render(sub)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-border/50 text-xs text-text/40 text-center">
                  Double-click a row to view full details
                </div>
                {(totalPages > 1 || pageSize === 0) && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text/50">
                        {pageSize === 0
                          ? `All ${filteredSubscribers.length} records`
                          : `${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, filteredSubscribers.length)} of ${filteredSubscribers.length}`}
                      </span>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-2 py-1 rounded-lg bg-background border border-border text-sm text-text"
                      >
                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s === 0 ? 'All Records' : `${s}/page`}</option>)}
                      </select>
                    </div>
                    {pageSize !== 0 && (
                      <div className="flex gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm disabled:opacity-40 hover:bg-primary/5">Prev</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm disabled:opacity-40 hover:bg-primary/5">Next</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* View Detail Modal */}
        <AnimatePresence>
          {viewingSubscriber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setViewingSubscriber(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-5 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{viewingSubscriber.subscriberName}</h2>
                        <p className="text-white/70 text-xs">Acct #{String(viewingSubscriber.accountNumber || '').replace(/\.0$/, '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        viewingSubscriber.status === 'completed' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${viewingSubscriber.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {viewingSubscriber.status || 'pending'}
                      </span>
                      <button onClick={() => setViewingSubscriber(null)} className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content - 2 column layout */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* Subscriber Info */}
                    <div>
                      <h3 className="font-semibold text-text uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[11px]">
                        <span className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </span>
                        Info
                      </h3>
                      <table className="w-full">
                        <tbody className="divide-y divide-border/50">
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">Primary</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.contactNumber1 || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">Secondary</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.contactNumber2 || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">Date</td><td className="py-1 px-2 font-medium text-text">{formatDateDisplay(viewingSubscriber.dateInstalled)}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">Agent</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.agentName || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">JO #</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.joNumber || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">Tech</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.assignedTechnician || '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Location */}
                    <div>
                      <h3 className="font-semibold text-text uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[11px]">
                        <span className="w-5 h-5 rounded bg-cyan-500/15 flex items-center justify-center">
                          <svg className="w-3 h-3 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </span>
                        Location
                      </h3>
                      <table className="w-full">
                        <tbody className="divide-y divide-border/50">
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap align-top">Address</td><td className="py-1 px-2 font-medium text-text whitespace-normal">{viewingSubscriber.address || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">House Lat</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.houseLatitude || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">House Long</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.houseLongitude || '-'}</td></tr>
                          <tr><td className="py-1 px-2 text-text/50 whitespace-nowrap">NAP Box</td><td className="py-1 px-2 font-medium text-text">{viewingSubscriber.napBoxLonglat || '-'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Equipment & Materials - Collapsible */}
                  <button
                    onClick={() => setShowEquipment(!showEquipment)}
                    className="mt-3 flex items-center gap-2 text-xs font-medium text-text/60 hover:text-text/90 transition-colors w-full px-3 py-2 bg-background/50 rounded-lg border border-border/50 hover:border-border"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${showEquipment ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Equipment & Materials
                  </button>

                  <AnimatePresence>
                    {showEquipment && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 text-xs bg-background/30 rounded-lg p-4 border border-border/50">
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Port</label>
                            <span className="text-text">{viewingSubscriber.port || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Start</label>
                            <span className="text-text">{viewingSubscriber.start || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">End</label>
                            <span className="text-text">{viewingSubscriber.end || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Modem S/N</label>
                            <span className="text-text">{viewingSubscriber.modemSerial || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Reel #</label>
                            <span className="text-text">{viewingSubscriber.reelNo || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Fiber Cable</label>
                            <span className="text-text">{viewingSubscriber.fiberOpticCable || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Patchcord</label>
                            <span className="text-text">{viewingSubscriber.patchcordApsc || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Connector</label>
                            <span className="text-text">{viewingSubscriber.mechanicalConnector || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">S-Clamp</label>
                            <span className="text-text">{viewingSubscriber.sClamp || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Bracket</label>
                            <span className="text-text">{viewingSubscriber.houseBracket || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">FTTH Box</label>
                            <span className="text-text">{viewingSubscriber.ftthTerminalBox || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Midspan</label>
                            <span className="text-text">{viewingSubscriber.midspan || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Cable Clip</label>
                            <span className="text-text">{viewingSubscriber.cableClip || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Tape</label>
                            <span className="text-text">{viewingSubscriber.doubleSidedTape || '-'}</span>
                          </div>
                          <div>
                            <label className="text-text/40 text-[10px] block mb-0.5">Tie Wrap</label>
                            <span className="text-text">{viewingSubscriber.cableTieWrap || '-'}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                

                {/* E-Load Transaction History */}
                {viewingSubscriber.accountNumber && (
                  <div className="px-4 pb-4">
                    <h3 className="font-semibold text-text uppercase tracking-wider mb-2 flex items-center gap-1.5 text-xs">
                      <span className="w-5 h-5 rounded bg-purple-500/15 flex items-center justify-center">
                        <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </span>
                      E-Load Transactions
                    </h3>
                    {isLoadingEload ? (
                      <div className="text-center py-4 text-text/40 text-sm">Loading transactions...</div>
                    ) : eloadTransactions.length === 0 ? (
                      <div className="text-center py-4 text-text/40 text-sm">No E-Load transactions found</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-background sticky top-0">
                            <tr className="border-b border-border">
                              <th className="px-2 py-1 text-left text-text/50">Date</th>
                              <th className="px-2 py-1 text-left text-text/50">Amount</th>
                              <th className="px-2 py-1 text-left text-text/50">Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eloadTransactions.slice(0, 10).map((t, i) => (
<tr key={t.id || i} className="border-b border-border/30">
                              <td className="px-2 py-1 text-text">{t.dateLoaded || '-'}</td>
                              <td className="px-2 py-1 text-text font-medium">₱{parseFloat(String(t.amount || 0)).toLocaleString()}</td>
                              <td className="px-2 py-1 text-text/70">{t.gcashReference || '-'}</td>
                            </tr>
                            ))}
                          </tbody>
                        </table>
                        {eloadTransactions.length > 10 && (
                          <div className="px-2 py-1 text-xs text-text/40 text-center bg-background">
                            +{eloadTransactions.length - 10} more transactions
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border flex gap-3">
                  <Button onClick={() => { setViewingSubscriber(null); setEditingSubscriber(viewingSubscriber); }} className="flex-1 text-sm py-2">
                    Edit
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => setDeleteTarget(viewingSubscriber)} 
                    className="flex-1 text-sm py-2"
                  >
                    Delete
                  </Button>
                  <Button variant="secondary" onClick={() => setViewingSubscriber(null)} className="flex-1 text-sm py-2">
                    Close
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingSubscriber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setEditingSubscriber(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Edit Subscriber</h2>
                        <p className="text-white/70 text-sm">{editingSubscriber.subscriberName}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingSubscriber(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><h3 className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Basic Info</h3></div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Subscriber Name</label>
                      <input type="text" value={editingSubscriber.subscriberName || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, subscriberName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Account Number</label>
                      <input type="text" value={editingSubscriber.accountNumber || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, accountNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Date Installed</label>
                      <input type="date" value={excelSerialToDate(editingSubscriber.dateInstalled) || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, dateInstalled: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Status</label>
                      <select value={editingSubscriber.status || 'pending'} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, status: e.target.value as 'pending' | 'completed' })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 mt-2"><h3 className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Contact & Location</h3></div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Contact #1</label>
                      <input type="text" value={editingSubscriber.contactNumber1 || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, contactNumber1: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Contact #2</label>
                      <input type="text" value={editingSubscriber.contactNumber2 || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, contactNumber2: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text/50 mb-1">Address</label>
                      <input type="text" value={editingSubscriber.address || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, address: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>

                    <div className="md:col-span-2 mt-2"><h3 className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Network & Equipment</h3></div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Agent Name</label>
                      <input type="text" value={editingSubscriber.agentName || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, agentName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">JO Number</label>
                      <input type="text" value={editingSubscriber.joNumber || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, joNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Assigned Technician</label>
                      <input type="text" value={editingSubscriber.assignedTechnician || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, assignedTechnician: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Status</label>
                      <select value={editingSubscriber.status || 'pending'} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, status: e.target.value as 'pending' | 'completed' })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 mt-2"><h3 className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2">Materials</h3></div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Mechanical Connector</label>
                      <input type="text" value={editingSubscriber.mechanicalConnector || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, mechanicalConnector: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">S-Clamp</label>
                      <input type="text" value={editingSubscriber.sClamp || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, sClamp: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">House Bracket</label>
                      <input type="text" value={editingSubscriber.houseBracket || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, houseBracket: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">FTTH Terminal Box</label>
                      <input type="text" value={editingSubscriber.ftthTerminalBox || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, ftthTerminalBox: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Midspan</label>
                      <input type="text" value={editingSubscriber.midspan || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, midspan: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Cable Clip</label>
                      <input type="text" value={editingSubscriber.cableClip || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, cableClip: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Double Sided Tape</label>
                      <input type="text" value={editingSubscriber.doubleSidedTape || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, doubleSidedTape: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Cable Tie Wrap</label>
                      <input type="text" value={editingSubscriber.cableTieWrap || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, cableTieWrap: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Reel No.</label>
                      <input type="text" value={editingSubscriber.reelNo || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, reelNo: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">Start</label>
                      <input type="text" value={editingSubscriber.start || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, start: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">End</label>
                      <input type="text" value={editingSubscriber.end || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, end: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">House Latitude</label>
                      <input type="text" value={editingSubscriber.houseLatitude || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, houseLatitude: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">House Longitude</label>
                      <input type="text" value={editingSubscriber.houseLongitude || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, houseLongitude: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text/50 mb-1">NAP Box Long/Lat</label>
                      <input type="text" value={editingSubscriber.napBoxLonglat || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, napBoxLonglat: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                      <div>
                        <label className="block text-xs font-medium text-text/50 mb-1">Notify Status</label>
                        <select value={editingSubscriber.notifyStatus || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, notifyStatus: e.target.value as any })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">-- Select --</option>
                          <option value="Not Yet Notified">Not Yet Notified</option>
                          <option value="Notified">Notified</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text/50 mb-1">Load Status</label>
                        <select value={editingSubscriber.loadStatus || ''} onChange={(e) => setEditingSubscriber({ ...editingSubscriber, loadStatus: e.target.value as any })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">-- Select --</option>
                          <option value="Not yet Loaded">Not yet Loaded</option>
                          <option value="Account Loaded">Account Loaded</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                  <Button variant="secondary" onClick={() => setEditingSubscriber(null)} className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Installation Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-backdrop flex items-center justify-center p-4"
onClick={() => { setShowForm(false); setFormData(initialFormData);
      setFormDataTechs([]); setShowMaterials(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="modal-container w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-text">New Installation</h2>
                        <p className="text-sm text-text-muted">Fill in the installation details</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMaterials(!showMaterials)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        showMaterials
                          ? 'bg-orange-500 text-white'
                          : 'bg-background border border-border text-text hover:bg-orange-50 hover:border-orange-300'
                      }`}
                    >
                      {showMaterials ? 'Hide Materials' : 'Add Materials'}
                    </button>
                  </div>
                </div>
                <div className="modal-body overflow-y-auto flex-1">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Primary Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-text mb-3 pb-2 border-b border-border">Primary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Date Installed</label>
                          <input
                            type="date"
                            value={formData.dateInstalled}
                            onChange={(e) => handleInputChange('dateInstalled', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Agent Name</label>
                          <input
                            type="text"
                            value={formData.agentName}
                            onChange={(e) => handleInputChange('agentName', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">JO Number</label>
                          <input
                            type="text"
                            value={formData.joNumber}
                            onChange={(e) => handleInputChange('joNumber', e.target.value)}
                            placeholder="JO-2026-001"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Account Number</label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                            placeholder="Account Number"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Subscriber Name</label>
                          <input
                            type="text"
                            value={formData.subscriberName}
                            onChange={(e) => handleInputChange('subscriberName', e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Contact #1</label>
                          <input
                            type="text"
                            value={formData.contactNumber1}
                            onChange={(e) => handleInputChange('contactNumber1', e.target.value)}
                            placeholder="Primary contact"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Contact #2</label>
                          <input
                            type="text"
                            value={formData.contactNumber2}
                            onChange={(e) => handleInputChange('contactNumber2', e.target.value)}
                            placeholder="Secondary contact"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Notify Status</label>
                          <select
                            value={formData.notifyStatus}
                            onChange={(e) => handleInputChange('notifyStatus', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="Not Yet Notified">Not Yet Notified</option>
                            <option value="Notified">Notified</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Load Status</label>
                          <select
                            value={formData.loadStatus}
                            onChange={(e) => handleInputChange('loadStatus', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="Not yet Loaded">Not yet Loaded</option>
                            <option value="Account Loaded">Account Loaded</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-text mb-3 pb-2 border-b border-border">Location</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-text mb-1">Address</label>
                          <textarea
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            placeholder="Full address"
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">
                            Assigned Technician{formDataTechs.length > 0 && (
                              <span className="ml-2 text-xs text-primary">({formDataTechs.length} selected)</span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={techSearch}
                              onChange={(e) => { setTechSearch(e.target.value); setShowTechDropdown(true); }}
                              onFocus={() => setShowTechDropdown(true)}
                              placeholder="Search technicians..."
                              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (techSearch.trim()) {
                                  handleTechnicianToggle(techSearch.trim());
                                  setTechSearch('');
                                }
                              }}
                              className="absolute right-1 top-1 bottom-1 px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary/90"
                            >
                              ADD
                            </button>
                            {showTechDropdown && filteredTechnicians.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredTechnicians.map((tech) => (
                                  <button
                                    key={tech.name}
                                    type="button"
                                    onClick={() => { handleTechnicianToggle(tech.name); setTechSearch(''); setShowTechDropdown(false); }}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-primary/5 ${
                                      formDataTechs.includes(tech.name) ? 'bg-primary/10 text-primary' : 'text-text'
                                    }`}
                                  >
                                    {tech.name} <span className="text-xs text-text/50">({tech.count} jobs)</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formDataTechs.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {formDataTechs.map((techName) => (
                                <span key={techName} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-1">
                                  {techName}
                                  <button type="button" onClick={() => handleTechnicianToggle(techName)} className="hover:text-white">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Materials Section - Toggleable */}
                    <AnimatePresence>
                      {showMaterials && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="border-t border-border pt-4">
                            <h3 className="text-sm font-semibold text-text mb-3 pb-2 border-b border-border">Materials</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Modem Serial #</label>
                          <input
                            type="text"
                            value={formData.modemSerial}
                            onChange={(e) => handleInputChange('modemSerial', e.target.value)}
                            placeholder="Modem Serial"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Reel No.</label>
                          <input
                            type="text"
                            value={formData.reelNo}
                            onChange={(e) => handleInputChange('reelNo', e.target.value)}
                            placeholder="Reel Number"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Start</label>
                          <input
                            type="text"
                            value={formData.start}
                            onChange={(e) => handleInputChange('start', e.target.value)}
                            placeholder="Start"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">End</label>
                          <input
                            type="text"
                            value={formData.end}
                            onChange={(e) => handleInputChange('end', e.target.value)}
                            placeholder="End"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Fiber Optic Cable</label>
                          <input
                            type="text"
                            value={formData.fiberOpticCable}
                            onChange={(e) => handleInputChange('fiberOpticCable', e.target.value)}
                            placeholder="FOC"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Mechanical Connector</label>
                          <input
                            type="text"
                            value={formData.mechanicalConnector}
                            onChange={(e) => handleInputChange('mechanicalConnector', e.target.value)}
                            placeholder="MC"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">S-Clamp</label>
                          <input
                            type="text"
                            value={formData.sClamp}
                            onChange={(e) => handleInputChange('sClamp', e.target.value)}
                            placeholder="S-Clamp"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Patchcord APC-SC</label>
                          <input
                            type="text"
                            value={formData.patchcordApsc}
                            onChange={(e) => handleInputChange('patchcordApsc', e.target.value)}
                            placeholder="Patchcord"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">House Bracket</label>
                          <input
                            type="text"
                            value={formData.houseBracket}
                            onChange={(e) => handleInputChange('houseBracket', e.target.value)}
                            placeholder="H-Bracket"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Midspan</label>
                          <input
                            type="text"
                            value={formData.midspan}
                            onChange={(e) => handleInputChange('midspan', e.target.value)}
                            placeholder="Midspan"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Cable Clip</label>
                          <input
                            type="text"
                            value={formData.cableClip}
                            onChange={(e) => handleInputChange('cableClip', e.target.value)}
                            placeholder="Cable Clip"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">FTTH Terminal Box (NIU)</label>
                          <input
                            type="text"
                            value={formData.ftthTerminalBox}
                            onChange={(e) => handleInputChange('ftthTerminalBox', e.target.value)}
                            placeholder="FTTH Box"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Double Sided Tape</label>
                          <input
                            type="text"
                            value={formData.doubleSidedTape}
                            onChange={(e) => handleInputChange('doubleSidedTape', e.target.value)}
                            placeholder="Tape"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text mb-1">Cable Tie Wrap</label>
                          <input
                            type="text"
                            value={formData.cableTieWrap}
                            onChange={(e) => handleInputChange('cableTieWrap', e.target.value)}
                            placeholder="Tie Wrap"
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-3 pt-4 border-t border-border">
                      <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving...
                          </span>
                        ) : 'Save Installation'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setFormData(initialFormData);
      setFormDataTechs([]); }} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <h3 className="text-lg font-bold text-text mb-1">Delete Subscriber?</h3>
                  <p className="text-text/60 text-sm font-medium mb-1">{deleteTarget.subscriberName}</p>
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
                className="fixed bottom-8 right-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Installation created successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </PageContainer>
      </LayoutWrapper>
    );
  }