import { STORY, ROOMS, OFFICE, ENDING, GEM, gematria, SAFE_CODE, TEACHER_CODE } from './data.js?v=9';
import { faceSVG, comicSVG, STAGE_SVG, AVATAR, ILLUSIONS } from './art.js?v=9';
import * as SND from './audio.js?v=9';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } if (html) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const roomById = id => ROOMS.find(r => r.id === id);

/* ---------------- מצב ושמירה ---------------- */
const KEY = 'psych_escape_v1';
// קצב הזמנים במשחק (ברירת מחדל: זמנים אמיתיים)
const TS = /[?&]fast=1(&|$)/.test(location.search) ? 0.1 : 1;
const HINT1_MS = 45000 * TS, HINT2_MS = 120000 * TS, COOL_MS = 30000 * TS, PEN_MS = 60000, PEEK_MS = 6000 * (TS < 1 ? 0.3 : 1);
const fresh = () => ({ v: 1, group: '', timer: { mode: 'stopwatch', minutes: 45 }, started: 0, finishMs: 0, solved: [], words: ['', '', '', '', ''], clues: {}, hints: {}, step: {}, timeUpShown: false, seen: [], enter: {}, hintT: {}, wrong: {}, cool: {} });
let S = load();
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) { } return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
let TEACHER = sessionStorage.getItem('pe_teacher') === '1';
const isSolved = id => S.solved.includes(id);
const isOpen = id => TEACHER || id === 'print' || (id === 'office' ? ROOMS.every(r => isSolved(r.id)) : isSolved(ROOMS[roomById(id).n - 2].id));
const found = (rid, cid) => (S.clues[rid] || []).includes(cid);
function markFound(rid, cid) { S.clues[rid] = S.clues[rid] || []; if (!S.clues[rid].includes(cid)) { S.clues[rid].push(cid); save(); SND.sfx('clue'); } refreshMarkers(); renderPanel(); }
const spot = id => id === 'office' ? OFFICE : roomById(id);
const allFound = id => spot(id).clues.every(c => found(id, c.id));

