const ws = document.getElementById('ws'), tray = document.getElementById('tray'), msg = document.getElementById('msg');
const fly = document.getElementById('fly');
const HOOKS = [{ x: 250, y: 74 }, { x: 540, y: 74 }];
const MU = { A: .19, B: .58 }, SC = 300, XMIN = 440, XMAX = 725, OFF = 309, RY = 818, DL = 150;   // трение, px/м, границы бруска, смещения
const chains = [[], []], free = {}, st = {}, sw = [{ a: 0, v: 0 }, { a: 0, v: 0 }];
const table = { rail: null, block: false, x: XMAX, stack: [], dyn: null, v: 0, F: 0 };
let drag = null, ghosts = [], raf = 0, last = 0, pan = null, pull = null;
const vw = { x: 0, y: 0, w: 800, h: 900 }, vt = { ...vw }, clamp = (v, a, b) => Math.min(Math.max(v, a), b);
// ---------- звук ----------
let AC = null, muted = false; try { muted = localStorage.getItem('mute') === '1'; } catch (e) {}
function tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
  if (muted) return; AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .03); }
const SND = { pick: () => tone(520, 700, .07, .04), put: () => tone(300, 200, .07, .05), back: () => tone(500, 260, .14, .035),
  hang: () => { tone(260, 130, .12, .09); tone(1900, 1500, .2, .01, 'sine', .01); }, undo: () => tone(620, 420, .08, .035), redo: () => tone(420, 620, .08, .035),
  restart: () => { tone(400, 200, .2, .035); tone(300, 150, .25, .03, 'sine', .08); }, warn: () => tone(330, 300, .25, .03, 'triangle'),
  ok: () => { tone(523, 523, .12, .045); tone(784, 784, .22, .045, 'sine', .1); }, bad: () => tone(300, 220, .22, .035, 'triangle') };
// ---------- история ----------
const snap = () => JSON.stringify({ c: chains, f: free, t: { rail: table.rail, block: table.block, x: Math.round(table.x), stack: table.stack, dyn: table.dyn } });
let hist = [snap()], hi = 0;
function ui() { undo.disabled = hi === 0; redo.disabled = hi >= hist.length - 1; snd.classList.toggle('off', muted); zv.textContent = Math.round(800 / vt.w * 100) + '%'; }
function commit() { const x = snap(); if (x !== hist[hi]) { hist.length = hi + 1; hist.push(x); hi++; } ui(); }
function restore(x) { const o = JSON.parse(x); chains.forEach((c, i) => { c.length = 0; c.push(...o.c[i]); });
  for (const k in free) delete free[k]; Object.assign(free, o.f); Object.assign(table, o.t, { v: 0, F: 0 }); for (const k in st) delete st[k];
  chains.forEach(c => c.forEach((id, i) => st[id] = { F: loadBelow(c, i), v: 0, dx: 0, dy: 0 })); sw.forEach(q => q.v += .25); wake(); }
function undoA() { if (!drag && hi > 0) { restore(hist[--hi]); SND.undo(); } ui(); }
function redoA() { if (!drag && hi < hist.length - 1) { restore(hist[++hi]); SND.redo(); } ui(); }
function clearAll() { chains.forEach(c => c.length = 0); for (const k in free) delete free[k]; Object.assign(table, { rail: null, block: false, x: XMAX, stack: [], dyn: null, v: 0, F: 0 }); }
function restart() { if (drag) return; clearAll(); document.getElementById('answer').reset(); document.getElementById('res').innerHTML = ''; setZoom(1, 400, 450); SND.restart(); commit(); wake(); }
function setZoom(z, cx, cy) { z = clamp(z, 1, 3.5); const w = 800 / z, h = 900 / z; vt.w = w; vt.h = h; vt.x = clamp(cx - w / 2, 0, 800 - w); vt.y = clamp(cy - h / 2, 0, 900 - h); ui(); wake(); }
const zoomBy = f => setZoom(800 / vt.w * f, vt.x + vt.w / 2, vt.y + vt.h / 2);

