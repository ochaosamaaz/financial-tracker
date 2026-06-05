// ===== CHARTS & VISUALIZATIONS =====

let dailyChart = null;
let categoryChart = null;
let historyChart = null;
let trendChart = null;
let comparisonChart = null;
let dailySavingsChart = null;

function updateCharts(tracker) {
    updateDailyChart(tracker);
    updateCategoryChart(tracker);
    updateHistoryChart(tracker);
    updateTrendChart(tracker);
    updateComparisonChart(tracker);
    updateDailySavingsChart(tracker);
}

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#CBD5E1' : '#475569',
        grid: isDark ? '#334155' : '#E2E8F0',
    };
}

// ===== DAILY EXPENSE CHART (Line) =====
function updateDailyChart(tracker) {
    const ctx = document.getElementById('daily-chart');
    if (!ctx) return;

    const mk = tracker.getSelectedMonthKey();
    const txs = tracker.getMonthTransactions(mk);
    const daysInMonth = new Date(tracker.selectedYear, tracker.selectedMonth + 1, 0).getDate();

    // Aggregate expenses by day
    const dailyExpense = new Array(daysInMonth).fill(0);
    const dailyIncome = new Array(daysInMonth).fill(0);
    txs.forEach(t => {
        const day = parseInt(t.date.split('-')[2]) - 1;
        if (day >= 0 && day < daysInMonth) {
            if (t.type === 'expense') dailyExpense[day] += t.amount;
            else dailyIncome[day] += t.amount;
        }
    });

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const colors = getChartColors();

    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Pengeluaran',
                    data: dailyExpense,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#EF4444',
                    borderWidth: 2,
                },
                {
                    label: 'Pemasukan',
                    data: dailyIncome,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10B981',
                    borderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: colors.text, usePointStyle: true, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: colors.text, font: { size: 10 }, maxTicksLimit: 15 }, grid: { display: false } },
                y: { ticks: { color: colors.text, font: { size: 10 }, callback: v => 'Rp' + (v / 1000) + 'K' }, grid: { color: colors.grid } }
            }
        }
    });
}


// ===== CATEGORY DONUT CHART =====
function updateCategoryChart(tracker) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    const mk = tracker.getSelectedMonthKey();
    const txs = tracker.getMonthTransactions(mk).filter(t => t.type === 'expense');
    const categoryTotals = {};
    txs.forEach(t => {
        const info = tracker.getCategoryInfo(t.category, 'expense');
        const name = info ? info.name : t.category;
        categoryTotals[name] = (categoryTotals[name] || 0) + t.amount;
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    const palette = ['#6C63FF', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'];
    const colors = getChartColors();

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Belum ada data'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? palette.slice(0, labels.length) : ['#E2E8F0'],
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1E293B' : '#FFFFFF',
                spacing: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, font: { size: 11 }, padding: 10 } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = Math.round((ctx.raw / total) * 100);
                            return ` ${ctx.label}: Rp ${ctx.raw.toLocaleString('id-ID')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ===== 6-MONTH HISTORY BAR CHART =====
function updateHistoryChart(tracker) {
    const ctx = document.getElementById('history-chart');
    if (!ctx) return;

    const months = [];
    const incomeData = [];
    const expenseData = [];
    const balanceData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(tracker.selectedYear, tracker.selectedMonth - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        months.push(label);
        const s = tracker.calcMonthSummary(key);
        incomeData.push(s.income);
        expenseData.push(s.expense);
        balanceData.push(s.balance);
    }

    const colors = getChartColors();
    if (historyChart) historyChart.destroy();
    historyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Pemasukan', data: incomeData, backgroundColor: '#10B981', borderRadius: 4, barPercentage: 0.7 },
                { label: 'Pengeluaran', data: expenseData, backgroundColor: '#EF4444', borderRadius: 4, barPercentage: 0.7 },
                { label: 'Sisa Saldo', data: balanceData, backgroundColor: '#F59E0B', borderRadius: 4, barPercentage: 0.7 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top', labels: { color: colors.text, usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}` } }
            },
            scales: {
                x: { ticks: { color: colors.text, font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: colors.text, font: { size: 10 }, callback: v => 'Rp' + (v / 1000000).toFixed(1) + 'jt' }, grid: { color: colors.grid } }
            }
        }
    });
}


