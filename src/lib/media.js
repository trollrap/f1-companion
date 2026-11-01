import * as M from '../data/mediaIndex';
// Photos are optional: every screen has a designed fallback (team gradient + big number / initials) when a file is missing.
// Looked up through the whole module so an older generated index (before principals, engineers, numbers) still works until `npm run media` is run again.
export const driverPhoto = (driverId) => (M.drivers || {})[driverId] || null;
export const teamCar = (teamId) => (M.cars || {})[teamId] || null;
export const teamLogo = (teamId) => (M.logos || {})[teamId] || null;
export const principalPhoto = (teamId) => (M.principals || {})[teamId] || null;
export const engineerPhoto = (driverId) => (M.engineers || {})[driverId] || null;
export const numberImage = (driverId) => (M.numbers || {})[driverId] || null;
export const appLogo = M.appLogo || null;
