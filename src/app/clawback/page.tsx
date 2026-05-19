'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useSubscribersStore } from '@/stores/subscribersStore';
import { UserRole, Installation } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';
import { formatDateDisplay } from '@/lib/utils';

export default function ClawbackPage() {
  const { user } = useAuth();
  const { subscribers, fetchSubscribers, updateSubscriber } = useSubscribersStore();
  const [selectedSubscriber, setSelectedSubscriber] = useState<Installation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [daysFilter, setDaysFilter] = useState<30 | 60 | 90>(60);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmNotify, setConfirmNotify] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchSubscribers();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchSubscribers]);

  useEffect(() => {
    const handleSync = () => {
      fetchSubscribers();
    };
    window.addEventListener('db-synced', handleSync);
    return () => {
      window.removeEventListener('db-synced', handleSync);
    };
  }, [fetchSubscribers]);

  const clawbackSubscribers = useMemo(() => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysFilter);

    return subscribers.filter(sub => {
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
    });
  }, [subscribers, daysFilter]);

  const filteredSubscribers = useMemo(() => {
    const filtered = clawbackSubscribers.filter(sub => {
      const matchesSearch = sub.subscriberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.contactNumber1?.includes(searchTerm) ||
                            sub.assignedTechnician?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    return filtered;
  }, [clawbackSubscribers, searchTerm]);

  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSubscribers.length / pageSize);

  const handleNotifyStatusChange = async (subscriberId: string, newStatus: 'Not Yet Notified' | 'Notified') => {
    setIsUpdating(true);
    try {
      await updateSubscriber(subscriberId, { notifyStatus: newStatus });
      await axios.patch(`/api/installations/${subscriberId}`, { notifyStatus: newStatus });
      setSelectedSubscriber(prev => prev ? { ...prev, notifyStatus: newStatus } : null);
    } catch (error) {
      console.error('Error updating notify status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLoadStatusChange = async (subscriberId: string, newStatus: 'Not yet Loaded' | 'Account Loaded') => {
    setIsUpdating(true);
    try {
      await updateSubscriber(subscriberId, { loadStatus: newStatus });
      await axios.patch(`/api/installations/${subscriberId}`, { loadStatus: newStatus });
      setSelectedSubscriber(prev => prev ? { ...prev, loadStatus: newStatus } : null);
    } catch (error) {
      console.error('Error updating load status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN || user.role === UserRole.VIEW_ONLY);

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Clawback Dashboard" subtitle="Track subscribers without load in 60 days">
          <Card>
            <p className="text-red-600 text-center py-4">You don&apos;t have permission to view this module.</p>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Clawback Dashboard" subtitle={`${filteredSubscribers.length} subscribers risk for clawback`}>
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
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                   className="w-full pl-12 pr-4 py-3 rounded-xl bg-background border border-border text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                 />
               </div>
               <div className="flex items-center gap-3">
                 <button
                   onClick={() => fetchSubscribers()}
                   className="px-4 py-2 rounded-lg bg-background border border-border text-text hover:bg-primary/5 transition-colors text-sm font-medium flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   Refresh
                 </button>
                 <select
                   value={daysFilter}
                   onChange={(e) => { setDaysFilter(Number(e.target.value) as 30 | 60 | 90); setCurrentPage(1); }}
                   className="px-4 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                 >
                   <option value={30}>Last 30 Days</option>
                   <option value={60}>Last 60 Days</option>
                   <option value={90}>Last 90 Days</option>
                 </select>
               </div>
             </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text/50 uppercase tracking-wider">Risk for Clawback</p>
                  <p className="text-2xl font-bold text-text">{clawbackSubscribers.length}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="!p-0 overflow-hidden">
            {filteredSubscribers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background flex items-center justify-center">
                  <svg className="w-8 h-8 text-text/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-text/50">No clawback subscribers found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Subscriber</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Account #</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Date Installed</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Address</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Contact</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Notified</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-text/50 uppercase tracking-wider whitespace-nowrap">Loaded</th>
                      </tr>
                    </thead>
                    <tbody>
{paginatedSubscribers.map((sub) => {
                        const isNotified = sub.notifyStatus === 'Notified';
                        const isLoaded = sub.loadStatus === 'Account Loaded';
                        const isNotNeeded = sub.notifyStatus === 'Not Needed';
                        
                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubscriber(sub)}
                            className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3 text-sm font-medium text-text">{sub.subscriberName || '-'}</td>
                            <td className="px-5 py-3 text-sm text-text/70">{String(sub.accountNumber || '').replace(/\.0$/, '')}</td>
                            <td className="px-5 py-3 text-sm text-text/70 whitespace-nowrap">{formatDateDisplay(sub.dateInstalled)}</td>
                            <td className="px-5 py-3 text-sm text-text/70">{sub.address || ''}</td>
                            <td className="px-5 py-3 text-sm text-text/70">{sub.contactNumber1 || '-'}</td>
                            <td className="px-5 py-3 text-sm whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isNotNeeded ? 'bg-blue-500/10 text-blue-600 animate-pulse' :
                                isNotified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {isNotNeeded ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : isNotified ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                                  </svg>
                                )}
                                {isNotNeeded ? 'Not Needed' : isNotified ? 'Notified' : 'Not Notified'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isLoaded ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                              }`}>
                                {isLoaded ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                                  </svg>
                                )}
                                {isLoaded ? 'Loaded' : 'Not Loaded'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                    <span className="text-sm text-text/50">
                      {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredSubscribers.length)} of {filteredSubscribers.length}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm disabled:opacity-40 hover:bg-primary/5">Prev</button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm disabled:opacity-40 hover:bg-primary/5">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <AnimatePresence>
          {selectedSubscriber && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedSubscriber(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-5 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{selectedSubscriber.subscriberName}</h2>
                      <p className="text-white/70 text-xs">Acct #{String(selectedSubscriber.accountNumber || '').replace(/\.0$/, '')}</p>
                    </div>
                    <button onClick={() => setSelectedSubscriber(null)} className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text/50">Date Installed</p>
                      <p className="font-medium text-text">{formatDateDisplay(selectedSubscriber.dateInstalled)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50">Assigned Technician</p>
                      <p className="font-medium text-text">{selectedSubscriber.assignedTechnician || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50">Contact Number</p>
                      <p className="font-medium text-text">{selectedSubscriber.contactNumber1 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text/50">Address</p>
                      <p className="font-medium text-text">{selectedSubscriber.address || '-'}</p>
                    </div>
<div>
                       <p className="text-xs text-text/50">Notify Status</p>
                       <div className="flex items-center gap-2 mt-1">
                         <p className={`text-sm font-medium ${
                           selectedSubscriber.notifyStatus === 'Not Yet Notified' ? 'text-red-600' :
                           selectedSubscriber.notifyStatus === 'Not Needed' ? 'text-blue-600' : 'text-emerald-600'
                         }`}>
                           {selectedSubscriber.notifyStatus || '-'}
                         </p>
                         {selectedSubscriber.notifyStatus !== 'Not Needed' && (
                           <button
                             onClick={() => setConfirmNotify(true)}
                             className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-primary/5 transition-colors"
                           >
                             {selectedSubscriber.notifyStatus === 'Not Yet Notified' ? 'Mark as Notified' : 'Mark as Not Yet Notified'}
                           </button>
                         )}
                       </div>
                     </div>
                    <div>
                      <p className="text-xs text-text/50">Load Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-sm font-medium ${
                          selectedSubscriber.loadStatus === 'Not yet Loaded' ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {selectedSubscriber.loadStatus || '-'}
                        </p>
                        <button
                          onClick={() => setConfirmLoad(true)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-primary/5 transition-colors"
                        >
                          {selectedSubscriber.loadStatus === 'Not yet Loaded' ? 'Mark as Loaded' : 'Mark as Not Loaded'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notify Status Confirmation */}
                <AnimatePresence>
                  {confirmNotify && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
                      onClick={() => setConfirmNotify(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm border border-border p-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-text mb-2">Confirm Notification</h3>
                        <p className="text-text/50 text-sm mb-6">Have you personally notified this subscriber?</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmNotify(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text/70 hover:bg-primary/5 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const newStatus = selectedSubscriber.notifyStatus === 'Not Yet Notified' ? 'Notified' : 'Not Yet Notified';
                              handleNotifyStatusChange(selectedSubscriber.id, newStatus);
                              setConfirmNotify(false);
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors text-sm"
                          >
                            Yes, Notified
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Load Status Confirmation */}
                <AnimatePresence>
                  {confirmLoad && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
                      onClick={() => setConfirmLoad(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm border border-border p-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-text mb-2">Confirm Load Status</h3>
                        <p className="text-text/50 text-sm mb-6">Has the subscriber loaded their account?</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setConfirmLoad(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text/70 hover:bg-primary/5 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const newStatus = selectedSubscriber.loadStatus === 'Not yet Loaded' ? 'Account Loaded' : 'Not yet Loaded';
                              handleLoadStatusChange(selectedSubscriber.id, newStatus);
                              setConfirmLoad(false);
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors text-sm"
                          >
                            Yes, Loaded
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="px-5 py-3 border-t border-border flex justify-end">
                  <Button variant="secondary" onClick={() => setSelectedSubscriber(null)}>Close</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </LayoutWrapper>
  );
}