const clampFree = p => ({ h: p.h, x: p.h ? clamp(p.x, 0, 300) : clamp(p.x, 30, 770), y: p.h ? clamp(p.y, 4, 860) : clamp(p.y, 4, 800) });
const byId = id => EQUIP.find(e => e.id === id);
function say(t) { msg.textContent = t; msg.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => msg.classList.remove('on'), 3800); }
const loadBelow = (c, i) => { let m = 0; for (let j = i + 1; j < c.length; j++) m += byId(c[j]).mass; return m * G; };
const bot = id => byId(id).bottom(st[id].F);
const chainEnd = ci => chains[ci].reduce((y, id) => y + bot(id), HOOKS[ci].y);
// точка верхнего крючка предмета с учётом того, за какое место его держат
function origin(d) { const a = d.ang * Math.PI / 180, X = d.sc * d.lx, Y = d.sc * d.ly; return { x: d.x - (X * Math.cos(a) - Y * Math.sin(a)), y: d.y - (X * Math.sin(a) + Y * Math.cos(a)) }; }
const near = d => { const o = origin(d); return HOOKS.findIndex((h, ci) => Math.abs(o.x - h.x) < 70 && Math.abs(o.y - chainEnd(ci)) < 90); };

function tableStep(dt) {   // брусок на рейке: трение покоя и скольжения
  const T = table; if (!T.block) { T.F = 0; return false; }
  const e = T.dyn && byId(T.dyn), m = .05 + T.stack.reduce((s, i) => s + byId(i).mass, 0), mk = MU[T.rail] * m * G;
  for (let k = 0; k < 4; k++) { const h = dt / 4;
    T.F = e && pull ? e.fmax * clamp((T.x - OFF - pull.xp) / DL, 0, 1.05) : 0;
    let dir = T.v < -.5 ? -1 : T.v > .5 ? 1 : 0;
    if (!dir) { if (T.F <= mk * 1.15) { T.v = 0; continue; } dir = -1; T.v = -1; }
    T.v += (-T.F - dir * mk - .03 * T.v / SC) / m * SC * h;
    if ((dir < 0 && T.v >= 0) || (dir > 0 && T.v <= 0)) T.v = 0;
    T.x += T.v * h; if (T.x < XMIN) { T.x = XMIN; T.v = Math.max(T.v, 0); } if (T.x > XMAX) { T.x = XMAX; T.v = Math.min(T.v, 0); } }
  return Math.abs(T.v) > .5 || !!(e && pull);
}
function step(dt) {
  let busy = !!drag || ghosts.length > 0 || tableStep(dt);
  chains.forEach((c, ci) => { c.forEach((id, i) => { const s = st[id], T = loadBelow(c, i), z = byId(id).type === 'spring' ? .22 : .4, w = 15;
      for (let k = 0; k < 3; k++) { s.v += (w * w * (T - s.F) - 2 * z * w * s.v) * dt / 3; s.F += s.v * dt / 3; }
      s.dx *= Math.exp(-dt * 9); s.dy *= Math.exp(-dt * 9);
      if (Math.abs(T - s.F) > .002 || Math.abs(s.v) > .01 || Math.abs(s.dx) + Math.abs(s.dy) > .3) busy = true; });
    const q = sw[ci]; q.v += (-20 * q.a - 1.7 * q.v) * dt; q.a += q.v * dt;
    if (Math.abs(q.a) > .0004 || Math.abs(q.v) > .004) busy = true; });
  if (drag) { const k = 1 - Math.exp(-dt * 12); drag.ang += (0 - drag.ang) * k; drag.sc += (1 - drag.sc) * k; }
  ghosts.forEach(g => { if (g.tx !== undefined) { const k = 1 - Math.exp(-dt * 12); g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.ang += (g.tang - g.ang) * k; g.sc += (g.tsc - g.sc) * k; g.life -= dt * 1.8; } else { g.life -= dt * 4; g.sc *= 1 - dt * 3; } });
  ghosts = ghosts.filter(g => g.life > 0);
  const kv = 1 - Math.exp(-dt * 14); for (const k in vw) { const d = vt[k] - vw[k]; vw[k] += d * kv; if (Math.abs(d) > .05) busy = true; else vw[k] = vt[k]; }
  return busy;
}
function loop(t) { const dt = Math.min((t - last) / 1000 || .016, .033); last = t; const busy = step(dt); render(); raf = busy ? requestAnimationFrame(loop) : 0; }
const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };

