/**
 * Noted by Rurin Binar febrianti
 * BudgetViz — script.js
 * Expense & Budget Visualizer
 * Vanilla JS · Chart.js · localStorage
 *
 * Features:
 *  MVP  : Add expense (form + validation), transaction list, delete,
 *         total spending (IDR), doughnut chart, localStorage persistence
 *  OPT-1: Monthly summary table
 *  OPT-2: Transaction sorting (date / amount / category)
 *  OPT-3: Dark / light mode toggle (persisted)
 *  EXTRA: Budget limit with over-limit highlight + warning
 */

'use strict';

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */

const LS_KEY_TX      = 'budgetviz_transactions';
const LS_KEY_THEME   = 'budgetviz_theme';
const LS_KEY_BUDGET  = 'budgetviz_budget';
const LS_KEY_SORT    = 'budgetviz_sort';

const CATEGORIES = {
  Food:      { emoji: '🍜', color: '#e07b39' },
  Transport: { emoji: '🚌', color: '#24497a' },
  Fun:       { emoji: '🎮', color: '#c9a84c' },
};

// App state — single source of truth
const state = {
  transactions: [],   // [{ id, name, amount, category, date }]
  budget:       0,    // monthly budget limit in IDR
  sort:         'date', // 'date' | 'amount-desc' | 'amount-asc' | 'category'
  chart:        null, // Chart.js instance
};

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/** Format number as Indonesian Rupiah */
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Generate a simple unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Return YYYY-MM string for a date string */
function toMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Format YYYY-MM as "January 2026" */
function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/* ============================================================
   LOCAL STORAGE
   ============================================================ */

function saveTransactions() {
  localStorage.setItem(LS_KEY_TX, JSON.stringify(state.transactions));
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(LS_KEY_TX);
    state.transactions = raw ? JSON.parse(raw) : [];
  } catch {
    state.transactions = [];
  }
}

function saveBudget() {
  localStorage.setItem(LS_KEY_BUDGET, String(state.budget));
}

function loadBudget() {
  const raw = localStorage.getItem(LS_KEY_BUDGET);
  state.budget = raw ? Number(raw) : 0;
}

function saveSort() {
  localStorage.setItem(LS_KEY_SORT, state.sort);
}

function loadSort() {
  state.sort = localStorage.getItem(LS_KEY_SORT) || 'date';
}

/* ============================================================
   THEME (Dark / Light)
   ============================================================ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  // Update chart colors if it exists
  if (state.chart) updateChartTheme();
}

function loadTheme() {
  const saved = localStorage.getItem(LS_KEY_THEME) || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(LS_KEY_THEME, next);
  applyTheme(next);
}

function updateChartTheme() {
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const textCol = isDark ? '#a0aec0' : '#5a5a5a';
  if (state.chart) {
    state.chart.options.plugins.legend.labels.color = textCol;
    state.chart.update();
  }
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */

function clearErrors() {
  ['itemName', 'amount', 'category'].forEach(field => {
    const el  = document.getElementById(field);
    const err = document.getElementById(field + 'Error');
    if (el)  el.classList.remove('error');
    if (err) err.classList.add('hidden');
  });
}

function showError(fieldId, message) {
  const el  = document.getElementById(fieldId);
  const err = document.getElementById(fieldId + 'Error');
  if (el)  el.classList.add('error');
  if (err) {
    err.textContent = message;
    err.classList.remove('hidden');
  }
}

/**
 * Validate the form fields.
 * Returns { valid, name, amount, category } or { valid: false }.
 */
function validateForm() {
  clearErrors();
  let valid = true;

  const name     = document.getElementById('itemName').value.trim();
  const amountRaw = document.getElementById('amount').value.trim();
  const category = document.getElementById('category').value;

  if (!name) {
    showError('itemName', 'Please enter an item name.');
    valid = false;
  }

  const amount = parseFloat(amountRaw);
  if (!amountRaw || isNaN(amount) || amount <= 0) {
    showError('amount', 'Please enter a valid amount greater than 0.');
    valid = false;
  }

  if (!category) {
    showError('category', 'Please select a category.');
    valid = false;
  }

  return valid ? { valid: true, name, amount, category } : { valid: false };
}

/* ============================================================
   TRANSACTIONS — ADD / DELETE
   ============================================================ */

