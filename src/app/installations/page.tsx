'use client';

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useTechniciansStore } from '@/stores/techniciansStore';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';

interface InstallationFormData {
  dateInstalled: string;
  agentName: string;
  joNumber: string;
  accountNumber: string;
  subscriberName: string;
  contactNumber1: string;
  contactNumber2: string;
  address: string;
  houseLatitude: string;
  houseLongitude: string;
  assignedTechnicians: string[];
  modemSerial: string;
  reelNo: string;
  start: string;
  end: string;
  fiberOpticCable: string;
  mechanicalConnector: string;
  sClamp: string;
  patchcordApsc: string;
  houseBracket: string;
  midspan: string;
  cableClip: string;
  ftthTerminalBox: string;
  doubleSidedTape: string;
  cableTieWrap: string;
  port: string;
  napLatitude: string;
  napLongitude: string;
}

const initialFormData: InstallationFormData = {
  dateInstalled: new Date().toISOString().split('T')[0],
  agentName: '3EJS',
  joNumber: '',
  accountNumber: '',
  subscriberName: '',
  contactNumber1: '',
  contactNumber2: '',
  address: '',
  houseLatitude: '',
  houseLongitude: '',
  assignedTechnicians: [],
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
  port: '',
  napLatitude: '',
  napLongitude: '',
};

