// Описания лабораторных работ: текст задания, бланк ответов и проверка. Новая работа = новый объект в LABS.
const num = id => parseFloat(document.getElementById(id).value.replace(',', '.'));
const inp = id => `<input id="${id}" inputmode="decimal">`;
const LABS = [
  { id: 4, short: '№4 · Измерение жёсткости пружины',
    title: 'Лабораторная работа №4 · Измерение жёсткости пружины',
    intro: 'Соберите установку, измерьте вес груза динамометром и удлинение пружины №1. Погрешности: Δl = ±2 мм, P = ±0,1 Н. g = 10 Н/кг.',
    form: `<label>Формула жёсткости
<select id="f"><option value="">— выберите —</option><option value="a">k = P / Δl</option><option value="b">k = P · Δl</option><option value="c">k = Δl / P</option><option value="d">k = m · Δl</option></select></label>
<div class="row"><label>P, Н${inp('p')}</label><span>±</span><label>ΔP, Н${inp('dp')}</label></div>
<div class="row"><label>Δl, см${inp('dl')}</label><span>±</span><label>ΔΔl, см${inp('ddl')}</label></div>
<label>k, Н/м${inp('k')}</label>`,
    check(add) {
      add(document.getElementById('f').value === 'a', 'Формула: k = P / Δl (из F_упр = kΔl и F_упр = P)');
      const P = num('p'), dP = num('dp'), dl = num('dl'), ddl = num('ddl'), k = num('k');
      add(Math.abs(dP - 0.1) < 1e-6, 'Погрешность веса ΔP = 0,1 Н');
      add(Math.abs(ddl - 0.2) < 1e-6, 'Погрешность удлинения Δl = 0,2 см (2 мм)');
      if ([P, dl, k].every(isFinite)) {
        add(Math.abs(P / (dl / 100) - k) <= 0.03 * k, 'k согласуется с вашими P и Δl (не забудьте перевести см в м)');
        const k1 = byId('s1').k; add(Math.abs(k - k1) <= 0.12 * k1, 'Значение жёсткости совпадает с пружиной №1 в пределах погрешности опыта');
      } else add(false, 'Заполните P, Δl и k числами');
    } },
  { id: 5, short: '№5 · Зависимость силы упругости от растяжения',
    title: 'Лабораторная работа №5 · Исследование зависимости силы упругости от степени растяжения пружины',
    intro: 'Соберите установку с пружиной №1, динамометром №2 (5 Н), линейкой и тремя грузами по 100 г. Подвешивайте к пружине один, два и три груза, определяя растяжение и вес. Погрешности: Δl = ±2 мм, P = ±0,1 Н.',
    form: `<div class="t5 h"><span></span><span>Δl, см</span><span>±</span><span>P, Н</span><span>±</span></div>` +
      [1, 2, 3].map(n => `<div class="t5"><b title="Количество грузов">${n}</b>${inp('l' + n)}${inp('e' + n)}${inp('p' + n)}${inp('q' + n)}</div>`).join('') +
      `<label>Вывод<select id="c5"><option value="">— выберите —</option><option value="up">Чем больше растяжение, тем больше сила упругости</option><option value="down">Чем больше растяжение, тем меньше сила упругости</option><option value="none">Сила упругости не зависит от растяжения</option></select></label>`,
    check(add) {
      const k1 = byId('s1').k; let ok = true;
      [1, 2, 3].forEach(n => { const dl = num('l' + n), e = num('e' + n), P = num('p' + n), q = num('q' + n);
        if (![dl, e, P, q].every(isFinite)) { ok = false; return; }
        add(Math.abs(P - n) <= 0.15 && Math.abs(q - .1) < 1e-6, `Строка ${n}: вес и его погрешность (ΔP = 0,1 Н)`);
        add(Math.abs(dl - n * 100 / k1) <= 0.45 && Math.abs(e - .2) < 1e-6, `Строка ${n}: растяжение и его погрешность (Δl = 0,2 см)`); });
      if (!ok) add(false, 'Заполните все ячейки таблицы');
      add(document.getElementById('c5').value === 'up', 'Вывод о зависимости силы упругости от растяжения');
    } },
  { id: 6, short: '№6 · Коэффициент трения скольжения',
    title: 'Лабораторная работа №6 · Измерение коэффициента трения скольжения',
    intro: 'Соберите установку: брусок с тремя грузами на направляющей рейке (поверхность А), динамометры №1 и №2. Погрешности: динамометр №1 — ±0,02 Н, динамометр №2 — ±0,1 Н. g = 10 Н/кг.',
    form: `<label>Формула коэффициента трения
<select id="f"><option value="">— выберите —</option><option value="a">μ = F_тяги / P</option><option value="b">μ = P / F_тяги</option><option value="c">μ = F_тяги · P</option><option value="d">μ = F_тяги / m</option></select></label>
<div class="row"><label>P, Н${inp('p')}</label><span>±</span><label>ΔP, Н${inp('dp')}</label></div>
<div class="row"><label>F_тр, Н${inp('ft')}</label><span>±</span><label>ΔF, Н${inp('df')}</label></div>
<label>μ${inp('mu')}</label>`,
    check(add) {
      if (table.rail) add(table.rail === 'A', 'Использована поверхность рейки А');
      add(document.getElementById('f').value === 'a', 'Формула: μ = F_тр / P (при равномерном движении F_тяги = F_тр, N = P)');
      const P = num('p'), dP = num('dp'), F = num('ft'), dF = num('df'), mu = num('mu');
      add(Math.abs(dP - .1) < 1e-6, 'Погрешность веса: динамометр №2, ΔP = 0,1 Н');
      add(Math.abs(dF - .02) < 1e-6 || Math.abs(dF - .1) < 1e-6, 'Погрешность силы трения соответствует использованному динамометру');
      if ([P, F, mu].every(isFinite)) {
        add(Math.abs(P - 3.5) <= .15, 'Вес бруска с тремя грузами');
        add(Math.abs(mu - F / P) <= .03 * mu, 'μ согласуется с вашими F_тр и P');
        add(Math.abs(mu - .19) <= .04, 'Значение μ для поверхности А в пределах погрешности опыта');
      } else add(false, 'Заполните P, F_тр и μ числами');
    } },
  { id: 7, short: '№7 · Работа силы трения скольжения',
    title: 'Лабораторная работа №7 · Измерение работы силы трения скольжения',
    intro: 'Соберите установку: брусок с тремя грузами на рейке (поверхность Б), динамометр №2, линейка. Равномерно переместите брусок на 17 см и снимите показание динамометра. Погрешности: F = ±0,1 Н, S = ±0,2 см. g = 10 Н/кг.',
    form: `<label>Формула работы силы трения
<select id="f"><option value="">— выберите —</option><option value="a">A = −F_тр · S</option><option value="b">A = F_тр · S</option><option value="c">A = −F_тр / S</option><option value="d">A = F_тр / S</option></select></label>
<div class="row"><label>F_тр, Н${inp('ft')}</label><span>±</span><label>ΔF, Н${inp('df')}</label></div>
<div class="row"><label>S, см${inp('s')}</label><span>±</span><label>ΔS, см${inp('ds')}</label></div>
<label>A, Дж${inp('a')}</label>`,
    check(add) {
      if (table.rail) add(table.rail === 'B', 'Использована поверхность рейки Б');
      add(document.getElementById('f').value === 'a', 'Формула: A = −F_тр · S (сила трения направлена против перемещения)');
      const F = num('ft'), dF = num('df'), S = num('s'), dS = num('ds'), A = num('a');
      add(Math.abs(dF - .1) < 1e-6, 'Погрешность силы: динамометр №2, ΔF = 0,1 Н');
      add(Math.abs(dS - .2) < 1e-6, 'Погрешность расстояния ΔS = 0,2 см');
      if ([F, S, A].every(isFinite)) {
        add(Math.abs(S - 17) <= .5, 'Перемещение бруска 17 см (в пределах погрешности)');
        add(Math.abs(F - 2.03) <= .25, 'Сила трения при равномерном движении по поверхности Б');
        add(A < 0 && Math.abs(A + F * S / 100) <= .03 * Math.abs(A), 'Работа отрицательна и согласуется с F_тр и S (расстояние переведите в м)');
        add(Math.abs(A + .345) <= .05, 'Значение работы в пределах погрешности опыта');
      } else add(false, 'Заполните F_тр, S и A числами');
    } },
  { id: 8, short: '№8 · Трение и сила нормального давления',
    title: 'Лабораторная работа №8 · Изучение зависимости силы трения скольжения от силы нормального давления',
    intro: 'Соберите установку: каретка (брусок) на рейке Б, динамометр №2 (5 Н), три груза. Помещая на каретку один, два и три груза, измерьте вес каретки с грузами и силу трения при равномерном движении. Погрешность измерения сил ±0,1 Н. g = 10 Н/кг.',
    form: `<div class="t5 h"><span></span><span>P, Н</span><span>±</span><span>F_тр, Н</span><span>±</span></div>` +
      [1, 2, 3].map(n => `<div class="t5"><b title="Количество грузов">${n}</b>${inp('P' + n)}${inp('dP' + n)}${inp('T' + n)}${inp('dT' + n)}</div>`).join('') +
      `<label>Вывод<select id="c8"><option value="">— выберите —</option><option value="up">С увеличением силы нормального давления сила трения увеличивается</option><option value="down">С увеличением силы нормального давления сила трения уменьшается</option><option value="none">Сила трения не зависит от силы нормального давления</option></select></label>`,
    check(add) {
      if (table.rail) add(table.rail === 'B', 'Использована поверхность рейки Б');
      let ok = true;
      [1, 2, 3].forEach(n => { const P = num('P' + n), dP = num('dP' + n), T = num('T' + n), dT = num('dT' + n);
        if (![P, dP, T, dT].every(isFinite)) { ok = false; return; }
        add(Math.abs(P - (n + .5)) <= .15 && Math.abs(dP - .1) < 1e-6, `Строка ${n}: вес каретки с грузами и его погрешность (0,1 Н)`);
        add(Math.abs(T - MU.B * (n + .5)) <= .25 && Math.abs(dT - .1) < 1e-6, `Строка ${n}: сила трения и её погрешность (0,1 Н)`); });
      if (!ok) add(false, 'Заполните все ячейки таблицы');
      add(document.getElementById('c8').value === 'up', 'Вывод о зависимости силы трения от силы нормального давления');
    } }];

