// sr2_html.js — HTML-шаблони для Самостійної Роботи №2
export function getSR2Html() {
  return `
<div class="sr2-container">
  <div class="sr2-header">
    <h1>САМОСТІЙНА РОБОТА №2</h1>
  </div>

  <!-- 1. Схема декомпозиції -->
  <div class="sr2-card">
    <h3>Схема декомпозиції для евристичних методів</h3>
    <div id="sr2-decomp-scheme"></div>
  </div>

  <!-- 2. Дослідження повного перебору -->
  <div class="sr2-card">
    <h3>Дослідження повного перебору (8-12 об'єктів, 10-50 експертів)</h3>
    <div class="sr2-btn-row">
      <button id="sr2-run-experiments" class="sr2-btn" style="background:#00b894;color:#fff;border-color:#00b894">Запустити експерименти</button>
      <select id="sr2-max-n" class="sr1-rank-select" style="padding:10px;font-size:1rem">
        <option value="7" selected>До n=7</option>
        <option value="8">До n=8</option>
        <option value="9">До n=9</option>
        <option value="10">До n=10</option>
        <option value="11">До n=11 (довго)</option>
        <option value="12">До n=12 (дуже довго!)</option>
      </select>
    </div>
    <div id="sr2-progress" style="display:none;margin-top:15px">
      <div class="sr1-progress-bar"><div id="sr2-progress-fill" class="sr1-progress-fill"></div></div>
      <div id="sr2-progress-text" class="sr1-progress-text">Підготовка...</div>
    </div>
    <div id="sr2-results-table" style="margin-top:20px"></div>
  </div>

  <!-- 3. Матриця попарних порівнянь медіан -->
  <div class="sr2-card">
    <h3>Матриця попарних порівнянь медіан</h3>
    <div id="sr2-median-matrix"></div>
  </div>

  <!-- 4. Графіки залежності часу -->
  <div class="sr2-card">
    <h3>Графіки залежності часу перебору</h3>
    <div class="sr1-charts-grid">
      <div class="sr2-chart-box"><h4>Час vs Кількість об'єктів</h4><div style="position:relative;height:300px;width:100%"><canvas id="sr2-chart-objects"></canvas></div></div>
      <div class="sr2-chart-box"><h4>Час vs Кількість експертів</h4><div style="position:relative;height:300px;width:100%"><canvas id="sr2-chart-experts"></canvas></div></div>
    </div>
  </div>

  <!-- 5. Порівняльна таблиця перебір vs евристика -->
  <div class="sr2-card">
    <h3>Порівняння: повний перебір vs ACO</h3>
    <div id="sr2-comparison-table"></div>
  </div>


  <!-- 7. Критерії зупинки -->
  <div class="sr2-card">
    <h3>Критерії зупинки алгоритмів</h3>
    <div id="sr2-stop-criteria"></div>
  </div>

  <!-- 8. Графіки збіжності -->
  <div class="sr2-card">
    <h3>Графіки збіжності ACO</h3>
    <div class="sr2-btn-row">
      <button id="sr2-run-convergence" class="sr2-btn" style="background:#00b894;color:#fff;border-color:#00b894">Побудувати графіки збіжності</button>
    </div>
    <div id="sr2-convergence-charts" style="margin-top:20px"></div>
  </div>

  <!-- 9. Великомасштабні (100-500) -->
  <div class="sr2-card">
    <h3>Розподілені евристики для великих n (100-500)</h3>
    <div class="sr2-btn-row">
      <button id="sr2-run-large" class="sr2-btn" style="background:#00b894;color:#fff;border-color:#00b894">Запустити великомасштабні тести</button>
    </div>
    <div id="sr2-large-results" style="margin-top:20px"></div>
  </div>

  <!-- 10. Ефективність розподілених обчислень -->
  <div class="sr2-card">
    <h3>Ефективність розподілених обчислень</h3>
    <div class="sr2-btn-row">
      <button id="sr2-calc-efficiency" class="sr2-btn" style="background:#00b894;color:#fff;border-color:#00b894">Розрахувати ефективність</button>
    </div>
    <div id="sr2-efficiency" style="margin-top:20px"></div>
  </div>
</div>`;
}