export default function InstallationsPage() {
  const { user } = useAuth();
  const { technicians, fetchTechnicians } = useTechniciansStore();
  const [formData, setFormData] = useState<InstallationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [techInput, setTechInput] = useState('');

  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN);

  useEffect(() => {
    if (hasAccess) {
      fetchTechnicians();
    }
  }, [hasAccess, fetchTechnicians]);

  const handleInputChange = (field: keyof InstallationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechnicianToggle = (techName: string) => {
    setFormData(prev => {
      const current = prev.assignedTechnicians;
      if (current.includes(techName)) {
        return { ...prev, assignedTechnicians: current.filter(t => t !== techName) };
      } else {
        return { ...prev, assignedTechnicians: [...current, techName] };
      }
    });
  };

  const handleAddTechnician = () => {
    const name = techInput.trim();
    if (!name) return;
    if (!formData.assignedTechnicians.includes(name)) {
      handleTechnicianToggle(name);
    }
    setTechInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submissionData = {
      ...formData,
      id: `INST-${Date.now()}`,
      no: `${Date.now()}`,
      status: 'pending' as const,
      assignedTechnician: formData.assignedTechnicians.join('/'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      monthInstalled: new Date().toLocaleString('default', { month: 'long' }),
      yearInstalled: new Date().getFullYear().toString(),
      loadExpire: formData.dateInstalled ? new Date(new Date(formData.dateInstalled).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
      subsName: formData.subscriberName,
      houseLatitude: formData.houseLatitude || '',
      houseLongitude: formData.houseLongitude || '',
      napBoxLonglat: formData.napLatitude && formData.napLongitude 
        ? `${formData.napLatitude}, ${formData.napLongitude}` : ''
    };

    try {
      await axios.post('/api/installations', submissionData);
    } catch (apiError) {
      console.warn('[Installations] API sync failed, saved locally only:', apiError);
      setShowSyncWarning(true);
      setTimeout(() => setShowSyncWarning(false), 5000);
    }
    
    setFormData(initialFormData);
    setShowForm(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setIsSubmitting(false);
  };

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Installations" subtitle="Manage new installations">
          <Card>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text">Access Denied</h3>
              <p className="text-text/50 mt-2">
                You don&apos;t have permission to view this module.
              </p>
            </motion.div>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Installations" subtitle="Create and manage new installations">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowForm(true)}>+ New Installation</Button>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-backdrop flex items-center justify-center p-4"
              onClick={() => { setShowForm(false); setFormData(initialFormData); }}
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
                </div>
                <div className="modal-body overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Date Installed</label>
                      <input
                        type="date"
                        value={formData.dateInstalled}
                        onChange={(e) => handleInputChange('dateInstalled', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Agent Name</label>
                      <input
                        type="text"
                        value="3EJS"
                        readOnly
                        className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border text-text/50 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">JO Number</label>
                      <input
                        type="text"
                        value={formData.joNumber}
                        onChange={(e) => handleInputChange('joNumber', e.target.value)}
                        placeholder="JO-2026-001"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Account Number</label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                        placeholder="SUB001"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Subscriber Name</label>
                    <input
                      type="text"
                      value={formData.subscriberName}
                      onChange={(e) => handleInputChange('subscriberName', e.target.value)}
                      placeholder="Enter subscriber name"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Contact Number 1</label>
                      <input
                        type="text"
                        value={formData.contactNumber1}
                        onChange={(e) => handleInputChange('contactNumber1', e.target.value)}
                        placeholder="09123456789"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Contact Number 2</label>
                      <input
                        type="text"
                        value={formData.contactNumber2}
                        onChange={(e) => handleInputChange('contactNumber2', e.target.value)}
                        placeholder="09123456789"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">House Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Full address"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">House Latitude</label>
                      <input
                        type="text"
                        value={formData.houseLatitude}
                        onChange={(e) => handleInputChange('houseLatitude', e.target.value)}
                        placeholder="14.5995"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">House Longitude</label>
                      <input
                        type="text"
                        value={formData.houseLongitude}
                        onChange={(e) => handleInputChange('houseLongitude', e.target.value)}
                        placeholder="120.9822"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Assigned Technician{formData.assignedTechnicians.length > 0 && (
                        <span className="ml-2 text-xs text-primary">({formData.assignedTechnicians.length} selected)</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTechnician(); } }}
                        placeholder="Enter technician name"
                        className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={handleAddTechnician}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.assignedTechnicians.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.assignedTechnicians.map((techName) => (
                          <span key={techName} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center gap-1">
                            {techName}
                            <button type="button" onClick={() => handleTechnicianToggle(techName)} className="hover:text-white">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-text pt-2 border-t border-border">Materials Used</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Modem Serial #</label>
                      <input
                        type="text"
                        value={formData.modemSerial}
                        onChange={(e) => handleInputChange('modemSerial', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Reel No.</label>
                      <input
                        type="text"
                        value={formData.reelNo}
                        onChange={(e) => handleInputChange('reelNo', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Start</label>
                      <input
                        type="text"
                        value={formData.start}
                        onChange={(e) => handleInputChange('start', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">End</label>
                      <input
                        type="text"
                        value={formData.end}
                        onChange={(e) => handleInputChange('end', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Fiber Optic Cable</label>
                      <input
                        type="text"
                        value={formData.fiberOpticCable}
                        onChange={(e) => handleInputChange('fiberOpticCable', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Mechanical Connector</label>
                      <input
                        type="text"
                        value={formData.mechanicalConnector}
                        onChange={(e) => handleInputChange('mechanicalConnector', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">S-CLAMP</label>
                      <input
                        type="text"
                        value={formData.sClamp}
                        onChange={(e) => handleInputChange('sClamp', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">PATCHCORD APC-SC</label>
                      <input
                        type="text"
                        value={formData.patchcordApsc}
                        onChange={(e) => handleInputChange('patchcordApsc', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">House Bracket</label>
                      <input
                        type="text"
                        value={formData.houseBracket}
                        onChange={(e) => handleInputChange('houseBracket', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">MIDSPAN</label>
                      <input
                        type="text"
                        value={formData.midspan}
                        onChange={(e) => handleInputChange('midspan', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">CABLE CLIP</label>
                      <input
                        type="text"
                        value={formData.cableClip}
                        onChange={(e) => handleInputChange('cableClip', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">FTTH Terminal Box</label>
                      <input
                        type="text"
                        value={formData.ftthTerminalBox}
                        onChange={(e) => handleInputChange('ftthTerminalBox', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Double Sided Tape</label>
                      <input
                        type="text"
                        value={formData.doubleSidedTape}
                        onChange={(e) => handleInputChange('doubleSidedTape', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Cable Tie Wrap</label>
                      <input
                        type="text"
                        value={formData.cableTieWrap}
                        onChange={(e) => handleInputChange('cableTieWrap', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-text pt-2 border-t border-border">Location Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Port</label>
                      <input
                        type="text"
                        value={formData.port}
                        onChange={(e) => handleInputChange('port', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">NAP Box Latitude</label>
                      <input
                        type="text"
                        value={formData.napLatitude}
                        onChange={(e) => handleInputChange('napLatitude', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">NAP Box Longitude</label>
                      <input
                        type="text"
                        value={formData.napLongitude}
                        onChange={(e) => handleInputChange('napLongitude', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Saving...' : 'Save Installation'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setFormData(initialFormData); }} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
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

        {/* Sync Warning Toast */}
        <AnimatePresence>
          {showSyncWarning && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-8 bg-amber-500 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
               <span className="font-medium text-sm">Saved locally — Supabase sync failed. Will retry on next sync.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </LayoutWrapper>
  );
}