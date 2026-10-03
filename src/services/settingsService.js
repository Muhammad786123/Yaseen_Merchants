import { db } from '../db/database.js';

export const settingsService = {
  async getSettings() {
    const list = await db.settings.toArray();
    const map = {};
    list.forEach(item => {
      map[item.key] = item.value;
    });
    return map;
  },

  async getSetting(key) {
    const record = await db.settings.where({ key }).first();
    return record ? record.value : null;
  },

  async saveSetting(key, value) {
    const existing = await db.settings.where({ key }).first();
    if (existing) {
      await db.settings.update(existing.id, { value });
    } else {
      await db.settings.add({ id: 's_' + Date.now(), key, value });
    }
  },

  async getCompanyProfile() {
    const profile = await this.getSetting('companyProfile');
    if (profile && typeof profile === 'object') {
      return profile;
    }
    const settings = await this.getSettings();
    return {
      legalName: settings.companyName || 'Shahid Yaseen Cotton Waste Merchant',
      tagline: settings.tagline || 'Wholesale Cotton Waste, Fabrics & Textile Fibers Merchant',
      address: settings.city || 'Faisalabad, Pakistan',
      phone: settings.phone || '+92 300 1234567',
      fiscalYear: settings.fiscalYear || '2026-2027',
      logoUrl: settings.logoUrl || '',
    };
  },

  async saveCompanyProfile(profileData) {
    await this.saveSetting('companyProfile', profileData);
    if (profileData.legalName) await this.saveSetting('companyName', profileData.legalName);
    if (profileData.address) await this.saveSetting('city', profileData.address);
    if (profileData.phone) await this.saveSetting('phone', profileData.phone);
    if (profileData.fiscalYear) await this.saveSetting('fiscalYear', profileData.fiscalYear);
    if (profileData.tagline) await this.saveSetting('tagline', profileData.tagline);
    if (profileData.logoUrl !== undefined) await this.saveSetting('logoUrl', profileData.logoUrl);
    return profileData;
  },

  async getUsers() {
    return await db.users.toArray();
  },

  async addUser(userData) {
    const id = userData.id || 'u_' + Date.now();
    const newUser = {
      id,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'Staff',
      status: userData.status || 'Active',
    };
    await db.users.add(newUser);
    return newUser;
  },

  async updateUser(id, userData) {
    const existing = await db.users.get(id);
    if (!existing) throw new Error('User not found');
    const updated = { ...existing, ...userData };
    await db.users.put(updated);
    return updated;
  },

  async deleteUser(id) {
    return await db.users.delete(id);
  },
};