/* ---------------- נרמול תשובות ---------------- */
const FIN = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };
export const norm = s => String(s).toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[םןץףך]/g, c => FIN[c]).replace(/^\s*the\s+/, '').replace(/[^a-z\u05d0-\u05ea]/g, '').replace(/ה/g, '');
function lev(a, b) { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
export function accepts(input, list) { const x = norm(input); if (!x) return false; return list.some(a => { const y = norm(a); if (x === y) return true; if (y.length >= 5 && x.includes(y)) return true; const tol = y.length >= 10 ? 2 : y.length >= 6 ? 1 : 0; return lev(x, y) <= tol; }); }

/* ---------------- טיימר ---------------- */
const fmt = ms => { const neg = ms < 0; ms = Math.abs(ms); const t = Math.floor(ms / 1000), m = Math.floor(t / 60), s = t % 60; return (neg ? '+' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
const elapsed = () => S.started ? ((S.finishMs || Date.now()) - S.started) : 0;
const penalty = () => totalHints() * PEN_MS;
const gameMs = () => elapsed() + penalty();
function tickTimer() {
  const el = $('#timer'); if (!el) return;
  const mode = S.timer.mode;
  if (mode === 'none' || !S.started) { el.hidden = true; return; } el.hidden = false;
  if (mode === 'stopwatch') { el.textContent = '⏱ ' + fmt(gameMs()); el.classList.remove('late', 'warn'); return; }
  const left = S.timer.minutes * 60000 - gameMs();
  if (left > 0) { el.textContent = '⏳ ' + fmt(left); el.classList.toggle('warn', left < 60000); el.classList.remove('late'); return; }
  el.textContent = '⏳ +' + fmt(-left); el.classList.add('late');
  if (!S.timeUpShown && !S.finishMs && !$('#game').hidden) { S.timeUpShown = true; save(); openModal({ title: '⏰ הזמן נגמר!', html: '<p class="big">הזמן שהמורה קבעה נגמר.</p><p>אבל בלשים טובים לא מוותרים – אפשר להמשיך ולפתור. השעון ימשיך לספור כמה זמן עבר מעבר לזמן.</p>', buttons: [{ t: 'ממשיכים בחקירה 🔍', primary: true }] }); }
}
setInterval(tickTimer, 1000);

/* ---------------- מודאל ---------------- */
let modalClose = null, modalAt = 0;
function openModal({ title, html = '', node = null, wide = false, buttons = [], onClose = null, cls = '' }) {
  const m = $('#modal'), body = $('#mbody');
  $('#mtitle').textContent = title || '';
  body.innerHTML = html; if (node) body.appendChild(node);
  const bb = h('div', { class: 'mbtns' });
  buttons.forEach(b => bb.appendChild(h('button', { class: 'btn ' + (b.primary ? 'primary' : 'ghost'), onclick: () => { if (b.fn) { if (b.fn() === false) return; } if (!b.keep) closeModal(); } }, b.t)));
  if (buttons.length) body.appendChild(bb);
  $('#mcard').className = 'mcard ' + (wide ? 'wide ' : '') + cls;
  m.hidden = false; modalClose = onClose; body.scrollTop = 0; modalAt = performance.now();
  requestAnimationFrame(() => { const f = body.querySelector('input,button'); if (f && matchMedia('(pointer:fine)').matches) f.focus({ preventScroll: true }); });
}
function closeModal() { const m = $('#modal'); if (m.hidden) return; m.hidden = true; $('#mbody').innerHTML = ''; const f = modalClose; modalClose = null; if (f) f(); }
let toastT = 0;
function toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
function wrongFx(el, msg = 'נסו שוב 🙂') { SND.sfx('wrong'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } const f = $('#mbody .feedback'); if (f) { f.className = 'feedback bad'; f.textContent = msg; } }
function okFx(msg) { SND.sfx('ok'); const f = $('#mbody .feedback'); if (f) { f.className = 'feedback good'; f.textContent = msg; } }

/* ---------------- רמזים ---------------- */
function hintInfo(key, hints) {
  const n = S.hints[key] || 0, now = Date.now();
  if (n >= hints.length) return { n, done: true };
  if (TEACHER) return { n, ready: true };
  if (n === 0) { const at = (S.enter[key] || now) + HINT1_MS; return at <= now ? { n, ready: true } : { n, wait: at - now }; }
  if (n === 1) { const at = ((S.hintT[key] || [])[0] || now) + HINT2_MS; return at <= now ? { n, ready: true } : { n, wait: at - now }; }
  const w = S.wrong[key] || 0; return w >= 2 ? { n, ready: true } : { n, needWrong: 2 - w };
}
const LIVE = new Set();
function liveTick() { LIVE.forEach(f => { if (!f._el.isConnected) LIVE.delete(f); else f(); }); applyCool(); }
setInterval(liveTick, 1000);
function hintBox(key, hints) {
  const wrap = h('div', { class: 'hints' });
  const list = h('ol', { class: 'hint-list' });
  const btn = h('button', { class: 'btn hint-btn', type: 'button' });
  const note = h('p', { class: 'hint-rule' }, 'רמז 1 נפתח 45 שניות אחרי שנכנסים לחדר, רמז 2 – שתי דקות אחרי שפתחתם את רמז 1, ורמז 3 – רק אחרי 2 ניסיונות שגויים במנעול. <b>כל רמז מוסיף דקה לזמן הקבוצה.</b>');
  let shown = -1;
  const draw = () => {
    if (TEACHER) { if (shown !== 99) { list.innerHTML = hints.map(x => `<li>${x}</li>`).join(''); shown = 99; } btn.hidden = true; note.textContent = '👩‍🏫 מצב מורה: כל הרמזים גלויים, בלי המתנה ובלי תוספת זמן.'; return; }
    const st = hintInfo(key, hints);
    if (st.n !== shown) { list.innerHTML = hints.slice(0, st.n).map(x => `<li>${x}</li>`).join(''); shown = st.n; }
    btn.hidden = false; btn.classList.toggle('ready', !!st.ready); btn.classList.toggle('locked', !st.ready && !st.done);
    if (st.done) { btn.textContent = '💡 פתחתם את כל הרמזים'; btn.disabled = true; }
    else if (st.ready) { btn.textContent = `💡 לפתוח רמז ${st.n + 1} מתוך ${hints.length} (+1 דקה)`; btn.disabled = false; }
    else if (st.wait) { btn.innerHTML = `🔒 רמז ${st.n + 1} ייפתח בעוד <b class="hcd">${fmt(Math.ceil(st.wait / 1000) * 1000)}</b>`; btn.disabled = true; }
    else { btn.textContent = `🔒 רמז 3 ייפתח אחרי 2 ניסיונות שגויים במנעול${st.needWrong === 1 ? ' (נשאר עוד אחד)' : ''}`; btn.disabled = true; }
  };
  btn.addEventListener('click', () => { const st = hintInfo(key, hints); if (!st.ready || TEACHER) return; S.hints[key] = st.n + 1; S.hintT[key] = [...(S.hintT[key] || []), Date.now()]; save(); SND.sfx('click'); toast('💡 רמז נפתח · +1 דקה לזמן הקבוצה'); tickTimer(); liveTick(); });
  draw._el = wrap; LIVE.add(draw); draw(); wrap.append(btn, list, note); return wrap;
}
/* ---------- נעילת 30 שניות אחרי תשובה שגויה ---------- */
const coolLeft = key => TEACHER ? 0 : Math.max(0, (S.cool[key] || 0) - Date.now());
function lockWrong(key, el, msg) {
  wrongFx(el, msg);
  if (TEACHER) return;
  S.wrong[key] = (S.wrong[key] || 0) + 1; S.cool[key] = Date.now() + COOL_MS; save();
  liveTick();
}
function applyCool() {
  const w = $('#mbody .lock');
  if (w && w.dataset.key) {
    const left = coolLeft(w.dataset.key), body = w.querySelector('.lbody'); let ov = body && body.querySelector('.cool');
    if (left > 0 && body) { if (!ov) { ov = h('div', { class: 'cool', role: 'status' }); body.appendChild(ov); } ov.innerHTML = `<div><span class="cl-ic">🔒</span><b>המנעול ננעל אחרי תשובה שגויה</b><span class="cl-t">${fmt(Math.ceil(left / 1000) * 1000)}</span><small>אפשר לנסות שוב כשהשעון יגיע ל-00:00. בינתיים חשבו ביחד או הסתכלו שוב ברמזים.</small></div>`; w.classList.add('cooling'); }
    else if (ov) { ov.remove(); w.classList.remove('cooling'); const f = w.querySelector('.feedback'); if (f && f.classList.contains('bad')) { f.className = 'feedback'; f.textContent = 'המנעול פתוח שוב – נסו עכשיו 🙂'; } }
  }
  const lb = $('#panel .lockbtn'); if (lb && lb.dataset.key) { const left = coolLeft(lb.dataset.key); const base = lb.dataset.base; lb.textContent = left > 0 ? `🔒 ${base} – נעול עוד ${fmt(Math.ceil(left / 1000) * 1000)}` : lb.dataset.label; }
}
const totalHints = () => Object.values(S.hints).reduce((a, b) => a + b, 0);

/* ======================= סצנות מצוירות (תלת ממד מרונדר) ======================= */
let curView = 'hub', cur = null, spotEls = [], panX = 0, panY = 0, lay = null;
const MEDIA = {};
const M = p => (MEDIA[p] || '') + p;
const SCN_Z = { hub: 1 };
const SCN = {"hub": {"img": "hub", "spots": [{"id": "go:print", "x": 11, "y": 38, "r": [2, 15, 20, 46]}, {"id": "go:cinema", "x": 32, "y": 38, "r": [23, 6, 18, 52]}, {"id": "go:telegraph", "x": 49, "y": 36, "r": [44, 15, 10, 42]}, {"id": "go:freud", "x": 63, "y": 36, "r": [56, 20, 14, 38]}, {"id": "go:gallery", "x": 85, "y": 36, "r": [76, 18, 22, 37]}, {"id": "go:office", "x": 86, "y": 70, "r": [77, 56, 19, 27]}]}, "print": {"img": "print", "spots": [{"id": "poster", "x": 9, "y": 16}, {"id": "press", "x": 32, "y": 42}, {"id": "note", "x": 27, "y": 84}, {"id": "x1", "x": 15, "y": 72, "decoy": "בקבוק דיו ישן ויבש. רק כתמי דיו כאן… 🖋️"}, {"id": "x2", "x": 88, "y": 76, "decoy": "ערימת עיתונים מאתמול. שום דבר מעניין."}, {"id": "lock", "x": 6, "y": 44}]}, "cinema": {"img": "cinema", "spots": [{"id": "poster", "x": 9, "y": 30}, {"id": "ticket", "x": 91, "y": 42}, {"id": "projector", "x": 77, "y": 50}, {"id": "x1", "x": 45, "y": 82, "decoy": "מושבי קטיפה ריקים… מישהו השאיר כאן קליפות של גרעינים 🌻"}, {"id": "x2", "x": 5, "y": 66, "decoy": "רק תנור חימום ישן שמקרקש."}, {"id": "lock", "x": 35, "y": 30}]}, "telegraph": {"img": "telegraph", "spots": [{"id": "telegram", "x": 63, "y": 49}, {"id": "board", "x": 84, "y": 32}, {"id": "machine", "x": 20, "y": 46}, {"id": "x1", "x": 24, "y": 33, "decoy": "מנורה ישנה. רק אבק כאן…"}, {"id": "x2", "x": 62, "y": 25, "decoy": "מעיל גשם רטוב על הקולב. לונדון, מה לעשות ☔"}, {"id": "lock", "x": 70, "y": 78}]}, "freud": {"img": "freud", "spots": [{"id": "sofa", "x": 20, "y": 52}, {"id": "cigar", "x": 48, "y": 54}, {"id": "diary", "x": 58, "y": 62}, {"id": "portrait", "x": 54, "y": 20}, {"id": "x1", "x": 37, "y": 8, "decoy": "פסל קטן ומאובק של פילוסוף יווני. לא קשור לחקירה."}, {"id": "x2", "x": 27, "y": 26, "decoy": "מנורת קריאה. רק אבק כאן…"}, {"id": "lock", "x": 91, "y": 44}]}, "gallery": {"img": "gallery", "spots": [{"id": "lines", "x": 15, "y": 26}, {"id": "stroop", "x": 89, "y": 26}, {"id": "memory", "x": 66, "y": 33}, {"id": "plaque", "x": 64, "y": 55}, {"id": "x1", "x": 16, "y": 58, "decoy": "ספסל קטיפה לנוח עליו. רק אבק כאן…"}, {"id": "x2", "x": 60, "y": 38, "decoy": "פסל שיש מפורסם. הוא לא מדבר 🗿"}, {"id": "lock", "x": 48, "y": 48}]}, "office": {"img": "office", "spots": [{"id": "letter", "x": 46, "y": 57}, {"id": "table", "x": 79, "y": 15}, {"id": "board", "x": 17, "y": 22}, {"id": "x1", "x": 56, "y": 42, "decoy": "האש באח מחממת נעים… אבל אין כאן שום רמז 🔥"}, {"id": "x2", "x": 96, "y": 78, "decoy": "קומקום התה של גברת לוגיה. עדיין חם ☕"}, {"id": "lock", "x": 94, "y": 47}]}};
const IMG_W = 1920, IMG_H = 1088;
const ICON = { clue: '?', found: '✓', lock: '🔒', locked: '🔒', open: '', solved: '✓', office: '🔐' };
function init3d() {
  const v = $('#view3d');
  new ResizeObserver(layout).observe(v);
  let down = null;
  v.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, px: panX, py: panY, moved: false }; });
  window.addEventListener('pointermove', e => {
    if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) down.moved = true; if (down.moved && lay && (lay.ox || lay.oy)) { panX = down.px + dx; panY = down.py + dy; applyPan(); } }
    else if (e.pointerType === 'mouse' && lay && v.contains(e.target)) { const r = v.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5; $('#scnPar').style.transform = `translate(${-nx * 14}px,${-ny * 10}px)`; glintNear(e.clientX, e.clientY); }
  });
  window.addEventListener('pointerup', () => { if (down && down.moved) { v.dataset.dragged = '1'; setTimeout(() => { delete v.dataset.dragged; }, 50); } down = null; });
  v.addEventListener('pointerleave', () => { $('#scnPar').style.transform = ''; glintNear(-1e4, -1e4); });
}
// נצנוץ שמתחזק ככל שהעכבר מתקרב לחפץ (במחשב)
function glintNear(x, y) { $$('#spots .hs').forEach(el => { const b = el.getBoundingClientRect(); const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2)); const R = Math.max(110, b.width * 1.6); el.style.setProperty('--g', d < R ? (1 - d / R).toFixed(2) : 0); }); }
function layout() {
  const v = $('#view3d'); const w = v.clientWidth, hh = v.clientHeight; if (!w || !hh) return;
  const s0 = Math.min(w / IMG_W, hh / IMG_H), s1 = Math.max(w / IMG_W, hh / IMG_H), s = Math.min(s1, s0 * (SCN_Z[curView] || 1.1));
  const bw = IMG_W * s, bh = IMG_H * s; const box = $('#scnBox'); box.style.width = bw + 'px'; box.style.height = bh + 'px';
  lay = { w, h: hh, bw, bh, ox: Math.max(0, bw - w), oy: Math.max(0, bh - hh) };
  panX = (w - bw) / 2; panY = (hh - bh) / 2;
  applyPan();
  const dh = $('.drag-hint'); dh.style.animation = 'none'; void dh.offsetWidth; dh.style.animation = '';
  const touch = matchMedia('(hover:none)').matches;
  dh.textContent = curView === 'hub' ? ((lay.ox > 4 || lay.oy > 4) ? 'לחצו על בניין · גררו להזזה' : 'לחצו על הבניין הזוהר') : ((lay.ox > 4 || lay.oy > 4) ? 'גררו כדי להסתכל מסביב · חפשו חפצים שמנצנצים' : (touch ? 'חפשו חפצים שמנצנצים מדי פעם' : 'הזיזו את העכבר על החפצים – משהו ינצנץ'));
}
function applyPan() {
  if (!lay) return;
  panX = lay.bw > lay.w ? Math.min(0, Math.max(lay.w - lay.bw, panX)) : (lay.w - lay.bw) / 2;
  panY = lay.bh > lay.h ? Math.min(0, Math.max(lay.h - lay.bh, panY)) : (lay.h - lay.bh) / 2;
  $('#scnPan').style.transform = `translate(${panX}px,${panY}px)`;
  // סימנים שיוצאים מגבולות התצוגה נצמדים לשוליים כדי שתמיד יהיה אפשר ללחוץ עליהם
  spotEls.forEach(el => { const x = el._x / 100 * lay.bw + panX, y = el._y / 100 * lay.bh + panY; const cx = Math.min(lay.w - 26, Math.max(26, x)), cy = Math.min(lay.h - 30, Math.max(30, y)); el.style.setProperty('--dx', (cx - x) + 'px'); el.style.setProperty('--dy', (cy - y) + 'px'); });
}
function showScene(view) {
  const tp = $('#tip'); if (tp) tp.hidden = true;
  curView = view; cur = SCN[view];
  const img = $('#scnImg'), bg = $('#scnBg'), src = M(`img/sc-${cur.img}.webp`) + '?v=9';
  img.src = src; bg.style.backgroundImage = `url("${src}")`; img.alt = view === 'hub' ? 'רחוב הבלשים בלונדון 1860' : (spot(view).name || '');
  const kb = $('#scnKb'); kb.classList.remove('enter'); void kb.offsetWidth; kb.classList.add('enter');
  const box = $('#spots'); box.innerHTML = ''; spotEls = [];
  cur.spots.forEach((m, i) => {
    if (m.r) { const ar = h('button', { class: 'area', type: 'button', 'data-id': m.id, 'aria-hidden': 'true', tabindex: '-1', style: `left:${m.r[0]}%;top:${m.r[1]}%;width:${m.r[2]}%;height:${m.r[3]}%` }); ar.addEventListener('click', ev => clickSpot(ev, m.id)); ar.addEventListener('mouseenter', () => box.querySelector(`.spot[data-id="${m.id}"]`)?.classList.add('hov')); ar.addEventListener('mouseleave', () => box.querySelector(`.spot[data-id="${m.id}"]`)?.classList.remove('hov')); box.appendChild(ar); }
    if (view !== 'hub' && m.id !== 'lock') { // חפץ נסתר: נצנוץ עדין בלבד, בלי סימן
      const hs = h('button', { class: 'hs', type: 'button', 'data-id': m.id, 'aria-label': 'חפץ בחדר', style: `left:${m.x}%;top:${m.y}%;--i:${(i * 7) % 5}` }, '<span class="glint"></span><span class="ok">✓</span>');
      hs.addEventListener('click', ev => clickSpot(ev, m.id)); box.appendChild(hs); return;
    }
    const el = h('button', { class: 'spot', type: 'button', 'data-id': m.id, style: `left:${m.x}%;top:${m.y}%;--i:${i}` }, '<span class="dot"><span class="ic"></span></span><span class="lab"></span>');
    el._x = m.x; el._y = m.y; el.addEventListener('click', ev => clickSpot(ev, m.id)); box.appendChild(el); spotEls.push(el);
  });
  refreshMarkers(); layout();
}
function clickSpot(ev, id) { ev.stopPropagation(); if ($('#view3d').dataset.dragged) return; SND.sfx('click'); onPick(id); }
function refreshMarkers() {
  const box = $('#spots'); if (!box) return;
  box.querySelectorAll('.hs').forEach(el => { const id = el.dataset.id; const c = !/^x\d/.test(id) && found(curView, id); el.classList.toggle('found', !!c); el.title = c ? ((spot(curView).clues.find(x => x.id === id) || {}).title || '') : ''; });
  box.querySelectorAll('.spot, .area').forEach(el => {
    const id = el.dataset.id; let k = 'clue', lab = '';
    if (curView === 'hub') { const rid = id.slice(3); if (rid === 'office') { k = isOpen('office') ? 'office' : 'locked'; lab = OFFICE.name; } else { const r = roomById(rid); k = isSolved(rid) ? 'solved' : isOpen(rid) ? 'open' : 'locked'; lab = `${r.n}. ${r.name}`; } }
    else if (id === 'lock') { k = isSolved(curView) ? 'solved' : (allFound(curView) || TEACHER) ? 'lock' : 'locked'; if (curView === 'office' && !ROOMS.every(r => isSolved(r.id)) && !TEACHER) k = 'locked'; lab = spot(curView).lock.title; }
    else { k = found(curView, id) ? 'found' : 'clue'; lab = found(curView, id) ? (spot(curView).clues.find(c => c.id === id) || {}).title : 'מה יש כאן?'; }
    el.className = (el.classList.contains('area') ? 'area ' : 'spot ') + k;
    if (el.classList.contains('spot')) { const n = curView === 'hub' && id !== 'go:office' ? String(roomById(id.slice(3)).n) : ''; el.querySelector('.ic').textContent = k === 'open' ? n : (k === 'office' ? '🔐' : ICON[k]); el.querySelector('.lab').textContent = lab; el.setAttribute('aria-label', lab + (k === 'locked' ? ' (נעול)' : '')); }
  });
  if (curView === 'hub') { const nx = [...ROOMS, { id: 'office' }].find(r => isOpen(r.id) && !isSolved(r.id)); box.querySelectorAll('.next').forEach(e => e.classList.remove('next')); if (nx) box.querySelectorAll(`[data-id="go:${nx.id}"]`).forEach(e => e.classList.add('next')); }
}
function tipText(id) {
  if (id.startsWith('go:')) { const rid = id.slice(3); const nm = rid === 'office' ? OFFICE.name : roomById(rid).name; return nm + (isOpen(rid) ? '' : ' 🔒'); }
  if (id === 'lock') return spot(curView).lock.title;
  const c = spot(curView).clues.find(c => c.id === id); return c ? (found(curView, id) ? c.title : 'מה יש כאן?') : '';
}
function onPick(id) {
  if (id.startsWith('go:')) return go(id.slice(3));
  const dm = cur && cur.spots.find(s => s.id === id); if (dm && dm.decoy) { toast('🔎 ' + dm.decoy, 2400); return; }
  if (id === 'lock') return openLock(curView);
  openClue(curView, id);
}

