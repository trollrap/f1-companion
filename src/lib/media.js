import * as M from '../data/mediaIndex';
import { devPhoto } from './dev';
// Photos are optional: every screen has a designed fallback (team gradient + big number / initials) when a file is missing.
// Looked up through the whole module so an older generated index (before principals, engineers, numbers) still works until `npm run media` is run again.
export const driverPhoto = (driverId) => devPhoto('drivers', driverId) || (M.drivers || {})[driverId] || null;
export const teamCar = (teamId) => devPhoto('cars', teamId) || (M.cars || {})[teamId] || null;
export const teamLogo = (teamId) => devPhoto('logos', teamId) || (M.logos || {})[teamId] || null;
export const principalPhoto = (teamId) => devPhoto('principals', teamId) || (M.principals || {})[teamId] || null;
export const engineerPhoto = (driverId) => devPhoto('engineers', driverId) || (M.engineers || {})[driverId] || null;
export const numberImage = (driverId) => devPhoto('numbers', driverId) || (M.numbers || {})[driverId] || null;
export const appLogo = M.appLogo || null;

export const driverPhotoIds = () => Object.keys((M.drivers || {}));
