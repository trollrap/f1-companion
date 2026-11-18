import React, { useEffect, useState } from 'react';
import { Share, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Text } from '../components/Text';
import Screen, { Card } from '../components/Screen';
import { StatHeader } from '../components/StatRows';
import { Btn } from '../components/FunBits';
import { colors } from '../theme';
import { readCrashes } from '../lib/crashlog';
import { readNewsLog, readBgRuns } from '../lib/newsAlerts';
import { readInbox } from '../lib/inbox';
import { currentVersion } from '../lib/update';
import { kvGet } from '../lib/kv';

const ts = (t) => { try { return new Date(t).toISOString().replace('T', ' ').slice(0, 19); } catch { return '?'; } };
async function build() {
  const out = []; const add = (s = '') => out.push(s);
  add(`F1 Companion report ${new Date().toISOString()}`);
  add(`Version ${currentVersion()} · ${Platform.OS} ${Platform.Version} · runtime ${String(Constants.expoConfig?.runtimeVersion || '?')}`);
  try { const U = require('expo-updates'); add(`Update ${U.updateId || 'embedded build'} · channel ${U.channel || '-'}`); } catch {}
  let perm = '?'; try { const n = require('expo-notifications'); const p = await n.getPermissionsAsync(); perm = p.granted ? 'granted' : `not granted (${p.status})`; } catch {}
  add(`Notification permission: ${perm}`);
  const prefs = await kvGet('prefs', {}); const o = prefs.opts || {};
  const news = Object.keys(o.newsAlerts || {}).filter((k) => o.newsAlerts[k]);
  add(`Alerts: results ${prefs.results ? 'on' : 'off'} · news sources on: ${news.length ? news.join(', ') : 'none'} · favourites only ${o.newsFavOnly ? 'yes' : 'no'}`);
  const runs = await readBgRuns(); add(`Background checks seen: ${runs.length}${runs.length ? `, last ${ts(runs[runs.length - 1])}` : ''}`);
  const nl = await readNewsLog();
  if (nl) { add(`Last news check ${ts(nl.t)}${nl.force ? ' (manual)' : ''}, sent ${nl.sent || 0}${nl.quiet ? ', quiet hours' : ''}`); (nl.src || []).forEach((s) => add(`  ${s.ok ? 'OK' : 'FAIL'} ${s.name}: ${s.count} items, ${s.fresh} new, ${s.sent} sent${s.baseline ? ', baseline' : ''}${s.err ? `, ${s.err}` : ''}`)); } else add('No news check recorded yet.');
  const inbox = await readInbox(); add(`Alerts inbox: ${inbox.length} entries`); inbox.slice(0, 8).forEach((x) => add(`  ${ts(x.t)} [${x.status || '-'}] ${x.title}`));
  const cr = await readCrashes(); add(`Crash log: ${cr.length} entries`); cr.slice(0, 8).forEach((x) => add(`  ${ts(x.t)} [${x.where}] ${String(x.msg).split('\n')[0].slice(0, 160)}`));
  return out.join('\n');
}
export default function ReportScreen() {
  const [txt, setTxt] = useState(null);
  useEffect(() => { build().then(setTxt).catch((e) => setTxt(`Could not build the report: ${(e && e.message) || e}`)); }, []);
  return (
    <Screen header={false}>
      <StatHeader title="Send a report" icon="mail" note="Bundles the version, alert and news checks and the crash log into one text you can share. It holds no personal data beyond your alert settings." />
      {txt ? <Btn tone="solid" icon="share-outline" onPress={() => { Share.share({ message: txt }).catch(() => {}); }}>Share the report</Btn> : null}
      <Card><Text style={{ color: colors.fg, fontSize: 12 }} selectable>{txt || 'Collecting…'}</Text></Card>
    </Screen>);
}
