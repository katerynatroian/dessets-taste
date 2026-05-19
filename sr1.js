// sr1.js — Логіка Самостійної Роботи №1
import { getSR1Html, HELP_TEXTS } from './sr1_html.js';
import { totalDist, maxDist, calcSatisfaction } from './src/lab4core.js';

let log = [];
let bruteState = null;
let originalExperts = [];
let currentExperts = [];
let lastResult = null;
let beforeResult = null;
let isPaused = false;
let isRunning = false;

function addLog(msg) {
  const t = new Date().toLocaleTimeString('uk-UA');
  log.push(`[${t}] ${msg}`);
  const el = document.getElementById('sr1-log');
  if (el) {
    el.innerHTML = log.slice(-20).map(l => `<div class="sr1-log-entry">${l}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
}

function generateRanking(seed, cities) {
  return [...cities].sort((a, b) => Math.sin(a.length + seed) - Math.cos(b.length + seed));
}

function buildExperts(cities) {
  const experts = [];
  for (let i = 1; i <= 15; i++) {
    const full = generateRanking(i, cities);
    experts.push(full.slice(0, 3).map((city, idx) => ({ city, rank: idx + 1 })));
  }
  return experts;
}

function renderEditTable(cities, experts, getCityNum) {
  const tbody = document.getElementById('sr1-edit-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  experts.forEach((exp, ei) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>E${ei + 1}</b></td>`;
    exp.forEach((item, ri) => {
      const td = document.createElement('td');
      const sel = document.createElement('select');
      sel.className = 'sr1-rank-select';
      sel.dataset.expert = ei;
      sel.dataset.rank = ri;
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = `${getCityNum(c)}. ${c}`;
        if (c === item.city) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => onRankChange(ei, ri, sel.value, cities, getCityNum);
      td.appendChild(sel);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function onRankChange(expertIdx, rankIdx, newCity, cities, getCityNum) {
  const old = currentExperts[expertIdx][rankIdx].city;
  currentExperts[expertIdx][rankIdx].city = newCity;
  addLog(`Змінено E${expertIdx + 1} ранг ${rankIdx + 1}: ${old} → ${newCity}`);
  if (lastResult) {
    beforeResult = { ...lastResult };
    const newBest = lastResult.bestPermSum;
    const newSat = calcSatisfaction(newBest, currentExperts, cities.length, []);
    const newSum = totalDist(newBest, currentExperts);
    const afterRes = { bestPermSum: newBest, bestSum: newSum, satisfaction: newSat };
    showComparison(beforeResult, afterRes, getCityNum);
    updateCharts(cities, currentExperts, newBest, getCityNum);
  }
}

function showComparison(before, after, getCityNum) {
  const bd = document.getElementById('sr1-before-data');
  const ad = document.getElementById('sr1-after-data');
  const dt = document.getElementById('sr1-delta-table');
  if (!bd || !ad) {
    console.error('Comparison elements not found:', { bd, ad });
    return;
  }

  bd.innerHTML = `<p><b>MinSum = ${before.bestSum}</b></p><p>${before.bestPermSum.map(c => getCityNum(c)).join(', ')}</p>`;
  ad.innerHTML = `<p><b>MinSum = ${after.bestSum}</b></p><p>${after.bestPermSum.map(c => getCityNum(c)).join(', ')}</p>`;

  const diff = after.bestSum - before.bestSum;
  const cls = diff > 0 ? 'color:#e74c3c' : diff < 0 ? 'color:#27ae60' : 'color:#666';

  if (dt && before.satisfaction && after.satisfaction) {
    let h = `<div style="margin-top:15px;${cls};font-size:1.1rem"><b>Δ суми = ${diff > 0 ? '+' : ''}${diff}</b></div>`;
    h += '<div class="table-box"><div class="table-scroll"><table class="sr1-table" style="margin-top:10px"><thead><tr><th>Експерт</th><th>d до</th><th>d після</th><th>Δ</th></tr></thead><tbody>';
    for (let i = 0; i < 15; i++) {
      const db = before.satisfaction[i]?.d || 0;
      const da = after.satisfaction[i]?.d || 0;
      const dd = da - db;
      const c = dd > 0 ? '#e74c3c' : dd < 0 ? '#27ae60' : '#666';
      h += `<tr><td>E${i + 1}</td><td>${db}</td><td>${da}</td><td style="color:${c};font-weight:bold">${dd > 0 ? '+' : ''}${dd}</td></tr>`;
    }
    h += '</tbody></table></div></div>';
    dt.innerHTML = h;
  }
}

function updateCharts(cities, experts, bestPerm, getCityNum) {
  const C = window.Chart;
  if (!C) return;

  function safeChart(canvas, config) {
    const existing = C.getChart(canvas);
    if (existing) existing.destroy();
    return new C(canvas, config);
  }

  // Chart 1: Rankings bar
  const c1 = document.getElementById('sr1-chart-rankings');
  if (c1) {
    const counts = {};
    cities.forEach(c => counts[c] = 0);
    experts.forEach(exp => exp.forEach(item => { counts[item.city] = (counts[item.city] || 0) + (4 - item.rank); }));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    safeChart(c1, {
      type: 'bar',
      data: { labels: sorted.map(s => s[0]), datasets: [{ label: 'Бали', data: sorted.map(s => s[1]), backgroundColor: '#299132de', borderRadius: 6 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
  }

  // Chart 2: Satisfaction radar
  const c2 = document.getElementById('sr1-chart-satisfaction');
  if (c2 && bestPerm) {
    const sat = calcSatisfaction(bestPerm, experts, cities.length, []);
    safeChart(c2, {
      type: 'bar',
      data: {
        labels: sat.map(s => `E${s.expert}`),
        datasets: [{
          label: 'Задоволеність %',
          data: sat.map(s => parseFloat(s.s)),
          backgroundColor: 'rgba(80, 204, 91, 0.6)',
          borderColor: '#299132de',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: 'Задоволеність (%)' }
          }
        }
      }
    });
  }

  // Chart 3: Median vs experts
  const c3 = document.getElementById('sr1-chart-median');
  if (c3 && bestPerm) {
    const dists = experts.map(exp => {
      let d = 0;
      for (const item of exp) { d += Math.abs((bestPerm.indexOf(item.city) + 1) - item.rank); }
      return d;
    });
    safeChart(c3, {
      type: 'bar',
      data: {
        labels: experts.map((_, i) => `E${i + 1}`),
        datasets: [{ label: 'Відстань до медіани', data: dists, backgroundColor: dists.map(d => d <= 2 ? '#27ae60' : d <= 4 ? '#16a085' : '#e74c3c'), borderRadius: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }
}

// === Chunked brute force with pause/resume ===
function* heapPermsGen(arr) {
  const n = arr.length;
  const c = new Array(n).fill(0);
  const a = [...arr];
  yield [...a];
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) [a[0], a[i]] = [a[i], a[0]];
      else [a[c[i]], a[i]] = [a[i], a[c[i]]];
      yield [...a];
      c[i]++;
      i = 0;
    } else { c[i] = 0; i++; }
  }
}

function startBruteForce(cities, experts, getCityNum) {
  const TOTAL = 3628800;
  const CHUNK = 50000;
  let processed = 0;
  let bestSum = Infinity, bestPermSum = null;
  let bestMax = Infinity, bestPermMax = null;
  const groups = new Array(cities.length).fill(null).map(() => ({ bestSum: Infinity, bestMax: Infinity }));
  const gen = heapPermsGen(cities);
  isRunning = true;
  isPaused = false;
  addLog('Розподілений перебір 10! розпочато');

  document.getElementById('sr1-progress-wrap').style.display = 'block';
  document.getElementById('sr1-brute-results').style.display = 'none';
  document.getElementById('sr1-start').disabled = true;
  document.getElementById('sr1-pause').disabled = false;
  document.getElementById('sr1-reset').disabled = false;
  const startTime = performance.now();

  function processChunk() {
    if (!isRunning) return;
    if (isPaused) { setTimeout(processChunk, 200); return; }
    let count = 0;
    while (count < CHUNK) {
      const next = gen.next();
      if (next.done) { finish(); return; }
      const perm = next.value;
      processed++;
      count++;
      const sd = totalDist(perm, experts);
      const md = maxDist(perm, experts);
      const gi = cities.indexOf(perm[0]);
      if (sd < groups[gi].bestSum) groups[gi].bestSum = sd;
      if (md < groups[gi].bestMax) groups[gi].bestMax = md;
      if (sd < bestSum) { bestSum = sd; bestPermSum = [...perm]; }
      if (md < bestMax) { bestMax = md; bestPermMax = [...perm]; }
    }
    const pct = (processed / TOTAL * 100).toFixed(1);
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    document.getElementById('sr1-progress-fill').style.width = pct + '%';
    document.getElementById('sr1-progress-text').textContent = `${pct}% (${processed.toLocaleString()} / ${TOTAL.toLocaleString()})`;
    document.getElementById('sr1-progress-stats').textContent = `Час: ${elapsed}с | MinSum: ${bestSum} | MinMax: ${bestMax}`;
    setTimeout(processChunk, 0);
  }

  function finish() {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    isRunning = false;
    addLog(`Перебір завершено за ${elapsed}с. MinSum=${bestSum}, MinMax=${bestMax}`);
    document.getElementById('sr1-progress-fill').style.width = '100%';
    document.getElementById('sr1-progress-text').textContent = '100%';
    document.getElementById('sr1-start').disabled = false;
    document.getElementById('sr1-pause').disabled = true;
    document.getElementById('sr1-resume').disabled = true;
    document.getElementById('sr1-start').textContent = '✅ Завершено';

    const sat = calcSatisfaction(bestPermSum, experts, cities.length, []);
    lastResult = { bestSum, bestPermSum, bestMax, bestPermMax, groups, time: elapsed, satisfaction: sat };
    localStorage.setItem('sr1_lastResult', JSON.stringify(lastResult));

    let h = `<div style="background:#e8ffe8;border:2px solid #27ae60;border-radius:12px;padding:20px;margin-top:15px">
      <p><b>MinSum = ${bestSum}</b> | Ранжування: ${bestPermSum.map(c => getCityNum(c)).join(', ')}</p>
      <p>${bestPermSum.join(' > ')}</p>
      <p><b>MinMax = ${bestMax}</b> | Ранжування: ${bestPermMax.map(c => getCityNum(c)).join(', ')}</p>
      <p>Час: ${elapsed}с | Перестановок: ${TOTAL.toLocaleString()}</p></div>`;

    h += '<h4 style="margin-top:20px">Результати по групах</h4>';
    h += '<div class="table-box"><div class="table-scroll"><table class="sr1-table"><thead><tr><th>Група</th><th>1-й елемент</th><th>MinSum</th><th>MinMax</th></tr></thead><tbody>';
    groups.forEach((g, i) => {
      h += `<tr><td>G${i + 1}</td><td>${getCityNum(cities[i])}. ${cities[i]}</td><td>${g.bestSum}</td><td>${g.bestMax}</td></tr>`;
    });
    h += '</tbody></table></div></div>';

    h += '<h4 style="margin-top:20px">Задоволеність експертів</h4>';
    h += '<div class="table-box"><div class="table-scroll"><table class="sr1-table"><thead><tr><th>Експерт</th><th>d</th><th>s (%)</th></tr></thead><tbody>';
    sat.forEach(s => {
      const c = s.s >= 80 ? '#27ae60' : s.s >= 50 ? '#16a085' : '#e74c3c';
      h += `<tr><td>E${s.expert}</td><td>${s.d}</td><td style="color:${c};font-weight:bold">${s.s}%</td></tr>`;
    });
    h += '</tbody></table></div></div>';

    document.getElementById('sr1-brute-results').style.display = 'block';
    document.getElementById('sr1-brute-results').innerHTML = h;
    updateCharts(cities, experts, bestPermSum, getCityNum);
    beforeResult = { ...lastResult };
  }

  processChunk();
}

function downloadFile(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type: type + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function buildSR1(container, lab2Cities) {
  const getCityNum = (name) => lab2Cities.indexOf(name) + 1;
  originalExperts = buildExperts(lab2Cities);
  currentExperts = JSON.parse(JSON.stringify(originalExperts));

  container.innerHTML = getSR1Html(lab2Cities);
  renderEditTable(lab2Cities, currentExperts, getCityNum);
  addLog('Система СР-1 ініціалізована');

  // Try restore
  const saved = localStorage.getItem('sr1_lastResult');
  if (saved) {
    try {
      lastResult = JSON.parse(saved);
      beforeResult = { ...lastResult };
      addLog('Завантажено попередній результат з кешу');
      updateCharts(lab2Cities, currentExperts, lastResult.bestPermSum, getCityNum);
      showComparison(beforeResult, lastResult, getCityNum);
    } catch (e) { /* ignore */ }
  }



  // Help
  document.querySelectorAll('.sr1-help-item').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.help;
      const box = document.getElementById('sr1-help-text');
      box.innerHTML = HELP_TEXTS[key] || '';
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };
  });

  // Brute force controls
  document.getElementById('sr1-start').onclick = () => startBruteForce(lab2Cities, currentExperts, getCityNum);
  document.getElementById('sr1-pause').onclick = () => {
    isPaused = true;
    document.getElementById('sr1-pause').disabled = true;
    document.getElementById('sr1-resume').disabled = false;
    addLog('Обчислення призупинено');
  };
  document.getElementById('sr1-resume').onclick = () => {
    isPaused = false;
    document.getElementById('sr1-pause').disabled = false;
    document.getElementById('sr1-resume').disabled = true;
    addLog('Обчислення відновлено');
  };
  document.getElementById('sr1-reset').onclick = () => {
    isRunning = false;
    isPaused = false;
    document.getElementById('sr1-start').disabled = false;
    document.getElementById('sr1-start').textContent = '▶ Старт';
    document.getElementById('sr1-pause').disabled = true;
    document.getElementById('sr1-resume').disabled = true;
    document.getElementById('sr1-reset').disabled = true;
    document.getElementById('sr1-progress-wrap').style.display = 'none';
    addLog('Обчислення скинуто');
  };

  // Export/Import
  document.getElementById('sr1-export-data').onclick = () => {
    const data = { cities: lab2Cities, experts: currentExperts, result: lastResult, log, timestamp: new Date().toISOString() };
    downloadFile('sr1_archive.json', JSON.stringify(data, null, 2), 'application/json');
    addLog('Дані архівовано');
  };
  document.getElementById('sr1-import-data').onclick = () => document.getElementById('sr1-file-input').click();
  document.getElementById('sr1-file-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.experts) { currentExperts = data.experts; renderEditTable(lab2Cities, currentExperts, getCityNum); }
        if (data.result) { 
          lastResult = data.result; 
          beforeResult = { ...lastResult }; 
          showComparison(beforeResult, lastResult, getCityNum);
          updateCharts(lab2Cities, currentExperts, lastResult.bestPermSum, getCityNum);
        }
        addLog(`Імпортовано дані з ${file.name}`);
      } catch (err) { addLog('Помилка імпорту: ' + err.message); }
    };
    reader.readAsText(file);
  };

  // Save results
  document.getElementById('sr1-save-txt').onclick = () => {
    let txt = '=== САМОСТІЙНА РОБОТА №1 — ПРОТОКОЛ ===\n';
    txt += `Дата: ${new Date().toLocaleString('uk-UA')}\n\n`;
    if (lastResult) {
      txt += `MinSum: ${lastResult.bestSum}\nРанжування: ${lastResult.bestPermSum?.join(' > ')}\n`;
      txt += `MinMax: ${lastResult.bestMax}\nЧас: ${lastResult.time}с\n\n`;
      if (lastResult.satisfaction) {
        txt += 'Задоволеність:\n';
        lastResult.satisfaction.forEach(s => { txt += `  E${s.expert}: d=${s.d}, s=${s.s}%\n`; });
      }
    }
    txt += '\nПротокол дій:\n';
    log.forEach(l => { txt += l + '\n'; });
    downloadFile('sr1_results.txt', txt);
    addLog('Результати збережено у TXT');
  };
  document.getElementById('sr1-save-json').onclick = () => {
    const data = { result: lastResult, experts: currentExperts, log, cities: lab2Cities };
    downloadFile('sr1_results.json', JSON.stringify(data, null, 2), 'application/json');
    addLog('Результати збережено у JSON');
  };
  document.getElementById('sr1-load-results').onclick = () => document.getElementById('sr1-load-input').click();
  document.getElementById('sr1-load-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.result) { lastResult = data.result; beforeResult = { ...lastResult }; }
        if (data.experts) { currentExperts = data.experts; renderEditTable(lab2Cities, currentExperts, getCityNum); }
        addLog(`Завантажено результати з ${file.name}`);
        if (lastResult?.bestPermSum) updateCharts(lab2Cities, currentExperts, lastResult.bestPermSum, getCityNum);
      } catch (err) { addLog('Помилка: ' + err.message); }
    };
    reader.readAsText(file);
  };

  // Download log
  document.getElementById('sr1-download-log').onclick = () => {
    downloadFile('sr1_protocol.txt', log.join('\n'));
    addLog('Протокол завантажено');
  };
}
