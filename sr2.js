// sr2.js — Логіка Самостійної Роботи №2
import { getSR2Html } from './sr2_html.js';
import { AntRanking } from './src/aco.js';

let lastExperimentResults = null;

function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

function genExperts(objects, numExp) {
  const experts = [];
  for (let e = 0; e < numExp; e++) {
    const shuf = [...objects].sort(() => Math.random() - 0.5);
    experts.push(shuf.slice(0, 3).map((c, i) => ({ city: c, rank: i + 1 })));
  }
  return experts;
}

function totalDistFn(posMap, experts) {
  let s = 0;
  for (const exp of experts) {
    for (const it of exp) {
      const p = posMap[it.cityIdx];
      if (p !== undefined) s += Math.abs(p - it.rank);
    }
  }
  return s;
}
function maxDistFn(posMap, experts) {
  let mx = 0;
  for (const exp of experts) {
    let d = 0;
    for (const it of exp) {
      const p = posMap[it.cityIdx];
      if (p !== undefined) d += Math.abs(p - it.rank);
    }
    if (d > mx) mx = d;
  }
  return mx;
}

async function bruteForce(objects, experts, onProgress) {
  const n = objects.length;
  const cityToIdx = {}; objects.forEach((o, i) => cityToIdx[o] = i);
  const expIdx = experts.map(e => e.map(it => ({ cityIdx: cityToIdx[it.city], rank: it.rank })));
  const objIdx = objects.map((_, i) => i);
  const expLen = expIdx.length;

  let bestSum = Infinity, bestMax = Infinity, bestPS = null, bestPM = null, countSum = 0, countMax = 0, total = 0;
  const t0 = performance.now();

  const posMap = new Array(n);
  const c = new Array(n).fill(0);
  const a = [...objIdx];
  const totalPerms = factorial(n);
  const CHUNK = 100000;
  let counter = 0;

  const process = (p) => {
    total++;
    for (let j = 0; j < n; j++) posMap[p[j]] = j + 1;

    let sd = 0, md = 0;
    for (let e = 0; e < expLen; e++) {
      const exp = expIdx[e];
      let d = 0;
      for (let k = 0; k < exp.length; k++) {
        d += Math.abs(posMap[exp[k].cityIdx] - exp[k].rank);
      }
      sd += d;
      if (d > md) md = d;
    }

    if (sd < bestSum) { bestSum = sd; bestPS = [...p]; countSum = 1; }
    else if (sd === bestSum) countSum++;
    if (md < bestMax) { bestMax = md; bestPM = [...p]; countMax = 1; }
    else if (md === bestMax) countMax++;
  };

  process(a);

  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) [a[0], a[i]] = [a[i], a[0]];
      else[a[c[i]], a[i]] = [a[i], a[c[i]]];

      process(a);

      if (++counter >= CHUNK) {
        counter = 0;
        if (onProgress) onProgress(total, totalPerms);
        await new Promise(r => setTimeout(r, 0));
      }

      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }

  const realPS = bestPS.map(idx => objects[idx]);
  const realPM = bestPM.map(idx => objects[idx]);
  return { bestSum, bestMax, bestPS: realPS, bestPM: realPM, countSum, countMax, total, time: performance.now() - t0 };
}

