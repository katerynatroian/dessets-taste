// lab3.js

function wrapTable(title, content) {
    return '<div class="table-box">' +
        '<h3>' + title + '</h3>' +
        '<div class="table-scroll">' +
        '<table class="results-table">' + content + '</table>' +
        '</div></div>';
}

// ── Worker source (runs 10! permutations in background thread) ────────────────
const WORKER_SRC = `
// Heap's algorithm — generates all N! permutations iteratively
function heapPermutations(arr) {
    var n = arr.length;
    var result = [];
    var c = new Array(n).fill(0);
    result.push(arr.slice());
    var i = 0;
    while (i < n) {
        if (c[i] < i) {
            if (i % 2 === 0) {
                var tmp = arr[0]; arr[0] = arr[i]; arr[i] = tmp;
            } else {
                var tmp = arr[c[i]]; arr[c[i]] = arr[i]; arr[i] = tmp;
            }
            result.push(arr.slice());
            c[i]++;
            i = 0;
        } else {
            c[i] = 0;
            i++;
        }
    }
    return result;
}

function permDist(perm, ranking) {
    var d = 0;
    for (var k = 0; k < ranking.length && k < 3; k++) {
        var pos = perm.indexOf(ranking[k]);
        if (pos >= 0) d += Math.abs(pos - k);
    }
    return d;
}

self.onmessage = function(e) {
    var startTime = Date.now();
    var topObjects = e.data.topObjects;
    var expertRankings = e.data.expertRankings;

    var allPerms = heapPermutations(topObjects.slice());
    var total = allPerms.length;

    var minSum = Infinity;
    var minMax = Infinity;

    // first pass — find minimums
    var distRows = [];
    for (var pi = 0; pi < total; pi++) {
        var perm = allPerms[pi];
        var dists = [];
        var sum = 0, max = 0;
        for (var ei = 0; ei < expertRankings.length; ei++) {
            var d = permDist(perm, expertRankings[ei]);
            dists.push(d);
            sum += d;
            if (d > max) max = d;
        }
        if (sum < minSum) minSum = sum;
        if (max < minMax) minMax = max;
        distRows.push({ perm: perm, dists: dists, sum: sum, max: max });
    }

    // collect medians
    var mediansCook = [];
    var mediansMinimax = [];
    for (var ri = 0; ri < distRows.length; ri++) {
        if (distRows[ri].sum === minSum) mediansCook.push(distRows[ri]);
        if (distRows[ri].max === minMax) mediansMinimax.push(distRows[ri]);
    }
    var endTime = Date.now();
    var duration = (endTime - startTime) / 1000;

    // send back first 30 rows + medians (don't send all 3.6M rows)
    self.postMessage({
        total: total,
        minSum: minSum,
        minMax: minMax,
        first30: distRows.slice(0, 30),
        mediansCook: mediansCook.slice(0, 10),
        mediansMinimax: mediansMinimax.slice(0, 10),
        mediansCookCount: mediansCook.length,
        mediansMinimaxCount: mediansMinimax.length,
        duration: duration

    });
};
`;

