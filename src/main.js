import { db, collection, addDoc, serverTimestamp } from './firebase.js';
import { getDocs, query, orderBy } from "firebase/firestore"; 
import './style.css';

// 1. КОНСТАНТИ ТА СТАН
const desserts = [
  "Шоколадний трюфель", "Полуниця-вершки", "Фісташка-малина",
  "Банан-карамель", "Снікерс", "Карамель-сіль",
  "Чорниця-йогурт", "Лимонний курд", "Шоколад-вишня",
  "Шоколад в шоколаді", "Рафаелло", "Орео",
  "Манго-маракуя", "Медовик", "Ванільно-ягідний",
  "Червоний оксамит", "Манго-кокос", "Малина-ваніль",
  "Фісташка-полуниця", "Кавовий"
];

const expertId = localStorage.getItem("expert_id") || Math.floor(1000 + Math.random() * 9000).toString();
localStorage.setItem("expert_id", expertId);

let selected = []; 

// DOM Елементи
const appDiv = document.querySelector('#app');
const submitBtn = document.querySelector('#submit-btn');
const tabVoting = document.getElementById('tab-voting');
const tabAdmin = document.getElementById('tab-admin');
const votingSection = document.getElementById('voting-section');
const adminSection = document.getElementById('admin-section');
const userDisplay = document.getElementById('user-display');

userDisplay.innerText = `Експерт #${expertId}`;


const passwordModal = document.getElementById('password-modal');
const passInput = document.getElementById('admin-pass-input');
const confirmBtn = document.getElementById('modal-confirm');
const cancelBtn = document.getElementById('modal-cancel');

tabAdmin.onclick = () => {
  switchTab('admin');
  loadAdminData();
};

// 2. ЛОГІКА ТАБІВ (ПЕРЕМИКАННЯ)
tabVoting.onclick = () => {
    switchTab('voting');
};


function switchTab(target) {
    if (target === 'voting') {
        tabVoting.classList.add('active');
        tabAdmin.classList.remove('active');
        votingSection.classList.remove('hidden');
        adminSection.classList.add('hidden');
    } else {
        tabAdmin.classList.add('active');
        tabVoting.classList.remove('active');
        adminSection.classList.remove('hidden');
        votingSection.classList.add('hidden');
    }
}

// 3. ФУНКЦІЇ ГОЛОСУВАННЯ
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
  submitBtn.innerText = selected.length === 3 ? "🚀 Надіслати свій топ-3" : `Оберіть ще ${3 - selected.length}`;
}

function handleSelect(name) {
  const index = selected.indexOf(name);
  if (index !== -1) {
    selected.splice(index, 1); 
  } else if (selected.length < 3) {
    selected.push(name); 
  }
  render();
}