let curLab = null;
function setLab(id, user) {
  const lab = LABS.find(l => l.id === id) || LABS[0]; if (curLab === lab.id) return;
  const first = curLab === null; curLab = lab.id;
  document.getElementById('lt').textContent = lab.title; document.getElementById('labname').textContent = lab.short; document.getElementById('li').textContent = lab.intro;
  document.getElementById('answer').innerHTML = lab.form + '<button id="check" class="primary"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Проверить</button><div id="res"></div>';
  document.querySelectorAll('.labbtn').forEach(b => b.classList.toggle('on', +b.dataset.id === lab.id));
  document.getElementById('check').onclick = () => { const out = [], add = (ok, t) => out.push(`<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${t}</div>`);
    lab.check(add); document.getElementById('res').innerHTML = out.join(''); (out.every(o => o.includes('class="ok"')) ? SND.ok : SND.bad)(); };
  try { history.replaceState(null, '', '#lab=' + lab.id); } catch (e) {}
  if (!first && user) restart();
}
LABS.forEach(l => { const b = document.createElement('button'); b.className = 'labbtn'; b.dataset.id = l.id; b.innerHTML = '<b>' + l.id + '</b>'; b.dataset.tip = l.short; b.setAttribute('aria-label', l.short);
  b.onclick = () => setLab(l.id, true); document.getElementById('labs').appendChild(b); });
setLab(+((location.hash.match(/lab=(\d+)/) || [])[1]) || 4);
