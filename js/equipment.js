// Оборудование комплекта №2. Начало координат предмета — верхний крючок; ось Y вниз.
const PX = 2.2, G = 10;   // пикселей на мм; Н/кг
const hookTop = `<path d="M0 0v6a4.5 4.5 0 1 1 4.5 4.5" fill="none" stroke="#a3afb9" stroke-width="2.4" stroke-linecap="round"/>`;
const ring = y => `<path d="M0 ${y}v5" stroke="#a3afb9" stroke-width="2.4"/><circle cx="0" cy="${y + 9}" r="4.2" fill="none" stroke="#a3afb9" stroke-width="2.4"/>`;
const coil = (y0, y1, n, a) => { let z = `M0 ${y0}`; for (let i = 1; i <= n; i++) z += `L${i % 2 ? a : -a} ${y0 + (y1 - y0) * (i - .5) / n}`; z += `L0 ${y1}`;
  return `<path d="${z}" fill="none" stroke="#2f363c" stroke-width="3.4" stroke-linejoin="round"/><path d="${z}" fill="none" stroke="#b4bec6" stroke-width="1.1" stroke-linejoin="round"/>`; };

function dynamo(id, name, fmax, C, major, lab, body, scaleBg) {
  const L = 150, T = 56, n = Math.round(fmax / C);
  return { id, name, type: 'dyn', mass: 0, h: 250,
    draw(F = 0) {
      const f = Math.min(F / fmax, 1.05), p = T + f * L; let t = '';
      for (let i = 0; i <= n; i++) { const y = T + i / n * L, big = i % major === 0;
        t += `<line x1="-19" x2="${big ? -7 : -13}" y1="${y}" y2="${y}" stroke="#1d1d1d" stroke-width="${big ? 1 : .7}"/>`;
        if (i % lab === 0) t += `<text x="-5" y="${y + 3}" font-size="8" font-weight="600" fill="#1d1d1d">${+(i * C).toFixed(1)}</text>`; }
      return `<g>${hookTop}<rect x="-25" y="14" width="50" height="${T + L + 4}" rx="5" fill="${body}" stroke="#0005"/>
      <rect x="-20" y="22" width="40" height="${T + L - 14}" rx="2" fill="${scaleBg}" stroke="#0003"/>
      <rect x="-1.6" y="${p}" width="3.2" height="${224 + f * L - p}" fill="url(#rod)"/>
      <g transform="translate(13 0)">${coil(24, Math.max(p - 3, 30), 12, 5)}</g>${t}
      <text x="-4" y="19.5" font-size="8" font-weight="700" fill="#1d1d1d">Н</text>
      <path d="M-14 ${p - 4}h28l-5 4 5 4h-28z" fill="#d82a30" stroke="#7a1015" stroke-width=".6"/><line x1="-20" x2="20" y1="${p}" y2="${p}" stroke="#7a1015" stroke-width=".5"/>
      <rect x="-5" y="${T + L + 14}" width="10" height="6" fill="#777"/>${ring(224 + f * L)}</g>`; },
    bottom: F => 237 + Math.min(F / fmax, 1.05) * L, over: F => F > fmax * 1.05 };
}
function springBoard(id, name, k, rng) {
  const rest = 50, H = 14 + rest + rng * PX + 26;
  return { id, name, type: 'spring', k, mass: 0, h: H, over: F => F / k * 1000 > rng * 1.05,
    draw(F = 0) {
      const e = Math.min(F / k * 1000, rng * 1.05), len = rest + e * PX; let t = '';
      for (let m = 0; m <= rng; m++) { const y = 14 + rest + m * PX, big = m % 10 === 0;
        t += `<line x1="-34" x2="${big ? -21 : m % 5 ? -29 : -26}" y1="${y}" y2="${y}" stroke="#222" stroke-width=".7"/>`;
        if (big) t += `<text x="-18" y="${y + 3}" font-size="8" fill="#222">${m / 10}</text>`; }
      return `<g><rect x="-36" y="0" width="72" height="${H}" rx="4" fill="url(#plate)" stroke="#8d99a3"/><rect x="-6" y="0" width="12" height="9" fill="#6d7780"/>${t}
      <text x="22" y="${H - 8}" font-size="9" fill="#555">см</text>${coil(10, 14 + len, 15, 11)}
      <path d="M-36 ${14 + len}h72" stroke="#d82a30" stroke-width="1.1"/>${ring(14 + len)}</g>`; },
    bottom: F => 14 + rest + Math.min(F / k * 1000, rng * 1.05) * PX + 14 };
}
const bodyOf = (kind, w, h, label) => { const x = -w / 2;
  if (kind === 'chr') return `<rect x="${x}" y="12" width="${w}" height="${h}" fill="url(#chr)" stroke="#5b666f" stroke-width=".6"/><ellipse cx="0" cy="12" rx="${w / 2}" ry="4" fill="#eef3f6" stroke="#7d8892" stroke-width=".6"/><path d="M${x} ${h + 12}a${w / 2} 4 0 0 0 ${w} 0" fill="#8d98a1"/><path d="M${x} ${h / 2 + 8}h${w}M${x} ${h / 2 + 16}h${w}" stroke="#6d7881" stroke-width=".7"/>`;
  if (kind === 'blue') return `<rect x="${x}" y="12" width="${w}" height="${h}" rx="4" fill="url(#blue)" stroke="#0d2c63"/><rect x="${x + 4}" y="${12 + h * .18}" width="${w - 8}" height="${h * .64}" fill="#fff" rx="1"/><text transform="translate(3.5 ${12 + h / 2}) rotate(-90)" text-anchor="middle" font-size="8.5" font-weight="700" fill="#111">груз № ${label}</text>`;
  return `<rect x="${x}" y="12" width="${w}" height="${h}" rx="2" fill="url(#wood)" stroke="#9a7440"/><path d="M${x + 6} 22v${h - 14}M${x + 14} 18v${h - 10}M${x + 22} 24v${h - 18}" stroke="#b98b52" stroke-width=".6" opacity=".7"/>`; };
