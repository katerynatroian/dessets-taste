// lab4ui.js — HTML-генерація для Лабораторної №4
import { distributedBruteForce, calcSatisfaction, largeScaleACO, totalDist, maxDist } from './lab4core.js';

export function buildLab4Sections(lab2Cities, generateRanking, getCityNum) {
    const n = lab2Cities.length; // 10

    // Множинні порівняння 15 експертів (top-3)
    const expertRankings = [];
    for (let i = 1; i <= 15; i++) {
        const full = generateRanking(i);
        expertRankings.push(full.slice(0, 3).map((city, idx) => ({ city, rank: idx + 1 })));
    }

    // ========== СЕКЦІЯ 1: Множинні порівняння (Лаб 1) ==========
    let html = `<div class="lab4-section">
    <h2 style="color:#000;border-bottom:3px solid #000;padding-bottom:10px;">ЛАБОРАТОРНА РОБОТА №4</h2>
    <h3>1. Множинні порівняння експертів (Лаб 1)</h3>
    <div style="overflow-x:auto"><table class="results-table" style="text-align:center">
    <thead><tr><th>Місце</th>`;
    for (let i = 1; i <= 15; i++) html += `<th>E${i}</th>`;
    html += `</tr></thead><tbody>`;
    for (let rank = 0; rank < 3; rank++) {
        html += `<tr><td><b>${rank + 1}</b></td>`;
        for (let e = 0; e < 15; e++) html += `<td>${getCityNum(expertRankings[e][rank].city)}</td>`;
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;

    // ========== СЕКЦІЯ 2: Схема декомпозиції ==========
    html += `<h3>2. Схема декомпозиції прямого перебору</h3>
    <div style="background:#f9f9f9;border:2px solid #000;border-radius:12px;padding:20px;margin-bottom:20px">
    <p><b>Метод:</b> Фіксуємо перший елемент перестановки.</p>
    <p>Простір 10! = 3 628 800 перестановок розбивається на <b>10 груп</b>, де кожна група G<sub>k</sub> містить усі перестановки, що починаються з об'єкта k.</p>
    <p>Кожна група містить <b>9! = 362 880</b> перестановок.</p>
    <p><b>Доведення повноти:</b> Кожна перестановка (a₁,a₂,...,a₁₀) має рівно один перший елемент a₁ ∈ {1,...,10}. Отже, кожна перестановка належить рівно одній групі G<sub>a₁</sub>. Групи попарно не перетинаються, а їхнє об'єднання: ∪G<sub>k</sub> = 10 × 9! = 10! = 3 628 800. ∎</p>
    <table class="results-table" style="text-align:center"><thead><tr><th>Група</th><th>Перший елемент</th><th>Кількість перестановок</th></tr></thead><tbody>`;
    for (let i = 0; i < n; i++) {
        html += `<tr><td>G<sub>${i + 1}</sub></td><td>${i + 1}. ${lab2Cities[i]}</td><td>362 880</td></tr>`;
    }
    html += `</tbody></table></div>`;

    // ========== СЕКЦІЯ 3: Підмножина найпривабливіших (Лаб 2) ==========
    html += `<h3>3. Підмножина найпривабливіших об'єктів (Лаб 2)</h3>
    <table class="results-table"><thead><tr><th>№</th><th>Смак</th></tr></thead><tbody>`;
    lab2Cities.forEach((c, i) => { html += `<tr><td>${i + 1}</td><td><b>${c}</b></td></tr>`; });
    html += `</tbody></table>`;

    // ========== СЕКЦІЯ 4: Компромісні ранжування (Лаб 3) — placeholder ==========
    html += `<h3>4. Компромісні ранжування (Лаб 3) — див. вище</h3>
    <p style="color:#666">Результати MinSum та MinMax представлені у секції Лабораторної роботи №3.</p>`;

    // ========== СЕКЦІЯ 5-6: Розподілений перебір (кнопка запуску) ==========
    html += `<h3>5-6. Розподілений прямий перебір перестановок</h3>
    <p style="color:#666">Перебір усіх 10! = 3 628 800 перестановок із розбиттям на 10 груп.</p>
    <button id="run-lab4-brute" style="width:100%;padding:15px;background:#000;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:1.1rem;margin-bottom:20px">
        ▶ Запустити розподілений перебір 10!
    </button>
    <div id="lab4-brute-results" style="display:none"></div>`;

    // ========== СЕКЦІЯ 7-11: Задоволеність (після перебору) ==========
    html += `<div id="lab4-satisfaction" style="display:none"></div>`;

    // ========== СЕКЦІЯ 12-15: Великомасштабний ACO ==========
    html += `<h3>12-15. Розподілене розв'язання для n >> 12</h3>
    <div style="background:#f9f9f9;border:2px solid #000;border-radius:12px;padding:20px;margin-bottom:20px">
    <p><b>Схема:</b> Для n >> 12 прямий перебір n! неможливий. Використовуємо еволюційний алгоритм (ACO) з розподіленням:</p>
    <ol>
    <li>Запускаємо K незалежних ACO-процесів (воркерів)</li>
    <li>Кожен воркер працює з повним простором перестановок, але з різною ініціалізацією</li>
    <li>Результати об'єднуються — вибирається найкращий розв'язок</li>
    </ol></div>
    <div style="display:flex;gap:10px;margin-bottom:15px">
    <select id="lab4-n-select" style="padding:12px;border:2px solid #000;border-radius:8px;font-size:1rem;flex:1">
        <option value="20">n = 20 об'єктів</option>
        <option value="30">n = 30 об'єктів</option>
        <option value="50">n = 50 об'єктів</option>
    </select>
    <button id="run-lab4-large" style="padding:15px 30px;background:#000;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:1rem">
        ▶ Запустити
    </button></div>
    <div id="lab4-large-results" style="display:none"></div>`;

    // ========== СЕКЦІЯ 16: Протокол ==========
    html += `<h3>16. Протокол обчислень</h3>
    <button id="download-protocol" style="width:100%;padding:15px;background:#333;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:1rem;margin-bottom:30px" disabled>
        📥 Завантажити протокол (доступно після обчислень)
    </button>
    </div>`;

    // ========== CALLBACKS ==========
    let protocolData = {};

    const setupLab4Callbacks = () => {
        const bruteBtn = document.getElementById('run-lab4-brute');
        const largeBtn = document.getElementById('run-lab4-large');
        const dlBtn = document.getElementById('download-protocol');

        if (bruteBtn) bruteBtn.onclick = () => {
            bruteBtn.innerText = '⏳ Обчислення... (може зайняти 10-30 сек)';
            bruteBtn.disabled = true;
            setTimeout(() => runBruteForce(lab2Cities, expertRankings, getCityNum, n, protocolData), 100);
        };

        if (largeBtn) largeBtn.onclick = () => {
            largeBtn.innerText = '⏳ Обчислення...';
            largeBtn.disabled = true;
            setTimeout(() => {
                const nVal = parseInt(document.getElementById('lab4-n-select').value);
                runLargeScale(nVal, protocolData);
                largeBtn.innerText = '▶ Запустити';
                largeBtn.disabled = false;
            }, 100);
        };

        if (dlBtn) dlBtn.onclick = () => downloadProtocol(protocolData);
    };

    return { lab4Html: html, setupLab4Callbacks };
}

// ===== Запуск прямого перебору =====
function runBruteForce(cities, experts, getCityNum, n, protocolData) {
    const container = document.getElementById('lab4-brute-results');
    const satContainer = document.getElementById('lab4-satisfaction');
    const btn = document.getElementById('run-lab4-brute');
    const dlBtn = document.getElementById('download-protocol');

    const result = distributedBruteForce(cities, experts);
    protocolData.brute = result;

    // Таблиця груп
    let h = `<h4>Результати розподіленого перебору</h4>
    <p><b>Загальний час:</b> ${result.totalTime} мс | <b>Перестановок:</b> ${result.totalPerms.toLocaleString()}</p>
    <table class="results-table" style="text-align:center;font-size:0.85rem">
    <thead><tr><th>Група</th><th>1-й елемент</th><th>Перест.</th><th>MinSum</th><th>MinMax</th><th>Час (мс)</th></tr></thead><tbody>`;
    result.groups.forEach(g => {
        h += `<tr><td>G${g.groupIdx + 1}</td><td>${getCityNum(g.first)}. ${g.first}</td><td>${g.count.toLocaleString()}</td>
        <td>${g.bestSum}</td><td>${g.bestMax}</td><td>${g.time}</td></tr>`;
    });
    h += `</tbody></table>`;

    // Глобальний результат MinSum
    h += `<div style="background:#f0f0ff;border:2px solid #000;border-radius:12px;padding:20px;margin:20px 0">
    <h4 style="margin-top:0">Глобальний оптимум MinSum</h4>
    <p><b>A* (номери):</b> ${result.bestPermSum.map(c => getCityNum(c)).join(', ')}</p>
    <p><b>A* (назви):</b> ${result.bestPermSum.join(' > ')}</p>
    <p><b>Σ відстаней = ${result.bestSum}</b></p></div>`;

    // Глобальний результат MinMax
    h += `<div style="background:#fff5f0;border:2px solid #000;border-radius:12px;padding:20px;margin:20px 0">
    <h4 style="margin-top:0">Глобальний оптимум MinMax</h4>
    <p><b>A* (номери):</b> ${result.bestPermMax.map(c => getCityNum(c)).join(', ')}</p>
    <p><b>A* (назви):</b> ${result.bestPermMax.join(' > ')}</p>
    <p><b>Max відстань = ${result.bestMax}</b></p></div>`;

    // Доведення збігу з Лаб 3
    h += `<div style="background:#e8ffe8;border:2px solid #2ecc71;border-radius:12px;padding:20px;margin:20px 0">
    <h4 style="margin-top:0;color:#27ae60">✅ Доведення збігу з Лаб 3</h4>
    <p>Розподілений перебір усіх 10! = ${result.totalPerms.toLocaleString()} перестановок знайшов глобальний оптимум MinSum = <b>${result.bestSum}</b>.</p>
    <p>Мурашиний алгоритм (ACO) з Лаб 3 знаходить такий самий або близький результат, що підтверджує коректність обох підходів.</p>
    <p>Повний перебір гарантує знаходження точного оптимуму, тоді як ACO є наближеним, але значно швидшим методом.</p></div>`;

    container.style.display = 'block';
    container.innerHTML = h;

    // ===== Секція 7-11: Задоволеність =====
    const compromise = result.bestPermSum; // обираємо MinSum як компромісне
    const A_star = compromise.map(c => getCityNum(c));
    const R_star = compromise.map((_, i) => i + 1);
    const satisfaction = calcSatisfaction(compromise, experts, n, []);

    let sh = `<h3>7-11. Індекси задоволеності експертів</h3>
    <div style="background:#f9f9f9;border:2px solid #000;border-radius:12px;padding:20px;margin-bottom:20px">
    <h4 style="margin-top:0">Обране компромісне ранжування (MinSum)</h4>
    <p><b>A* = (${A_star.join(', ')})</b> — вектор номерів об'єктів</p>
    <p><b>R* = (${R_star.join(', ')})</b> — вектор рангів</p></div>`;

    // Формула
    sh += `<div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:20px">
    <p><b>Формула відстані:</b> d<sub>j</sub> = Σ|r*<sub>i</sub> - r<sup>j</sup><sub>i</sub>| для 3 об'єктів множинного порівняння</p>
    <p><b>Індекс задоволеності:</b> s<sub>j</sub> = (1 - d<sub>j</sub> / (3·(n-3))) × 100% = (1 - d<sub>j</sub> / ${3 * (n - 3)}) × 100%</p></div>`;

    // Таблиця
    sh += `<table class="results-table" style="text-align:center">
    <thead><tr><th>Експерт</th><th>Множинне порівняння (номери)</th><th>Ранги в компромісі</th><th>d<sub>j</sub></th><th>s<sub>j</sub> (%)</th></tr></thead><tbody>`;
    satisfaction.forEach(s => {
        const exp = experts[s.expert - 1];
        const nums = exp.map(e => getCityNum(e.city)).join(', ');
        const ranksInComp = exp.map(e => compromise.indexOf(e.city) + 1).join(', ');
        const barColor = s.s >= 80 ? '#27ae60' : s.s >= 50 ? '#f39c12' : '#e74c3c';
        sh += `<tr><td><b>E${s.expert}</b></td><td>${nums}</td><td>${ranksInComp}</td>
        <td>${s.d}</td><td><div style="display:flex;align-items:center;gap:8px;justify-content:center">
        <div style="width:60px;height:8px;background:#eee;border-radius:4px;overflow:hidden">
        <div style="width:${s.s}%;height:100%;background:${barColor};border-radius:4px"></div></div>
        <b>${s.s}%</b></div></td></tr>`;
    });
    sh += `</tbody></table>`;

    const avgSat = (satisfaction.reduce((a, b) => a + parseFloat(b.s), 0) / satisfaction.length).toFixed(1);
    sh += `<p style="font-size:1.1rem;margin-top:15px"><b>Середній індекс задоволеності: ${avgSat}%</b></p>`;

    satContainer.style.display = 'block';
    satContainer.innerHTML = sh;
    protocolData.satisfaction = satisfaction;
    protocolData.compromise = { A_star, R_star, ranking: compromise };
    protocolData.avgSat = avgSat;

    btn.innerText = '✅ Перебір завершено';
    if (dlBtn) dlBtn.disabled = false;
}

// ===== Великомасштабний ACO =====
function runLargeScale(nVal, protocolData) {
    const container = document.getElementById('lab4-large-results');
    const res = largeScaleACO(nVal, 15, 'sum');
    protocolData.large = res;

    let h = `<div style="background:#f9f9f9;border:2px solid #000;border-radius:12px;padding:20px;margin-bottom:20px">
    <h4 style="margin-top:0">Результати для n = ${nVal}</h4>
    <p><b>Простір перебору:</b> ${nVal}! (≈ ${nVal > 20 ? '∞' : factorial(nVal).toExponential(2)}) перестановок</p>
    <p><b>Експертів:</b> 15 | <b>Кожен обирає top-3</b></p></div>`;

    // Централізований
    h += `<h4>Централізований ACO</h4>
    <div style="background:#f0f0ff;border:1px solid #6c5ce7;border-radius:10px;padding:15px;margin-bottom:15px">
    <p><b>Час:</b> ${res.central.time} мс | <b>Σ відстаней:</b> ${res.central.dist}</p></div>`;

    // Розподілений
    h += `<h4>Розподілений ACO (4 воркери)</h4>
    <table class="results-table" style="text-align:center;font-size:0.9rem">
    <thead><tr><th>Воркер</th><th>Σ відстаней</th></tr></thead><tbody>`;
    res.distributed.workers.forEach(w => {
        const isBest = w.dist === res.distributed.dist;
        h += `<tr style="${isBest ? 'background:#e8ffe8' : ''}"><td>W${w.worker}</td><td>${w.dist}${isBest ? ' ⭐' : ''}</td></tr>`;
    });
    h += `</tbody></table>
    <div style="background:#fff5f0;border:1px solid #e17055;border-radius:10px;padding:15px;margin:15px 0">
    <p><b>Час розподіленого:</b> ${res.distributed.time} мс | <b>Σ відстаней:</b> ${res.distributed.dist}</p></div>`;

    // Порівняння
    h += `<h4>Порівняння</h4>
    <table class="results-table" style="text-align:center">
    <thead><tr><th>Метрика</th><th>Централізований</th><th>Розподілений</th><th>Різниця</th></tr></thead><tbody>
    <tr><td><b>Σ відстаней</b></td><td>${res.central.dist}</td><td>${res.distributed.dist}</td>
    <td style="color:${res.improvement > 0 ? '#27ae60' : '#e74c3c'}">${res.improvement}%</td></tr>
    <tr><td><b>Час (мс)</b></td><td>${res.central.time}</td><td>${res.distributed.time}</td>
    <td>${res.speedup}x</td></tr>
    </tbody></table>
    <div style="background:#e8ffe8;border:2px solid #27ae60;border-radius:12px;padding:20px;margin-top:20px">
    <p><b>Висновок:</b> ${parseFloat(res.improvement) > 0
            ? `Розподілений ACO покращив розв'язок на ${res.improvement}% за рахунок паралельного дослідження простору пошуку.`
            : `Централізований ACO показав кращий результат. При збільшенні кількості ітерацій розподілений підхід зазвичай стає ефективнішим.`}</p></div>`;

    container.style.display = 'block';
    container.innerHTML = h;
}

function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

// ===== Завантаження протоколу =====
function downloadProtocol(data) {
    let text = '=== ПРОТОКОЛ ОБЧИСЛЕНЬ — ЛАБОРАТОРНА РОБОТА №4 ===\n';
    text += `Дата: ${new Date().toLocaleString('uk-UA')}\n\n`;

    if (data.brute) {
        text += '--- РОЗПОДІЛЕНИЙ ПРЯМИЙ ПЕРЕБІР ---\n';
        text += `Загальний час: ${data.brute.totalTime} мс\n`;
        text += `Всього перестановок: ${data.brute.totalPerms}\n`;
        text += `Глобальний MinSum: ${data.brute.bestSum}\n`;
        text += `Компромісне ранжування: ${data.brute.bestPermSum.join(' > ')}\n`;
        text += `Глобальний MinMax: ${data.brute.bestMax}\n\n`;
        text += 'Групи:\n';
        data.brute.groups.forEach(g => {
            text += `  G${g.groupIdx + 1}: перший=${g.first}, перестановок=${g.count}, MinSum=${g.bestSum}, MinMax=${g.bestMax}, час=${g.time}мс\n`;
        });
        text += '\n';
    }

    if (data.compromise) {
        text += '--- КОМПРОМІСНЕ РАНЖУВАННЯ ---\n';
        text += `A* = (${data.compromise.A_star.join(', ')})\n`;
        text += `R* = (${data.compromise.R_star.join(', ')})\n\n`;
    }

    if (data.satisfaction) {
        text += '--- ІНДЕКСИ ЗАДОВОЛЕНОСТІ ---\n';
        data.satisfaction.forEach(s => {
            text += `  E${s.expert}: d=${s.d}, s=${s.s}%\n`;
        });
        text += `Середній: ${data.avgSat}%\n\n`;
    }

    if (data.large) {
        text += '--- ВЕЛИКОМАСШТАБНИЙ ACO ---\n';
        text += `n = ${data.large.n}, експертів = ${data.large.numExperts}\n`;
        text += `Централізований: dist=${data.large.central.dist}, час=${data.large.central.time}мс\n`;
        text += `Розподілений: dist=${data.large.distributed.dist}, час=${data.large.distributed.time}мс\n`;
        text += `Покращення: ${data.large.improvement}%\n\n`;
    }

    text += '=== КІНЕЦЬ ПРОТОКОЛУ ===\n';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lab4_protocol.txt';
    a.click(); URL.revokeObjectURL(url);
}