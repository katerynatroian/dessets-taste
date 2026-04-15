// aco.js - Мурашиний алгоритм для консенсус-ранжування
// з двома метриками: відстань Кука та мінімакс

// --- Генерація 20 випадкових перестановок ---
export function generateRandomPermutations(objects, count = 20) {
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

// --- Відстань Кука (Kendall tau) між двома перестановками ---
function kendallDistance(rankingA, rankingB) {
    let distance = 0;
    const n = rankingA.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            const posA_i = rankingA.indexOf(rankingA[i]);
            const posB_i = rankingB.indexOf(rankingA[i]);
            const posA_j = rankingA.indexOf(rankingA[j]);
            const posB_j = rankingB.indexOf(rankingA[j]);
            // Якщо відносний порядок пари відрізняється — штраф
            if ((posA_i - posA_j) * (posB_i - posB_j) < 0) {
                distance++;
            }
        }
    }
    return distance;
}

// --- Сума відстаней Кука від кандидата до всіх перестановок ---
function cookDistance(ranking, permutations) {
    let total = 0;
    permutations.forEach(perm => {
        total += kendallDistance(ranking, perm);
    });
    return total;
}

// --- Мінімакс відстань: максимальна відстань Кука до будь-якої перестановки ---
function minimaxDistance(ranking, permutations) {
    let maxDist = 0;
    permutations.forEach(perm => {
        const d = kendallDistance(ranking, perm);
        if (d > maxDist) maxDist = d;
    });
    return maxDist;
}

// --- Основний клас ACO ---
export class AntRanking {
    constructor(objects, permutations, distanceType = 'cook') {
        this.objects = objects;           // ТОП-10 об'єктів
        this.permutations = permutations; // 20 випадкових перестановок
        this.distanceType = distanceType; // 'cook' або 'minimax'
        this.antsCount = 30;
        this.iterations = 80;
        this.evaporationRate = 0.4;
        this.alpha = 1;
        this.beta = 2;

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

    solve() {
        let bestRanking = null;
        let minDistance = Infinity;
        let convergenceHistory = [];

        for (let iter = 0; iter < this.iterations; iter++) {
            let iterationRankings = [];

            for (let ant = 0; ant < this.antsCount; ant++) {
                const currentRanking = this.constructSolution();
                const dist = this.calculateDistance(currentRanking);

                if (dist < minDistance) {
                    minDistance = dist;
                    bestRanking = [...currentRanking];
                }
                iterationRankings.push({ ranking: currentRanking, dist });
            }

            this.updatePheromones(iterationRankings);
            convergenceHistory.push(minDistance);
        }

        return { best: bestRanking, distance: minDistance, history: convergenceHistory };
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

        // Евристика: перевага з матриці (скільки разів last стоїть перед candidate у перестановках)
        let scores = unvisited.map(u => {
            const pher = Math.pow(this.pheromones[last][u] || 0.01, this.alpha);
            const heur = Math.pow((this.prefMatrix[last][u] || 0) + 1, this.beta);
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

    updatePheromones(results) {
        // Випаровування
        for (const a in this.pheromones) {
            for (const b in this.pheromones[a]) {
                this.pheromones[a][b] *= (1 - this.evaporationRate);
                if (this.pheromones[a][b] < 0.01) this.pheromones[a][b] = 0.01;
            }
        }
        // Відкладення феромону (кращі рішення отримують більше)
        results.forEach(res => {
            const deposit = 1 / (res.dist + 1);
            for (let i = 0; i < res.ranking.length - 1; i++) {
                const a = res.ranking[i];
                const b = res.ranking[i + 1];
                this.pheromones[a][b] += deposit;
            }
        });
    }
}