// ── Build tables from worker result ──────────────────────────────────────────
function buildTables(experts, topObjects, workerResult, stats) {
    var showExpCount = Math.min(experts.length, 10);
    var N = topObjects.length;

    var {
        total, minSum, minMax,
        first30, mediansCook, mediansMinimax,
        mediansCookCount, mediansMinimaxCount, duration
    } = workerResult;

    // ── TABLE 4 ───────────────────────────────────────────────────────────────
    var t4 = '';

    t4 += '<tr>';
    t4 += '<th rowspan="2">#</th>';
    t4 += '<th colspan="' + N + '">' + N + '! перестановок об\'єктів</th>';
    t4 += '<th colspan="' + showExpCount + '">Відстані від перестановки до експертного МП</th>';
    t4 += '<th rowspan="2" style="background:#e8f5e9">сума</th>';
    t4 += '<th rowspan="2" style="background:#fff3e0">макс</th>';
    t4 += '</tr>';

    t4 += '<tr>';
    for (var ti = 0; ti < N; ti++) {
        t4 += '<th style="font-size:0.75rem">О' + (ti + 1) + '</th>';
    }
    for (var ei = 0; ei < showExpCount; ei++) {
        t4 += '<th style="font-size:0.75rem">' + experts[ei].id + '</th>';
    }
    t4 += '</tr>';

    first30.forEach(function(row, ri) {
        var isMinS = row.sum === minSum;
        var isMinM = row.max === minMax;
        var rowStyle = isMinS ? 'background:#e8f5e9;font-weight:bold'
            : isMinM ? 'background:#fff3e0;font-weight:bold' : '';

        t4 += '<tr style="' + rowStyle + '">';
        t4 += '<td>' + (ri + 1) + '</td>';

        topObjects.forEach(function(obj) {
            t4 += '<td>' + (row.perm.indexOf(obj) + 1) + '</td>';
        });

        for (var di = 0; di < showExpCount; di++) {
            t4 += '<td>' + (row.dists[di] !== undefined ? row.dists[di] : 0) + '</td>';
        }

        t4 += '<td style="background:#e8f5e9;font-weight:bold">' + row.sum + '</td>';
        t4 += '<td style="background:#fff3e0;font-weight:bold">' + row.max + '</td>';
        t4 += '</tr>';
    });

    var table4 = wrapTable(
        'Таблиця 4 — Перебір ' + N + '! = ' + total.toLocaleString('uk-UA') +
        ' перестановок (показано перші 30)' +
        '<br><span style="font-size:0.85rem;color:#636e72">⏱️ Час обчислення: <b>' + duration.toFixed(2) + ' сек</b></span>',
        t4
    );

    var legendHtml = '<p style="font-size:0.78rem;color:#636e72;margin:4px 0 20px;padding:0 4px">';
    topObjects.forEach(function(obj, i) {
        legendHtml += '<b>О' + (i + 1) + '</b>=' + obj + (i < topObjects.length - 1 ? ', ' : '');
    });
    legendHtml += '</p>';

    // ── TABLE 5 ───────────────────────────────────────────────────────────────
    var t5 = '';
    t5 += '<tr><th>#</th><th>Ранжування (медіана)</th>';
    for (var ei5 = 0; ei5 < showExpCount; ei5++) t5 += '<th>' + experts[ei5].id + '</th>';
    t5 += '<th style="background:#e8f5e9">сума</th></tr>';

    mediansCook.forEach(function(med, i) {
        t5 += '<tr style="background:#e8f5e9">';
        t5 += '<td>' + (i + 1) + '</td>';
        var rankStr = med.perm.map(function(obj, pi) {
            return '<b>' + (pi + 1) + '.</b>' + obj;
        }).join(' &#8250; ');
        t5 += '<td style="font-size:0.82rem;text-align:left">' + rankStr + '</td>';
        for (var di = 0; di < showExpCount; di++) {
            t5 += '<td>' + (med.dists[di] !== undefined ? med.dists[di] : 0) + '</td>';
        }
        t5 += '<td style="font-weight:bold;color:#00b894">' + med.sum + '</td>';
        t5 += '</tr>';
    });

    var table5 = wrapTable(
        'Таблиця 5 — Медіани за мінімумом суми (&Sigma; = ' + minSum +
        ', всього знайдено: ' + mediansCookCount.toLocaleString('uk-UA') + ', показано перші 10)',
        t5
    );

    // ── TABLE 6 ───────────────────────────────────────────────────────────────
    var t6 = '';
    t6 += '<tr><th>#</th><th>Ранжування (медіана)</th>';
    for (var ei6 = 0; ei6 < showExpCount; ei6++) t6 += '<th>' + experts[ei6].id + '</th>';
    t6 += '<th style="background:#fff3e0">макс</th></tr>';

    mediansMinimax.forEach(function(med, i) {
        t6 += '<tr style="background:#fff3e0">';
        t6 += '<td>' + (i + 1) + '</td>';
        var rankStr = med.perm.map(function(obj, pi) {
            return '<b>' + (pi + 1) + '.</b>' + obj;
        }).join(' &#8250; ');
        t6 += '<td style="font-size:0.82rem;text-align:left">' + rankStr + '</td>';
        for (var di = 0; di < showExpCount; di++) {
            t6 += '<td>' + (med.dists[di] !== undefined ? med.dists[di] : 0) + '</td>';
        }
        t6 += '<td style="font-weight:bold;color:#e17055">' + med.max + '</td>';
        t6 += '</tr>';
    });

    var table6 = wrapTable(
        'Таблиця 6 — Медіани за мінімаксом (макс = ' + minMax +
        ', всього знайдено: ' + mediansMinimaxCount.toLocaleString('uk-UA') + ', показано перші 10)',
        t6
    );

 

    return table4 + legendHtml + table5 + table6;
}

