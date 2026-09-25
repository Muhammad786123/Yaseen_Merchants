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

  async saveSetting(key, value) {
    const existing = await db.settings.where({ key }).first();
    if (existing) {
      await db.settings.update(existing.id, { value });
    } else {
      await db.settings.add({ id: 's_' + Date.now(), key, value });
    }
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
