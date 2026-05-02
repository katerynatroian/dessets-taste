// aco.js - Мурашиний алгоритм для консенсус-ранжування
// з двома метриками: відстань Кука та мінімакс

// --- Генерація 20 випадкових перестановок ---
export function generateRandomPermutations(objects, count = 3628800) {
    const result = [];
    for (let i = 0; i < count; i++) {
        const shuffled = [...objects];
        for (let j = shuffled.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }
        result.push(shuffled);
    }
    return result;
}

// --- Метрика відстані (як у lab3.js) ---
function calculatePermutationDistance(perm, expertRanking) {
    let d = 0;
    for (let k = 0; k < expertRanking.length; k++) {
        const posInPerm = perm.indexOf(expertRanking[k]);
        if (posInPerm >= 0) {
            d += Math.abs(posInPerm - k);
        }
    }
    return d;
}

// --- Сума відстаней від кандидата до всіх перестановок (Відстань Кука) ---
function cookDistance(ranking, permutations) {
    let total = 0;
    permutations.forEach(perm => {
        total += calculatePermutationDistance(ranking, perm);
    });
    return total;
}

// --- Мінімакс відстань ---
function minimaxDistance(ranking, permutations) {
    let maxDist = 0;
    permutations.forEach(perm => {
        const d = calculatePermutationDistance(ranking, perm);
        if (d > maxDist) maxDist = d;
    });
    return maxDist;
}

// --- Основний клас ACO ---
export class AntRanking {
    constructor(objects, permutations, distanceType = 'cook') {
        this.objects = objects;       
        this.permutations = permutations; // 20 випадкових перестановок
        this.distanceType = distanceType; // 'cook' або 'minimax'
        this.antsCount = 50;
        this.iterations = 150;
        this.evaporationRate = 0.3;
        this.alpha = 1;
        this.beta = 3; // Increase beta for stronger heuristic influence

        // ... (prefMatrix and pheromones initialization unchanged) ...
        // Матриця переваг: скільки разів A стоїть перед B у перестановках
        this.prefMatrix = {};
        objects.forEach(a => {
            this.prefMatrix[a] = {};
            objects.forEach(b => {
                if (a !== b) {
                    let count = 0;
                    permutations.forEach(perm => {
                        const posA = perm.indexOf(a);
                        const posB = perm.indexOf(b);
                        if (posA !== -1 && posB !== -1 && posA < posB) count++;
                    });
                    this.prefMatrix[a][b] = count;
                }
            });
        });

        // Ініціалізація матриці феромонів
        this.pheromones = {};
        objects.forEach(a => {
            this.pheromones[a] = {};
            objects.forEach(b => {
                if (a !== b) this.pheromones[a][b] = 1.0;
            });
        });
    }

    // Розрахунок відстані залежно від типу
    calculateDistance(ranking) {
        if (this.distanceType === 'minimax') {
            return minimaxDistance(ranking, this.permutations);
        }
        return cookDistance(ranking, this.permutations);
    }

    // --- Локальний пошук (2-opt / adjacent swap) ---
    localSearch(ranking) {
        let improved = true;
        let currentRank = [...ranking];
        let currentDist = this.calculateDistance(currentRank);

        while (improved) {
            improved = false;
            for (let i = 0; i < currentRank.length - 1; i++) {
                // Міняємо місцями сусідні елементи
                [currentRank[i], currentRank[i + 1]] = [currentRank[i + 1], currentRank[i]];
                let newDist = this.calculateDistance(currentRank);

                if (newDist < currentDist) {
                    currentDist = newDist;
                    improved = true;
                    // Продовжуємо з новою перестановкою
                } else {
                    // Повертаємо назад
                    [currentRank[i], currentRank[i + 1]] = [currentRank[i + 1], currentRank[i]];
                }
            }
        }
        return currentRank;
    }