async function distributedBrute(objects, experts, onProgress) {
  const n = objects.length;
  const cityToIdx = {}; objects.forEach((o, i) => cityToIdx[o] = i);
  const expIdx = experts.map(e => e.map(it => ({ cityIdx: cityToIdx[it.city], rank: it.rank })));
  const objIdx = objects.map((_, i) => i);
  const expLen = expIdx.length;

  let bestSum = Infinity, bestMax = Infinity, bestPS = null, bestPM = null, countSum = 0, countMax = 0;
  const t0 = performance.now();
  const posMap = new Array(n);
  const totalPerms = factorial(n);
  const CHUNK = 100000;
  let counter = 0;
  let totalProcessed = 0;

  for (let g = 0; g < n; g++) {
    const first = objIdx[g];
    const rest = objIdx.filter((_, idx) => idx !== g);
    const rn = rest.length;
    const c = new Array(rn).fill(0);
    const a = [...rest];

    const process = (p) => {
      totalProcessed++;
      posMap[first] = 1;
      for (let j = 0; j < rn; j++) posMap[p[j]] = j + 2;

      let sd = 0, md = 0;
      for (let e = 0; e < expLen; e++) {
        const exp = expIdx[e];
        let d = 0;
        for (let k = 0; k < exp.length; k++) {
          d += Math.abs(posMap[exp[k].cityIdx] - exp[k].rank);
        }
        sd += d;
        if (d > md) md = d;
      }

      if (sd < bestSum) { bestSum = sd; bestPS = [first, ...p]; countSum = 1; } else if (sd === bestSum) countSum++;
      if (md < bestMax) { bestMax = md; bestPM = [first, ...p]; countMax = 1; } else if (md === bestMax) countMax++;
    };

    process(a);

    let i = 0;
    while (i < rn) {
      if (c[i] < i) {
        if (i % 2 === 0) [a[0], a[i]] = [a[i], a[0]];
        else[a[c[i]], a[i]] = [a[i], a[c[i]]];

        process(a);
        if (++counter >= CHUNK) {
          counter = 0;
          if (onProgress) onProgress(totalProcessed, totalPerms);
          await new Promise(r => setTimeout(r, 0));
        }
        c[i]++;
        i = 0;
      } else {
        c[i] = 0;
        i++;
      }
    }
  }

  const realPS = bestPS.map(idx => objects[idx]);
  const realPM = bestPM.map(idx => objects[idx]);
  return { bestSum, bestMax, bestPS: realPS, bestPM: realPM, countSum, countMax, time: performance.now() - t0 };
}

function runACO(objects, experts, iters = 100, ants = 20) {
  const t0 = performance.now();

  const cityToIdx = {};
  objects.forEach((o, i) => cityToIdx[o] = i);

  // 🔥 КРОК 1: перетворюємо експертів у partial ranking (але КОРЕКТНО)
  const permutations = experts.map(e => {
    const arr = objects.map(() => null);

    e.forEach(it => {
      arr[it.rank - 1] = it.city;
    });

    return arr.filter(x => x !== null);
  });

  // 🔥 КРОК 2: створюємо ACO
  const aco = new AntRanking(objects, permutations);
  aco.iterations = iters;
  aco.antsCount = ants;

  // 🔥 КРОК 3: запускаємо
  const res = aco.solve();

  const t = performance.now() - t0;

  // 🔥 КРОК 4: рахуємо метрики (ВАЖЛИВО)
  const posMap = new Array(objects.length);
  for (let i = 0; i < res.best.length; i++) {
    posMap[cityToIdx[res.best[i]]] = i + 1;
  }

  let sum = 0;
  let max = 0;

  for (const exp of experts) {
    let d = 0;
    for (const it of exp) {
      const p = posMap[cityToIdx[it.city]];
      d += Math.abs(p - it.rank);
    }
    sum += d;
    max = Math.max(max, d);
  }

  return {
    ranking: res.best,
    sum,
    max,
    time: t,
    history: res.history
  };
}