function tableSvg() {
  const T = table; if (!T.rail) return '';
  let s = `<g class="it" data-t="rail" transform="translate(${RX0} ${RY})" filter="url(#sh)" style="cursor:grab">${byId('rail').draw(T.rail)}</g>
  <g class="flip" transform="translate(${RX1 + 16} 828)" style="cursor:pointer"><title>Перевернуть рейку: А ↔ Б</title><circle r="12" fill="#fff" stroke="#35506a" stroke-width="2"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="700" fill="#1b55b3">${T.rail === 'A' ? 'А' : 'Б'}</text></g>`;
  if (!T.block) return s;
  let y = -30, k = '';
  T.stack.forEach((id, i) => { y -= byId(id).spec.h; k += `<g class="it" data-t="stack" data-i="${i}" transform="translate(0 ${y - 12})" style="cursor:grab">${byId(id).flat()}</g>`; });
  const hk = '#a3afb9', rl = free.ruler;
  if (rl && rl.h) s += `<line x1="${T.x - 38}" x2="${T.x - 38}" y1="${Math.min(RY - 30, rl.y)}" y2="${Math.max(RY, rl.y + 30)}" stroke="#d6262c" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>`;
  s += `<g transform="translate(${T.x} ${RY})" filter="url(#sh)"><g class="it" data-t="block" style="cursor:grab"><rect x="-38" y="-30" width="76" height="30" rx="2" fill="url(#wood)" stroke="#9a7440"/><path d="M-30 -20h60M-30 -11h60" stroke="#b98b52" stroke-width=".6" opacity=".7"/><path d="M-38 -15h-8M38 -15h8" stroke="${hk}" stroke-width="2.4"/><circle cx="-50" cy="-15" r="4.2" fill="none" stroke="${hk}" stroke-width="2.4"/><circle cx="50" cy="-15" r="4.2" fill="none" stroke="${hk}" stroke-width="2.4"/></g>${k}</g>`;
  if (T.dyn) { const e = byId(T.dyn), xh = T.x - 76, f = Math.min(T.F / e.fmax, 1.05), rx = xh - (233 + f * DL);
    s += `<path d="M${T.x - 54} 803L${xh} 793" stroke="#7b8791" stroke-width="1.5"/><g class="it" data-t="dyn" transform="translate(${xh} 793) rotate(90)" filter="url(#sh)" style="cursor:grab">${e.draw(T.F)}</g>
    <circle class="pull" cx="${rx}" cy="793" r="15" fill="#1b55b3" fill-opacity="${pull ? .25 : .001}" style="cursor:ew-resize"/>`;
    if (!pull && T.F < .001) s += `<text x="${rx - 22 - 4 * Math.sin(performance.now() / 200)}" y="798" font-size="16" fill="#1b55b3" opacity=".8" pointer-events="none">◀</text>`; }
  return s;
}
function render() {
  ws.setAttribute('viewBox', `${vw.x} ${vw.y} ${vw.w} ${vw.h}`);
  let s = `<defs><linearGradient id="tbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b79a74"/><stop offset="1" stop-color="#8f7456"/></linearGradient><radialGradient id="glow"><stop offset="0" stop-color="#6aa4ff" stop-opacity=".7"/><stop offset="1" stop-color="#6aa4ff" stop-opacity="0"/></radialGradient></defs>
  <rect width="800" height="900" fill="#dfe7ec"/><path d="M0 120H800M0 240H800M0 360H800M0 480H800M0 600H800M0 720H800" stroke="#cfd9e0" stroke-width="1"/>
  <rect y="838" width="800" height="62" fill="url(#tbl)"/><rect y="836" width="800" height="4" fill="#d9c3a0"/>
  <ellipse cx="170" cy="850" rx="150" ry="9" fill="#0004"/><rect x="40" y="826" width="260" height="16" rx="5" fill="#39424b"/><rect x="40" y="826" width="260" height="5" rx="3" fill="#5a6671"/>
  <rect x="62" y="36" width="16" height="792" fill="url(#rod)"/><rect x="52" y="32" width="36" height="26" rx="4" fill="#4a535c"/><circle cx="70" cy="45" r="5" fill="#9aa6b0"/>
  <rect x="78" y="38" width="526" height="13" rx="4" fill="url(#rod)" filter="url(#sh)"/>`;
  HOOKS.forEach(h => s += `<path d="M${h.x} 50v12a5.5 5.5 0 1 0 5.5 5.5" fill="none" stroke="#6f7a84" stroke-width="3.2" stroke-linecap="round"/>`);
  const nc = drag ? near(drag) : -1;
  if (nc >= 0) s += `<circle cx="${HOOKS[nc].x}" cy="${chainEnd(nc)}" r="${34 + 4 * Math.sin(performance.now() / 160)}" fill="url(#glow)"/>`;
  s += tableSvg();
  chains.forEach((c, ci) => { let y = HOOKS[ci].y, g = '';
    c.forEach((id, i) => { const e = byId(id), q = st[id];
      g += `<g transform="translate(${HOOKS[ci].x + q.dx} ${y + q.dy})" filter="url(#sh)" class="it" data-c="${ci}" data-i="${i}" style="cursor:grab">${e.draw(q.F)}</g>`; y += e.bottom(q.F); });
    s += `<g transform="rotate(${sw[ci].a * 57.3} ${HOOKS[ci].x} ${HOOKS[ci].y})">${g}</g>`; });
  Object.entries(free).forEach(([id, p]) => s += `<g transform="translate(${p.x} ${p.y})" filter="url(#sh)" class="it" data-f="${id}" style="cursor:grab">${byId(id).draw(p.h)}</g>
  <g class="rot" data-id="${id}" transform="translate(${p.h ? p.x + 300 * TS + 26 : p.x + 34} ${p.h ? p.y + 15 : p.y + 12})" style="cursor:pointer"><title>Повернуть линейку</title><circle r="10" fill="#fff" stroke="#8a7a3c" stroke-width="1.5"/><text y="5" text-anchor="middle" font-size="14" fill="#6b5d1f">↻</text></g>`);
  const gh = (g, f) => `<g transform="translate(${g.x} ${g.y}) rotate(${g.ang}) scale(${g.sc}) translate(${-g.lx} ${-g.ly})" ${f}>${byId(g.id).draw(g.id === 'ruler' ? g.h : 0)}</g>`;
  let fl = ''; ghosts.forEach(g => fl += gh(g, `opacity="${g.tx !== undefined ? Math.min(1, g.life * 2.5) : g.life}" filter="url(#sh)"`));
  if (drag) fl += gh(drag, 'filter="url(#sh)"');
  ws.innerHTML = s; const m = ws.getScreenCTM(); fly.innerHTML = fl ? `<g transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})">${fl}</g>` : '';
  const used = new Set([...chains.flat(), ...Object.keys(free), table.rail && 'rail', table.block && 'blk', ...table.stack, table.dyn, drag && drag.id]);
  tray.querySelectorAll('.card').forEach(c => { const u = used.has(c.dataset.id), f = byId(c.dataset.id).type === 'free'; c.classList.toggle('used', u && !f); c.classList.toggle('placed', u && f); });
  if (table.dyn && table.F >= byId(table.dyn).fmax * 1.049 && !render.w) { say('Перегрузка: ' + byId(table.dyn).name + ' — сила выше предела'); SND.warn(); render.w = 1; setTimeout(() => render.w = 0, 4000); }
  chains.forEach(c => c.forEach((id, i) => { if (byId(id).over && byId(id).over(loadBelow(c, i)) && !render.w) { say('Перегрузка: ' + byId(id).name + ' — нагрузка выше предела'); SND.warn(); render.w = 1; setTimeout(() => render.w = 0, 4000); } }));
}
function pt(ev) { const p = ws.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(ws.getScreenCTM().inverse()); }
// el — элемент, за который взяли предмет: запоминаем точку хвата в системе координат предмета
function startDrag(id, ev, fromTray, el, h) {
  const p = pt(ev); let lx = 0, ly = 0, sc = 1, ang = 0;
  if (fromTray) { const sv = el.querySelector('svg'), m = sv.getScreenCTM(), q = sv.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; const r = q.matrixTransform(m.inverse());
    if (el.dataset.h) { lx = r.x; ly = r.y; } else { lx = r.y; ly = -r.x; ang = 90; } sc = m.a / ws.getScreenCTM().a; }
  else { const q = ws.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; const r = q.matrixTransform(el.getScreenCTM().inverse()); lx = r.x; ly = r.y; }
  drag = { id, x: p.x, y: p.y, ang, sc, lx, ly, h: !!h }; SND.pick(); wake();
}
function placeTable(d, e) {
  const T = table;
  if (e.type === 'rail') { if (T.rail) return false; T.rail = 'A'; say('Нажмите на кружок у края рейки, чтобы перевернуть её (А ↔ Б)'); SND.put(); return true; }
  if (!T.rail) return false;
  if (e.id === 'blk') { if (T.block) return false; T.block = true; T.x = clamp(d.x, XMIN, XMAX); T.v = 0; SND.hang(); return true; }
  if (!T.block) return false;
  if (e.type === 'dyn') { if (T.dyn || d.x > T.x + 40 || d.x < T.x - 300) return false; T.dyn = e.id; say('Потяните динамометр за кольцо влево — брусок поедет'); SND.hang(); return true; }
  if (e.type === 'mass') { if (Math.abs(d.x - T.x) > 90 || T.stack.length >= 5) return false; T.stack.push(e.id); SND.put(); return true; }
  return false;
}
const overKit = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); return !!(el && el.closest('#kit')); };
function drop(ev) {
  const d = drag, e = byId(d.id), o = origin(d); drag = null; document.getElementById('kit').classList.remove('drop');
  const back = () => { const g = { ...d, life: 1 }, card = tray.querySelector(`.card[data-id="${d.id}"]`);
    if (card) { const r = card.getBoundingClientRect(), q = ws.createSVGPoint(), ctm = ws.getScreenCTM(); q.x = r.left + r.width / 2; q.y = r.top + r.height / 2; const w = q.matrixTransform(ctm.inverse());
      g.tsc = card.querySelector('svg').getScreenCTM().a / ctm.a; g.tang = (e.horiz || d.h) ? 0 : 90; const a = g.tang * Math.PI / 180, c = d.h ? [244, 15] : e.horiz ? [190, 10] : [0, e.h / 2], X = g.tsc * (d.lx - c[0]), Y = g.tsc * (d.ly - c[1]);
      g.tx = w.x + X * Math.cos(a) - Y * Math.sin(a); g.ty = w.y + X * Math.sin(a) + Y * Math.cos(a); }
    ghosts.push(g); SND.back(); };
  if (overKit(ev)) back();
  else if (e.type === 'free') { free[d.id] = clampFree({ x: o.x, y: o.y, h: d.h }); SND.put(); }
  else { const ci = e.type === 'rail' ? -1 : near(d); let ok = false;
    if (ci >= 0) { st[d.id] = { F: 0, v: 0, dx: o.x - HOOKS[ci].x, dy: o.y - chainEnd(ci) }; chains[ci].push(d.id); sw[ci].v += (Math.random() < .5 ? -1 : 1) * .35; SND.hang(); ok = true; }
    else if (d.y > 650) ok = placeTable(d, e);
    if (!ok) { back(); say('Предмет вернулся в ящик: повесьте его на крючок или поставьте на рейку'); } }
  commit(); wake();
}
document.addEventListener('pointermove', ev => {
  if (drag) { const p = pt(ev); drag.x = p.x; drag.y = p.y; document.getElementById('kit').classList.toggle('drop', overKit(ev)); wake(); }
  else if (pull) { pull.xp = pt(ev).x - pull.off; wake(); }
  else if (pan) { const u = ws.getScreenCTM().a; vt.x = vw.x = clamp(pan.x - (ev.clientX - pan.cx) / u, 0, 800 - vw.w); vt.y = vw.y = clamp(pan.y - (ev.clientY - pan.cy) / u, 0, 900 - vw.h); render(); } });