/* ======================= קליפים ======================= */
const CLIPS = { intro: 'clips/intro.mp4', door: 'clips/door.mp4', finale: 'clips/finale.mp4' };
let clipDone = null;
function playClip(name, caps, done, minDur = 0) {
  const ov = $('#clip'), vd = $('#clipVid'), cp = $('#clipCap'), pb = $('#clipPlay');
  closeModal(); clipDone = done || null; ov.hidden = false; ov.classList.remove('out'); cp.innerHTML = ''; pb.hidden = true;
  vd.muted = true; vd.defaultMuted = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.setAttribute('muted', '');
  vd.poster = M(CLIPS[name].replace('.mp4', '.jpg')) + '?v=9'; vd.removeAttribute('src'); const tok = ov._tok = (ov._tok || 0) + 1;
  let last = -1, t0 = 0, ended = false; const total = Math.max(minDur, caps.length ? caps[caps.length - 1][0] + 2.4 : 0);
  const tick = () => {
    if (ov.hidden || clipDone === undefined) return;
    const t = t0 ? (performance.now() - t0) / 1000 : 0; let idx = -1; caps.forEach((c, i) => { if (t >= c[0]) idx = i; });
    if (idx !== last) { last = idx; cp.innerHTML = idx >= 0 ? `<span>${caps[idx][1]}</span>` : ''; }
    if (ended && t >= total) return endClip();
    ov._raf = requestAnimationFrame(tick);
  };
  vd.onplaying = () => { if (!t0) t0 = performance.now(); };
  vd.onended = () => { ended = true; };
  vd.onerror = () => { ended = true; if (!t0) t0 = performance.now(); };
  cancelAnimationFrame(ov._raf); ov._raf = requestAnimationFrame(tick);
  clipURL(name).then(u => { if (ov._tok !== tok || ov.hidden) return; vd.src = u; const pr = vd.play(); if (pr && pr.catch) pr.catch(() => { if (ov._tok === tok && !ov.hidden) pb.hidden = false; }); });
}
// הקליפים נטענים במלואם ומוצגים מקובץ מקומי בדפדפן – כך הם מתנגנים גם באייפון
const BLOBS = {};
function clipURL(name) {
  if (BLOBS[name]) return BLOBS[name];
  const url = M(CLIPS[name]) + '?v=9';
  return (BLOBS[name] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b)).catch(() => { delete BLOBS[name]; return url; }));
}
function endClip() {
  const ov = $('#clip'), vd = $('#clipVid'); if (ov.hidden) return;
  cancelAnimationFrame(ov._raf); vd.onended = vd.onplaying = vd.onerror = null; try { vd.pause(); } catch (e) { }
  ov.classList.add('out'); setTimeout(() => { ov.hidden = true; vd.removeAttribute('src'); vd.load(); }, 350);
  const f = clipDone; clipDone = null; if (f) f();
}
function wireClip() {
  $('#clipSkip').addEventListener('click', () => { SND.sfx('click'); endClip(); });
  $('#clipPlay').addEventListener('click', () => { $('#clipPlay').hidden = true; $('#clipVid').play().catch(() => { $('#clipVid').onerror(); }); });
}

/* ======================= ניווט ופאנל ======================= */
function go(id) {
  if (!isOpen(id)) { SND.sfx('wrong'); const prev = id === 'office' ? 'כל חמשת הבניינים' : roomById(ROOMS[roomById(id).n - 2].id).name; toast(`🔒 הבניין עוד נעול. קודם פתרו את: ${prev}`); return; }
  if (!S.enter[id] && !isSolved(id)) { S.enter[id] = Date.now(); save(); }
  showScene(id); renderPanel(); $('#panel').scrollTop = 0;
  S.seen = S.seen || [];
  if (!S.seen.includes(id)) { S.seen.push(id); save(); const nm = id === 'office' ? OFFICE.name : roomById(id).name; playClip('door', [[0, `🔍 הבלשים בדרך אל ${nm}…`], [2.6, 'חפשו בחדר את הרמזים – הם לא מסומנים, רק מנצנצים קצת…']], null); }
}
function goHub() { showScene('hub'); renderPanel(); }
function say(who, text) { return `<div class="say"><div class="ava">${AVATAR[who]}</div><div class="bubble">${text}</div></div>`; }
function renderPanel() {
  const p = $('#panel'); if (!p) return; p.innerHTML = '';
  if (curView === 'hub') {
    const n = S.solved.length;
    p.appendChild(h('div', { class: 'ptitle' }, `<span class="pico">📰</span><div><h2>רחוב הבלשים · לונדון 1860</h2><div class="psub">קבוצת ${esc(S.group || 'הבלשים')} · ${n} מתוך 5 מילים</div></div>`));
    p.insertAdjacentHTML('beforeend', n === 0 ? say('logia', 'ברוכים הבאים לרחוב! חמישה בניינים נפתחים אחד אחרי השני. התחילו ב<b>בית הדפוס</b> – לחצו עליו בציור או ברשימה.') : n < 5 ? say('psycho', `יפה מאוד! מצאתם ${n} ${n === 1 ? 'מילה' : 'מילים'}. הבניין הבא כבר פתוח – המשיכו!`) : say('psycho', 'מצאתם את כל חמש המילים! עכשיו לכו ל<b>משרד הבלשים</b> ופתחו את הכספת.'));
    const list = h('div', { class: 'places' });
    [...ROOMS, { id: 'office', n: 6, name: OFFICE.name, icon: OFFICE.icon, color: '#4361ee' }].forEach(r => {
      const st = isSolved(r.id) ? 'solved' : isOpen(r.id) ? 'open' : 'locked';
      const lab = st === 'solved' ? `✓ ${r.word}` : st === 'open' ? 'פתוח – כנסו!' : '🔒 נעול';
      list.appendChild(h('button', { class: 'place ' + st, style: `--c:${r.color}`, onclick: () => { SND.sfx('click'); go(r.id); } }, `<span class="pnum">${r.n < 6 ? r.n : '★'}</span><span class="picon">${r.icon}</span><span class="pname">${r.name}</span><span class="pstate">${lab}</span>`));
    });
    p.appendChild(list);
    p.insertAdjacentHTML('beforeend', '<p class="tip">💡 לחצו על הבניין הזוהר בציור או ברשימה. בניין נעול מופיע אפור עם מנעול.</p>');
    return;
  }
  const sp = spot(curView), isOff = curView === 'office';
  p.appendChild(h('button', { class: 'btn back', onclick: () => { SND.sfx('click'); goHub(); } }, '→ חזרה לרחוב'));
  p.appendChild(h('div', { class: 'ptitle', style: `--c:${sp.color || '#4361ee'}` }, `<span class="pico">${sp.icon}</span><div><h2>${isOff ? '' : sp.n + '. '}${sp.name}</h2>${isOff ? '<div class="psub">הכספת הסופית</div>' : `<div class="psub">חדר ${sp.n} מתוך 5${isSolved(sp.id) ? ' · ' + sp.topic.split('–')[0] : ''}</div>`}</div>`));
  p.insertAdjacentHTML('beforeend', `<div class="say"><div class="ava">${AVATAR[/מר פסיכו/.test(sp.intro) ? 'psycho' : 'logia']}</div><div class="bubble">${sp.intro.replace(/^[^:]+: "?/, '').replace(/"$/, '')}</div></div>`);
  const nf = sp.clues.filter(c => found(curView, c.id)).length;
  p.appendChild(h('h3', { class: 'clue-h' }, `🔎 רמזים שמצאתם: ${nf} מתוך ${sp.clues.length}`));
  const cl = h('div', { class: 'clues' });
  sp.clues.forEach(c => { const f = found(curView, c.id); cl.appendChild(h('button', { class: 'clue ' + (f ? 'found' : ''), onclick: () => { if (f) openClue(curView, c.id); else { toast(matchMedia('(hover:none)').matches ? 'חפשו בתמונה חפץ שמנצנץ מדי פעם 👀' : 'הזיזו את העכבר על החפצים בתמונה – רמז מנצנץ כשמתקרבים 👀'); } } }, f ? `✓ ${c.title}` : '❓ רמז שעוד לא נמצא')); });
  p.appendChild(cl);
  const solved = isSolved(curView);
  const ready = TEACHER || (allFound(curView) && (!isOff || ROOMS.every(r => isSolved(r.id))));
  if (solved && !isOff) { p.insertAdjacentHTML('beforeend', `<div class="solved-box">✓ החדר נפתר! המילה: <b>${sp.word}</b></div>`); p.appendChild(h('button', { class: 'btn primary wide', onclick: goHub }, '🏙️ חזרה לרחוב – לבניין הבא')); }
  else { const lab = `🔐 ${sp.lock.title}` + (ready ? '' : ' (מצאו קודם את כל הרמזים)'); const lb = h('button', { class: 'btn primary wide lockbtn' + (ready ? '' : ' dim'), onclick: () => openLock(curView), 'data-key': curView, 'data-base': sp.lock.title, 'data-label': lab }, lab); p.appendChild(lb);
    const hb = hintBox(curView, sp.lock.hints); hb.classList.add('phints'); hb.insertBefore(h('h3', { class: 'clue-h' }, '💡 רמזים לפתרון המנעול'), hb.firstChild); p.appendChild(hb); applyCool(); }
  if (isOff && S.finishMs) p.appendChild(h('button', { class: 'btn wide', onclick: showEnding }, '📰 לעיתון הסיום'));
  p.insertAdjacentHTML('beforeend', '<p class="tip">🔎 הרמזים לא מסומנים: חפשו בסצנה חפצים שמנצנצים (במחשב – כשהעכבר מתקרב, בטלפון – נצנוץ עדין מדי כמה שניות). לא כל חפץ הוא רמז! כל רמז נותן רק חלק מהמידע – חברו ביניהם. תשובה שגויה נועלת את המנעול ל-30 שניות.</p>');
}

/* ======================= רמזים (קלפים) ======================= */
function openClue(rid, cid) {
  const sp = spot(rid), c = sp.clues.find(x => x.id === cid); if (!c) return;
  if (c.widget === 'muller') return mullerWidget(rid, c);
  if (c.widget === 'stroop') return stroopWidget(rid, c);
  if (c.widget === 'memory') return memoryWidget(rid, c);
  let html = c.html;
  if (c.comic) html += comicSVG();
  if (c.gem) html += gemTable();
  if (c.words) html += `<div class="wordpins">${S.words.map((w, i) => `<span class="pin">${w || '?'}</span>`).join('')}</div>`;
  openModal({ title: c.title, html, wide: !!(c.comic || c.gem), buttons: [{ t: 'הבנתי 👍', primary: true }] });
  markFound(rid, cid);
}
function gemTable() { const L = 'אבגדהוזחטיכלמנסעפצקרשת'; return `<div class="gem">${[...L].map(ch => `<div><b>${ch}</b><span>${GEM[ch]}</span></div>`).join('')}</div>`; }

/* ---------- מילר-לייר עם סרגל ---------- */
function mullerWidget(rid, c) {
  const wrap = h('div', { class: 'muller' });
  wrap.innerHTML = `<p>איזה קו ארוך יותר – העליון או התחתון? אל תסמכו על העיניים: <b>גררו את הסרגל</b> ומדדו!</p>
  <svg viewBox="0 0 600 380" class="ml-svg" aria-label="שני קווים עם חיצים בקצוות">
    <rect width="600" height="380" fill="#fffdf5" rx="16"/>
    <g stroke="#1d3557" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M180 90 H420 M180 90 l40 -38 M180 90 l40 38 M420 90 l-40 -38 M420 90 l-40 38"/>
      <path d="M180 210 H420 M180 210 l-40 -38 M180 210 l-40 38 M420 210 l40 -38 M420 210 l40 38"/>
    </g>
    <text x="540" y="96" font-size="22" font-family="Rubik" fill="#1d3557" text-anchor="middle">א</text><text x="540" y="216" font-size="22" font-family="Rubik" fill="#1d3557" text-anchor="middle">ב</text>
    <g class="ruler" transform="translate(150 290)">
      <rect x="0" y="0" width="320" height="56" rx="6" fill="#ffd166" stroke="#a47100" stroke-width="2"/>
      ${Array.from({ length: 33 }, (_, i) => `<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="${i % 2 === 0 ? 22 : 12}" stroke="#5a3a00" stroke-width="${i % 2 === 0 ? 2.4 : 1.4}"/>`).join('')}
      ${Array.from({ length: 17 }, (_, i) => `<text x="${i * 20}" y="40" font-size="13" font-family="Rubik" text-anchor="middle" fill="#5a3a00">${i}</text>`).join('')}
      <text x="160" y="53" font-size="10" font-family="Rubik" fill="#5a3a00" text-anchor="middle">ס"מ</text>
    </g>
  </svg>
  <div class="row mlq"><button class="btn opt" data-a="top">קו א' ארוך יותר</button><button class="btn opt" data-a="bottom">קו ב' ארוך יותר</button><button class="btn opt" data-a="same">הם באותו אורך</button></div>
  <div class="feedback"></div>`;
  const svg = wrap.querySelector('svg'), ru = wrap.querySelector('.ruler'); let pos = { x: 150, y: 290 }, drag = null, measured = false;
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  ru.addEventListener('pointerdown', e => { const p = pt(e); drag = { dx: p.x - pos.x, dy: p.y - pos.y }; ru.setPointerCapture(e.pointerId); e.preventDefault(); });
  ru.addEventListener('pointermove', e => { if (!drag) return; const p = pt(e); pos = { x: Math.max(-40, Math.min(320, p.x - drag.dx)), y: Math.max(20, Math.min(320, p.y - drag.dy)) }; ru.setAttribute('transform', `translate(${pos.x} ${pos.y})`); measured = true; });
  ru.addEventListener('pointerup', () => { drag = null; });
  wrap.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.a === 'same') { okFx('נכון! שני הקווים באורך 12 ס"מ בדיוק. החיצים בקצוות גורמים למוח "לקרוא" את הקו התחתון כארוך יותר – זו אשליית מילר-לייר.'); markFound(rid, c.id); wrap.querySelector('.mlq').innerHTML = '<span class="pill good">✓ גיליתם את האשליה</span><p class="piece">🧩 חלק מהתשובה: התהליך שבו המוח קולט ומפרש את מה שהעיניים רואות נקרא <b>תפיסה</b>.</p>'; }
    else wrongFx(b, measured ? 'מדדתם? הניחו את ה-0 של הסרגל בתחילת הקו (בלי החיצים) ובדקו שוב 🙂' : 'העיניים אומרות כן… אבל מה אומר הסרגל? גררו אותו מתחת לקווים ומדדו 🙂');
  }));
  openModal({ title: '🖼️ ' + c.title, node: wrap, wide: true, buttons: [{ t: 'סגירה' }] });
}