    solve() {
        let bestRankings = [];
        let minDistance = Infinity;
        let convergenceHistory = [];
        let logs = [];

        logs.push(`🚀 Початок роботи покращеного ACO (${this.distanceType === 'cook' ? 'Відстань Кука' : 'Мінімакс'})...`);
        logs.push(`👥 Мурах: ${this.antsCount}, Ітерацій: ${this.iterations}, + Локальний пошук (2-opt)`);

        const isUnique = (rankings, newRank) => {
            const newStr = JSON.stringify(newRank);
            return !rankings.some(r => JSON.stringify(r) === newStr);
        };

        for (let iter = 0; iter < this.iterations; iter++) {
            let iterationRankings = [];
            let iterationBestDist = Infinity;

            for (let ant = 0; ant < this.antsCount; ant++) {
                let currentRanking = this.constructSolution();

                // Застосовуємо локальний пошук для покращення результату мурахи
                currentRanking = this.localSearch(currentRanking);

                const dist = this.calculateDistance(currentRanking);

                if (dist < minDistance) {
                    minDistance = dist;
                    bestRankings = [[...currentRanking]];
                    logs.push(`📈 Іт. ${iter + 1}: Новий рекорд! d = ${minDistance}`);
                } else if (dist === minDistance) {
                    if (isUnique(bestRankings, currentRanking)) {
                        bestRankings.push([...currentRanking]);
                    }
                }

                if (dist < iterationBestDist) {
                    iterationBestDist = dist;
                }
                iterationRankings.push({ ranking: currentRanking, dist });
            }

            this.updatePheromones(iterationRankings, minDistance);
            convergenceHistory.push(minDistance);

            if ((iter + 1) % 30 === 0) {
                logs.push(`🔄 Ітерація ${iter + 1}: d_min = ${minDistance} (${bestRankings.length} розв.)`);
            }
        }

        logs.push(`✅ Завершено. Знайдено найкращих розв'язків: ${bestRankings.length} (d = ${minDistance})`);
        return { bests: bestRankings, distance: minDistance, history: convergenceHistory, logs: logs };
    }

    constructSolution() {
        let unvisited = [...this.objects];
        let ranking = [];

        while (unvisited.length > 0) {
            const next = this.selectNext(ranking[ranking.length - 1], unvisited);
            ranking.push(next);
            unvisited = unvisited.filter(u => u !== next);
        }
        return ranking;
    }

    selectNext(last, unvisited) {
        if (!last) return unvisited[Math.floor(Math.random() * unvisited.length)];

        let scores = unvisited.map(u => {
            const pher = Math.pow(this.pheromones[last][u] || 0.01, this.alpha);
            // Використовуємо prefMatrix як евристику: наскільки частіше 'last' стоїть перед 'u'
            const heurValue = (this.prefMatrix[last][u] || 0) + 1;
            const heur = Math.pow(heurValue, this.beta);
            return { u, score: pher * heur };
        });

        const total = scores.reduce((sum, s) => sum + s.score, 0);
        if (total === 0) return unvisited[Math.floor(Math.random() * unvisited.length)];

        let rand = Math.random() * total;
        let current = 0;
        for (const { u, score } of scores) {
            current += score;
            if (current >= rand) return u;
        }
        return unvisited[0];
    }

    updatePheromones(results, globalMin) {
        // Випаровування
        for (const a in this.pheromones) {
            for (const b in this.pheromones[a]) {
                this.pheromones[a][b] *= (1 - this.evaporationRate);
                if (this.pheromones[a][b] < 0.01) this.pheromones[a][b] = 0.01;
            }
        }
        // Відкладення феромону (тільки найкращі рішення ітерації отримують суттєвий бонус)
        results.forEach(res => {
            // Чим ближче до глобального мінімуму, тим більше феромону
            const quality = (globalMin + 1) / (res.dist + 1);
            const deposit = Math.pow(quality, 2) * 0.5;

            for (let i = 0; i < res.ranking.length - 1; i++) {
                for (let j = i + 1; j < res.ranking.length; j++) {
                    const a = res.ranking[i];
                    const b = res.ranking[j];
                    if (this.pheromones[a] && this.pheromones[a][b] !== undefined) {
                        this.pheromones[a][b] += deposit;
                    }
                }
            }
        });
    }
}