document.addEventListener('pointerup', ev => { pan = null; ws.style.cursor = ''; if (pull) { pull = null; commit(); wake(); } if (drag) drop(ev); });
ws.addEventListener('pointerdown', ev => {
  const T = table, rt = ev.target.closest('.rot');
  if (rt) { const q = free[rt.dataset.id]; if (q) { free[rt.dataset.id] = clampFree({ x: q.x, y: q.y, h: !q.h }); SND.put(); commit(); wake(); } return; }
  if (ev.target.closest('.flip')) { T.rail = T.rail === 'A' ? 'B' : 'A'; SND.put(); say('Поверхность ' + (T.rail === 'A' ? 'А' : 'Б')); commit(); wake(); return; }
  if (ev.target.closest('.pull')) { ev.preventDefault(); const p = pt(ev), f = Math.min(T.F / byId(T.dyn).fmax, 1.05); pull = { off: p.x - (T.x - 76 - 233 - f * DL), xp: 0 }; pull.xp = p.x - pull.off; wake(); return; }
  const g = ev.target.closest('.it');
  if (!g) { if (vt.w < 800) { pan = { cx: ev.clientX, cy: ev.clientY, x: vt.x, y: vt.y }; ws.style.cursor = 'grabbing'; } return; }
  if (g.dataset.f) { const id = g.dataset.f, h = free[id].h; delete free[id]; startDrag(id, ev, false, g, h); return; }
  const t = g.dataset.t;
  if (t === 'stack') { if (+g.dataset.i !== T.stack.length - 1) return say('Сначала снимите верхние грузы'); startDrag(T.stack.pop(), ev, false, g); }
  else if (t === 'block') { if (T.stack.length || T.dyn) return say('Сначала снимите грузы и динамометр'); T.block = false; startDrag('blk', ev, false, g); }
  else if (t === 'dyn') { const id = T.dyn; T.dyn = null; startDrag(id, ev, false, g); }
  else if (t === 'rail') { if (T.block) return say('Сначала снимите брусок'); T.rail = null; startDrag('rail', ev, false, g); }
  else { const c = chains[+g.dataset.c];
    if (+g.dataset.i !== c.length - 1) return say('Сначала снимите нижние предметы');
    sw[+g.dataset.c].v += .3; startDrag(c.pop(), ev, false, g); } });
