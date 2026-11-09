// Backup and restore of everything that lives on the phone: fantasy saves, settings, predictions, friends, favourites, developer overrides.
// The backup is one JSON file. Caches (keys starting with "c:") are left out, they download again.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readDurable, writeDurable } from './durable';
const DURABLE = ['fun:v1', 'prefs:v2', 'welcomed', 'accent'];
const fs = () => { try { return require('expo-file-system/legacy'); } catch { return null; } };
export async function makeBackup() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => !k.startsWith('c:') && !DURABLE.includes(k));
  const pairs = await AsyncStorage.multiGet(keys); const plain = {}; pairs.forEach(([k, v]) => { if (v != null) plain[k] = v; });
  const durable = {}; for (const k of DURABLE) { const v = await readDurable(k); if (v != null) durable[k] = v; }
  return JSON.stringify({ app: 'f1-companion', format: 1, at: new Date().toISOString(), durable, plain });
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
// Writes the backup into the remembered folder when there is one, otherwise opens the share sheet. Returns a short text for the screen.
export async function exportBackup() {
  const text = await makeBackup(); const name = `f1-companion-backup-${stamp()}.json`; const FS = fs(); if (!FS) throw new Error('Files are not available in this build.');
  let dir = null; try { dir = await AsyncStorage.getItem('saveDir'); } catch {}
  if (dir && FS.StorageAccessFramework) { try { const uri = await FS.StorageAccessFramework.createFileAsync(dir, name.replace(/\.json$/, ''), 'application/json'); await FS.writeAsStringAsync(uri, text, { encoding: FS.EncodingType.UTF8 }); return `Saved ${name} in your chosen folder.`; } catch {} }
  const path = `${FS.documentDirectory}${name}`; await FS.writeAsStringAsync(path, text);
  const Sharing = require('expo-sharing'); if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Save your backup' }); return `Backup ready: ${name}`; }
  throw new Error('Sharing is not available on this phone.');
}
// Lists backup files in a folder the user picks.
export async function findBackups() {
  const FS = fs(); const SAF = FS && FS.StorageAccessFramework; if (!SAF) throw new Error('Folder access is not available in this build.');
  const p = await SAF.requestDirectoryPermissionsAsync(); if (!p.granted) return [];
  const list = await SAF.readDirectoryAsync(p.directoryUri);
  return list.filter((u) => /backup/i.test(decodeURIComponent(u)) && /\.json/i.test(decodeURIComponent(u))).map((u) => ({ uri: u, name: decodeURIComponent(u).split('/').pop().replace(/^.*:/, '') })).reverse();
}
export async function restoreFrom(uri) {
  const FS = fs(); const txt = await FS.StorageAccessFramework.readAsStringAsync(uri); let j; try { j = JSON.parse(txt); } catch { throw new Error('That file is not a valid backup.'); }
  if (!j || j.app !== 'f1-companion' || !j.durable || !j.plain) throw new Error('That file is not an F1 Companion backup.');
  for (const [k, v] of Object.entries(j.durable)) { if (typeof v === 'string' && v) await writeDurable(k, v); }
  for (const [k, v] of Object.entries(j.plain)) { if (typeof v === 'string') await AsyncStorage.setItem(k, v); }
  return { saves: (() => { try { return (JSON.parse(j.durable['fun:v1'] || '{}').fantasies || []).length; } catch { return 0; } })(), keys: Object.keys(j.plain).length + Object.keys(j.durable).length, at: j.at };
}
