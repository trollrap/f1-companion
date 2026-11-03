// Motorsport news from public RSS/Atom feeds. No account, no key. A feed that is down or has moved is skipped and listed as unavailable.
// Feed addresses could not be reached from the build sandbox: Settings > Check data sources tests every one from the phone.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOURCES = [
  { id: 'bbc', name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml' },
  { id: 'autosport', name: 'Autosport', url: 'https://www.autosport.com/rss/f1/news' },
  { id: 'motorsport', name: 'Motorsport.com', url: 'https://www.motorsport.com/rss/f1/news/' },
  { id: 'racefans', name: 'RaceFans', url: 'https://www.racefans.net/feed/' },
  { id: 'therace', name: 'The Race', url: 'https://the-race.com/feed/' },
  { id: 'crash', name: 'Crash.net', url: 'https://www.crash.net/rss/f1' },
  { id: 'planetf1', name: 'PlanetF1', url: 'https://www.planetf1.com/feed' },
];
const TTL = 10 * 60e3, UA = { 'User-Agent': 'Mozilla/5.0 (Android) F1Companion/1.8', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
export const decode = (s) => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n); } catch { return ''; } }
  return ENT[e.toLowerCase()] ?? m;
});
const unCdata = (s) => String(s || '').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
const tagOf = (xml, name) => { const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml); return m ? unCdata(m[1]).trim() : ''; };
const attrOf = (xml, tag, attr) => { const m = new RegExp(`<${tag}\\b[^>]*?\\b${attr}=["']([^"']+)["']`, 'i').exec(xml); return m ? decode(m[1]) : ''; };
export const stripTags = (h) => decode(String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const firstImg = (h) => { const m = /<img\b[^>]*?\bsrc=["']([^"']+)["']/i.exec(h || ''); return m ? decode(m[1]) : ''; };

export function parseFeed(xml, source) {
  const items = []; const blocks = String(xml).match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = stripTags(tagOf(b, 'title')); if (!title) continue;
    let link = tagOf(b, 'link'); if (!link || /^\s*</.test(link)) link = attrOf(b, 'link', 'href'); link = decode(link).trim();
    if (!link) link = tagOf(b, 'guid');
    const date = Date.parse(tagOf(b, 'pubDate') || tagOf(b, 'published') || tagOf(b, 'updated') || tagOf(b, 'dc:date')) || 0;
    const html = tagOf(b, 'content:encoded') || tagOf(b, 'content');
    const sum = tagOf(b, 'description') || tagOf(b, 'summary');
    const img = attrOf(b, 'media:content', 'url') || attrOf(b, 'media:thumbnail', 'url') || (/<enclosure\b[^>]*type=["']image/i.test(b) ? attrOf(b, 'enclosure', 'url') : '') || firstImg(html) || firstImg(sum);
    items.push({ id: `${source.id}:${link || title}`, source: source.id, sourceName: source.name, title, link, date, image: img, summary: stripTags(sum).slice(0, 400), html: html || '' });
  }
  return items.sort((a, b) => b.date - a.date);
}
// One feed, kept for 10 minutes; a failed request falls back to the last saved copy.
export async function fetchFeed(source, { fresh = false } = {}) {
  const key = `news:${source.id}`; let saved = null;
  try { const r = await AsyncStorage.getItem(key); if (r) saved = JSON.parse(r); } catch {}
  if (saved && !fresh && Date.now() - saved.t < TTL) return saved.items;
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(source.url, { headers: UA, signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const items = parseFeed(await r.text(), source); if (!items.length) throw new Error('no articles in the feed');
    const keep = items.slice(0, 15); AsyncStorage.setItem(key, JSON.stringify({ t: Date.now(), items: keep.map((x) => ({ ...x, html: '' })) })).catch(() => {});
    return keep;
  } catch (e) { if (saved) return saved.items; throw e; }
}
// Every chosen source at once, newest first, the same story from two sources only once. `failed` lists the sources that could not be read.
export async function fetchNews(ids, opts) {
  const list = SOURCES.filter((s) => !ids || ids.includes(s.id));
  const res = await Promise.allSettled(list.map((s) => fetchFeed(s, opts)));
  const failed = list.filter((_, i) => res[i].status === 'rejected').map((s) => s.name);
  const seen = new Set(); const items = [];
  res.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).sort((a, b) => b.date - a.date).forEach((x) => { const k = x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60); if (seen.has(k)) return; seen.add(k); items.push(x); });
  return { items, failed };
}

// ---- article body: blocks of { t: 'p'|'h'|'img'|'quote', v } ----
export function htmlToBlocks(html, base) {
  const out = []; if (!html) return out;
  const clean = String(html).replace(/<(script|style|noscript|svg|form|iframe|aside|figcaption)[\s\S]*?<\/\1>/gi, '');
  const re = /<(h[1-6]|p|blockquote|li|img)\b([^>]*)>([\s\S]*?)(?=<(?:h[1-6]|p|blockquote|li|img)\b|$)/gi; let m;
  while ((m = re.exec(clean))) {
    const tag = m[1].toLowerCase();
    if (tag === 'img') { const src = /\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i.exec(m[2])?.[1]; const w = Number(/\bwidth=["']?(\d+)/i.exec(m[2])?.[1] || 999); if (src && w >= 200 && !/^data:|pixel|logo|icon|avatar|emoji/i.test(src)) out.push({ t: 'img', v: abs(decode(src), base) }); const rest = stripTags(m[3]); if (rest.length > 30) out.push({ t: 'p', v: rest }); continue; }
    const inner = m[3]; const imgs = [...inner.matchAll(/<img\b[^>]*?\b(?:data-src|src)=["']([^"']+)["']/gi)].map((x) => abs(decode(x[1]), base));
    const text = stripTags(inner).replace(/\n+/g, ' ').trim();
    if (text.length > (tag === 'li' ? 20 : 2)) out.push({ t: tag[0] === 'h' ? 'h' : tag === 'blockquote' ? 'quote' : 'p', v: text });
    imgs.filter((u) => !/pixel|logo|icon|avatar|emoji|^data:/i.test(u)).slice(0, 1).forEach((u) => out.push({ t: 'img', v: u }));
  }
  return out;
}
const abs = (u, base) => { try { return new URL(u, base).toString(); } catch { return u; } };
const skipText = /^(read more|related|share|follow us|subscribe|advertisement|sign up|click here|comments?)\b/i;
// Full text: the feed's own body when it has one, otherwise the article page itself (its <article> element). Falls back to the feed summary.
export async function fetchArticle(item) {
  let blocks = htmlToBlocks(item.html, item.link);
  if (blocks.filter((b) => b.t === 'p').length < 3 && item.link) {
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(item.link, { headers: UA, signal: ctrl.signal }).finally(() => clearTimeout(timer));
      if (r.ok) {
        const page = await r.text(); const art = /<article\b[\s\S]*?<\/article>/i.exec(page)?.[0] || /<main\b[\s\S]*?<\/main>/i.exec(page)?.[0] || '';
        const b2 = htmlToBlocks(art, item.link); if (b2.filter((b) => b.t === 'p').length >= 2) blocks = b2;
      }
    } catch {}
  }
  blocks = blocks.filter((b) => b.t === 'img' || !skipText.test(b.v));
  if (!blocks.some((b) => b.t === 'p') && item.summary) blocks = [...blocks, { t: 'p', v: item.summary }];
  const seen = new Set(); blocks = blocks.filter((b) => { const k = b.t + b.v; if (seen.has(k)) return false; seen.add(k); return true; });
  if (item.image) blocks = blocks.filter((b) => !(b.t === 'img' && b.v === item.image));
  return blocks.slice(0, 60);
}