function addTransaction(name, amount, category) {
  const tx = {
    id:       uid(),
    name,
    amount,
    category,
    date:     new Date().toISOString(),
  };
  state.transactions.unshift(tx); // newest first in array
  saveTransactions();
  renderAll();
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderAll();
}

/* ============================================================
   SORTING
   ============================================================ */

function getSortedTransactions() {
  const list = [...state.transactions];
  switch (state.sort) {
    case 'amount-desc':
      return list.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':
      return list.sort((a, b) => a.amount - b.amount);
    case 'category':
      return list.sort((a, b) => a.category.localeCompare(b.category));
    case 'date':
    default:
      return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

function setSort(sortKey) {
  state.sort = sortKey;
  saveSort();
  // Update active button
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === sortKey);
  });
  renderTransactionList();
}

/* ============================================================
   BUDGET HELPERS
   ============================================================ */

/** Total spending for the current calendar month */
function currentMonthTotal() {
  const now = toMonthKey(new Date().toISOString());
  return state.transactions
    .filter(tx => toMonthKey(tx.date) === now)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function isOverBudget() {
  return state.budget > 0 && currentMonthTotal() > state.budget;
}

/* ============================================================
   RENDER — SUMMARY CARDS
   ============================================================ */

function renderSummary() {
  const total = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  document.getElementById('totalSpending').textContent = formatIDR(total);
  document.getElementById('txCount').textContent       = state.transactions.length;
  document.getElementById('budgetLimitDisplay').textContent =
    state.budget > 0 ? formatIDR(state.budget) : 'Not set';

  const warning = document.getElementById('budgetWarning');
  if (isOverBudget()) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
}

/* ============================================================
   RENDER — TRANSACTION LIST
   ============================================================ */

function renderTransactionList() {
  const listEl  = document.getElementById('txList');
  const emptyEl = document.getElementById('listEmpty');
  listEl.innerHTML = '';

  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  sorted.forEach(tx => {
    const cat     = CATEGORIES[tx.category] || { emoji: '💸', color: '#999' };
    const over    = isOverBudget(); // highlight all items when month is over budget
    const badgeClass = 'badge-' + tx.category.toLowerCase();

    const li = document.createElement('li');
    li.className = 'tx-item' + (over ? ' over-limit' : '');
    li.dataset.id = tx.id;

    const dateStr = new Date(tx.date).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    li.innerHTML = `
      <div class="tx-left">
        <span class="tx-emoji" aria-hidden="true">${cat.emoji}</span>
        <div class="tx-info">
          <p class="tx-name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</p>
          <div class="tx-meta">
            <span class="tx-cat-badge ${badgeClass}">${tx.category}</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${formatIDR(tx.amount)}</span>
        <button
          class="btn-delete"
          data-id="${tx.id}"
          aria-label="Delete ${escapeHtml(tx.name)}"
          title="Delete"
        >✕</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

/** Simple HTML escape to prevent XSS */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   RENDER — DOUGHNUT CHART
   ============================================================ */

function getCategoryTotals() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  state.transactions.forEach(tx => {
    if (totals[tx.category] !== undefined) totals[tx.category] += tx.amount;
  });
  return totals;
}

function renderChart() {
  const canvas   = document.getElementById('spendingChart');
  const emptyMsg = document.getElementById('chartEmpty');
  const legendEl = document.getElementById('chartLegend');
  const totals   = getCategoryTotals();
  const hasData  = Object.values(totals).some(v => v > 0);
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const textCol  = isDark ? '#a0aec0' : '#5a5a5a';

  const labels = Object.keys(CATEGORIES);
  const data   = labels.map(k => totals[k]);
  const colors = labels.map(k => CATEGORIES[k].color);

  // Show/hide empty message
  if (hasData) {
    emptyMsg.classList.add('hidden');
    canvas.style.display = '';
  } else {
    emptyMsg.classList.remove('hidden');
    canvas.style.display = 'none';
    legendEl.innerHTML = '';
    if (state.chart) { state.chart.destroy(); state.chart = null; }
    return;
  }

  if (state.chart) {
    // Update existing chart data
    state.chart.data.datasets[0].data = data;
    state.chart.update();
  } else {
    // Create new chart
    state.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor:     isDark ? '#161d27' : '#ffffff',
          borderWidth:     3,
          hoverOffset:     8,
        }],
      },
      options: {
        responsive:  true,
        cutout:      '62%',
        plugins: {
          legend: { display: false }, // we render our own legend pills
          tooltip: {
            callbacks: {
              label(ctx) {
                const val = ctx.parsed;
                const pct = ((val / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                return ` ${formatIDR(val)}  (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Render legend pills
  legendEl.innerHTML = labels.map((label, i) => `
    <div class="legend-pill">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${CATEGORIES[label].emoji} ${label}
      <strong>${formatIDR(totals[label])}</strong>
    </div>
  `).join('');
}

/* ============================================================
   RENDER — MONTHLY SUMMARY
   ============================================================ */

function renderMonthlySummary() {
  const bodyEl  = document.getElementById('monthlyBody');
  const emptyEl = document.getElementById('monthlyEmpty');
  bodyEl.innerHTML = '';

  if (state.transactions.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  // Build month → category → total map
  const monthMap = {};
  state.transactions.forEach(tx => {
    const key = toMonthKey(tx.date);
    if (!monthMap[key]) monthMap[key] = { Food: 0, Transport: 0, Fun: 0 };
    if (monthMap[key][tx.category] !== undefined) {
      monthMap[key][tx.category] += tx.amount;
    }
  });

  // Sort months newest first
  const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));

  sortedMonths.forEach(key => {
    const m     = monthMap[key];
    const total = m.Food + m.Transport + m.Fun;
    const over  = state.budget > 0 && total > state.budget;

    const tr = document.createElement('tr');
    if (over) tr.style.background = 'var(--danger-bg)';

    tr.innerHTML = `
      <td>${formatMonthLabel(key)}</td>
      <td>${formatIDR(m.Food)}</td>
      <td>${formatIDR(m.Transport)}</td>
      <td>${formatIDR(m.Fun)}</td>
      <td>${formatIDR(total)}${over ? ' ⚠️' : ''}</td>
    `;
    bodyEl.appendChild(tr);
  });
}

/* ============================================================
   RENDER ALL — single entry point for full re-render
   ============================================================ */

function renderAll() {
  renderSummary();
  renderTransactionList();
  renderChart();
  renderMonthlySummary();
}

/* ============================================================
   BUDGET LIMIT UI
   ============================================================ */

function showBudgetEditor() {
  const editor = document.getElementById('budgetEditor');
  const input  = document.getElementById('budgetInput');
  editor.classList.remove('hidden');
  input.value = state.budget > 0 ? state.budget : '';
  input.focus();
}

function hideBudgetEditor() {
  document.getElementById('budgetEditor').classList.add('hidden');
}

function saveBudgetFromInput() {
  const val = parseFloat(document.getElementById('budgetInput').value);
  state.budget = (!isNaN(val) && val >= 0) ? val : 0;
  saveBudget();
  hideBudgetEditor();
  renderAll();
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function initEventListeners() {
  // ── Form submit ──
  document.getElementById('expenseForm').addEventListener('submit', e => {
    e.preventDefault();
    const result = validateForm();
    if (!result.valid) return;

    addTransaction(result.name, result.amount, result.category);

    // Reset form
    e.target.reset();
    clearErrors();
    document.getElementById('itemName').focus();
  });

  // ── Delete transaction (event delegation on the list) ──
  document.getElementById('txList').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    if (id) deleteTransaction(id);
  });

  // ── Theme toggle ──
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // ── Sort buttons ──
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.addEventListener('click', () => setSort(btn.dataset.sort));
  });

  // ── Budget limit ──
  document.getElementById('editBudgetBtn').addEventListener('click', showBudgetEditor);
  document.getElementById('saveBudgetBtn').addEventListener('click', saveBudgetFromInput);
  document.getElementById('cancelBudgetBtn').addEventListener('click', hideBudgetEditor);

  // Allow pressing Enter inside budget input to save
  document.getElementById('budgetInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBudgetFromInput();
    if (e.key === 'Escape') hideBudgetEditor();
  });

  // ── Clear error styling on input ──
  ['itemName', 'amount', 'category'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      document.getElementById(id).classList.remove('error');
      document.getElementById(id + 'Error').classList.add('hidden');
    });
  });
}

/* ============================================================
   INIT — runs on DOMContentLoaded
   ============================================================ */

function init() {
  // Load persisted data
  loadTheme();
  loadTransactions();
  loadBudget();
  loadSort();

  // Set active sort button
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === state.sort);
  });

  // Wire up all events
  initEventListeners();

  // Initial render
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