// ── Tables 1-3 (sync, instant) ────────────────────────────────────────────────
function buildStaticTables(experts, topObjects, stats) {
    var t1 = '';
    t1 += '<tr><th>Експерти</th>';
    experts.forEach(function(e) { t1 += '<td>' + e.id + '</td>'; });
    t1 += '</tr>';
    ['ranking[0]', 'ranking[1]', 'ranking[2]'].forEach(function(_, pos) {
        t1 += '<tr><th>' + (pos + 1) + ' місце</th>';
        experts.forEach(function(e) { t1 += '<td>' + (e.ranking[pos] || '-') + '</td>'; });
        t1 += '</tr>';
    });
    var table1 = wrapTable('Таблиця 1 — Множинні порівняння', t1);

    var t2 = '';
    t2 += '<tr><th>Об\'єкт</th>';
    topObjects.forEach(function(o) { t2 += '<th>' + o + '</th>'; });
    t2 += '</tr>';
    [['1 місце', 'pos1'], ['2 місце', 'pos2'], ['3 місце', 'pos3'], ['Всього', 'total']].forEach(function(pair) {
        t2 += '<tr><th>' + pair[0] + '</th>';
        topObjects.forEach(function(o) { t2 += '<td>' + stats[o][pair[1]] + '</td>'; });
        t2 += '</tr>';
    });
    var table2 = wrapTable("Таблиця 2 — Частота вибору об'єктів", t2);

    var t3 = '';
    t3 += '<tr><th>Об\'єкт \\ Експерт</th>';
    experts.forEach(function(e) { t3 += '<th>' + e.id + '</th>'; });
    t3 += '</tr>';
    topObjects.forEach(function(obj) {
        t3 += '<tr><td><b>' + obj + '</b></td>';
        experts.forEach(function(e) {
            var idx = e.ranking.indexOf(obj);
            t3 += '<td>' + (idx >= 0 ? idx + 1 : 0) + '</td>';
        });
        t3 += '</tr>';
    });
    var table3 = wrapTable('Таблиця 3 — Ранги за множинним порівнянням', t3);

    return table1 + table2 + table3;
}

// ── Main export (returns Promise) ─────────────────────────────────────────────
export function runLab3Analysis(votes, allObjects, topObjects, container) {
    var experts = [];
    var stats = {};

    topObjects.forEach(function(obj) {
        stats[obj] = { pos1: 0, pos2: 0, pos3: 0, total: 0 };
    });

    votes.forEach(function(v) {
        if (!v.ranking) return;
        experts.push({ id: v.expert_id, ranking: v.ranking });
        v.ranking.forEach(function(obj, i) {
            if (!stats[obj]) return;
            if (i === 0) stats[obj].pos1++;
            if (i === 1) stats[obj].pos2++;
            if (i === 2) stats[obj].pos3++;
            stats[obj].total++;
        });
    });

    // Render tables 1-3 immediately
    var staticHtml = buildStaticTables(experts, topObjects, stats);
    var loaderId = 'lab3-loader-' + Date.now();
    container.innerHTML = staticHtml +
        '<div id="' + loaderId + '" style="' +
        'text-align:center;padding:32px;background:#f8f7ff;border-radius:16px;margin:16px 0">' +
        '<div style="font-size:1.1rem;color:#6c5ce7;font-weight:600;margin-bottom:8px">' +
        '⏳ Обчислення 10! = 3&nbsp;628&nbsp;800 перестановок...</div>' +
        '<div style="font-size:0.85rem;color:#636e72">Це може зайняти 5–30 секунд залежно від пристрою</div>' +
        '<div style="margin-top:12px;height:4px;background:#eee;border-radius:2px;overflow:hidden">' +
        '<div style="height:100%;background:#6c5ce7;border-radius:2px;animation:lab3progress 3s linear infinite"></div>' +
        '</div></div>' +
        '<style>@keyframes lab3progress{0%{width:0%}100%{width:100%}}</style>';

    // Spin up a Web Worker from a Blob URL
    var blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);

    worker.postMessage({
        topObjects: topObjects,
        expertRankings: experts.map(function(e) { return e.ranking; })
    });

    worker.onmessage = function(e) {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        var loaderEl = document.getElementById(loaderId);
        if (loaderEl) {
            var dynamicHtml = buildTables(experts, topObjects, e.data, stats);
            loaderEl.outerHTML = dynamicHtml;
        }
    };

    worker.onerror = function(err) {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        var loaderEl = document.getElementById(loaderId);
        if (loaderEl) {
            loaderEl.innerHTML = '<p style="color:red">Помилка Worker: ' + err.message + '</p>';
        }
    };
}