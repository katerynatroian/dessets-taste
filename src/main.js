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

// Відкриваємо модалку замість prompt
tabAdmin.onclick = () => {
    passwordModal.classList.remove('hidden');
    passInput.value = ''; // Очищуємо поле
    passInput.focus();
};

// Функція закриття
const closeModal = () => {
    passwordModal.classList.add('hidden');
};

cancelBtn.onclick = closeModal;

// Перевірка пароля
const checkPassword = () => {
    if (passInput.value === "2903") {
        closeModal();
        switchTab('admin');
        loadAdminData();
    } else {
        passInput.style.borderColor = "#d63031";
        setTimeout(() => passInput.style.borderColor = "#eee", 1000);
    }
};

confirmBtn.onclick = checkPassword;

// Додаємо вхід по натисканню Enter
passInput.onkeydown = (e) => {
    if (e.key === 'Enter') checkPassword();
};

// Закриття при кліку на фон
passwordModal.onclick = (e) => {
    if (e.target === passwordModal) closeModal();
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

// Початковий запуск
render();