/* ---------- סטרופ ---------- */
const COLORS = [['אדום', '#e63946'], ['כחול', '#2b6fd8'], ['ירוק', '#2a9d50'], ['צהוב', '#e9b200']];
function stroopWidget(rid, c) {
  const wrap = h('div', { class: 'stroop' });
  const N = 8; let round = 0, i = 0, t0 = 0, times = [0, 0], errs = [0, 0], seq = [];
  const mk = r => { const out = []; let last = -1; for (let k = 0; k < N; k++) { let ink; do ink = Math.floor(Math.random() * 4); while (ink === last); last = ink; let word = ink; if (r === 1) { do word = Math.floor(Math.random() * 4); while (word === ink); } out.push({ word, ink }); } return out; };
  const intro = () => { wrap.innerHTML = `<p class="big">משחק הצבעים 🎨</p><p>תופיע מילה צבועה. לחצו כמה שיותר מהר על <b>צבע הדיו</b> של המילה – לא על מה שכתוב!</p><p>יש שני סבבים של ${N} מילים. השעון מודד אתכם.</p><button class="btn primary go">מתחילים סבב 1 ▶</button>`; wrap.querySelector('.go').addEventListener('click', () => start(0)); };
  const start = r => { round = r; i = 0; seq = mk(r); wrap.innerHTML = `<div class="st-head">סבב ${r + 1} מתוך 2 · מילה <span class="st-i">1</span>/${N}</div><div class="st-word"></div><div class="st-btns">${COLORS.map((cc, k) => `<button class="btn st-b" data-k="${k}"><span class="sw" style="background:${cc[1]}"></span>${cc[0]}</button>`).join('')}</div><div class="feedback"></div>`; wrap.querySelectorAll('.st-b').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k, b))); show(); t0 = performance.now(); };
  const show = () => { const s = seq[i], w = wrap.querySelector('.st-word'); w.textContent = COLORS[s.word][0]; w.style.color = COLORS[s.ink][1]; wrap.querySelector('.st-i').textContent = i + 1; w.classList.remove('pop'); void w.offsetWidth; w.classList.add('pop'); };
  const answer = (k, b) => { if (k !== seq[i].ink) { errs[round]++; wrongFx(b, 'אופס – צבע הדיו, לא המילה!'); return; } SND.sfx('tick'); const f = wrap.querySelector('.feedback'); f.textContent = ''; i++; if (i < N) show(); else { times[round] = (performance.now() - t0) / 1000; if (round === 0) between(); else result(); } };
  const between = () => { wrap.innerHTML = `<p class="big">סבב 1: ${times[0].toFixed(1)} שניות ✓</p><p>עכשיו הסבב השני. אותה משימה בדיוק: לחצו על צבע הדיו.</p><button class="btn primary go">מתחילים סבב 2 ▶</button>`; wrap.querySelector('.go').addEventListener('click', () => start(1)); };
  const result = () => { const slower = times[1] > times[0]; const pct = Math.round((times[1] / times[0] - 1) * 100);
    wrap.innerHTML = `<div class="st-res"><div><span>סבב 1 (מילה וצבע זהים)</span><b>${times[0].toFixed(1)} שנ'</b><small>${errs[0]} טעויות</small></div><div><span>סבב 2 (מילה וצבע שונים)</span><b>${times[1].toFixed(1)} שנ'</b><small>${errs[1]} טעויות</small></div></div>
    <p class="big">${slower ? `בסבב השני הייתם איטיים יותר ב-${pct}%!` : (errs[1] > errs[0] ? 'בסבב השני טעיתם יותר!' : 'וואו, הצלחתם להתגבר! אבל הרגשתם כמה המוח התאמץ בסבב השני?')}</p>
    <p>זו <b>תופעת סטרופ</b>: המוח קורא מילים באופן אוטומטי, וכשהמילה והצבע לא מתאימים – ה<b>קשב</b> צריך להתאמץ כדי "להשתיק" את הקריאה. לכן אנחנו איטיים יותר וטועים יותר.</p><p class="piece">🧩 חלק מהתשובה: התהליך שנבחן כאן נקרא <b>קשב</b>.</p><button class="btn ghost again">לנסות שוב</button>`;
    wrap.querySelector('.again').addEventListener('click', () => start(0)); okFx(''); markFound(rid, c.id); };
  intro();
  openModal({ title: '🖼️ ' + c.title, node: wrap, wide: true, buttons: [{ t: 'סגירה' }] });
}


/* ---------- משחק הזיכרון על מסגרות הגלריה ---------- */
function memoryWidget(rid, c) {
  const wrap = h('div', { class: 'memo' });
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const piece = '<p class="piece">🧩 חלק מהתשובה: כדי למצוא את הזוגות הייתם צריכים לשנן ואז לשלוף את המיקומים. התהליך שהפעלתם נקרא <b>זיכרון</b>.</p>';
  let deck = [], first = null, busy = false, pairs = 0, tries = 0, peekT = 0;
  const intro = () => {
    wrap.innerHTML = `<p class="big">משחק הזיכרון 🖼️</p><p>על קיר הגלריה תלויות 12 מסגרות: 6 זוגות של אשליות ראייה. בהתחלה התמונות יוצגו לכמה שניות – <b>שננו איפה כל תמונה</b>. אחר כך הן יתהפכו, ותצטרכו למצוא את הזוגות.</p><p>טעיתם? זה בסדר. אפשר ללחוץ "שננו שוב" ולהציץ שוב.</p>${found(rid, c.id) ? piece : ''}<button class="btn primary go">${found(rid, c.id) ? 'לשחק שוב ▶' : 'מתחילים לשנן ▶'}</button>`;
    wrap.querySelector('.go').addEventListener('click', start);
  };
  const start = () => {
    deck = shuffle([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]); first = null; busy = true; pairs = 0; tries = 0;
    wrap.innerHTML = `<div class="mm-head"><span class="mm-st">שננו! התמונות יתהפכו בעוד <b class="mm-cd"></b></span><span class="mm-score">זוגות: <b class="mm-p">0</b>/6</span></div><div class="mm-wall">${deck.map((k, i) => `<button class="mm" type="button" data-i="${i}" data-k="${k}" aria-label="מסגרת ${i + 1}"><span class="mm-in"><span class="mm-back"><span>🔍</span></span><span class="mm-front">${ILLUSIONS[k].svg}</span></span></button>`).join('')}</div><div class="row center mm-btns"><button class="btn ghost again" type="button" disabled>👀 שננו שוב</button></div><div class="feedback"></div>`;
    const cards = $$('.mm', wrap); cards.forEach(b => b.classList.add('up'));
    const t0 = performance.now(); const cd = wrap.querySelector('.mm-cd');
    const tick = () => { if (!wrap.isConnected) return; const left = PEEK_MS - (performance.now() - t0); if (left > 0) { cd.textContent = Math.ceil(left / 1000); peekT = requestAnimationFrame(tick); } else { cards.forEach(b => b.classList.remove('up')); busy = false; wrap.querySelector('.mm-st').textContent = 'מצאו את הזוגות: לחצו על שתי מסגרות'; wrap.querySelector('.again').disabled = false; } };
    tick();
    wrap.querySelector('.mm-wall').addEventListener('click', e => { const b = e.target.closest('.mm'); if (!b || busy || b.classList.contains('up') || b.classList.contains('done')) return; flip(b); });
    wrap.querySelector('.again').addEventListener('click', () => { if (busy) return; busy = true; SND.sfx('click'); const hid = cards.filter(b => !b.classList.contains('done')); hid.forEach(b => b.classList.add('up')); first = null; setTimeout(() => { hid.forEach(b => b.classList.remove('up')); busy = false; }, PEEK_MS * 0.45); });
  };
  const flip = b => {
    SND.sfx('tick'); b.classList.add('up');
    if (!first) { first = b; return; }
    const a = first; first = null; tries++;
    if (a.dataset.k === b.dataset.k) {
      a.classList.add('done'); b.classList.add('done'); pairs++; wrap.querySelector('.mm-p').textContent = pairs; SND.sfx('ok');
      const f = wrap.querySelector('.feedback'); f.className = 'feedback good'; f.textContent = `זוג! ${ILLUSIONS[+a.dataset.k].name} ✓`;
      if (pairs === 6) done();
    } else {
      busy = true; const f = wrap.querySelector('.feedback'); f.className = 'feedback bad'; f.textContent = 'לא זוג. שננו שוב או נסו זוג אחר 🙂'; SND.sfx('wrong');
      setTimeout(() => { a.classList.remove('up'); b.classList.remove('up'); busy = false; }, 950);
    }
  };
  const done = () => {
    okFx(''); const st = wrap.querySelector('.mm-st'); st.innerHTML = `<b>כל הכבוד! מצאתם את כל 6 הזוגות ב-${tries} ניסיונות 🎉</b>`;
    wrap.querySelector('.mm-btns').innerHTML = ''; wrap.querySelector('.feedback').insertAdjacentHTML('afterend', piece); markFound(rid, c.id);
  };
  intro();
  openModal({ title: '🖼️ ' + c.title, node: wrap, wide: true, buttons: [{ t: 'סגירה' }], onClose: () => cancelAnimationFrame(peekT) });
}

