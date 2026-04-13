import { resolveBackendAssetUrl } from './assetUrl'

// src/utils/profileUtils.js
export const getProfilePhotoUrl = (photoPath) => {
  return resolveBackendAssetUrl(photoPath)
}

export const getInitials = (name) => {
  if (!name) return 'U';
  return name.charAt(0).toUpperCase();
};

export const cleanUsername = (username) => {
  if (!username) return '';
  return username.toLowerCase()
    .replace(/^ormawa_/, '')
    .replace(/^ukm_/, '')
    .replace(/^admin_/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
};