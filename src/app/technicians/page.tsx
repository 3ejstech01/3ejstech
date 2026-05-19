'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { PageContainer, Card, Button } from '@/components/common/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useTechniciansStore } from '@/stores/techniciansStore';
import { useTechnicianProfilesStore } from '@/stores/technicianProfilesStore';
import { UserRole, InstallationRow } from '@/lib/types';
import { localDb } from '@/lib/database';
import { formatDateDisplay } from '@/lib/utils';

interface SearchableDropdownProps {
  technicians: { name: string; count: number }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label: string;
}

const SearchableMultiDropdown: React.FC<SearchableDropdownProps> = ({ technicians, selected, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = technicians.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(t.name)
  );

  const toggleSelect = (name: string) => {
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  };

  const removeSelected = (name: string) => {
    onChange(selected.filter(n => n !== name));
  };

  return (
    <div className="mb-4" ref={ref}>
      <label className="block text-sm font-medium text-text mb-2">{label}</label>
      <div className="relative">
        <div
          className="min-h-[42px] px-3 py-2 rounded-xl bg-background border border-border cursor-text flex flex-wrap gap-1.5 items-center"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {name}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeSelected(name); }} className="ml-0.5 hover:text-primary-dark">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <span className="text-text/40 text-sm">{placeholder || 'Select...'}</span>
          )}
          <svg className={`w-4 h-4 ml-auto text-text/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text/40 text-center">No matches found</div>
              ) : (
                filtered.map(tech => (
                  <button
                    key={tech.name}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(tech.name); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 flex items-center justify-between"
                  >
                    <span className="font-medium text-text">{tech.name}</span>
                    <span className="text-xs text-text/40">{tech.count} installs</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SingleSearchDropdownProps {
  technicians: { name: string; count: number }[];
  selected: string;
  onChange: (name: string) => void;
  placeholder?: string;
  label: string;
}

const SingleSearchDropdown: React.FC<SingleSearchDropdownProps> = ({ technicians, selected, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = technicians.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTech = technicians.find(t => t.name === selected);

  return (
    <div className="mb-4" ref={ref}>
      <label className="block text-sm font-medium text-text mb-2">{label}</label>
      <div className="relative">
        <div
          className="h-[42px] px-3 py-2 rounded-xl bg-background border border-border cursor-text flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedTech ? (
            <span className="font-medium text-text">{selectedTech.name}</span>
          ) : (
            <span className="text-text/40 text-sm">{placeholder || 'Select...'}</span>
          )}
          <svg className={`w-4 h-4 text-text/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text/40 text-center">No matches found</div>
              ) : (
                filtered.map(tech => (
                  <button
                    key={tech.name}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(tech.name); setIsOpen(false); setSearch(''); }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${selected === tech.name ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'}`}
                  >
                    <span className="font-medium text-text">{tech.name}</span>
                    <span className="text-xs text-text/40">{tech.count} installs</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MergeModal: React.FC<{
  technicians: { name: string; count: number }[];
  onMerge: (fromNames: string[], toName: string) => void;
  onClose: () => void;
}> = ({ technicians, onMerge, onClose }) => {
  const [selectedFrom, setSelectedFrom] = useState<string[]>([]);
  const [selectedTo, setSelectedTo] = useState('');

  const handleMerge = () => {
    if (selectedFrom.length >= 2 && selectedTo) {
      onMerge(selectedFrom, selectedTo);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Merge Technicians</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="text-white/70 text-sm mt-1">Combine multiple technician records into one</p>
        </div>

        <div className="p-5">
          <SearchableMultiDropdown
            technicians={technicians}
            selected={selectedFrom}
            onChange={setSelectedFrom}
            label="From (select 2+ technicians)"
            placeholder="Search and select technicians to merge..."
          />

          {selectedFrom.length >= 2 && (
            <SingleSearchDropdown
              technicians={technicians}
              selected={selectedTo}
              onChange={setSelectedTo}
              label="Merge into (destination)"
              placeholder="Select destination technician..."
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleMerge} disabled={selectedFrom.length < 2 || !selectedTo} className="flex-1">
              Merge ({selectedFrom.length} into {selectedTo || '...'})
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TechniciansPage() {
  const { user } = useAuth();
  const { technicians, fetchTechnicians, isLoading, refreshCount } = useTechniciansStore();
  const { profiles, addProfile, updateProfile, getProfileByName, mergeTechnicians, updateInstallationCount } = useTechnicianProfilesStore();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<{ name: string; fullName: string; nickname: string; address: string } | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentInstallations, setRecentInstallations] = useState<InstallationRow[]>([]);
  const [viewingInstallation, setViewingInstallation] = useState<InstallationRow | null>(null);
  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.TECHNICIAN);

  const filteredTechnicians = technicians.filter(tech => 
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProfileByName(tech.name)?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProfileByName(tech.name)?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    if (technicians.length > 0) {
      technicians.forEach(tech => {
        if (!getProfileByName(tech.name)) {
          addProfile(tech.name);
          updateInstallationCount(tech.name, tech.count);
        } else {
          updateInstallationCount(tech.name, tech.count);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicians]);

  const selectedTechnician = technicians.find(t => t.name === selectedTech);
  const profile = selectedTech ? getProfileByName(selectedTech) : undefined;

  const loadRecentInstallations = useCallback(async (techName: string) => {
    try {
      const all = await localDb.getAll<InstallationRow>('installations');
      const techInstalls = all
        .filter(inst => {
          const assigned = (inst.assignedTechnician || '').toLowerCase();
          return assigned.includes(techName.toLowerCase());
        })
        .sort((a, b) => {
          const da = a.dateInstalled || '';
          const db2 = b.dateInstalled || '';
          return da < db2 ? 1 : da > db2 ? -1 : 0;
        })
        .slice(0, 5);
      setRecentInstallations(techInstalls);
    } catch (err) {
      console.error('[Technicians] Failed to load recent installations:', err);
      setRecentInstallations([]);
    }
  }, []);

  const handleUpdateProfile = () => {
    if (editingProfile && selectedTech) {
      const existingProfile = getProfileByName(selectedTech);
      if (existingProfile) {
        updateProfile(existingProfile.id, {
          fullName: editingProfile.fullName,
          nickname: editingProfile.nickname,
          address: editingProfile.address
        });
      }
      setEditingProfile(null);
    }
  };

  const handleMerge = (fromNames: string[], toName: string) => {
    mergeTechnicians(fromNames, toName);
    refreshCount();
  };

  if (!hasAccess) {
    return (
      <LayoutWrapper>
        <PageContainer title="Technicians" subtitle="Technician profiles and stats">
          <Card>
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Access Denied</h3>
              <p className="text-text/70 dark:text-text mt-2">You do not have permission to view this module.</p>
            </div>
          </Card>
        </PageContainer>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <PageContainer title="Technicians" subtitle={`${technicians.length} technicians registered`}>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 px-3 py-1.5 text-sm rounded-lg bg-background border border-border text-text placeholder-text/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button variant="secondary" onClick={() => setShowMergeModal(true)} className="px-3 py-1.5 text-sm">
              Merge
            </Button>
          </div>
        </div>

        {isLoading && technicians.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Technicians Found</h3>
              <p className="text-text/70 dark:text-text mt-2">Technicians will appear here once installations are created and assigned.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1 text-left text-xs font-medium text-text/60">Technician</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-text/60">Installations</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.map((tech) => (
                  <tr key={tech.name} className="border-b border-border/50 hover:bg-background/50">
                    <td className="px-2 py-1 text-xs text-text">{tech.name}</td>
                    <td className="px-2 py-1 text-xs text-left text-text/70">{tech.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {showMergeModal && (
          <MergeModal
            technicians={technicians}
            onMerge={handleMerge}
            onClose={() => setShowMergeModal(false)}
          />
        )}

        {editingProfile && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingProfile(null)}
          >
            <div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Edit Profile: {editingProfile.name}</h2>
                  <button onClick={() => setEditingProfile(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Full Name</label>
                  <input type="text" value={editingProfile.fullName} onChange={(e) => setEditingProfile({ ...editingProfile, fullName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Nickname</label>
                  <input type="text" value={editingProfile.nickname} onChange={(e) => setEditingProfile({ ...editingProfile, nickname: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nickname" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-1">Address</label>
                  <input type="text" value={editingProfile.address} onChange={(e) => setEditingProfile({ ...editingProfile, address: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Address" />
                </div>

                {/* Recent Installations */}
                <div>
                  <label className="block text-xs font-medium text-text/50 uppercase tracking-wider mb-2">Recent Installations — double-click to view</label>
                  {recentInstallations.length === 0 ? (
                    <p className="text-xs text-text/40 italic">No installations found for this technician.</p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-background border-b border-border">
                            <th className="px-3 py-2 text-left text-text/50 font-semibold uppercase tracking-wider">Date</th>
                            <th className="px-3 py-2 text-left text-text/50 font-semibold uppercase tracking-wider">Subscriber</th>
                            <th className="px-3 py-2 text-left text-text/50 font-semibold uppercase tracking-wider">Acct #</th>
                            <th className="px-3 py-2 text-left text-text/50 font-semibold uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentInstallations.map((inst, idx) => (
                            <tr
                              key={inst.id || idx}
                              onDoubleClick={() => setViewingInstallation(inst)}
                              className="border-b border-border/50 last:border-0 hover:bg-primary/5 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 text-text/70 whitespace-nowrap">{formatDateDisplay(inst.dateInstalled || '')}</td>
                              <td className="px-3 py-2 text-text font-medium truncate max-w-[120px]">{inst.subscriberName || '-'}</td>
                              <td className="px-3 py-2 text-text/70 font-mono">{String(inst.accountNumber || '').replace(/\.0$/, '') || '-'}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  (inst.status || 'pending') === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {inst.status || 'pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleUpdateProfile} className="flex-1">Save</Button>
                  <Button variant="secondary" onClick={() => setEditingProfile(null)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Installation Detail Modal (from technician popup double-click) */}
        {viewingInstallation && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
            onClick={() => setViewingInstallation(null)}
          >
            <div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{viewingInstallation.subscriberName || '-'}</h3>
                    <p className="text-white/70 text-xs">Acct #{String(viewingInstallation.accountNumber || '').replace(/\.0$/, '')}</p>
                  </div>
                  <button onClick={() => setViewingInstallation(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-text/40 uppercase">Date</p><p className="font-medium text-text">{formatDateDisplay(viewingInstallation.dateInstalled || '')}</p></div>
                <div><p className="text-xs text-text/40 uppercase">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${(viewingInstallation.status || 'pending') === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {viewingInstallation.status || 'pending'}
                  </span>
                </div>
                <div><p className="text-xs text-text/40 uppercase">JO #</p><p className="font-medium text-text">{viewingInstallation.joNumber || '-'}</p></div>
                <div><p className="text-xs text-text/40 uppercase">Technician</p><p className="font-medium text-text">{viewingInstallation.assignedTechnician || '-'}</p></div>
                <div className="col-span-2"><p className="text-xs text-text/40 uppercase">Address</p><p className="font-medium text-text">{viewingInstallation.address || '-'}</p></div>
                <div><p className="text-xs text-text/40 uppercase">Contact #1</p><p className="font-medium text-text">{viewingInstallation.contactNumber1 || '-'}</p></div>
                <div><p className="text-xs text-text/40 uppercase">Modem S/N</p><p className="font-medium text-text">{viewingInstallation.modemSerial || '-'}</p></div>
                <div><p className="text-xs text-text/40 uppercase">Port</p><p className="font-medium text-text">{viewingInstallation.port || '-'}</p></div>
              </div>
              <div className="px-4 pb-4">
                <button onClick={() => setViewingInstallation(null)} className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </LayoutWrapper>
  );
}