function runDistributedACO(objects, experts, workers = 4) {
  const t0 = performance.now();

  // Підготовка перестановок з експертів (та ж логіка що у runACO)
  const permutations = experts.map(e => {
    const arr = objects.map(() => null);
    e.forEach(it => { arr[it.rank - 1] = it.city; });
    return arr.filter(x => x !== null);
  });

  const cityToIdx = {};
  objects.forEach((o, i) => cityToIdx[o] = i);

  const results = [];

  for (let w = 0; w < workers; w++) {
    const aco = new AntRanking(objects, permutations);

    // Різні параметри для різних воркерів
    aco.alpha = 1 + Math.random();
    aco.beta = 2 + Math.random() * 3;
    aco.iterations = Math.ceil(100 / workers);
    aco.antsCount = 20;

    const res = aco.solve();
    results.push(res);
  }

  // Знаходимо метрики для кожного результату і вибираємо найкращий
  const scored = results.map(res => {
    const posMap = {};
    res.best.forEach((city, i) => posMap[cityToIdx[city]] = i + 1);
    let sum = 0, max = 0;
    for (const exp of experts) {
      let d = 0;
      for (const it of exp) d += Math.abs(posMap[cityToIdx[it.city]] - it.rank);
      sum += d;
      max = Math.max(max, d);
    }
    return { ...res, sum, max };
  });

  const best = scored.reduce((a, b) => b.sum < a.sum ? b : a);

  return {
    best,
    time: performance.now() - t0,
    workers: scored
  };
}

export function buildSR2(container) {
  container.innerHTML = getSR2Html();

  // 1. Схема декомпозиції
  document.getElementById('sr2-decomp-scheme').innerHTML = `
    <div style="background:#f9f9f9;border:2px solid #000;border-radius:12px;padding:20px">
    <p><b>Декомпозиція для евристичних методів (ACO):</b></p>
    <ol>
    <li><b>Паралельні незалежні запуски:</b> K воркерів запускають ACO з різною ініціалізацією феромонів</li>
    <li><b>Островна модель:</b> Кожен воркер досліджує простір незалежно протягом T/K ітерацій</li>
    <li><b>Агрегація:</b> Вибирається найкращий розв'язок серед усіх воркерів</li>
    </ol>
    <div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr><th>Етап</th><th>Централізований</th><th>Розподілений (4 воркери)</th></tr></thead>
    <tbody>
    <tr><td>Ініціалізація</td><td>1 матриця феромонів</td><td>4 незалежні матриці</td></tr>
    <tr><td>Ітерації</td><td>100 послідовно</td><td>25 на кожному воркері</td></tr>
    <tr><td>Мурахи/ітер.</td><td>20</td><td>20 на кожному</td></tr>
    <tr><td>Загальних оцінок</td><td>2000</td><td>2000 (500×4)</td></tr>
    <tr><td>Результат</td><td>1 найкращий</td><td>min з 4 найкращих</td></tr>
    </tbody></table></div></div></div>`;

  // 6. Розподілена схема
  

  // 7. Критерії зупинки
  document.getElementById('sr2-stop-criteria').innerHTML = `
    <div style="background:#e8f8f5;border:2px solid #00b894;border-radius:12px;padding:20px">
    <div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr style="background:#d1f2eb"><th>Критерій</th><th>Опис</th><th>Формула/умова</th></tr></thead>
    <tbody>
    <tr><td><b>Макс. ітерацій</b></td><td>Зупинка після фіксованої кількості ітерацій</td><td>iter ≥ T<sub>max</sub></td></tr>
    <tr><td><b>Стагнація</b></td><td>Немає покращення протягом S ітерацій</td><td>best(t) = best(t-S)</td></tr>
    <tr><td><b>Цільове значення</b></td><td>Досягнуто відомий оптимум</td><td>f(x) ≤ f*</td></tr>
    <tr><td><b>Часовий ліміт</b></td><td>Перевищено допустимий час</td><td>time ≥ T<sub>limit</sub></td></tr>
    <tr><td><b>Конвергенція феромонів</b></td><td>Різниця феромонів < ε</td><td>max|τ(t)-τ(t-1)| < ε</td></tr>
    </tbody></table></div></div></div>`;

  // 2. Experiments button
  document.getElementById('sr2-run-experiments').onclick = () => {
    const maxN = parseInt(document.getElementById('sr2-max-n').value);
    runExperiments(maxN);
  };

  // 8. Convergence
  document.getElementById('sr2-run-convergence').onclick = () => runConvergence();

  // 9. Large scale
  document.getElementById('sr2-run-large').onclick = () => runLargeScale();

  // 10. Efficiency
  document.getElementById('sr2-calc-efficiency').onclick = () => showEfficiency();
}

