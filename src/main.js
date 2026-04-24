import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import { getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore"; 
import { AntRanking, generateRandomPermutations } from './aco.js';
import { runLab3Analysis } from './lab3.js';
import './style.css';

const desserts = [
  "Шоколадний трюфель", "Полуниця-вершки", "Фісташка-малина",
  "Банан-карамель", "Снікерс", "Карамель-сіль",
  "Чорниця-йогурт", "Лимонний курд", "Шоколад-вишня",
  "Шоколад в шоколаді", "Рафаелло", "Орео",
  "Манго-маракуя", "Медовик", "Ванільно-ягідний",
  "Червоний оксамит", "Манго-кокос", "Малина-ваніль",
  "Фісташка-полуниця", "Кавовий"
];

const heuristics = [
    { id: 'E1', text: 'Об\'єкт був на 3 місці хоча б раз' },
    { id: 'E2', text: 'Об\'єкт був на 2 місці хоча б раз' },
    { id: 'E3', text: 'Об\'єкт був на 1 місці хоча б раз' },
    { id: 'E4', text: 'Об\'єкт був двічі на 3 місці' },
    { id: 'E5', text: 'Об\'єкт був на 3 місці та на 2 місці' },
    { id: 'E6', text: 'Об\'єкт жодного разу не входив у топ-2' },
    { id: 'E7', text: 'Об\'єкт має лише 1 згадку у всіх голосах' }
];

const expertId = localStorage.getItem("expert_id") || Math.floor(1000 + Math.random() * 9000).toString();
localStorage.setItem("expert_id", expertId);

let selected = []; 
let selectedHeuristics = [];
const heuristicsList = document.getElementById('heuristics-list');
const submitHeuristicsBtn = document.getElementById('submit-heuristics-btn');
let myChart = null; 

const appDiv = document.querySelector('#app');
const submitBtn = document.querySelector('#submit-btn');
const tabVoting = document.getElementById('tab-voting');
const tabAdmin = document.getElementById('tab-admin');
const votingSection = document.getElementById('voting-section');
const adminSection = document.getElementById('admin-section');
const userDisplay = document.getElementById('user-display');

if (userDisplay) userDisplay.innerText = `Експерт #${expertId}`;

const passwordModal = document.getElementById('password-modal');
const passInput = document.getElementById('admin-pass-input');
const confirmBtn = document.getElementById('modal-confirm');
const cancelBtn = document.getElementById('modal-cancel');

// --- ДІАГРАМА ---
function updateChart(votesData) {
    const canvas = document.getElementById('resultsChart');
    if (!canvas) return;
    const ChartLib = window.Chart;
    if (!ChartLib) { console.error("Chart.js не знайдено."); return; }

    const scores = {};
    desserts.forEach(city => scores[city] = 0);
    votesData.forEach(vote => {
        if (vote.ranking && Array.isArray(vote.ranking)) {
            if (vote.ranking[0]) scores[vote.ranking[0]] += 3;
            if (vote.ranking[1]) scores[vote.ranking[1]] += 2;
            if (vote.ranking[2]) scores[vote.ranking[2]] += 1;
        }
    });

    const sortedLabels = Object.keys(scores).filter(city => scores[city] > 0).sort((a, b) => scores[b] - scores[a]);
    const sortedData = sortedLabels.map(label => scores[label]);

    if (myChart) myChart.destroy();

    myChart = new ChartLib(canvas, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{ label: 'Рейтингові бали', data: sortedData, backgroundColor: '#6c5ce7', borderRadius: 8 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// --- ЕВРИСТИКИ (вкладка голосування) ---
function renderHeuristics() {
    if (!heuristicsList) return;
    heuristicsList.innerHTML = '';
    heuristics.forEach(h => {
        const isSelected = selectedHeuristics.includes(h.id);
        const div = document.createElement('div');
        div.className = `heuristic-card ${isSelected ? 'active' : ''}`;
        div.innerHTML = `<strong>${h.id}</strong><p>${h.text}</p>`;
        div.onclick = () => handleHeuristicSelect(h.id);
        heuristicsList.appendChild(div);
    });
    if (submitHeuristicsBtn) {
        const count = selectedHeuristics.length;
        submitHeuristicsBtn.disabled = count < 2 || count > 3;
        submitHeuristicsBtn.innerText = `Відправити (${count})`;
    }
}

function handleHeuristicSelect(id) {
    const index = selectedHeuristics.indexOf(id);
    if (index !== -1) {
        selectedHeuristics.splice(index, 1);
    } else {
        if (selectedHeuristics.length < 3) selectedHeuristics.push(id);
        else showToast("Можна обрати не більше 3-х", "error");
    }
    renderHeuristics();
}

// --- ТАБИ ТА ПАРОЛЬ ---
tabAdmin.onclick = () => { passwordModal.classList.remove('hidden'); passInput.value = ''; passInput.focus(); };
const closeModal = () => passwordModal.classList.add('hidden');
cancelBtn.onclick = closeModal;

const checkPassword = () => {
    if (passInput.value === "2903") {
        closeModal(); switchTab('admin'); loadAdminData();
    } else {
        passInput.style.borderColor = "#d63031";
        setTimeout(() => passInput.style.borderColor = "#eee", 1000);
    }
};
confirmBtn.onclick = checkPassword;
passInput.onkeydown = (e) => { if (e.key === 'Enter') checkPassword(); };
passwordModal.onclick = (e) => { if (e.target === passwordModal) closeModal(); };
tabVoting.onclick = () => switchTab('voting');

window.switchTab = (target) => {
    const votingSec = document.getElementById('voting-section');
    const heuristicsSec = document.getElementById('heuristics-vote-section');
    const adminSec = document.getElementById('admin-section');
    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));

    if (target === 'voting') {
        votingSec?.classList.remove('hidden');
        heuristicsSec?.classList.add('hidden');
        adminSec?.classList.add('hidden');
        document.getElementById('tab-voting')?.classList.add('active');
    } else if (target === 'heuristics') {
        votingSec?.classList.add('hidden');
        heuristicsSec?.classList.remove('hidden');
        adminSec?.classList.add('hidden');
        document.getElementById('tab-heuristics')?.classList.add('active');
        renderHeuristics();
    } else if (target === 'admin') {
        adminSec?.classList.remove('hidden');
        votingSec?.classList.add('hidden');
        heuristicsSec?.classList.add('hidden');
        document.getElementById('tab-admin')?.classList.add('active');
        // Show first admin sub-tab (lab1/2)
        showAdminTab('lab12');
    }
};

const tabHeuristics = document.getElementById('tab-heuristics');
if (tabHeuristics) tabHeuristics.onclick = () => switchTab('heuristics');

// --- ADMIN SUB-TABS ---
window.showAdminTab = function(tab) {
    const lab12El = document.getElementById('admin-lab12-section');
    const lab3El = document.getElementById('admin-lab3-section');
    const btnLab12 = document.getElementById('admin-tab-lab12');
    const btnLab3 = document.getElementById('admin-tab-lab3');

    if (tab === 'lab12') {
        lab12El?.classList.remove('hidden');
        lab3El?.classList.add('hidden');
        btnLab12?.classList.add('active');
        btnLab3?.classList.remove('active');
    } else {
        lab12El?.classList.add('hidden');
        lab3El?.classList.remove('hidden');
        btnLab12?.classList.remove('active');
        btnLab3?.classList.add('active');
        // Trigger Lab 3 render if not yet done
        const container = document.getElementById('lab3-content');
        if (container && container.dataset.loaded !== 'true') {
            renderLab3(container);
        }
    }
};

// --- ГОЛОСУВАННЯ ---
function render() {
    appDiv.innerHTML = '';
    desserts.forEach(name => {
        const rankIndex = selected.indexOf(name);
        const btn = document.createElement('button');
        btn.className = `dessert-card ${rankIndex !== -1 ? 'active' : ''}`;
        btn.innerHTML = `
            <span class="item-name">${name}</span>
            ${rankIndex !== -1 ? `<span class="rank-badge">${rankIndex + 1}</span>` : ''}
        `;
        btn.onclick = () => handleSelect(name);
        appDiv.appendChild(btn);
    });
    submitBtn.disabled = selected.length !== 3;
    submitBtn.innerText = selected.length === 3 ? "Надіслати свій топ-3" : `Оберіть ще ${3 - selected.length}`;
}

function handleSelect(name) {
    const index = selected.indexOf(name);
    if (index !== -1) selected.splice(index, 1);
    else if (selected.length < 3) selected.push(name);
    render();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✨' : '❌'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}

submitBtn.onclick = async () => {
    try {
        submitBtn.disabled = true;
        await addDoc(collection(db, "votes"), {
            expert_id: expertId,
            username: `Експерт #${expertId}`,
            ranking: selected,
            timestamp: serverTimestamp()
        });
        showToast("Дякуємо! Ваш вибір збережено.");
        selected = [];
        render();
    } catch (e) {
        console.error(e);
        showToast("Помилка", "error");
        submitBtn.disabled = false;
    }
};

window.deleteVote = async function(id) {
    if (confirm("Видалити цей результат?")) {
        try {
            await deleteDoc(doc(db, "votes", id));
            showToast("Запис видалено");
            loadAdminData();
        } catch (e) {
            showToast("Помилка видалення", "error");
        }
    }
};

// --- ДОПОМІЖНА ФУНКЦІЯ: чи підпадає об'єкт під евристику ---
function matchesHeuristic(hId, stat) {
    if (hId === 'E1') return stat.pos3 > 0;
    if (hId === 'E2') return stat.pos2 > 0;
    if (hId === 'E3') return stat.pos1 > 0;
    if (hId === 'E4') return stat.pos3 >= 2;
    if (hId === 'E5') return stat.pos3 > 0 && stat.pos2 > 0;
    if (hId === 'E6') return stat.pos1 === 0 && stat.pos2 === 0;
    if (hId === 'E7') return stat.total === 1;
    return false;
}

// Cached data for Lab 3
let _cachedVotes = null;
let _cachedTopObjects = null;

// --- LAB 3 RENDER ---
async function renderLab3(container) {
    container.innerHTML = '<p style="text-align:center;padding:20px;color:#636e72">⏳ Обчислення... (може зайняти кілька секунд)</p>';
    try {
        let votes = _cachedVotes;
        let topObjects = _cachedTopObjects;

        if (!votes) {
            const snap = await getDocs(query(collection(db, "votes"), orderBy("timestamp", "desc")));
            votes = [];
            snap.forEach(d => votes.push(d.data()));
            _cachedVotes = votes;
        }

        if (!topObjects) {
            // Recalculate top objects from heuristic filtering (same as Lab 1/2 logic)
            const snap2 = await getDocs(query(collection(db, "votes_lab2"), orderBy("timestamp", "desc")));
            const scores = {};
            const dessertStats = {};
            desserts.forEach(city => {
                scores[city] = 0;
                dessertStats[city] = { pos1: 0, pos2: 0, pos3: 0, total: 0 };
            });

            votes.forEach(data => {
                if (data.ranking && Array.isArray(data.ranking)) {
                    const r = data.ranking;
                    if (r[0]) { scores[r[0]] += 3; dessertStats[r[0]].pos1++; dessertStats[r[0]].total++; }
                    if (r[1]) { scores[r[1]] += 2; dessertStats[r[1]].pos2++; dessertStats[r[1]].total++; }
                    if (r[2]) { scores[r[2]] += 1; dessertStats[r[2]].pos3++; dessertStats[r[2]].total++; }
                }
            });

            const hCounts = {};
            heuristics.forEach(h => hCounts[h.id] = 0);
            snap2.forEach(d => {
                const data = d.data();
                if (data.chosenHeuristics) data.chosenHeuristics.forEach(id => { if (hCounts[id] !== undefined) hCounts[id]++; });
            });

            const sortedHeuristics = heuristics.map(h => ({ ...h, count: hCounts[h.id] })).sort((a, b) => b.count - a.count);
            const top3H = sortedHeuristics.slice(0, 3).map(h => h.id);

            let currentSet = [...desserts];
            top3H.forEach(hId => {
                currentSet = currentSet.filter(name => !matchesHeuristic(hId, dessertStats[name]));
            });


            // --- ГАРАНТУЄМО РІВНО 10 ОБ'ЄКТІВ (з Лаб 2) ---

            // всі об'єкти, відсортовані за балами
            const sortedByScore = desserts
                .map(n => ({ n, s: scores[n] }))
                .sort((a, b) => b.s - a.s)
                .map(x => x.n);

            // якщо після евристик >= 10 → беремо топ 10 з них
            if (currentSet.length >= 10) {
                currentSet = currentSet
                    .sort((a, b) => scores[b] - scores[a])
                    .slice(0, 10);
            } 
            else {
                // якщо менше 10 → ДОБИРАЄМО до 10
                const missing = sortedByScore.filter(x => !currentSet.includes(x));
                currentSet = [...currentSet, ...missing].slice(0, 10);
            }

            topObjects = currentSet;
            _cachedTopObjects = topObjects;
        }

        // Run analysis (CPU-intensive, runs synchronously)
        runLab3Analysis(votes, desserts, topObjects, container);
        container.dataset.loaded = 'true';
    } catch (e) {
        console.error('Lab3 error:', e);
        container.innerHTML = `<p style="color:red">Помилка при виконанні аналізу Лаб 3: ${e.message}</p>`;
    }

}

// --- АДМІНКА ---
async function loadAdminData() {
    const container = document.getElementById('lab2-analysis-container');
    const tbody = document.getElementById('admin-tbody');
    if (!container || !tbody) return;

    container.innerHTML = '<p>Обробка аналітичних даних...</p>';
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Завантаження...</td></tr>';

    // Reset Lab 3 cache to force re-render with fresh data
    _cachedVotes = null;
    _cachedTopObjects = null;
    const lab3Container = document.getElementById('lab3-content');
    if (lab3Container) lab3Container.dataset.loaded = '';

    try {
        const snap1 = await getDocs(query(collection(db, "votes"), orderBy("timestamp", "desc")));
        const snap2 = await getDocs(query(collection(db, "votes_lab2"), orderBy("timestamp", "desc")));

        const scores = {};
        const dessertStats = {};
        desserts.forEach(city => {
            scores[city] = 0;
            dessertStats[city] = { pos1: 0, pos2: 0, pos3: 0, total: 0 };
        });

        const hCounts = {};
        heuristics.forEach(h => hCounts[h.id] = 0);

        // 2. Обробка голосів Лаб 1
        const allVotes = [];
        tbody.innerHTML = '';
        snap1.forEach(docSnap => {
            const data = docSnap.data();
            allVotes.push(data);

            const date = data.timestamp ? data.timestamp.toDate().toLocaleString('uk-UA') : 'Щойно';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>ID: ${data.expert_id}</td>
                <td>${data.ranking.join(', ')}</td>
                <td>${date}</td>
                <td><button onclick="deleteVote('${docSnap.id}')">🗑️</button></td>
            `;
            tbody.appendChild(tr);

            if (data.ranking && Array.isArray(data.ranking)) {
                const r = data.ranking;
                if (r[0]) { scores[r[0]] += 3; dessertStats[r[0]].pos1++; dessertStats[r[0]].total++; }
                if (r[1]) { scores[r[1]] += 2; dessertStats[r[1]].pos2++; dessertStats[r[1]].total++; }
                if (r[2]) { scores[r[2]] += 1; dessertStats[r[2]].pos3++; dessertStats[r[2]].total++; }
            }
        });

        // 3. Протокол евристик
        let lab2Html = '<h3>Протокол вибору евристик (Лабораторна №2)</h3><table class="results-table"><thead><tr><th>Експерт</th><th>Обрані евристики</th></tr></thead><tbody>';
        snap2.forEach(d => {
            const data = d.data();
            lab2Html += `<tr><td>${data.expert_id}</td><td>${data.chosenHeuristics.join(', ')}</td></tr>`;
            data.chosenHeuristics.forEach(id => { if (hCounts[id] !== undefined) hCounts[id]++; });
        });
        lab2Html += '</tbody></table>';

        // 4. Рейтинг евристик за популярністю
        let heuristicsPopHtml = '<h3>Рейтинг евристик за популярністю</h3><table class="results-table"><thead><tr><th>ID</th><th>Зміст</th><th>Голоси</th></tr></thead><tbody>';
        const sortedHeuristics = heuristics.map(h => ({ ...h, count: hCounts[h.id] })).sort((a, b) => b.count - a.count);
        sortedHeuristics.forEach(h => {
            heuristicsPopHtml += `<tr><td><b>${h.id}</b></td><td>${h.text}</td><td>${h.count}</td></tr>`;
        });
        heuristicsPopHtml += '</tbody></table>';

        // 4.1. Матриця переваг ТОП-10
        const top10ForMatrix = desserts.map(name => ({ name, score: scores[name] })).sort((a, b) => b.score - a.score).slice(0, 10);
        const matrixNames = top10ForMatrix.map(item => item.name);

        let matrixHtml = '<h3>Матриця суміжних переваг (ТОП-10 смаків)</h3><div style="overflow-x: auto;"><table class="results-table" style="text-align: center;"><thead><tr><th>Смак / №</th>';
        matrixNames.forEach((_, i) => matrixHtml += `<th style="text-align: center;">${i + 1}</th>`);
        matrixHtml += '</tr></thead><tbody>';

        matrixNames.forEach((nameA, i) => {
            matrixHtml += `<tr><td style="text-align: left; white-space: nowrap;"><b>${i + 1}. ${nameA}</b></td>`;
            matrixNames.forEach((nameB, j) => {
                if (i === j) {
                    matrixHtml += '<td style="background: #f1f2f6; color: #ccc;">-</td>';
                } else {
                    let count = 0;
                    allVotes.forEach(vote => {
                        const posA = vote.ranking.indexOf(nameA);
                        const posB = vote.ranking.indexOf(nameB);
                        if (posA !== -1 && (posB === -1 || posA < posB)) count++;
                    });
                    const cellStyle = count >= 3 ? 'style="font-weight: bold; color: #6c5ce7; background: #f9f9ff;"' : '';
                    matrixHtml += `<td ${cellStyle}>${count}</td>`;
                }
            });
            matrixHtml += '</tr>';
        });
        matrixHtml += '</tbody></table></div>';

        // 5. Таблиці по кожній евристиці — показуємо тих, хто ЗАЛИШИВСЯ після відсіву
        const top3H = sortedHeuristics.slice(0, 3).map(h => h.id);

        let heuristicsResultsHtml = '<h3>Результати по кожній евристиці</h3>' +
            '<p style="font-size:0.9rem; color:#555; margin-bottom:16px;">' +
            'Кожна евристика <b>виключає</b> об\'єкти, що підпадають під її умову. ' +
            'Таблиця показує тих, хто <b>залишився</b> після відсіву, відсортованих за балом.</p>';

        heuristics.forEach(h => {
            const survived = desserts
                .filter(name => !matchesHeuristic(h.id, dessertStats[name]))
                .map(name => ({
                    name,
                    score: scores[name],
                    stats: dessertStats[name]
                }))
                .sort((a, b) => b.score - a.score);

            const excluded = desserts.length - survived.length;

            heuristicsResultsHtml += `
                <h4>${h.id}: ${h.text}</h4>
                <p style="font-size:0.85rem; color:#666; margin: -8px 0 8px;">
                    Відсіяно: <b style="color:#d63031;">${excluded}</b> &nbsp;|&nbsp;
                    Залишилось: <b style="color:#00b894;">${survived.length}</b> з ${desserts.length}
                </p>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Об'єкт</th>
                            <th>Бал</th>
                            <th>1-е</th>
                            <th>2-е</th>
                            <th>3-є</th>
                            <th>Згадок</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (survived.length === 0) {
                heuristicsResultsHtml += `
                    <tr>
                        <td colspan="7" style="text-align:center; color:#999; font-style:italic;">
                            Всі об'єкти відсіяні цією евристикою
                        </td>
                    </tr>`;
            } else {
                survived.forEach((item, i) => {
                    heuristicsResultsHtml += `
                        <tr>
                            <td>${i + 1}</td>
                            <td><b>${item.name}</b></td>
                            <td>${item.score}</td>
                            <td>${item.stats.pos1}</td>
                            <td>${item.stats.pos2}</td>
                            <td>${item.stats.pos3}</td>
                            <td>${item.stats.total}</td>
                        </tr>
                    `;
                });
            }

            heuristicsResultsHtml += '</tbody></table>';
        });

        // 5.1. Підмножина переможців — послідовне застосування ТОП-3 евристик
        let currentSet = [...desserts];
        let winnersHtml = `<h3>Підмножина переможців (послідовний відсів ТОП-3 евристик)</h3>
            <p style="font-size:0.85rem; color:#555; margin-bottom:12px;">
                Евристики застосовуються одна за одною: <b>${top3H.join(' → ')}</b>
            </p>`;

        top3H.forEach((hId, step) => {
            const hText = heuristics.find(h => h.id === hId)?.text || '';
            const before = currentSet.length;
            currentSet = currentSet.filter(name => !matchesHeuristic(hId, dessertStats[name]));
            const after = currentSet.length;

            winnersHtml += `
                <p style="font-size:0.85rem; color:#636e72; margin: 8px 0 4px;">
                    <b>Крок ${step + 1} — ${hId}:</b> ${hText}<br>
                    Було: ${before} → Залишилось: <b>${after}</b> (відсіяно: ${before - after})
                </p>`;
        });

        const winners = currentSet
            .map(name => ({ name, score: scores[name] }))
            .sort((a, b) => b.score - a.score);

        winnersHtml += `
            <table class="results-table">
                <thead><tr><th>№</th><th>Об'єкт</th><th>Бал</th></tr></thead>
                <tbody>
        `;
        if (winners.length === 0) {
            winnersHtml += `<tr><td colspan="3" style="text-align:center; color:#999;">Всі об'єкти відсіяні</td></tr>`;
        } else {
            winners.forEach((w, i) => {
                winnersHtml += `<tr><td>${i + 1}</td><td><b>${w.name}</b></td><td>${w.score}</td></tr>`;
            });
        }
        winnersHtml += '</tbody></table>';

        // 6. Мурашиний алгоритм (ACO)
        const top10 = desserts
            .map(name => ({ name, score: scores[name] }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(item => item.name);

        const randomPerms = generateRandomPermutations(top10, 20);

        let acoHtml = '<h3>Мурашиний алгоритм (ACO)</h3>';

        acoHtml += '<h4>20 випадкових перестановок ТОП-10 об\'єктів</h4>';
        acoHtml += '<div style="overflow-x:auto"><table class="results-table"><thead><tr><th>#</th>';
        top10.forEach((_, i) => acoHtml += `<th>Поз. ${i+1}</th>`);
        acoHtml += '</tr></thead><tbody>';
        randomPerms.forEach((perm, i) => {
            acoHtml += `<tr><td><b>${i+1}</b></td>${perm.map(name => `<td>${name}</td>`).join('')}</tr>`;
        });
        acoHtml += '</tbody></table></div>';

        const acoCook = new AntRanking(top10, randomPerms, 'cook');
        const resultCook = acoCook.solve();

        acoHtml += '<h4>Оптимальна перестановка за відстанню Кука</h4>';
        acoHtml += `<p style="font-size:0.85rem; color:#555;">Сума відстаней Кендалла до всіх 20 перестановок: <b>${resultCook.distance}</b></p>`;
        acoHtml += '<table class="results-table"><thead><tr><th>Місце</th><th>Об\'єкт</th></tr></thead><tbody>';
        resultCook.best.forEach((name, i) => {
            acoHtml += `<tr><td><b>#${i+1}</b></td><td>${name}</td></tr>`;
        });
        acoHtml += '</tbody></table>';
        acoHtml += '<h4>Графік збіжності (відстань Кука)</h4>';
        acoHtml += '<div style="height:260px; margin-bottom:24px;"><canvas id="acoChartCook"></canvas></div>';

        const acoMinimax = new AntRanking(top10, randomPerms, 'minimax');
        const resultMinimax = acoMinimax.solve();

        acoHtml += '<h4>Оптимальна перестановка за відстанню мінімакс</h4>';
        acoHtml += `<p style="font-size:0.85rem; color:#555;">Максимальна відстань Кендалла серед усіх 20 перестановок: <b>${resultMinimax.distance}</b></p>`;
        acoHtml += '<table class="results-table"><thead><tr><th>Місце</th><th>Об\'єкт</th></tr></thead><tbody>';
        resultMinimax.best.forEach((name, i) => {
            acoHtml += `<tr><td><b>#${i+1}</b></td><td>${name}</td></tr>`;
        });
        acoHtml += '</tbody></table>';
        acoHtml += '<h4>Графік збіжності (мінімакс)</h4>';
        acoHtml += '<div style="height:260px; margin-bottom:40px;"><canvas id="acoChartMinimax"></canvas></div>';

        setTimeout(() => {
        const ctxCook = document.getElementById('acoChartCook')?.getContext('2d');
        if (ctxCook) {
            new Chart(ctxCook, {
                type: 'line',
                data: {
                    labels: resultCook.history.map((_, i) => i + 1),
                    datasets: [{
                        label: 'Відстань Кука',
                        data: resultCook.history,
                        borderColor: '#6c5ce7',
                        backgroundColor: 'rgba(108,92,231,0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }

        const ctxMinimax = document.getElementById('acoChartMinimax')?.getContext('2d');
        if (ctxMinimax) {
            new Chart(ctxMinimax, {
                type: 'line',
                data: {
                    labels: resultMinimax.history.map((_, i) => i + 1),
                    datasets: [{
                        label: 'Мінімакс відстань',
                        data: resultMinimax.history,
                        borderColor: '#e17055',
                        backgroundColor: 'rgba(225,112,85,0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
        }, 300);

        container.innerHTML =
            lab2Html +
            heuristicsPopHtml +
            heuristicsResultsHtml +
            winnersHtml +
            matrixHtml +
            acoHtml;

        updateChart(allVotes);

    } catch (e) {
        console.error("Помилка аналітики: ", e);
        container.innerHTML = '<p style="color:red">Помилка аналізу.</p>';
    }
}

// --- ВІДПРАВКА ЕВРИСТИК (ЛАБ 2) ---
if (submitHeuristicsBtn) {
    submitHeuristicsBtn.onclick = async () => {
        try {
            submitHeuristicsBtn.disabled = true;
            submitHeuristicsBtn.innerText = "Відправка...";

            await addDoc(collection(db, "votes_lab2"), {
                expert_id: expertId,
                username: `Експерт #${expertId}`,
                chosenHeuristics: selectedHeuristics,
                timestamp: serverTimestamp()
            });

            showToast("Евристики для Лаб 2 успішно збережено!");
            selectedHeuristics = [];

            setTimeout(() => {
                switchTab('voting');
                renderHeuristics();
            }, 1000);

        } catch (e) {
            console.error("Error saving heuristics: ", e);
            showToast("Помилка при відправці", "error");
            submitHeuristicsBtn.disabled = false;
            submitHeuristicsBtn.innerText = `Відправити (${selectedHeuristics.length})`;
        }
    };
}

render();