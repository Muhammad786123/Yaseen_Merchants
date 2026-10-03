import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService.js';
import defaultLogo from '../assets/logo.png';

export const DEFAULT_COMPANY_PROFILE = {
  legalName: 'Shahid Yaseen Cotton Waste Merchant',
  tagline: 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant',
  address: 'Faisalabad, Pakistan',
  phone: '+92 300 1234567',
  fiscalYear: '2026-2027',
  logoUrl: '',
};

const CompanyProfileContext = createContext({
  profile: DEFAULT_COMPANY_PROFILE,
  defaultLogo,
  loading: true,
  updateProfile: async () => {},
  reloadProfile: async () => {},
});

export function CompanyProfileProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_COMPANY_PROFILE);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await settingsService.getCompanyProfile();
      if (data) {
        setProfile((prev) => ({
          ...DEFAULT_COMPANY_PROFILE,
          ...data,
        }));
      }
    } catch (err) {
      console.error('Failed to load company profile from settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = async (newProfileData) => {
    const updated = {
      ...profile,
      ...newProfileData,
    };
    await settingsService.saveCompanyProfile(updated);
    setProfile(updated);
    return updated;
  };

  return (
    <CompanyProfileContext.Provider
      value={{
        profile,
        defaultLogo,
        loading,
        updateProfile,
        reloadProfile: loadProfile,
      }}
    >
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfile() {
  const ctx = useContext(CompanyProfileContext);
  if (!ctx) {
    return {
      profile: DEFAULT_COMPANY_PROFILE,
      defaultLogo,
      loading: false,
      updateProfile: async () => {},
      reloadProfile: async () => {},
    };
  }
  return ctx;
}