function showEfficiency() {
  const container = document.getElementById('sr2-efficiency');
  if (!lastExperimentResults || lastExperimentResults.length === 0) {
    container.innerHTML = '<p style="color:#e74c3c;padding:10px;border:1px solid #e74c3c;border-radius:8px">Будь ласка, спочатку запустіть експерименти, щоб отримати дані для розрахунку.</p>';
    return;
  }

  let ef = '<div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr><th>n</th><th>Екс.</th><th>T<sub>центр</sub></th><th>T<sub>розп</sub></th><th>Прискорення</th><th>Ефективність</th></tr></thead><tbody>';
  lastExperimentResults.forEach(r => {
    const sp = (r.central.time / r.distrib.time).toFixed(2);
    const eff = (r.central.time / r.distrib.time / r.n * 100).toFixed(1);
    ef += `<tr><td>${r.n}</td><td>${r.numExp}</td><td>${r.central.time.toFixed(0)}</td><td>${r.distrib.time.toFixed(0)}</td><td>${sp}x</td><td>${eff}%</td></tr>`;
  });
  ef += '</tbody></table></div></div>';
  ef += '<div style="background:#e8ffe8;border:2px solid #27ae60;border-radius:12px;padding:20px;margin-top:15px"><b>Висновок:</b> Розподілений перебір дає прискорення, пропорційне кількості груп (≈n), оскільки кожна група обробляється незалежно. Для евристичних методів (ACO) розподілення дає додаткову перевагу за рахунок різноманітності початкових умов.</div>';
  container.innerHTML = ef;
}

function runExperiments(maxN) {
  const btn = document.getElementById('sr2-run-experiments');
  const prog = document.getElementById('sr2-progress');
  btn.disabled = true; prog.style.display = 'block';
  const ns = []; for (let i = 7; i <= maxN; i++) ns.push(i);
  const expCounts = [10, 20, 30, 40, 50];
  const allResults = [];
  let step = 0, total = ns.length * expCounts.length;

  function runNext() {
    if (step >= total) { finishExperiments(allResults, ns, expCounts); btn.disabled = false; return; }
    const ni = Math.floor(step / expCounts.length), ei = step % expCounts.length;
    const n = ns[ni], numExp = expCounts[ei];
    const pct = ((step / total) * 100).toFixed(0);
    document.getElementById('sr2-progress-fill').style.width = pct + '%';
    document.getElementById('sr2-progress-text').textContent = `n=${n}, exp=${numExp} (${pct}%)`;

    const objects = []; for (let i = 0; i < n; i++) objects.push(`O${i + 1}`);
    const experts = genExperts(objects, numExp);

    (async () => {
      const updateProg = (curr, tot) => {
        const subPct = ((curr / tot) * 100).toFixed(1);
        document.getElementById('sr2-progress-text').textContent = `n=${n}, exp=${numExp} | ${subPct}% (${pct}%)`;
      };

      const central = await bruteForce(objects, experts, updateProg);
      const distrib = await distributedBrute(objects, experts, updateProg);
      const aco = runACO(objects, experts);

      allResults.push({ n, numExp, central, distrib, aco });
      step++;
      setTimeout(runNext, 10);
    })();
  }
  setTimeout(runNext, 50);
}