const solid = (id, name, g, w, h, kind, label) => ({ id, name, type: 'mass', mass: g / 1000, h: h + 28, spec: { w, h },
  draw: () => `<g>${hookTop}${bodyOf(kind, w, h, label)}${ring(h + 12)}</g>`, flat: () => bodyOf(kind, w, h, label), bottom: () => h + 26 });
const RX0 = 400, RX1 = 770;
const railSvg = s => { const W = RX1 - RX0; let t = '';
  if (s === 'B') for (let i = 6; i < W; i += 8) t += `<circle cx="${i}" cy="5.5" r="1.2" fill="#5a5a5e"/>`; else for (let i = 8; i < W; i += 40) t += `<path d="M${i} 3v5" stroke="#d6d1c0" stroke-width=".6"/>`;
  return `<g><rect width="${W}" height="20" rx="3" fill="#6c8aa6" stroke="#35506a"/><rect x="2" y="2" width="${W - 4}" height="7" rx="2" fill="${s === 'B' ? '#2c2c2e' : '#f2efe6'}"/>${t}<text x="8" y="17.5" font-size="9" font-weight="700" fill="#fff">${s === 'B' ? 'Б' : 'А'}</text></g>`; };
const RAIL = { id: 'rail', name: 'Рейка А / Б', type: 'rail', mass: 0, h: 380, horiz: true, vb: '-4 -4 378 28', draw: s => railSvg(s) };
const TS = 1.6;   // px/мм на «столе»
const ruler = { id: 'ruler', name: 'Линейка 300 мм', type: 'free', mass: 0, h: 300 * PX + 12,
  draw(h) { let t = '';
    if (h) { for (let m = 0; m <= 300; m++) { const x = 4 + m * TS, b = m % 10 === 0;
        t += `<line x1="${x}" x2="${x}" y1="0" y2="${b ? 12 : m % 5 ? 6 : 9}" stroke="#222" stroke-width=".7"/>` + (b && m < 300 ? `<text x="${x - 3}" y="23" font-size="8" fill="#222">${m / 10}</text>` : ''); }
      return `<g><rect x="0" y="0" width="${300 * TS + 8}" height="30" rx="2" fill="#f3e3a6" fill-opacity=".88" stroke="#8a7a3c"/>${t}</g>`; }
    for (let m = 0; m <= 300; m++) { const y = 4 + m * PX, b = m % 10 === 0;
      t += `<line x1="-16" x2="${b ? -4 : m % 5 ? -11 : -8}" y1="${y}" y2="${y}" stroke="#222" stroke-width=".7"/>` + (b && m < 300 ? `<text x="-1" y="${y + 3}" font-size="8" fill="#222">${m / 10}</text>` : ''); }
    return `<g><rect x="-18" y="0" width="38" height="${300 * PX + 8}" rx="2" fill="#f3e3a6" fill-opacity=".88" stroke="#8a7a3c"/>${t}</g>`; } };
const EQUIP = [
  dynamo('d1', 'Динамометр №1 · 1 Н', 1, .02, 10, 10, 'url(#gray)', '#f3f3ef'),
  dynamo('d2', 'Динамометр №2 · 5 Н', 5, .1, 10, 10, 'url(#gray)', '#f3f3ef'),
  dynamo('d3', 'Динамометр №3 · 10 Н', 10, .2, 5, 5, 'url(#gray)', '#f7e84a'),
  dynamo('d4', 'Динамометр №4 · 10 Н', 10, .2, 5, 5, 'url(#gray)', '#f7e84a'),
  springBoard('s1', 'Пружина №1', 50.8, 160), springBoard('s2', 'Пружина №2', 10.3, 240),
  solid('w1', 'Груз №1', 101, 34, 40, 'chr'), solid('w2', 'Груз №2', 99, 34, 40, 'chr'), solid('w3', 'Груз №3', 100, 34, 40, 'chr'),
  solid('w4', 'Груз №4', 60, 24, 60, 'blue', 4), solid('w5', 'Груз №5', 70, 24, 70, 'blue', 5), solid('w6', 'Груз №6', 80, 24, 80, 'blue', 6),
  solid('blk', 'Брусок', 50, 30, 76, 'wood'), ruler, RAIL];