// Функція для відображення повідомлень
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✨' : '❌'}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);

  // Видалення через 3 секунди
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Оновлений обробник кнопки
submitBtn.onclick = async () => {
  try {
    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Зберігання...";

    await addDoc(collection(db, "votes"), {
      expert_id: expertId,
      username: `Експерт #${expertId}`,
      ranking: selected,
      timestamp: serverTimestamp(),
      action: `Проголосував: 1-${selected[0]}, 2-${selected[1]}, 3-${selected[2]}`
    });

    // Замість alert використовуємо нашу нову функцію
    showToast("Дякуємо! Ваш вибір успішно збережено.");
    
    selected = [];
    render();
  } catch (e) {
    console.error(e);
    showToast("Сталася помилка при відправці", "error");
    submitBtn.disabled = false;
  }
};
// 4. ЛОГІКА АДМІНКИ (ПРОТОКОЛ)
async function loadAdminData() {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Завантаження протоколу...</td></tr>';

    try {
        const q = query(collection(db, "votes"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        tbody.innerHTML = ''; 

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Голосів ще немає</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Форматування дати
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString('uk-UA') : 'Щойно';
            
            const tr = document.createElement('tr');
            tr.className = 'table-row';
            tr.innerHTML = `
                <td><span class="admin-id-badge">ID: ${data.expert_id}</span></td>
                <td>
                    <div class="admin-choices">
                        <span class="choice-item">🥇 ${data.ranking[0]}</span>
                        <span class="choice-item">🥈 ${data.ranking[1]}</span>
                        <span class="choice-item">🥉 ${data.ranking[2]}</span>
                    </div>
                </td>
                <td class="time-cell">${date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Firebase Error: ", e);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center">Помилка доступу до бази даних</td></tr>';
    }
}




// --- ЕВРИСТИЧНЕ СКОРОЧЕННЯ СПИСКУ (E1-E8) ---
function applyHeuristics(votes, allDesserts) {
  let currentDesserts = [...allDesserts];
  const TARGET_COUNT = 12;

  const getStats = (list) => {
      const stats = {};
      list.forEach(d => stats[d] = { p1: 0, p2: 0, p3: 0, totalVotes: 0 });
      
      votes.forEach(vote => {
          vote.forEach((name, index) => {
              if (stats[name]) {
                  if (index === 0) stats[name].p1++;
                  if (index === 1) stats[name].p2++;
                  if (index === 2) stats[name].p3++;
                  stats[name].totalVotes++;
              }
          });
      });
      return stats;
  };

  const heuristics = [
      { id: "E1", check: (s) => s.totalVotes === 1 && s.p3 === 1 },
      { id: "E2", check: (s) => s.totalVotes === 1 && s.p2 === 1 },
      { id: "E3", check: (s) => s.totalVotes === 1 && s.p1 === 1 },
      { id: "E4", check: (s) => s.totalVotes === 2 && s.p3 === 2 },
      { id: "E5", check: (s) => s.totalVotes === 2 && s.p3 === 1 && s.p2 === 1 },
      { id: "E6", check: (s) => s.totalVotes === 2 && s.p2 === 2 },
      { id: "E7", check: (s) => s.totalVotes === 3 && s.p3 === 2 && s.p2 === 1 },
      { id: "E8", check: (s) => s.totalVotes === 3 && s.p3 === 3 } 
  ];

  for (let rule of heuristics) {
      if (currentDesserts.length <= TARGET_COUNT) break;

      const stats = getStats(currentDesserts);
      const candidatesToRemove = currentDesserts.filter(d => rule.check(stats[d]));
      
      if (candidatesToRemove.length > 0) {
          const canRemoveCount = currentDesserts.length - TARGET_COUNT;
          const actualToRemove = candidatesToRemove.slice(0, canRemoveCount);
          currentDesserts = currentDesserts.filter(d => !actualToRemove.includes(d));
          console.log(`Правило ${rule.id} видалило об'єктів: ${actualToRemove.length}`);
      }
  }

  // ЯКЩО ВСЕ ОДНО > 12: Додаємо "Запобіжник" за сумарним рейтингом (найменша кількість 1-х місць)
  /*if (currentDesserts.length > TARGET_COUNT) {
      console.warn("Евристики E1-E8 не дали 12 елементів. Застосовуємо фінальне відсікання за кількістю 1-х місць.");
      const stats = getStats(currentDesserts);
      currentDesserts.sort((a, b) => stats[a].p1 - stats[b].p1); 
      
      const toRemoveCount = currentDesserts.length - TARGET_COUNT;
      currentDesserts.splice(0, toRemoveCount);
  }*/

  return currentDesserts;
}

// ===============================
// ГЕНЕТИЧНИЙ АЛГОРИТМ
// ===============================

function geneticRanking(votes, availableDesserts){

  const populationSize = 60;
  const generations = 150;
  const mutationRate = 0.1;

  const history = [];

  function randomChromosome(){

    const shuffled = [...availableDesserts].sort(()=>Math.random()-0.5);

    return shuffled.slice(0,3);

  }

  function fitness(chromosome){

    let score = 0;

    votes.forEach(vote=>{

      vote.forEach((dessert,index)=>{

        const pos = chromosome.indexOf(dessert);

        if(pos !== -1){

          score += 3 - Math.abs(index - pos);

        }

      });

    });

    return score;
  }

  function crossover(parent1,parent2){

    const child = [];

    parent1.forEach(d=>{
      if(!child.includes(d) && child.length<3)
        child.push(d);
    });

    parent2.forEach(d=>{
      if(!child.includes(d) && child.length<3)
        child.push(d);
    });

    return child.slice(0,3);
  }

  function mutate(chromosome){

    if(Math.random() < mutationRate){

      const randomDessert =
      availableDesserts[Math.floor(Math.random()*availableDesserts.length)];

      chromosome[Math.floor(Math.random()*3)] = randomDessert;

    }

    return [...new Set(chromosome)].slice(0,3);
  }

  let population = Array.from(
    {length: populationSize},
    randomChromosome
  );

  for(let g=0; g<generations; g++){

    population.sort((a,b)=>fitness(b)-fitness(a));

    const bestFitness = fitness(population[0]);

    history.push(bestFitness);

    const newPopulation = population.slice(0,10);

    while(newPopulation.length < populationSize){

      const p1 = population[Math.floor(Math.random()*20)];
      const p2 = population[Math.floor(Math.random()*20)];

      let child = crossover(p1,p2);

      child = mutate(child);

      newPopulation.push(child);

    }

    population = newPopulation;

  }

  population.sort((a,b)=>fitness(b)-fitness(a));

  return {
    best: population[0],
    history: history
  };
}


function drawChart(history){

  const ctx = document
  .getElementById("fitnessChart")
  .getContext("2d");

  new Chart(ctx,{

    type:"line",

    data:{
      labels: history.map((_,i)=>i+1),

      datasets:[{
        label:"Fitness еволюції",

        data:history,

        borderColor:"rgb(255,105,180)",

        fill:false,

        tension:0.1
      }]
    },

    options:{
      responsive:true,

      plugins:{
        legend:{display:true}
      },

      scales:{
        x:{
          title:{
            display:true,
            text:"Покоління"
          }
        },

        y:{
          title:{
            display:true,
            text:"Fitness"
          }
        }
      }
    }

  });

}


// Оновлена функція для кнопки розрахунку
async function calculateOptimalRanking() {
  const resultDiv = document.getElementById("ga-result");
  resultDiv.innerHTML = "⏳ Отримання даних з бази та фільтрація...";

  const q = query(collection(db, "votes"));
  const snapshot = await getDocs(q);
  const votes = [];
  snapshot.forEach(doc => votes.push(doc.data().ranking));

  if (votes.length === 0) {
      resultDiv.innerHTML = "Помилка: Немає голосів для аналізу";
      return;
  }

  // 1. Скорочення списку за евристиками
  const reducedList = applyHeuristics(votes, desserts);

  // 2. Вивід результатів скорочення
  let reducedHtml = `
      <div class="heuristic-log" style="background: #f0fdf4; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin-top:0">✅ Список скорочено (Евристики E1-E8)</h4>
          <p>Залишилось смаків: <b>${reducedList.length}</b></p>
          <ul style="column-count: 2; font-size: 0.9em; padding-left: 20px;">
              ${reducedList.map(d => `<li>${d}</li>`).join('')}
          </ul>
      </div>
  `;
  resultDiv.innerHTML = reducedHtml;

  // 3. Запуск ГА на залишку
  const result = geneticRanking(votes, reducedList);
  const best = result.best;

  resultDiv.innerHTML += `
      <div class="ga-output">
          <h3>🧬 Результат генетичного алгоритму</h3>
          <div class="ga-ranking" style="background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="font-size: 1.1em; margin-bottom: 5px;">🥇 <b>${best[0]}</b></div>
              <div style="font-size: 1.1em; margin-bottom: 5px;">🥈 <b>${best[1]}</b></div>
              <div style="font-size: 1.1em;">🥉 <b>${best[2]}</b></div>
          </div>
      </div>
  `;

  drawChart(result.history);
}

// Прив'язка до кнопки
document.getElementById("calc-ranking").onclick = calculateOptimalRanking;

// Початковий запуск
render();