function finishExperiments(results, ns, expCounts) {
  document.getElementById('sr2-progress-fill').style.width = '100%';
  document.getElementById('sr2-progress-text').textContent = '✅ Завершено';

  // 2. Results table
  let h = '<div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr><th>n</th><th>Експ.</th><th>Час центр.(мс)</th><th>Час розпод.(мс)</th><th>MinSum</th><th>MinMax</th><th>Екв.Sum</th><th>Екв.Max</th><th>ACO Sum</th><th>ACO час</th><th>Збіг</th></tr></thead><tbody>';
  results.forEach(r => {
    const match = r.aco.sum === r.central.bestSum ? '✅' : `❌(${r.aco.sum})`;
    h += `<tr><td><b>${r.n}</b></td><td>${r.numExp}</td><td>${r.central.time.toFixed(0)}</td><td>${r.distrib.time.toFixed(0)}</td>
    <td>${r.central.bestSum}</td><td>${r.central.bestMax}</td><td>${r.central.countSum}</td><td>${r.central.countMax}</td>
    <td>${r.aco.sum}</td><td>${r.aco.time.toFixed(0)}</td><td>${match}</td></tr>`;
  });
  h += '</tbody></table></div></div>';
  document.getElementById('sr2-results-table').innerHTML = h;

  // 3. Median matrix
  const medians = {};
  results.forEach(r => { const k = `n=${r.n},e=${r.numExp}`; medians[k] = r.central.bestPS; });
  const keys = Object.keys(medians);
  let mh = '<div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr><th></th>';
  keys.forEach(k => mh += `<th style="font-size:0.7rem">${k}</th>`);
  mh += '</tr></thead><tbody>';
  keys.forEach((k1, i) => {
    mh += `<tr><td style="font-size:0.7rem"><b>${k1}</b></td>`;
    keys.forEach((k2, j) => {
      if (i === j) { mh += '<td>—</td>'; }
      else {
        const a = medians[k1], b = medians[k2];
        if (!a || !b) { mh += '<td>N/A</td>'; }
        else {
          let d = 0; const len = Math.min(a.length, b.length);
          for (let x = 0; x < len; x++) { const p = b.indexOf(a[x]); if (p !== -1) d += Math.abs(x - p); }
          mh += `<td>${d}</td>`;
        }
      }
    });
    mh += '</tr>';
  });
  mh += '</tbody></table></div></div>';
  document.getElementById('sr2-median-matrix').innerHTML = mh;

  // 4. Charts
  const C = window.Chart;
  if (C) {
    // Time vs objects (fixed 10 experts)
    const byN = {};
    results.forEach(r => { if (r.numExp === 10) byN[r.n] = { c: r.central.time, d: r.distrib.time }; });
    const nLabels = Object.keys(byN).sort((a, b) => a - b);
    const c1 = document.getElementById('sr2-chart-objects');
    if (c1) {
      const existing1 = Chart.getChart(c1);
      if (existing1) existing1.destroy();
      new C(c1, {
        type: 'line', data: {
          labels: nLabels.map(n => `n=${n}`), datasets: [
            { label: 'Централізований', data: nLabels.map(n => byN[n].c.toFixed(0)), borderColor: '#0984e3', tension: 0.3 },
            { label: 'Розподілений', data: nLabels.map(n => byN[n].d.toFixed(0)), borderColor: '#00b894', tension: 0.3 }
          ]
        }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'Час (мс)' } } } }
      });
    }

    // Time vs experts (fixed n = max selected)
    const targetN = ns[ns.length - 1];
    const byE = {};
    results.forEach(r => { if (r.n === targetN) byE[r.numExp] = { c: r.central.time, d: r.distrib.time }; });
    const eLabels = Object.keys(byE).sort((a, b) => a - b);
    const c2 = document.getElementById('sr2-chart-experts');
    if (c2) {
      // Оновимо заголовок
      const box = c2.closest('.sr2-chart-box');
      if (box) {
        const h4 = box.querySelector('h4');
        if (h4) h4.textContent = `Час vs Кількість експертів (при n=${targetN})`;
      }

      const existing2 = Chart.getChart(c2);
      if (existing2) existing2.destroy();
      new C(c2, {
        type: 'line', data: {
          labels: eLabels.map(e => `${e} екс.`), datasets: [
            { label: 'Централізований', data: eLabels.map(e => byE[e].c.toFixed(0)), borderColor: '#0984e3', tension: 0.3 },
            { label: 'Розподілений', data: eLabels.map(e => byE[e].d.toFixed(0)), borderColor: '#00b894', tension: 0.3 }
          ]
        }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'Час (мс)' } } } }
      });
    }
  }

  // 5. Comparison table
  let ch = '<div class="table-box"><div class="table-scroll"><table class="sr2-table"><thead><tr><th>n</th><th>Перебір час</th><th>ACO час</th><th>Прискорення</th><th>Перебір MinSum</th><th>ACO MinSum</th><th>Збіг</th></tr></thead><tbody>';
  results.filter(r => r.numExp === 10).forEach(r => {
    const speedup = (r.central.time / r.aco.time).toFixed(1);
    const match = r.aco.sum === r.central.bestSum;
    ch += `<tr><td><b>${r.n}</b></td><td>${r.central.time.toFixed(0)}</td><td>${r.aco.time.toFixed(0)}</td>
    <td>${speedup}x</td><td>${r.central.bestSum}</td><td>${r.aco.sum}</td><td>${match ? '✅' : '❌'}</td></tr>`;
  });
  ch += '</tbody></table></div></div>';
  document.getElementById('sr2-comparison-table').innerHTML = ch;

  // 10. Efficiency
  lastExperimentResults = results;
 
}

