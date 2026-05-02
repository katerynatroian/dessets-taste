// lab4core.js — Ядро обчислень Лабораторної №4
import { AntRanking } from './aco.js';

// ===== Генератор перестановок (Heap's algorithm) =====
export function* heapPerms(arr) {
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

// ===== Відстань перестановки до всіх експертів (сума) =====
export function totalDist(perm, experts) {
    let sum = 0;
    for (const exp of experts) {
        for (const item of exp) {
            const pos = perm.indexOf(item.city) + 1;
            sum += Math.abs(pos - item.rank);
        }
    }
    return sum;
}

// ===== Максимальна відстань перестановки =====
export function maxDist(perm, experts) {
    let mx = 0;
    for (const exp of experts) {
        let d = 0;
        for (const item of exp) {
            const pos = perm.indexOf(item.city) + 1;
            d += Math.abs(pos - item.rank);
        }
        if (d > mx) mx = d;
    }
    return mx;
}

// ===== Розподілений прямий перебір =====
export function distributedBruteForce(cities, experts) {
    const n = cities.length;
    const groups = [];
    let globalBestSum = Infinity, globalBestMax = Infinity;
    let globalBestPermSum = null, globalBestPermMax = null;
    let allSumSolutions = [], allMaxSolutions = [];
    const startTime = performance.now();

    for (let g = 0; g < n; g++) {
        const first = cities[g];
        const rest = cities.filter((_, i) => i !== g);
        let localBestSum = Infinity, localBestMax = Infinity;
        let localPermSum = null, localPermMax = null;
        let count = 0;
        const groupStart = performance.now();

        for (const perm of heapPerms(rest)) {
            const full = [first, ...perm];
            count++;
            const sd = totalDist(full, experts);
            const md = maxDist(full, experts);

            if (sd < localBestSum) {
                localBestSum = sd;
                localPermSum = [...full];
            }
            if (md < localBestMax) {
                localBestMax = md;
                localPermMax = [...full];
            }
        }

        const groupTime = performance.now() - groupStart;
        if (localPermSum) allSumSolutions.push({ ranking: localPermSum, dist: localBestSum });
        if (localPermMax) allMaxSolutions.push({ ranking: localPermMax, dist: localBestMax });

        if (localBestSum < globalBestSum) {
            globalBestSum = localBestSum;
            globalBestPermSum = localPermSum;
        }
        if (localBestMax < globalBestMax) {
            globalBestMax = localBestMax;
            globalBestPermMax = localPermMax;
        }

        groups.push({
            groupIdx: g, first: first, count,
            bestSum: localBestSum, bestMax: localBestMax,
            permSum: localPermSum, permMax: localPermMax,
            time: groupTime.toFixed(1)
        });
    }

    allSumSolutions.sort((a, b) => a.dist - b.dist);
    allMaxSolutions.sort((a, b) => a.dist - b.dist);
    const totalTime = performance.now() - startTime;

    return {
        groups, totalTime: totalTime.toFixed(0),
        bestSum: globalBestSum, bestPermSum: globalBestPermSum,
        bestMax: globalBestMax, bestPermMax: globalBestPermMax,
        topSum: allSumSolutions.slice(0, 20),
        topMax: allMaxSolutions.slice(0, 20),
        totalPerms: groups.reduce((s, g) => s + g.count, 0)
    };
}

// ===== Індекс задоволеності =====
export function calcSatisfaction(compromiseRanking, experts, n, removedCities) {
    const results = [];
    for (let j = 0; j < experts.length; j++) {
        const exp = experts[j];
        let d = 0;
        let removed = false;
        for (const item of exp) {
            const posInCompromise = compromiseRanking.indexOf(item.city) + 1;
            d += Math.abs(posInCompromise - item.rank);
            if (removedCities && removedCities.includes(item.city)) removed = true;
        }
        if (removed) d += (n - 3);
        const s = (1 - d / (3 * (n - 3))) * 100;
        results.push({ expert: j + 1, d, s: Math.max(0, s).toFixed(1), removed });
    }
    return results;
}

// ===== Великомасштабний ACO (n >> 12) =====
export function largeScaleACO(n, numExperts, mode) {
    // Генеруємо випадкові назви об'єктів
    const objects = [];
    for (let i = 0; i < n; i++) objects.push(`Obj_${i + 1}`);

    // Генеруємо випадкові експертні ранжування (top-3)
    const experts = [];
    for (let e = 0; e < numExperts; e++) {
        const shuffled = [...objects].sort(() => Math.random() - 0.5);
        const partial = shuffled.slice(0, 3).map((city, idx) => ({ city, rank: idx + 1 }));
        experts.push(partial);
    }

    // Централізований ACO
    const startCentral = performance.now();
    // Pass experts as arrays of strings for AntRanking
    const acoCentral = new AntRanking(objects, experts.map(e => e.map(item => item.city)));
    acoCentral.iterations = 150;
    acoCentral.antsCount = 30;
    const resCentral = acoCentral.solve();
    const bestCentral = resCentral.bests[0]; // Take the first best solution
    const timeCentral = performance.now() - startCentral;
    const distCentral = totalDist(bestCentral, experts);

    // Розподілений ACO (4 незалежні запуски, вибір кращого)
    const startDistrib = performance.now();
    const numWorkers = 4;
    let bestDistrib = null, bestDistribDist = Infinity;
    const workerResults = [];
    for (let w = 0; w < numWorkers; w++) {
        const aco = new AntRanking(objects, experts.map(e => e.map(item => item.city)));
        aco.iterations = Math.ceil(150 / numWorkers);
        aco.antsCount = 30;
        const res = aco.solve();
        const best = res.bests[0];
        const d = totalDist(best, experts);
        workerResults.push({ worker: w + 1, dist: d, ranking: best });
        if (d < bestDistribDist) { bestDistribDist = d; bestDistrib = best; }
    }
    const timeDistrib = performance.now() - startDistrib;

    return {
        n, numExperts, objects, experts,
        central: { ranking: bestCentral, dist: distCentral, time: timeCentral.toFixed(0) },
        distributed: { ranking: bestDistrib, dist: bestDistribDist, time: timeDistrib.toFixed(0), workers: workerResults },
        improvement: ((distCentral - bestDistribDist) / (distCentral || 1) * 100).toFixed(1),
        speedup: (timeCentral / timeDistrib).toFixed(2)
    };
}