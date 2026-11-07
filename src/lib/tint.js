import { createContext, useContext } from 'react';
import { colors } from '../theme';
// Profile pages (driver, team) colour their buttons, tabs and headings with the team colour. Shared components read it with useTint(); everywhere else
// it falls back to the user's accent colour.
export const TintCtx = createContext(null);
export const useTint = () => useContext(TintCtx) || colors.accent;