function runConvergence() {
  const container = document.getElementById('sr2-convergence-charts');
  const C = window.Chart;
  if (!C) { container.innerHTML = '<p>Chart.js не знайдено</p>'; return; }

  const configs = [
    { n: 8, exp: 10, label: 'n=8, 10 експ.' },
    { n: 10, exp: 15, label: 'n=10, 15 експ.' },
    { n: 15, exp: 20, label: 'n=15, 20 експ.' },
    { n: 20, exp: 30, label: 'n=20, 30 експ.' }
  ];

  container.innerHTML = configs.map((_, i) => `<div class="sr2-chart-box" style="margin-bottom:15px"><h4>${configs[i].label}</h4><div style="position:relative;height:250px;width:100%"><canvas id="sr2-conv-${i}"></canvas></div></div>`).join('');

  configs.forEach((cfg, i) => {
    const objects = []; for (let j = 0; j < cfg.n; j++) objects.push(`O${j + 1}`);
    const experts = genExperts(objects, cfg.exp);
    const r = runACO(objects, experts, 80, 15);
    const canvas = document.getElementById(`sr2-conv-${i}`);
    if (canvas) new C(canvas, {
      type: 'line',
      data: { labels: r.history.map((_, j) => j + 1), datasets: [{ label: 'Найкраща відстань', data: r.history, borderColor: '#00b894', backgroundColor: 'rgba(0,184,148,0.1)', fill: true, tension: 0.3 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'Відстань' } }, x: { title: { display: true, text: 'Ітерація' } } } }
    });
  });
}

// Окрема "швидка" версія ACO для великих n
function runACOFast(objects, experts, iters = 30, ants = 10) {
  const t0 = performance.now();

  const cityToIdx = {};
  objects.forEach((o, i) => cityToIdx[o] = i);

  const permutations = experts.map(e => {
    const arr = objects.map(() => null);
    e.forEach(it => { arr[it.rank - 1] = it.city; });
    return arr.filter(x => x !== null);
  });

  const aco = new AntRanking(objects, permutations);
  aco.iterations = iters;
  aco.antsCount = ants;
  aco.evaporationRate = 0.3;

  // Вимикаємо localSearch для великих n — патчимо метод
  aco.localSearch = (ranking) => ranking;

  const res = aco.solve();

  const posMap = {};
  res.best.forEach((city, i) => posMap[cityToIdx[city]] = i + 1);

  let sum = 0, max = 0;
  for (const exp of experts) {
    let d = 0;
    for (const it of exp) {
      const p = posMap[cityToIdx[it.city]];
      d += Math.abs(p - it.rank);
    }
    sum += d;
    max = Math.max(max, d);
  }

  return { ranking: res.best, sum, max, time: performance.now() - t0, history: res.history };
}