/* ======================= מנעולים ======================= */
function openLock(rid) {
  const sp = spot(rid), isOff = rid === 'office';
  if (isSolved(rid) && !isOff) { openModal({ title: sp.lock.title, html: `<p class="big">✓ כבר פתרתם! המילה: <b>${sp.word}</b></p>`, buttons: [{ t: 'סגירה' }] }); return; }
  if (!TEACHER) {
    if (isOff && !ROOMS.every(r => isSolved(r.id))) { toast('🔒 צריך את כל חמש המילים כדי לפתוח את הכספת'); return; }
    if (!allFound(rid)) { SND.sfx('wrong'); const left = sp.clues.filter(c => !found(rid, c.id)).length; toast(`🔒 המנעול סגור. נשארו עוד ${left} ${left === 1 ? 'רמז' : 'רמזים'} למצוא בחדר`); return; }
  }
  const L = sp.lock, key = rid;
  ({ sort: lockSort, match: lockMatch, text: lockText, freud: lockFreud, safe: lockSafe })[L.type](rid, sp, L, key);
}
function lockShell(sp, L, key, node, extra = {}) {
  const wrap = h('div', { class: 'lock', 'data-key': key }); if (L.prompt) wrap.appendChild(h('p', { class: 'lprompt' }, L.prompt));
  if (L.pieces) wrap.appendChild(h('div', { class: 'pieces' }, '🧩 החלקים שאספתם בגלריה: ' + L.pieces.map(([cid, w]) => `<span class="pin">${found(sp.id, cid) ? w : '?'}</span>`).join('')));
  const body = h('div', { class: 'lbody' }); body.appendChild(node); wrap.appendChild(body);
  wrap.appendChild(h('div', { class: 'feedback', 'aria-live': 'polite' })); wrap.appendChild(hintBox(key, L.hints));
  openModal({ title: '🔐 ' + L.title, node: wrap, wide: true, ...extra }); applyCool(); return wrap;
}
// בחר-ושים: לחיצה על פריט ואז על יעד, וגרירה במחשב
function selectable(root) {
  let sel = null;
  const api = { get: () => sel, set: el => { if (sel) sel.classList.remove('sel'); sel = el; if (el) el.classList.add('sel'); }, clear: () => api.set(null) };
  return api;
}
function lockSort(rid, sp, L, key) {
  const node = h('div', { class: 'sort' });
  const order = [5, 0, 6, 2, 4, 1, 7, 3];
  node.innerHTML = `<div class="pool zone" data-z="-1"></div><div class="cols">${L.cols.map((c, i) => `<div class="col zone" data-z="${i}"><div class="colh">${c}</div><div class="colb"></div></div>`).join('')}</div><div class="movebar" hidden><span>להעביר ל:</span><button class="btn mv" data-z="0">🔬 אפשר לחקור</button><button class="btn mv" data-z="1">🚫 לא מדעי</button></div><button class="btn primary check" disabled>בדיקה ✔</button>`;
  const pool = node.querySelector('.pool'); const sel = selectable(node); const mb = node.querySelector('.movebar');
  const _set = sel.set; sel.set = el => { _set(el); mb.hidden = !el; };
  mb.querySelectorAll('.mv').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (sel.get()) place(sel.get(), +b.dataset.z); }));
  order.forEach(i => { const it = h('div', { class: 'card', draggable: 'true', 'data-i': i, tabindex: '0' }, `📰 ${L.items[i].t}`); pool.appendChild(it); });
  const place = (card, z) => { (z < 0 ? pool : node.querySelector(`.col[data-z="${z}"] .colb`)).appendChild(card); sel.clear(); SND.sfx('click'); upd(); };
  const upd = () => { node.querySelector('.check').disabled = pool.children.length > 0; node.querySelectorAll('.card').forEach(c => c.classList.remove('ok', 'no')); };
  node.addEventListener('click', e => {
    const card = e.target.closest('.card'), zone = e.target.closest('.zone'), cs = sel.get();
    if (card) { if (cs && cs !== card && cs.closest('.zone') !== zone) { place(cs, +zone.dataset.z); return; } sel.set(cs === card ? null : card); SND.sfx('click'); return; }
    if (zone && cs) place(cs, +zone.dataset.z);
  });
  node.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) sel.set(e.target); });
  node.addEventListener('dragstart', e => { const c = e.target.closest('.card'); if (c) { sel.set(c); e.dataTransfer.setData('text/plain', c.dataset.i); } });
  node.querySelectorAll('.zone').forEach(z => { z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); }); z.addEventListener('dragleave', () => z.classList.remove('over')); z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); const c = sel.get(); if (c) place(c, +z.dataset.z); }); });
  node.querySelector('.check').addEventListener('click', () => {
    if (coolLeft(key)) return;
    let ok = 0; node.querySelectorAll('.col').forEach(col => col.querySelectorAll('.card').forEach(c => { if (L.items[c.dataset.i].c === +col.dataset.z) ok++; }));
    if (ok === L.items.length) { node.querySelectorAll('.card').forEach(c => c.classList.add('ok')); okFx('מושלם! כל השאלות במקום הנכון 🎉'); letterLights(node, sp); }
    else lockWrong(key, node.querySelector('.cols'), `${ok} מתוך 8 במקום הנכון. נסו שוב 🙂`);
  });
  lockShell(sp, L, key, node);
}
function letterLights(node, sp) {
  const scr = [...sp.word].sort(() => 0.5 - Math.random());
  const box = h('div', { class: 'letters' }, scr.map(l => `<span>${l}</span>`).join('')); node.querySelector('.check').replaceWith(box);
  $$('span', box).forEach((s, i) => setTimeout(() => { s.classList.add('lit'); SND.sfx('type'); }, 300 + i * 350));
  setTimeout(() => { box.insertAdjacentHTML('afterend', '<p class="center">האותיות נדלקו – אבל מה המילה? קחו את זכוכית המגדלת…</p>'); const b = h('button', { class: 'btn primary wide', onclick: () => reveal(sp) }, '🔍 לחשיפת המילה'); node.appendChild(b); }, 500 + scr.length * 350);
}
function successNext(node, sp, msg) { const b = h('button', { class: 'btn primary wide', onclick: () => reveal(sp) }, '🔍 לחשיפת המילה'); if (msg) node.appendChild(h('p', { class: 'center' }, msg)); node.appendChild(b); b.scrollIntoView({ block: 'nearest' }); }
function lockMatch(rid, sp, L, key) {
  const node = h('div', { class: 'match' }); const sel = selectable(node); const asg = {};
  node.innerHTML = `<div class="chips">${L.chips.map(c => `<button class="chip" draggable="true" data-c="${c}">${c}</button>`).join('')}</div><div class="faces">${L.faces.map((f, i) => `<div class="face" data-f="${f}"><div class="fsvg"><img src="img/emo-${f}.webp?v=9" alt="דמות רגש" draggable="false"></div><div class="fname">דמות ${'אבגדהו'[i]}</div><div class="slot">?</div></div>`).join('')}</div><button class="btn primary check" disabled>בדיקה ✔</button>`;
  const draw = () => { node.querySelectorAll('.face').forEach(f => { const v = asg[f.dataset.f]; const s = f.querySelector('.slot'); s.textContent = v || '?'; s.classList.toggle('full', !!v); f.classList.remove('ok', 'no'); }); node.querySelectorAll('.chip').forEach(c => c.classList.toggle('used', Object.values(asg).includes(c.dataset.c))); node.querySelector('.check').disabled = Object.keys(asg).length < L.faces.length; };
  const assign = (face, chip) => { for (const k in asg) if (asg[k] === chip) delete asg[k]; asg[face] = chip; sel.clear(); SND.sfx('click'); draw(); };
  node.addEventListener('click', e => { const chip = e.target.closest('.chip'); const face = e.target.closest('.face'); if (chip) { sel.set(chip === sel.get() ? null : chip); return; } if (face) { if (sel.get()) assign(face.dataset.f, sel.get().dataset.c); else if (asg[face.dataset.f]) { delete asg[face.dataset.f]; draw(); } else toast('בחרו קודם רגש מהרשימה למעלה'); } });
  node.addEventListener('dragstart', e => { const c = e.target.closest('.chip'); if (c) { sel.set(c); e.dataTransfer.setData('text/plain', c.dataset.c); } });
  node.querySelectorAll('.face').forEach(f => { f.addEventListener('dragover', e => { e.preventDefault(); f.classList.add('over'); }); f.addEventListener('dragleave', () => f.classList.remove('over')); f.addEventListener('drop', e => { e.preventDefault(); f.classList.remove('over'); if (sel.get()) assign(f.dataset.f, sel.get().dataset.c); }); });
  node.querySelector('.check').addEventListener('click', () => {
    if (coolLeft(key)) return;
    const ok = L.faces.filter(f => asg[f] === L.labels[f]).length;
    if (ok === L.faces.length) { node.querySelectorAll('.face').forEach(f => f.classList.add('ok')); node.querySelector('.check').remove(); okFx('מעולה! זיהיתם את כל שישת הרגשות הבסיסיים 🎉'); successNext(node, sp); }
    else lockWrong(key, node.querySelector('.faces'), `${ok} מתוך 6 נכונים. הסתכלו שוב על הגבות, העיניים והפה 🙂`);
  });
  draw(); lockShell(sp, L, key, node);
}
function lockText(rid, sp, L, key) {
  const node = h('div', { class: 'tlock' });
  if (L.comic) node.appendChild(h('details', { class: 'comic-d', open: '' }, '<summary>הקומיקס מלוח המודעות</summary>' + comicSVG()));
  const form = h('form', { class: 'row tform' }, `<input type="text" class="ans" autocomplete="off" placeholder="הקלידו את התשובה כאן" aria-label="תשובה"><button class="btn primary" type="submit">בדיקה ✔</button>`);
  node.appendChild(form);
  form.addEventListener('submit', e => { e.preventDefault(); if (coolLeft(key)) return; const v = form.querySelector('.ans').value.trim(); if (!v) return;
    if (accepts(v, L.accept)) { form.querySelector('.ans').disabled = true; form.querySelector('button').remove(); okFx('נכון מאוד! 🎉'); successNext(node, sp); return; }
    const nk = Object.keys(L.near || {}).find(k => L.near[k] && norm(v).includes(norm(k))); lockWrong(key, form, nk ? L.near[nk] : 'לא נכון 🙂 נסו לחבר את כל הרמזים מהחדר'); });
  lockShell(sp, L, key, node);
}
function lockFreud(rid, sp, L, key) {
  const node = h('div', { class: 'freud' });
  const stage2 = () => {
    const fb = node.closest('.lock') && node.closest('.lock').querySelector('.feedback'); if (fb) { fb.textContent = ''; fb.className = 'feedback'; }
    node.innerHTML = `<p class="lprompt">${L.afterMc}</p><p class="dhow"><span aria-hidden="true">⠿</span> סדרו את המגירות לפי סדר השלבים – גררו או לחצו על החצים</p><div class="drawers"></div><button class="btn primary check">בדיקה ✔</button>`;
    let order = (S.step.freudOrder && S.step.freudOrder.length === 5) ? [...S.step.freudOrder] : [...L.startOrder];
    const box = node.querySelector('.drawers');
    const commit = () => { S.step.freudOrder = [...order]; save(); };
    const draw = () => { box.innerHTML = order.map((id, i) => { const st = L.stages.find(s => s.id === id); return `<div class="drawer" data-id="${id}" data-i="${i}"><div class="dtop"><span class="dgrip" title="גררו כדי להזיז" aria-hidden="true">⠿</span><span class="dnum">מגירה ${i + 1}</span></div><span class="dsvg">${STAGE_SVG[id]}</span><span class="dcap">${st.cap}</span><div class="darrows"><button type="button" class="dmv" data-d="-1" aria-label="הזזת המגירה למקום ${i}"${i === 0 ? ' disabled' : ''}><span class="ah">▶</span><span class="av">▲</span></button><button type="button" class="dmv" data-d="1" aria-label="הזזת המגירה למקום ${i + 2}"${i === 4 ? ' disabled' : ''}><span class="ah">◀</span><span class="av">▼</span></button></div></div>`; }).join(''); };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flipDraw = (focusId, focusD) => { // redraw with a smooth slide from the old places
      const before = {}; box.querySelectorAll('.drawer').forEach(d => { before[d.dataset.id] = d.getBoundingClientRect(); });
      draw();
      if (!reduce) box.querySelectorAll('.drawer').forEach(d => { const b = before[d.dataset.id]; if (!b) return; const a = d.getBoundingClientRect(); const dx = b.left - a.left, dy = b.top - a.top; if (!dx && !dy) return;
        d.style.transition = 'none'; d.style.transform = `translate(${dx}px,${dy}px)`; d.getBoundingClientRect(); d.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)'; d.style.transform = ''; d.addEventListener('transitionend', () => { d.style.transition = ''; }, { once: true }); });
      if (focusId) { const d = box.querySelector(`.drawer[data-id="${focusId}"]`); const b = d && (d.querySelector(`.dmv[data-d="${focusD}"]:not(:disabled)`) || d.querySelector('.dmv:not(:disabled)')); if (b) b.focus({ preventScroll: true }); if (d) { d.classList.add('moved'); setTimeout(() => d.classList.remove('moved'), 450); } }
    };
    // arrows
    box.addEventListener('click', e => { const b = e.target.closest('.dmv'); if (!b || box.classList.contains('done') || box.classList.contains('dragging')) return;
      const d = b.closest('.drawer'), i = +d.dataset.i, j = i + (+b.dataset.d); if (j < 0 || j > 4) return;
      [order[i], order[j]] = [order[j], order[i]]; commit(); SND.sfx('click'); flipDraw(d.dataset.id, b.dataset.d); });
    // drag & drop (mouse: whole drawer; touch/pen: the ⠿ handle)
    const scroller = () => { let el = box.parentElement; while (el && el !== document.body) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; } return null; };
    let drag = null;
    box.addEventListener('pointerdown', e => {
      if (box.classList.contains('done') || drag || e.button > 0) return;
      const d = e.target.closest('.drawer'); if (!d || e.target.closest('.dmv')) return;
      const onGrip = !!e.target.closest('.dgrip');
      if (e.pointerType !== 'mouse' && !onGrip) return;
      if (onGrip) e.preventDefault();
      const els = [...box.querySelectorAll('.drawer')], br = box.getBoundingClientRect();
      const slots = els.map(x => { const r = x.getBoundingClientRect(); return { x: r.left - br.left, y: r.top - br.top, w: r.width, h: r.height }; });
      const from = +d.dataset.i, r0 = slots[from];
      drag = { d, els, slots, from, to: from, id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, gx: e.clientX - br.left - r0.x, gy: e.clientY - br.top - r0.y, started: onGrip, sc: scroller(), raf: 0 };
      if (onGrip) startDrag();
      window.addEventListener('pointermove', onMove, { passive: false }); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    });
    const startDrag = () => {
      drag.started = true; box.classList.add('dragging'); drag.d.classList.add('lifted');
      drag.ph = document.createElement('div'); drag.ph.className = 'dph'; box.appendChild(drag.ph); placePh();
      drag.els.forEach(x => { if (x !== drag.d) x.style.transition = reduce ? 'none' : 'transform .22s cubic-bezier(.2,.8,.2,1)'; });
      try { navigator.vibrate && navigator.vibrate(12); } catch (e) { }
      SND.sfx('click'); const loop = () => { if (!drag) return; autoScroll(); drag.raf = requestAnimationFrame(loop); }; drag.raf = requestAnimationFrame(loop);
    };
    const placePh = () => { const s = drag.slots[drag.to]; Object.assign(drag.ph.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' }); };
    const layout = () => {
      const br = box.getBoundingClientRect(), s0 = drag.slots[drag.from];
      const px = drag.cx - br.left - drag.gx, py = drag.cy - br.top - drag.gy;
      drag.d.style.transform = `translate(${px - s0.x}px,${py - s0.y}px) scale(1.05) rotate(-1.5deg)`;
      const mx = px + s0.w / 2, my = py + s0.h / 2; let best = drag.to, bd = Infinity;
      drag.slots.forEach((s, k) => { const dd = Math.hypot(s.x + s.w / 2 - mx, s.y + s.h / 2 - my); if (dd < bd) { bd = dd; best = k; } });
      if (best !== drag.to) { drag.to = best; placePh(); SND.sfx('click');
        const tmp = order.filter((_, k) => k !== drag.from); tmp.splice(drag.to, 0, order[drag.from]);
        drag.els.forEach((x, k) => { if (x === drag.d) return; const nk = tmp.indexOf(order[k]); const a = drag.slots[k], b = drag.slots[nk]; x.style.transform = nk === k ? '' : `translate(${b.x - a.x}px,${b.y - a.y}px)`; }); }
    };
    const autoScroll = () => { const sc = drag && drag.started && drag.sc; if (!sc) return; const r = sc.getBoundingClientRect(), m = 56; let v = 0;
      if (drag.cy < r.top + m) v = -Math.ceil((r.top + m - drag.cy) / 4); else if (drag.cy > r.bottom - m) v = Math.ceil((drag.cy - (r.bottom - m)) / 4);
      if (v) { const t = sc.scrollTop; sc.scrollTop += v; if (sc.scrollTop !== t) layout(); } };
    const onMove = e => { if (!drag || e.pointerId !== drag.id) return; drag.cx = e.clientX; drag.cy = e.clientY;
      if (!drag.started) { if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return; startDrag(); }
      e.preventDefault(); layout(); };
    const onUp = e => { if (!drag || e.pointerId !== drag.id) return;
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      const g = drag; drag = null; cancelAnimationFrame(g.raf); if (!g.started) return;
      const a = g.slots[g.from], b = g.slots[g.to];
      g.d.classList.remove('lifted'); g.d.classList.add('dropping'); g.d.style.transition = reduce ? 'none' : 'transform .2s ease-out'; g.d.style.transform = `translate(${b.x - a.x}px,${b.y - a.y}px)`;
      const fin = () => { if (g.ph) g.ph.remove(); box.classList.remove('dragging');
        if (g.to !== g.from) { const id = order.splice(g.from, 1)[0]; order.splice(g.to, 0, id); commit(); }
        draw(); if (g.to !== g.from) { const nd = box.querySelector(`.drawer[data-id="${g.d.dataset.id}"]`); if (nd) { nd.classList.add('moved'); setTimeout(() => nd.classList.remove('moved'), 450); } } };
      if (reduce) fin(); else setTimeout(fin, 210);
    };
    node.querySelector('.check').addEventListener('click', () => {
      if (coolLeft(key)) return;
      const right = L.stages.map(s => s.id); const ok = order.filter((id, i) => id === right[i]).length;
      if (ok === 5) { box.classList.add('done'); box.querySelectorAll('.darrows,.dgrip').forEach(x => x.remove()); box.querySelectorAll('.drawer').forEach((d, i) => d.insertAdjacentHTML('beforeend', `<span class="dname">${L.stages[i].name}</span>`)); node.querySelector('.check').remove(); SND.sfx('unlock'); okFx('המגירות נפתחו! 🎉 אלה שלבי ההתפתחות מהינקות ועד הבגרות.'); successNext(node, sp, 'בתוך המגירה האחרונה מסתתר דף מקופל…'); }
      else lockWrong(key, box, `${ok} מתוך 5 מגירות במקום. נסו שוב 🙂`);
    });
    draw();
  };
  if (S.step.freud >= 1) stage2();
  else {
    node.innerHTML = `<p class="lprompt">על השידה חרוטה שאלה: <b>${L.mc.q}</b></p><div class="row opts">${L.mc.options.map((o, i) => `<button class="btn opt" data-i="${i}">${o}</button>`).join('')}</div>`;
    node.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { if (coolLeft(key)) return; if (+b.dataset.i === L.mc.answer) { S.step.freud = 1; save(); SND.sfx('ok'); stage2(); } else lockWrong(key, b, 'לא הוא… חברו את הפרטים מכל החפצים בחדר 🙂'); }));
  }
  lockShell(sp, L, key, node);
}
function lockSafe(rid, sp, L, key) {
  const node = h('div', { class: 'safe' }); let code = '';
  node.innerHTML = `<p class="lprompt">הקלידו את הקוד בן 4 הספרות: סכום הגימטריה של חמש המילים.</p><div class="wordpins small">${S.words.map(w => `<span class="pin">${w || '?'}</span>`).join('')}</div><div class="sdisp">____</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✔'].map(k => `<button class="btn key" data-k="${k}">${k}</button>`).join('')}</div>`;
  const disp = node.querySelector('.sdisp'); const draw = () => { disp.textContent = (code + '____').slice(0, 4); };
  const press = k => { if (coolLeft(key)) return; if (k === '⌫') code = code.slice(0, -1); else if (k === '✔') return check(); else if (code.length < 4) code += k; SND.sfx('tick'); draw(); };
  const check = () => { if (code === SAFE_CODE) { SND.sfx('unlock'); disp.classList.add('open'); disp.textContent = '✔ נפתח'; finishGame(); } else { if (code.length < 4) wrongFx(disp, 'צריך 4 ספרות'); else lockWrong(key, disp, 'הכספת לא נפתחה. בדקו שוב את החישוב 🙂'); code = ''; setTimeout(draw, 500); } };
  node.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
  const kh = e => { if ($('#modal').hidden) return document.removeEventListener('keydown', kh); if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter') press('✔'); };
  document.addEventListener('keydown', kh);
  node.appendChild(h('details', { class: 'gemd' }, '<summary>טבלת הגימטריה</summary>' + gemTable()));
  lockShell(sp, L, key, node);
}

/* ======================= זכוכית מגדלת ======================= */
function reveal(sp) {
  const word = sp.word;
  const wrap = h('div', { class: 'mag' });
  wrap.innerHTML = `<p class="center">העבירו את זכוכית המגדלת על הדף הישן ומצאו את המילה הנסתרת</p><div class="parch"><div class="w faint">${word}</div><div class="w sharp">${word}</div><div class="lens"><span></span></div></div><div class="mag-after" hidden></div><button class="btn ghost giveup" hidden>לא מצליחים? חשפו את המילה</button>`;
  const par = wrap.querySelector('.parch'), sharp = wrap.querySelector('.sharp'), lens = wrap.querySelector('.lens');
  const seen = new Set(); let done = false;
  const move = (x, y) => { par.style.setProperty('--x', x + 'px'); par.style.setProperty('--y', y + 'px'); const wb = sharp.getBoundingClientRect(), pb = par.getBoundingClientRect(); const rx = x - (wb.left - pb.left), ry = y - (wb.top - pb.top); if (rx > -20 && rx < wb.width + 20 && ry > -40 && ry < wb.height + 40) { seen.add(Math.max(0, Math.min(9, Math.floor(rx / wb.width * 10)))); if (seen.size >= 7) finish(); } };
  par.addEventListener('pointermove', e => { const b = par.getBoundingClientRect(); move(e.clientX - b.left, e.clientY - b.top); });
  par.addEventListener('pointerdown', e => { par.setPointerCapture(e.pointerId); const b = par.getBoundingClientRect(); move(e.clientX - b.left, e.clientY - b.top); });
  const finish = () => {
    if (done) return; done = true; par.classList.add('revealed'); SND.sfx('win');
    const a = wrap.querySelector('.mag-after'); a.hidden = false; wrap.querySelector('.giveup').hidden = true;
    a.innerHTML = `<p class="big center">מצאתם את המילה: <b class="theword">${word}</b> ✨</p><p class="center">${sp.topic}</p>`;
    a.appendChild(h('button', { class: 'btn primary wide', onclick: () => collect(sp) }, '📥 שמרו את המילה במגש המילים'));
  };
  setTimeout(() => { const g = wrap.querySelector('.giveup'); if (g && !done) { g.hidden = false; g.addEventListener('click', finish); } }, 6000);
  openModal({ title: '🔍 זכוכית המגדלת', node: wrap, wide: true, cls: 'magcard', onClose: () => { if (done && !isSolved(sp.id)) collect(sp, true); } });
  requestAnimationFrame(() => { const b = par.getBoundingClientRect(); move(b.width * 0.85, b.height * 0.25); });
}
function collect(sp, silent) {
  if (isSolved(sp.id)) { closeModal(); return; }
  const from = $('#mbody .theword'); const slot = $(`#tray .slot[data-n="${sp.n}"]`);
  if (from && slot && !silent) { const a = from.getBoundingClientRect(), b = slot.getBoundingClientRect(); const fly = h('div', { class: 'fly' }, sp.word); document.body.appendChild(fly); fly.style.left = a.left + 'px'; fly.style.top = a.top + 'px'; requestAnimationFrame(() => { fly.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.6)`; fly.style.opacity = '.3'; }); setTimeout(() => fly.remove(), 900); }
  S.solved.push(sp.id); S.words[sp.n - 1] = sp.word; save();
  if (!silent) closeModal();
  setTimeout(() => { drawTray(); const s = $(`#tray .slot[data-n="${sp.n}"]`); if (s) s.classList.add('pop'); }, silent ? 0 : 800);
  refreshMarkers(); renderPanel();
  const next = ROOMS[sp.n]; setTimeout(() => { toast(next ? `🔓 ${next.name} נפתח! חוזרים לרחוב…` : '🔓 משרד הבלשים נפתח! הכספת מחכה…', 3000); setTimeout(goHub, 1400); }, silent ? 200 : 900);
}
function drawTray() { const t = $('#tray'); t.innerHTML = ROOMS.map(r => `<div class="slot ${S.words[r.n - 1] ? 'full' : ''}" data-n="${r.n}" title="${r.name}" style="--c:${r.color}"><span class="si">${r.icon}</span><span class="sw">${S.words[r.n - 1] || '?'}</span></div>`).join(''); }

/* ======================= סיום ותעודה ======================= */
function finishGame() {
  if (!S.finishMs) { S.finishMs = Date.now(); save(); }
  setTimeout(() => { closeModal(); playClip('finale', [[0, '🔓 הכספת נפתחה!'], [2.4, 'הרווחה הנפשית והרוגע חוזרים לתושבי לונדון 🎉'], [5.2, 'כל הכבוד, בלשים!']], showEnding, 7); }, 900);
}
function showEnding() {
  SND.sfx('win');
  const e = $('#ending'); const nh = totalHints(); const hl = nh ? ` · רמזים: <b>${nh}</b> (כולל ${nh} ${nh === 1 ? 'דקה' : 'דקות'} תוספת)` : ' · בלי רמזים! 🌟'; const tm = S.timer.mode === 'none' ? `<div class="etime">💡 רמזים: <b>${nh}</b></div>` : `<div class="etime">⏱ זמן החקירה: <b>${fmt(gameMs())}</b>${hl}</div>`;
  e.innerHTML = `<div class="paper"><div class="mast">${STORY.masthead}</div><div class="dateline">לונדון · מהדורה מיוחדת · 1860</div>
  <h1>${ENDING.headline}</h1><h2>${ENDING.sub}</h2>
  <div class="ecols"><div><p>${ENDING.body.replace('קבוצת הבלשים הצעירה', `קבוצת הבלשים <b>"${esc(S.group || 'הבלשים')}"</b>`)}</p><p class="sentence">${ENDING.sentence}</p></div>
  <div><img class="endpic" src="img/finale-end.jpg?v=9" alt="מר פסיכו וגברת לוגיה חוגגים ליד הכספת הפתוחה"><div class="meditate">🧘‍♂️🧘‍♀️</div><p class="quote">${ENDING.quote}</p></div></div>
  <div class="ewords">${S.words.map(w => `<span>${w}</span>`).join('')}</div>${tm}
  <div class="row center"><button class="btn primary" id="certBtn">🖨️ תעודה לקבוצה</button><button class="btn ghost" id="endBack">חזרה למשרד</button></div></div><canvas id="confetti"></canvas>`;
  e.hidden = false; $('#certBtn').addEventListener('click', printCert); $('#endBack').addEventListener('click', () => { e.hidden = true; });
  confetti($('#confetti'));
}
function confetti(cv) { const c = cv.getContext('2d'); const W = cv.width = innerWidth, H = cv.height = innerHeight; const P = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 2 + Math.random() * 3, r: 4 + Math.random() * 6, c: ['#ff7a59', '#e94f8a', '#2bb3a3', '#8a63d2', '#f2b705', '#4361ee'][Math.random() * 6 | 0], a: Math.random() * 6 })); let n = 0; const f = () => { c.clearRect(0, 0, W, H); P.forEach(p => { p.y += p.v; p.a += 0.1; c.fillStyle = p.c; c.save(); c.translate(p.x + Math.sin(p.a) * 10, p.y); c.rotate(p.a); c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); c.restore(); }); if (++n < 420 && !$('#ending').hidden) requestAnimationFrame(f); else c.clearRect(0, 0, W, H); }; f(); }
function printArea(html, cls) { const p = $('#print-area'); p.innerHTML = html; document.body.classList.add('printing', cls); const done = () => { document.body.classList.remove('printing', cls); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); setTimeout(() => window.print(), 300); }
function printCert() {
  const d = new Date(S.finishMs || Date.now()); const ds = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  printArea(`<div class="cert"><div class="cin"><img src="img/logo.png" alt="" class="clogo"><div class="cmast">${STORY.masthead}</div><h1>תעודת בלשים מצטיינים</h1><p class="cto">מוענקת לקבוצת</p><div class="cgroup">${esc(S.group || 'הבלשים')}</div>
  <p>על פתרון תעלומת הרוגע הגנוב והחזרת הרווחה הנפשית לתושבי לונדון</p><div class="cwords">${S.words.map(w => `<span>${w}</span>`).join('')}</div>
  <p class="cmeta">${S.timer.mode === 'none' ? '' : `זמן החקירה: <b>${fmt(gameMs())}</b> · `}רמזים שנפתחו: <b>${totalHints()}</b>${totalHints() ? ` (+${totalHints()} דק')` : ''} · תאריך: ${ds}</p><div class="csig"><div>${AVATAR.psycho}<span>מר פסיכו</span></div><div>${AVATAR.logia}<span>גברת לוגיה</span></div></div></div></div>`, 'p-cert');
}

/* ======================= מורה ======================= */
function teacherLogin() {
  const node = h('form', { class: 'row tform' }, '<input type="password" inputmode="numeric" class="tc" placeholder="קוד מורה" aria-label="קוד מורה" autocomplete="off"><button class="btn primary" type="submit">כניסה</button>');
  const wrap = h('div'); wrap.appendChild(h('p', {}, 'כניסה למורים: תשובות לכל החדרים, פתיחת חדרים ואיפוס התקדמות.')); wrap.appendChild(node); wrap.appendChild(h('div', { class: 'feedback' }));
  node.addEventListener('submit', e => { e.preventDefault(); if (node.querySelector('.tc').value.trim() === TEACHER_CODE) { TEACHER = true; sessionStorage.setItem('pe_teacher', '1'); closeModal(); teacherPanel(); updTeacherBadge(); refreshMarkers(); renderPanel(); } else wrongFx(node, 'קוד שגוי'); });
  openModal({ title: '👩‍🏫 כניסת מורה', node: wrap });
}
function whereHTML(id) { const sp = spot(id), sc = SCN[id]; const nd = sc.spots.filter(s => s.decoy).length; return `<p class="where">🔎 חפצי הרמז בחדר: ${sp.clues.map(x => x.title).join(' · ')} <small>(ועוד ${nd} חפצי הסחה שמראים רק משפט קצר)</small></p>`; }
function answersHTML() {
  const r = ROOMS; const [p, c, t, f, g] = r;
  return `<section class="ans"><h3>⏱ כללי המשחק</h3><p>הרמזים בחדר לא מסומנים: חפץ מנצנץ כשהעכבר מתקרב (בטלפון – נצנוץ עדין כל כמה שניות). בכל חדר יש גם 2 חפצי הסחה. תשובה שגויה במנעול נועלת אותו ל-30 שניות. רמזי המנעול: רמז 1 נפתח 45 שניות אחרי הכניסה לחדר, רמז 2 – שתי דקות אחרי פתיחת רמז 1, רמז 3 – אחרי 2 ניסיונות שגויים ופתיחת רמז 2. כל רמז מוסיף דקה לזמן הקבוצה, ומספר הרמזים מופיע בתעודה. במצב מורה אין המתנה, אין נעילה ואין תוספת זמן.</p></section>
  <section class="ans"><h3>1. ${p.name} → <b>${p.word}</b> (גימטריה ${gematria(p.word)})</h3>${whereHTML('print')}<p>מיון השאלות:</p><table><tr><th>${p.lock.cols[0]}</th><th>${p.lock.cols[1]}</th></tr>${[0, 1, 2, 3].map(i => `<tr><td>${p.lock.items[i].t}<small>${p.lock.items[i].why}</small></td><td>${p.lock.items[i + 4].t}<small>${p.lock.items[i + 4].why}</small></td></tr>`).join('')}</table></section>
  <section class="ans"><h3>2. ${c.name} → <b>${c.word}</b> (${gematria(c.word)})</h3>${whereHTML('cinema')}<p>התאמת פרצופים (6 הרגשות הבסיסיים לפי פול אקמן; "קנאה" ו"גאווה" הם מסיחים):</p><ul class="faces-key">${c.lock.faces.map((k, i) => `<li><span class="mini"><img src="img/emo-${k}.webp?v=9" alt=""></span>דמות ${'אבגדהו'[i]} = <b>${c.lock.labels[k]}</b></li>`).join('')}</ul></section>
  <section class="ans"><h3>3. ${t.name} → <b>${t.word}</b> (${gematria(t.word)})</h3>${whereHTML('telegraph')}<p>שאלה: ${t.lock.prompt}</p><p>תשובה: <b>אפקט הצופה מן הצד</b> (Bystander effect). המערכת מקבלת גם: אפקט הצופה, תופעת הצופה מן הצד, bystander effect – בלי תלות ברווחים, באות ה' ובאותיות סופיות, וגם טעות הקלדה קטנה. "פיזור אחריות" מקבל הודעת "כמעט".</p></section>
  <section class="ans"><h3>4. ${f.name} → <b>${f.word}</b> (${gematria(f.word)})</h3>${whereHTML('freud')}<p>"מי אני?" → <b>זיגמונד פרויד</b> (ספה, סיגר, חלומות, אבי הפסיכואנליזה).</p><p>סדר המגירות (1 → 5): ${f.lock.stages.map((s, i) => `${i + 1}. ${s.name} ("${s.cap}")`).join(' · ')}. על המגירות מופיעים רק הציור והמשפט; שמות השלבים נחשפים אחרי הפתרון.</p></section>
  <section class="ans"><h3>5. ${g.name} → <b>${g.word}</b> (${gematria(g.word)})</h3>${whereHTML('gallery')}<p>רמז "שני קווים" (מילר-לייר): התשובה "הם באותו אורך" (12 ס"מ כל אחד) → חלק התשובה: <b>תפיסה</b>. רמז "צבעים מבולבלים" (סטרופ): משחק של שני סבבים, נספר כרמז בסיומו → <b>קשב</b>.</p><p><b>משחק הזיכרון</b> (קיר המסגרות, שלב חובה לפני המנעול): 12 מסגרות = 6 זוגות של אשליות ראייה מקוריות: ${ILLUSIONS.map(x => x.name).join(' · ')}. התמונות מוצגות ${Math.round(PEEK_MS / 1000)} שניות לשינון ואז מתהפכות; לוחצים על שתי מסגרות כדי למצוא זוג. טעות מחזירה את המסגרות, והכפתור "שננו שוב" מציץ שוב כמה פעמים שרוצים. המיקומים מתערבבים בכל משחק, אז אין סדר קבוע להדפסה. בסיום → חלק התשובה: <b>זיכרון</b>.</p><div class="ill-key">${ILLUSIONS.map(x => `<figure>${x.svg}<figcaption>${x.name}</figcaption></figure>`).join('')}</div><p>שאלה: ${g.lock.prompt}<br>תשובה: <b>פסיכולוגיה קוגניטיבית</b> (מתקבל גם "קוגניטיבית", "קוגניציה", cognitive).</p></section>
  <section class="ans"><h3>🔐 הכספת במשרד הבלשים</h3>${whereHTML('office')}<p>${r.map(x => `${x.word} = ${gematria(x.word)}`).join(' · ')}</p><p>${r.map(x => gematria(x.word)).join(' + ')} = <b>${r.reduce((a, x) => a + gematria(x.word), 0)}</b> → קוד הכספת: <b class="code">${SAFE_CODE}</b></p></section>`;
}
function teacherPanel() {
  const CK = getClock();
  const node = h('div', { class: 'teacher' });
  node.innerHTML = `<div class="row tbtns"><button class="btn primary" data-a="print">🖨️ דף תשובות להדפסה</button><button class="btn" data-a="reset">🔄 איפוס התקדמות לקבוצה הבאה</button><button class="btn ghost" data-a="exit">יציאה ממצב מורה</button></div>
  <p class="tnote">במצב מורה כל הבניינים פתוחים, המנעולים נפתחים בלי לחפש רמזים, כל הרמזים גלויים בלי המתנה ובלי תוספת זמן, ואין נעילה של 30 שניות. המצב נשמר רק בלשונית הזו.</p>
  <h3>⏱ שעון לקבוצות</h3><div class="tclock"><p class="tnote">ברירת המחדל: שעון עצר. ההגדרה נשמרת במחשב הזה וחלה על כל קבוצה חדשה שמתחילה בו. התלמידים לא בוחרים שעון.</p>
   <div class="row"><label class="radio"><input type="radio" name="tcm" value="stopwatch" ${CK.mode === 'stopwatch' ? 'checked' : ''}> ⏱ שעון עצר</label><label class="radio"><input type="radio" name="tcm" value="countdown" ${CK.mode === 'countdown' ? 'checked' : ''}> ⏳ ספירה לאחור <select class="tcmins" aria-label="דקות">${[15, 20, 25, 30, 35, 40, 45, 50, 60].map(m => `<option value="${m}" ${CK.minutes === m ? 'selected' : ''}>${m} דקות</option>`).join('')}</select></label><label class="radio"><input type="radio" name="tcm" value="none" ${CK.mode === 'none' ? 'checked' : ''}> 🚫 בלי שעון</label></div>
   <p class="tnote tcnow">מוגדר עכשיו: <b>${clockLabel(CK)}</b></p><p class="tnote">קישור לכיתה עם ההגדרה הזו (כל מחשב שייפתח ממנו יקבל אותה): <code class="tclink">${esc(clockLink(CK))}</code> <button type="button" class="btn small" data-a="copyclock">📋 העתקה</button></p></div>
  <h3>פתיחת חדר ישירות</h3><div class="row tbtns">${ROOMS.map(r => `<button class="btn" data-go="${r.id}">${r.icon} ${r.name}</button>`).join('')}<button class="btn" data-go="office">🕵️ משרד הבלשים</button><button class="btn" data-go="hub">🏙️ הרחוב</button></div>
  <h3>התשובות</h3>${answersHTML()}`;
  node.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.go) { closeModal(); if (!$('#game').hidden) { b.dataset.go === 'hub' ? goHub() : go(b.dataset.go); } else enterGame(true, b.dataset.go); }
    if (b.dataset.a === 'print') printArea(`<div class="ansheet"><h1>חדר הבריחה בפסיכולוגיה – דף תשובות למורה</h1><p>קוד מורה: ${TEACHER_CODE} · קוד הכספת: ${SAFE_CODE}</p>${answersHTML()}</div>`, 'p-ans');
    if (b.dataset.a === 'reset') { if (confirm('לאפס את כל ההתקדמות במחשב הזה? (שם הקבוצה, הזמן, המילים והרמזים יימחקו)')) { localStorage.removeItem(KEY); S = fresh(); closeModal(); location.reload(); } }
    if (b.dataset.a === 'copyclock') { const t = node.querySelector('.tclink').textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('הקישור הועתק 📋')).catch(() => { const r = document.createRange(); r.selectNodeContents(node.querySelector('.tclink')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }); }
    if (b.dataset.a === 'exit') { exitTeacher(); closeModal(); }
  });
  node.addEventListener('change', e => { if (!e.target.closest('.tclock')) return; const m = node.querySelector('input[name=tcm]:checked').value; const c = { mode: m, minutes: +node.querySelector('.tcmins').value }; setClock(c); node.querySelector('.tcnow b').textContent = clockLabel(c); node.querySelector('.tclink').textContent = clockLink(c); });
  openModal({ title: '👩‍🏫 מצב מורה – כל התשובות', node, wide: true, cls: 'tcard' });
}
function updTeacherBadge() { const b = $('#tbadge'); if (b) b.hidden = true; const sb = $('#startTeacher'); if (sb) sb.textContent = TEACHER ? '👩‍🏫 פאנל מורה' : '👩‍🏫 כניסת מורה';
  document.body.classList.toggle('tmode', TEACHER); $$('.tstrip').forEach(x => x.hidden = !TEACHER); const tn = $('#tmNote'); if (tn) tn.hidden = !TEACHER; }
