// sr1_html.js — HTML-шаблони для Самостійної Роботи №1
export function getSR1Html(lab2Cities) {
  const n = lab2Cities.length;
  const cityList = lab2Cities.map((c, i) => `${i + 1}. ${c}`).join(', ');
  return `
<div class="sr1-container">
  <div class="sr1-header">
    <h1>САМОСТІЙНА РОБОТА №1</h1>
  </div>

    <!-- Завд 2: Допомога -->
  <div class="sr1-card">
    <h3>Підсистема допомоги</h3>
    <div class="sr1-help-grid">
      <div class="sr1-help-item" data-help="domain">Налаштування</div>
      <div class="sr1-help-item" data-help="brute">Перебір</div>
      <div class="sr1-help-item" data-help="charts">Графіки</div>
      <div class="sr1-help-item" data-help="edit">Редагування</div>
      <div class="sr1-help-item" data-help="export">Експорт</div>
      <div class="sr1-help-item" data-help="compare">Порівняння</div>
    </div>
    <div id="sr1-help-text" class="sr1-help-text" style="display:none"></div>
  </div>

  <!-- Завд 1: Налаштування -->
  <div class="sr1-card">
    <h3>Налаштування предметної області</h3>
    <p><b>Об'єкти (${n}):</b> ${cityList}</p>
    <p><b>Експертів:</b> 15 <br><b>Множинне порівняння:</b> ТОП-3</p>
    <div class="sr1-btn-row">
      <button id="sr1-import-data" class="sr1-btn">Імпорт даних</button>
      <button id="sr1-export-data" class="sr1-btn">Архівувати дані</button>
    </div>
    <input type="file" id="sr1-file-input" accept=".json" style="display:none">
  </div>

  <!-- Завд 3: Протоколювання -->
  <div class="sr1-card">
    <h3>Протокол дій</h3>
    <div id="sr1-log" class="sr1-log"></div>
    <button id="sr1-download-log" class="sr1-btn">Завантажити протокол</button>
  </div>

  <!-- Завд 10: Редагування ранжувань -->
  <div class="sr1-card">
    <h3>Зміна індивідуальних ранжувань</h3>
    <div class="table-box">
      <div class="table-scroll">
        <table class="sr1-table" id="sr1-edit-table">
          <thead><tr><th>Експерт</th><th>1-е місце</th><th>2-е місце</th><th>3-є місце</th></tr></thead>
          <tbody id="sr1-edit-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Завд 4,7: Розподілений перебір з контролем (10!) -->
  <div class="sr1-card">
    <h3>Розподілений перебір з управлінням обчисленнями (10!)</h3>
    <div class="sr1-controls">
      <button id="sr1-start" class="sr1-btn sr1-btn-accent">Старт</button>
      <button id="sr1-pause" class="sr1-btn" disabled>Пауза</button>
      <button id="sr1-resume" class="sr1-btn" disabled>Продовжити</button>
      <button id="sr1-reset" class="sr1-btn" disabled>Скинути</button>
    </div>
    <div id="sr1-progress-wrap" class="sr1-progress-wrap" style="display:none">
      <div class="sr1-progress-bar"><div id="sr1-progress-fill" class="sr1-progress-fill"></div></div>
      <div id="sr1-progress-text" class="sr1-progress-text">0%</div>
      <div id="sr1-progress-stats" class="sr1-progress-stats"></div>
    </div>
    <div id="sr1-brute-results" style="display:none"></div>
  </div>

  <!-- Завд 8: Графіки -->
  <div class="sr1-card">
    <h3>Графічна ілюстрація результатів</h3>
      <div class="sr1-chart-box">
        <h4>Задоволеність експертів</h4>
        <div style="position:relative;height:300px;width:100%"><canvas id="sr1-chart-satisfaction"></canvas></div>
      </div>
    <div class="sr1-chart-box" style="margin-top:20px">
      <h4>Медіана Кемені vs Експерти</h4>
      <div style="position:relative;height:280px;width:100%"><canvas id="sr1-chart-median"></canvas></div>
    </div>
  </div>

  <!-- Завд 11: Порівняння до/після -->
  <div class="sr1-card">
    <h3>Ілюстрація зміни результатів</h3>
    <div id="sr1-comparison" class="sr1-comparison">
      <div class="sr1-compare-col" id="sr1-before">
        <h4>До зміни</h4>
        <div id="sr1-before-data"></div>
      </div>
      <div class="sr1-compare-arrow">→</div>
      <div class="sr1-compare-col" id="sr1-after">
        <h4>Після зміни</h4>
        <div id="sr1-after-data"></div>
      </div>
    </div>
    <div id="sr1-delta-table"></div>
  </div>

  <!-- Завд 6,9: Збереження результатів -->
  <div class="sr1-card">
    <h3>Збереження та виведення результатів</h3>
    <div class="sr1-btn-row">
      <button id="sr1-save-txt" class="sr1-btn">Зберегти TXT</button>
      <button id="sr1-save-json" class="sr1-btn">Зберегти JSON</button>
      <button id="sr1-load-results" class="sr1-btn">Завантажити результати</button>
    </div>
    <input type="file" id="sr1-load-input" accept=".json" style="display:none">
    <div id="sr1-saved-status"></div>
  </div>
</div>`;
}

export const HELP_TEXTS = {
  domain: '<b>Налаштування предметної області:</b> Система працює з 10 містами Київської області. Ви можете імпортувати/експортувати дані через JSON-файл для повторного використання.',
  brute: '<b>Розподілений перебір:</b> Алгоритм перебирає всі 10!=3628800 перестановок, розбиваючи їх на 10 груп по першому елементу. Підтримує паузу та відновлення.',
  charts: '<b>Графіки:</b> Система будує діаграми порівняння експертних ранжувань, задоволеності кожного експерта, та медіани Кемені відносно вхідних даних.',
  edit: '<b>Редагування:</b> Натисніть на число в таблиці ранжувань для зміни. Система автоматично перерахує результат та покаже вплив зміни.',
  export: '<b>Експорт:</b> Результати зберігаються у форматах TXT (для друку) та JSON (для повторного використання). Дані також кешуються в localStorage.',
  compare: '<b>Порівняння:</b> Після зміни ранжування система показує паралельне порівняння результатів "до" і "після", включаючи дельти відстаней.'
};