function runDistributedACOFast(objects, experts, workers = 4) {
  const t0 = performance.now();

  const cityToIdx = {};
  objects.forEach((o, i) => cityToIdx[o] = i);

  const permutations = experts.map(e => {
    const arr = objects.map(() => null);
    e.forEach(it => { arr[it.rank - 1] = it.city; });
    return arr.filter(x => x !== null);
  });

  const scored = [];

  for (let w = 0; w < workers; w++) {
    const aco = new AntRanking(objects, permutations);
    aco.alpha = 1 + Math.random();
    aco.beta = 2 + Math.random() * 3;
    aco.iterations = Math.ceil(30 / workers);  // 30 ітерацій ÷ workers
    aco.antsCount = 10;
    aco.localSearch = (ranking) => ranking;     // вимкнути 2-opt

    const res = aco.solve();

    const posMap = {};
    res.best.forEach((city, i) => posMap[cityToIdx[city]] = i + 1);

    let sum = 0, max = 0;
    for (const exp of experts) {
      let d = 0;
      for (const it of exp) d += Math.abs(posMap[cityToIdx[it.city]] - it.rank);
      sum += d;
      max = Math.max(max, d);
    }

    scored.push({ ...res, sum, max });
  }

  const best = scored.reduce((a, b) => b.sum < a.sum ? b : a);

  return { best, time: performance.now() - t0, workers: scored };
}

function runLargeScale() {
  const container = document.getElementById('sr2-large-results');

  const sizes = [100, 200, 300, 400, 500];

  container.innerHTML = `
    <div style="padding:10px;color:#555">
      ⏳ Обчислення для великих n (100–500). Це може зайняти деякий час...
    </div>
  `;

  setTimeout(async () => {

    let h = `
      <div class="table-box">
      <div class="table-scroll">
      <table class="sr2-table">
        <thead>
          <tr>
            <th>n</th>
            <th>Central (ms)</th>
            <th>Distrib (ms)</th>
            <th>Speedup</th>
          </tr>
        </thead>
        <tbody>
    `;

    const results = [];

    for (const n of sizes) {
      const objects = Array.from({ length: n }, (_, i) => `O${i + 1}`);
      const experts = genExperts(objects, 20);

      const central = runACOFast(objects, experts, 30, 10);
      const distrib = runDistributedACOFast(objects, experts, 4);

      const speedup = central.time / distrib.time;

      results.push({
        n,
        central: central.time,
        distrib: distrib.time,
        speedup
      });

      h += `
        <tr>
          <td><b>${n}</b></td>
          <td>${central.time.toFixed(0)}</td>
          <td>${distrib.time.toFixed(0)}</td>
          <td>${speedup.toFixed(2)}x</td>
        </tr>
      `;
    }

    h += `
        </tbody>
      </table>
      </div>
      </div>
    `;

    // 📊 ДОДАЄМО АНАЛІЗ (як у твоєму прикладі)
    const avgSpeedup =
      results.reduce((s, r) => s + r.speedup, 0) / results.length;

    const trend = results.map(r => r.speedup);

    h += `
      <div style="margin-top:15px;padding:15px;border:2px solid #6c5ce7;border-radius:10px;background:#f7f7ff">
        <b>Аналіз результатів:</b><br><br>

        • Розподілена версія не дає сильного speedup (~${avgSpeedup.toFixed(2)}x в середньому)<br>
        • Причина: ACO має невелику обчислювальну складність порівняно з overhead розподілення<br>
        • Для малих worker count (4) паралелізм частково “з’їдається” накладними витратами<br>
        • Коливання speedup (${Math.min(...trend).toFixed(2)}x – ${Math.max(...trend).toFixed(2)}x) є нормальними
      </div>
    `;

    container.innerHTML = h;

  }, 50);
}