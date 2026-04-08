// aco.js - Мурашиний алгоритм для консенсус-ранжування
export class AntRanking {
    constructor(objects, expertVotes) {
        this.objects = objects; // ТОП-10 об'єктів
        this.expertVotes = expertVotes; // Голоси експертів
        this.antsCount = 20; //мурахи
        this.iterations = 50; //повторень
        this.evaporationRate = 0.5; // Випаровування феромону
        this.alpha = 1; // Вплив феромону
        
        // Ініціалізація матриці феромонів (об'єкт A перед об'єктом B)
        this.pheromones = {};
        this.objects.forEach(a => {
            this.pheromones[a] = {};
            this.objects.forEach(b => {
                if (a !== b) this.pheromones[a][b] = 1;
            });
        });
    }

    // Розрахунок відстані (якість ранжування)
    calculateDistance(ranking) {
        let distance = 0;
        this.expertVotes.forEach(vote => {
            for (let i = 0; i < vote.length; i++) {
                for (let j = i + 1; j < vote.length; j++) {
                    const posA = ranking.indexOf(vote[i]);
                    const posB = ranking.indexOf(vote[j]);
                    if (posA > posB && posA !== -1 && posB !== -1) {
                        distance++; // Додаємо штраф за порушення порядку експерта
                    }
                }
            }
        });
        return distance;
    }

    solve() {
        let bestRanking = null;
        let minDistance = Infinity;
        let convergenceHistory = [];

        for (let iter = 0; iter < this.iterations; iter++) {
            let iterationRankings = [];

            for (let ant = 0; ant < this.antsCount; ant++) {
                let currentRanking = this.constructSolution();
                let dist = this.calculateDistance(currentRanking);

                if (dist < minDistance) {
                    minDistance = dist;
                    bestRanking = [...currentRanking];
                }
                iterationRankings.push({ ranking: currentRanking, dist });
            }

            this.updatePheromones(iterationRankings);
            convergenceHistory.push(minDistance);
        }

        return { best: bestRanking, history: convergenceHistory };
    }

    constructSolution() {
        let unvisited = [...this.objects];
        let ranking = [];

        while (unvisited.length > 0) {
            let next = this.selectNext(ranking[ranking.length - 1], unvisited);
            ranking.push(next);
            unvisited = unvisited.filter(u => u !== next);
        }
        return ranking;
    }

    selectNext(last, unvisited) {
        if (!last) return unvisited[Math.floor(Math.random() * unvisited.length)];
        
        let total = 0;
        unvisited.forEach(u => total += Math.pow(this.pheromones[last][u], this.alpha));
        
        let rand = Math.random() * total;
        let current = 0;
        for (let u of unvisited) {
            current += Math.pow(this.pheromones[last][u], this.alpha);
            if (current >= rand) return u;
        }
        return unvisited[0];
    }

    updatePheromones(results) {
        // Випаровування
        for (let a in this.pheromones) {
            for (let b in this.pheromones[a]) {
                this.pheromones[a][b] *= (1 - this.evaporationRate);
            }
        }
        // Нанесення нових феромонів
        results.forEach(res => {
            const deposit = 1 / (res.dist + 1);
            for (let i = 0; i < res.ranking.length - 1; i++) {
                this.pheromones[res.ranking[i]][res.ranking[i+1]] += deposit;
            }
        });
    }
}