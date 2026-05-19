import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TechnicianProfile {
  id: string;
  fullName: string;
  nickname: string;
  address: string;
  phone: string;
  photo: string;
  installationCount: number;
  createdAt: string;
}

interface TechnicianProfilesState {
  profiles: TechnicianProfile[];
  addProfile: (name: string) => TechnicianProfile;
  updateProfile: (id: string, data: Partial<Omit<TechnicianProfile, 'id' | 'installationCount' | 'createdAt'>>) => void;
  deleteProfile: (id: string) => void;
  getProfileByName: (name: string) => TechnicianProfile | undefined;
  mergeTechnicians: (fromNames: string[], toName: string) => void;
  updateInstallationCount: (name: string, count: number) => void;
}

export const useTechnicianProfilesStore = create<TechnicianProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],

      addProfile: (name: string) => {
        const newProfile: TechnicianProfile = {
          id: `TECH-${Date.now()}`,
          fullName: name,
          nickname: '',
          address: '',
          phone: '',
          photo: '',
          installationCount: 0,
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          profiles: [...state.profiles, newProfile]
        }));
        
        return newProfile;
      },

      updateProfile: (id: string, data: Partial<Omit<TechnicianProfile, 'id' | 'installationCount' | 'createdAt'>>) => {
        set((state) => ({
          profiles: state.profiles.map(p => 
            p.id === id ? { ...p, ...data } : p
          )
        }));
      },

      deleteProfile: (id: string) => {
        set((state) => ({
          profiles: state.profiles.filter(p => p.id !== id)
        }));
      },

      getProfileByName: (name: string) => {
        const { profiles } = get();
        return profiles.find(p => 
          p.fullName.toLowerCase() === name.toLowerCase() ||
          p.nickname.toLowerCase() === name.toLowerCase()
        );
      },

      mergeTechnicians: (fromNames: string[], toName: string) => {
        const { profiles } = get();
        
        const normalizedFromNames = fromNames.map(n => n.toLowerCase().trim());
        const normalizedToName = toName.toLowerCase().trim();
        
        const targetProfile = profiles.find(p => 
          p.fullName.toLowerCase() === normalizedToName ||
          p.nickname.toLowerCase() === normalizedToName
        );

        let totalCount = targetProfile?.installationCount || 0;
        let finalFullName = targetProfile?.fullName || toName;
        let finalNickname = targetProfile?.nickname || '';
        let finalAddress = targetProfile?.address || '';

        const profilesToMerge = profiles.filter(p => 
          normalizedFromNames.includes(p.fullName.toLowerCase()) ||
          normalizedFromNames.includes(p.nickname?.toLowerCase() || '')
        );

        profilesToMerge.forEach(p => {
          totalCount += p.installationCount;
          if (p.fullName.toLowerCase() !== normalizedToName && !normalizedFromNames.includes(p.fullName.toLowerCase())) {
            if (p.fullName.length > finalFullName.length) finalFullName = p.fullName;
          }
          if (p.nickname && p.nickname.toLowerCase() !== normalizedToName && p.nickname.length > finalNickname.length) {
            finalNickname = p.nickname;
          }
          if (p.address && p.address.length > finalAddress.length) {
            finalAddress = p.address;
          }
        });

        const remainingProfiles = profiles.filter(p => 
          !normalizedFromNames.includes(p.fullName.toLowerCase()) &&
          !normalizedFromNames.includes(p.nickname?.toLowerCase() || '')
        );

        const finalProfile: TechnicianProfile = {
          id: targetProfile?.id || `TECH-${Date.now()}`,
          fullName: finalFullName,
          nickname: finalNickname,
          address: finalAddress,
          phone: targetProfile?.phone || '',
          photo: targetProfile?.photo || '',
          installationCount: totalCount,
          createdAt: targetProfile?.createdAt || new Date().toISOString()
        };

        set({
          profiles: [...remainingProfiles, finalProfile]
        });
      },

      updateInstallationCount: (name: string, count: number) => {
        set((state) => ({
          profiles: state.profiles.map(p => 
            p.fullName.toLowerCase() === name.toLowerCase() ||
            p.nickname?.toLowerCase() === name.toLowerCase()
              ? { ...p, installationCount: count }
              : p
          )
        }));
      }
    }),
    {
      name: 'technician-profiles-storage'
    }
  )
);