function exitTeacher() { const was = TEACHER; TEACHER = false; try { sessionStorage.removeItem('pe_teacher'); } catch (e) { } updTeacherBadge(); if (was && !$('#game').hidden) { refreshMarkers(); renderPanel(); } }
function wireStrips() { $$('.tstrip').forEach(st => st.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.t === 'panel') teacherPanel(); if (b.dataset.t === 'exit') { exitTeacher(); closeModal(); toast('יצאת ממצב מורה'); } })); }

/* ======================= מסך פתיחה ======================= */
const CLOCK_KEY = 'psych_escape_clock';
function getClock() { try { const c = JSON.parse(localStorage.getItem(CLOCK_KEY)); if (c && ['stopwatch', 'countdown', 'none'].includes(c.mode)) return { mode: c.mode, minutes: +c.minutes || 45 }; } catch (e) { } return { mode: 'stopwatch', minutes: 45 }; }
function setClock(c) { try { localStorage.setItem(CLOCK_KEY, JSON.stringify(c)); } catch (e) { } }
(function clockFromURL() { try { const q = new URLSearchParams(location.search).get('clock'); if (!q) return; const m = /^(stopwatch|none|countdown)(\d+)?$/.exec(q); if (!m) return; setClock({ mode: m[1], minutes: m[1] === 'countdown' ? Math.min(120, Math.max(5, +m[2] || 45)) : 45 }); } catch (e) { } })();
function clockLabel(c) { return c.mode === 'countdown' ? `⏳ ספירה לאחור, ${c.minutes} דקות` : c.mode === 'none' ? '🚫 בלי שעון' : '⏱ שעון עצר'; }
function clockLink(c) { const u = new URL(location.href); u.search = ''; u.hash = ''; if (c.mode !== 'stopwatch') u.searchParams.set('clock', c.mode === 'countdown' ? 'countdown' + c.minutes : 'none'); return u.toString(); }
function deckle(n) { const pts = []; const j = () => (Math.random() * 3.5).toFixed(1) + 'px'; for (let i = 0; i <= n; i++) pts.push(`${(i / n * 100).toFixed(2)}% ${j()}`); for (let i = 1; i <= n; i++) pts.push(`calc(100% - ${j()}) ${(i / n * 100).toFixed(2)}%`); for (let i = n - 1; i >= 0; i--) pts.push(`${(i / n * 100).toFixed(2)}% calc(100% - ${j()})`); for (let i = n - 1; i > 0; i--) pts.push(`${j()} ${(i / n * 100).toFixed(2)}%`); return `polygon(${pts.join(',')})`; }
function startScreen() {
  clipURL('intro');
  const st = $('#start');
  const saved = S.started && !S.finishMs ? S : (S.finishMs ? S : null);
  const col = (t, x, cap) => `<article class="gz-col${cap ? ' cap' : ''}"><h3>${t}</h3><p>${x}</p></article>`;
  st.innerHTML = `<div class="gz-wrap"><div class="gz" id="gzSheet">
   <div class="gz-top"><div class="gz-ear">מהדורת<br>בוקר<small>מחיר: פני אחד</small></div>
     <div class="gz-masthead"><div class="gz-motto">❦ עיתון לענייני הנפש, החברה והסדר הציבורי ❦</div><div class="gz-mast">${STORY.masthead}</div></div>
     <div class="gz-ear">מזג האוויר:<br>ערפל כבד<small>ורוגע אין</small></div></div>
   <div class="gz-strip"><span>שנה ה׳ · גיליון מס׳ 47</span><span>${STORY.dateline.replace(' · מחיר: פני אחד', '')}</span><span>מחיר: פני אחד</span></div>
   <h1 class="gz-head">${STORY.headline}</h1>
   <div class="gz-deck">תושבי העיר קמו בלי שלווה · המשטרה חסרת אונים · הבלשים הנודעים נקראים לדגל</div>
   <button type="button" class="gz-jump" id="gzJump">✂ לטופס ההרשמה לבלשים ↓</button>
   <div class="gz-grid">
     <div class="gz-c1">${col(STORY.col1t, STORY.col1, true)}<div class="gz-brief"><b>בקצרה</b><ul><li>ברחוב בייקר נשמעו אנחות כבדות כל הלילה.</li><li>בעל בית הקפה מדווח: "אף אחד כבר לא צוחק".</li><li>רופאי העיר אובדי עצות.</li></ul></div></div>
     <figure class="gz-fig"><div class="gz-photo"><img src="img/detectives.webp?v=9" alt="מר פסיכו וגברת לוגיה"></div><figcaption><b>מר פסיכו וגברת לוגיה</b>הבלשים הטובים בעיר, בתחריט שהוכן במיוחד לעיתוננו</figcaption></figure>
     ${col(STORY.col2t, STORY.col2, false)}
   </div>
   <div class="gz-low">
     <form class="gz-coupon" id="sform"><div class="gz-scissors" aria-hidden="true">✂</div>
       <div class="gz-ctitle">טופס הרשמה לבלשים</div><div class="gz-csub">מלאו, גזרו והצטרפו לחקירה!</div>
       <label class="gz-field">שם הקבוצה<input id="gname" maxlength="40" placeholder="למשל: הבלשים מכיתה י'3" value="${esc(S.group)}" required></label>
       <div class="gz-btns">${saved && S.started ? `<button type="button" class="btn gz-btn primary" id="contBtn">▶ המשך המשחק של "${esc(S.group)}"</button><button type="submit" class="btn gz-btn">🆕 קבוצה חדשה</button>` : `<button type="submit" class="btn gz-btn primary">🔍 מתחילים בחקירה!</button>`}</div>
       <div class="gz-cnote">⏱ הזמן נמדד משעת ההרשמה · כל רמז מוסיף דקה</div>
       <div class="gz-tmnote" id="tmNote" hidden>👩‍🏫 מצב מורה פעיל כרגע. כניסה כקבוצה יוצאת ממצב המורה, והמשחק יהיה רגיל, בלי תשובות.</div>
     </form>
     <aside class="gz-ads" aria-label="מודעות">
       <div class="gz-ad"><b>זכוכיות מגדלת</b>משובחות ומלוטשות<br>לבלשים ולחוקרי הנפש<span>חנות האחים לנס, רחוב בייקר</span></div>
       <div class="gz-ad alt"><b>דרושים!</b>בלשים צעירים, סקרנים ונבונים.<br>ניסיון קודם – לא נדרש.<span>לפנות למשרד הבלשים</span></div>
       <div class="gz-ad"><b>תה קמומיל</b>להרגעת העצבים<br>ולשינה טובה<span>רק 2 פני לחבילה</span></div>
     </aside>
   </div>
   <div class="gz-foot"><button class="btn gz-teach" id="toGate" type="button">📜 הוראות</button><button class="btn gz-teach" id="startTeacher" type="button">👩‍🏫 כניסת מורה</button><span class="gz-note">מתאים למחשב ולטלפון · מותר להיעזר באינטרנט ובבינה מלאכותית</span><img class="gz-logo" src="img/logo.png" alt="INBAL ARIELY"></div>
  </div></div>`;
  const sh = $('#gzSheet'); sh.style.clipPath = deckle(60);
  $('#gzJump').addEventListener('click', () => { $('#sform').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#gname').focus({ preventScroll: true }), 500); });
  $('#sform').addEventListener('submit', e => { e.preventDefault(); const name = $('#gname').value.trim(); if (!name) { $('#gname').focus(); return; } exitTeacher();
    try { localStorage.removeItem(KEY); } catch (e) { } S = fresh(); S.group = name; S.timer = getClock(); S.started = Date.now(); save(); enterGame(); playClip('intro', [[0, 'לונדון, 1860. מישהו גנב לתושבי העיר את הרווחה הנפשית והרוגע…'], [3, 'מר פסיכו וגברת לוגיה, הבלשים הטובים בעיר, צריכים את העזרה שלכם!'], [6, 'אספו 5 מילים בחמישה בניינים – והן יפתחו את הכספת 🔐']], null, 8.6); });
  const cb = $('#contBtn'); if (cb) cb.addEventListener('click', () => { exitTeacher(); enterGame(); });
  $('#toGate').addEventListener('click', () => { $('#start').hidden = true; showGate(); });
  $('#startTeacher').addEventListener('click', () => TEACHER ? teacherPanel() : teacherLogin());
  updTeacherBadge();
}

/* ======================= שער ======================= */
function showGate() { closeModal(); $('#game').hidden = true; $('#ending').hidden = true; $('#start').hidden = true; $('#gate').hidden = false; $('#gate').scrollTop = 0; updTeacherBadge(); clipURL('intro'); }
function wireGate() {
  const d = $('#gtDust'); if (d && !d.childElementCount) { for (let i = 0; i < 34; i++) { const p = document.createElement('i'); const z = Math.random(); p.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--s:${(2 + z * 5).toFixed(1)}px;--d:${(7 + Math.random() * 10).toFixed(1)}s;--dl:-${(Math.random() * 12).toFixed(1)}s;--x:${(Math.random() * 60 - 30).toFixed(0)}px;--c:${['#ffe08a', '#ffd23f', '#9ff3ff', '#ffb3e6', '#fff'][i % 5]}`; d.appendChild(p); } }
  $('#gateGo').addEventListener('click', () => { try { SND.init(); SND.sfx('click'); } catch (e) { } $('#gate').hidden = true; $('#start').hidden = false; startScreen(); window.scrollTo(0, 0); });
}
let inited = false;
function enterGame(teacherJump = false, where = null) {
  SND.init(); SND.startMusic();
  if (teacherJump && !S.started) { S.group = S.group || 'מורה'; S.started = Date.now(); save(); }
  $('#start').hidden = true; $('#gate').hidden = true; $('#game').hidden = false;
  drawTray(); tickTimer(); updTeacherBadge();
  if (!inited) { init3d(); inited = true; setTimeout(() => { clipURL('door'); clipURL('finale'); }, 3500); }
  if (where && where !== 'hub') { showScene(where); renderPanel(); } else goHub();
  if (S.finishMs && !where) setTimeout(showEnding, 300);
}

/* ======================= חיבורים כלליים ======================= */
function wire() {
  wireClip();
  document.addEventListener('click', e => { if (e.detail > 0 && performance.now() - modalAt < 400 && $('#modal').contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);
  $('#mclose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && performance.now() - modalAt > 600) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  const vol = $('#vol'), mute = $('#mute');
  vol.value = SND.getVolume(); const mi = () => { mute.textContent = SND.isMuted() || +vol.value === 0 ? '🔇' : '🔊'; mute.setAttribute('aria-pressed', SND.isMuted() ? 'true' : 'false'); }; mi();
  vol.addEventListener('input', () => { SND.init(); SND.setVolume(+vol.value); mi(); });
  mute.addEventListener('click', () => { SND.init(); SND.startMusic(); SND.setMuted(!SND.isMuted()); mi(); });
  $('#tbadge').addEventListener('click', teacherPanel); wireStrips(); wireGate();
  $('#homeBtn').addEventListener('click', () => { if (!$('#game').hidden) goHub(); });
  $('#menuBtn').addEventListener('click', () => { closeModal(); $('#game').hidden = true; $('#ending').hidden = true; $('#gate').hidden = true; $('#start').hidden = false; startScreen(); window.scrollTo(0, 0); });
}
document.fonts && document.fonts.load('700 40px Rubik').catch(() => { });
(document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(() => { wire(); showGate(); updTeacherBadge(); window.__PE = { S: () => S, view: () => curView, markerScreen: id => { const s = sprites.find(x => x.userData.id === id); if (!s) return null; const v = s.position.clone().project(camera); const r = canvasEl.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; } }; });