ws.addEventListener('wheel', ev => { ev.preventDefault(); const p = pt(ev), z = clamp(800 / vt.w * Math.exp(-ev.deltaY * .0015), 1, 3.5), w = 800 / z, h = 900 / z;
  vt.w = w; vt.h = h; vt.x = clamp(p.x - (p.x - vw.x) * w / vw.w, 0, 800 - w); vt.y = clamp(p.y - (p.y - vw.y) * h / vw.h, 0, 900 - h); ui(); wake(); }, { passive: false });
const $ = id => document.getElementById(id), undo = $('undo'), redo = $('redo'), snd = $('snd'), zv = $('zv');
undo.onclick = undoA; redo.onclick = redoA; $('restart').onclick = restart; $('zin').onclick = () => zoomBy(1.25); $('zout').onclick = () => zoomBy(.8); $('zfit').onclick = () => setZoom(1, 400, 450);
const toggleSound = () => { muted = !muted; try { localStorage.setItem('mute', muted ? '1' : '0'); } catch (e) {} ui(); if (!muted) SND.pick(); }; snd.onclick = toggleSound;
document.addEventListener('keydown', ev => {
  if (/INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return; const m = ev.ctrlKey || ev.metaKey, c = ev.code;
  if (m && c === 'KeyZ') { ev.preventDefault(); ev.shiftKey ? redoA() : undoA(); } else if (m && c === 'KeyY') { ev.preventDefault(); redoA(); }
  else if (!m && !ev.altKey) { if (c === 'KeyR') restart(); else if (c === 'KeyM') toggleSound(); else if (c === 'Equal' || c === 'NumpadAdd') zoomBy(1.25); else if (c === 'Minus' || c === 'NumpadSubtract') zoomBy(.8); else if (c === 'Digit0' || c === 'Numpad0') setZoom(1, 400, 450); } });
const rank = { dyn: 0, spring: 1, free: 2, rail: 3, mass: 4 };
[...EQUIP].sort((a, b) => rank[a.type] - rank[b.type]).forEach(e => { const c = document.createElement('div');
  c.className = 'card ' + (e.type === 'mass' ? '' : 'half'); c.dataset.id = e.id; if (e.horiz) c.dataset.h = 1;
  const W = e.type === 'mass' ? 40 : e.type === 'dyn' ? 150 : 160;
  c.innerHTML = (e.horiz ? `<svg viewBox="${e.vb}" style="width:${W}px">${e.draw(0)}</svg>` : `<svg viewBox="${-(e.h + 16)} -42 ${e.h + 34} 84" style="width:${W}px"><g transform="rotate(90)">${e.draw(0)}</g></svg>`) + e.name;
  c.addEventListener('pointerdown', ev => { ev.preventDefault(); delete free[e.id]; startDrag(e.id, ev, true, c); });
  tray.appendChild(c); });
render(); ui();