// ===== TREND LINE CHART (Insights Page) =====
function updateTrendChart(tracker) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;

    const months = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(tracker.selectedYear, tracker.selectedMonth - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(d.toLocaleDateString('id-ID', { month: 'short' }));
        const s = tracker.calcMonthSummary(key);
        incomeData.push(s.income);
        expenseData.push(s.expense);
    }

    const colors = getChartColors();
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Pemasukan', data: incomeData, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
                { label: 'Pengeluaran', data: expenseData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: colors.text, usePointStyle: true } },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}` } }
            },
            scales: {
                x: { ticks: { color: colors.text }, grid: { display: false } },
                y: { ticks: { color: colors.text, callback: v => 'Rp' + (v / 1000000).toFixed(1) + 'jt' }, grid: { color: colors.grid } }
            }
        }
    });
}

// ===== COMPARISON BAR CHART (Insights Page) =====
function updateComparisonChart(tracker) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    const months = [];
    const netData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(tracker.selectedYear, tracker.selectedMonth - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
        const s = tracker.calcMonthSummary(key);
        netData.push(s.balance);
    }

    const colors = getChartColors();
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Selisih (Income - Expense)',
                data: netData,
                backgroundColor: netData.map(v => v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'),
                borderColor: netData.map(v => v >= 0 ? '#10B981' : '#EF4444'),
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: colors.text } },
                tooltip: { callbacks: { label: (ctx) => ` Selisih: Rp ${ctx.raw.toLocaleString('id-ID')}` } }
            },
            scales: {
                x: { ticks: { color: colors.text }, grid: { display: false } },
                y: { ticks: { color: colors.text, callback: v => 'Rp' + (v / 1000000).toFixed(1) + 'jt' }, grid: { color: colors.grid } }
            }
        }
    });
}



function updateDailySavingsChart(tracker) {
    const ctx = document.getElementById('daily-savings-chart');
    if (!ctx) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    // Get savings transactions for current month
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const savingsIds = ['tabungan', 'investasi', 'dana_darurat'];
    const savingsTx = tracker.transactions.filter(t => 
        t.date && t.date.startsWith(monthKey) && 
        t.type === 'expense' && 
        savingsIds.includes(t.category)
    );

    // Build daily data
    const dailyData = [];
    const labels = [];
    let totalSavings = 0;
    let daysWithSavings = 0;

    for (let day = 1; day <= Math.min(today, daysInMonth); day++) {
        const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
        const dayTotal = savingsTx
            .filter(t => t.date === dateStr)
            .reduce((sum, t) => sum + t.amount, 0);
        
        dailyData.push(dayTotal);
        labels.push(`${day}`);
        totalSavings += dayTotal;
        if (dayTotal > 0) daysWithSavings++;
    }

    // Calculate average (per days that have passed)
    const avgPerDay = today > 0 ? Math.round(totalSavings / today) : 0;
    const avgPerSavingDay = daysWithSavings > 0 ? Math.round(totalSavings / daysWithSavings) : 0;

    // Update stats
    document.getElementById('savings-total-month').textContent = tracker.formatMoney(totalSavings);
    document.getElementById('savings-daily-avg').textContent = tracker.formatMoney(avgPerDay);
    document.getElementById('savings-days-count').textContent = `${daysWithSavings} hari`;

    const chartColors = getChartColors();

    if (dailySavingsChart) dailySavingsChart.destroy();

    // Create average line data
    const avgLine = dailyData.map(() => avgPerDay);

    dailySavingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tabungan Harian',
                    data: dailyData,
                    backgroundColor: dailyData.map(v => v > 0 ? 'rgba(37, 99, 235, 0.7)' : 'rgba(226, 232, 240, 0.3)'),
                    borderColor: dailyData.map(v => v > 0 ? '#2563EB' : 'transparent'),
                    borderWidth: 1,
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: `Rata-rata (${tracker.formatMoney(avgPerDay)}/hari)`,
                    data: avgLine,
                    type: 'line',
                    borderColor: '#F59E0B',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: chartColors.text, usePointStyle: true, font: { size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => `Tanggal ${items[0].label} ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
                        label: (ctx) => {
                            if (ctx.datasetIndex === 0) {
                                return ` Tabungan: ${tracker.formatMoney(ctx.raw)}`;
                            }
                            return ` Rata-rata: ${tracker.formatMoney(ctx.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    ticks: { color: chartColors.text, font: { size: 10 } }, 
                    grid: { display: false },
                    title: { display: true, text: 'Tanggal', color: chartColors.text }
                },
                y: {
                    ticks: {
                        color: chartColors.text,
                        callback: (v) => {
                            if (v >= 1000000) return 'Rp ' + (v / 1000000).toFixed(1) + 'jt';
                            if (v >= 1000) return 'Rp ' + (v / 1000).toFixed(0) + 'rb';
                            return 'Rp ' + v;
                        }
                    },
                    grid: { color: chartColors.grid },
                    beginAtZero: true
                }
            }
        }
    });
}
