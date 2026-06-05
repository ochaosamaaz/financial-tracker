// ===== CHARTS & VISUALIZATIONS =====

let categoryChart = null;
let trendChart = null;
let comparisonChart = null;
let dailySavingsChart = null;

function updateCharts(tracker) {
    updateCategoryChart(tracker);
    updateTrendChart(tracker);
    updateComparisonChart(tracker);
    updateDailySavingsChart(tracker);
}

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#F1F5F9' : '#1E293B',
        grid: isDark ? '#334155' : '#E2E8F0',
        bg: isDark ? '#1E293B' : '#FFFFFF'
    };
}

function updateCategoryChart(tracker) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    const monthly = tracker.getMonthlyTransactions();
    const expenses = monthly.filter(t => t.type === 'expense');
    const categoryTotals = {};

    expenses.forEach(t => {
        const catInfo = tracker.getCategoryInfo(t.category, 'expense');
        const name = catInfo ? catInfo.name : t.category;
        categoryTotals[name] = (categoryTotals[name] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = [
        '#6C63FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
        '#D946EF', '#0EA5E9', '#FBBF24', '#A3E635'
    ];

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Belum ada data'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? colors.slice(0, labels.length) : ['#E2E8F0'],
                borderWidth: 0,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getChartColors().text,
                        padding: 12,
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.raw;
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = Math.round((value / total) * 100);
                            return ` ${ctx.label}: Rp ${value.toLocaleString('id-ID')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateTrendChart(tracker) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;

    // Get last 6 months data
    const months = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
        months.push(monthName);

        const monthTx = tracker.transactions.filter(t => t.date && t.date.startsWith(monthKey));
        incomeData.push(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
        expenseData.push(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    const chartColors = getChartColors();

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: chartColors.text, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: Rp ${ctx.raw.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } },
                y: {
                    ticks: {
                        color: chartColors.text,
                        callback: (v) => 'Rp ' + (v / 1000000).toFixed(1) + 'jt'
                    },
                    grid: { color: chartColors.grid }
                }
            }
        }
    });
}

function updateComparisonChart(tracker) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    const months = [];
    const balanceData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        months.push(monthName);

        const monthTx = tracker.transactions.filter(t => t.date && t.date.startsWith(monthKey));
        const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        balanceData.push(income - expense);
    }

    const chartColors = getChartColors();

    if (comparisonChart) comparisonChart.destroy();

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Selisih (Income - Expense)',
                data: balanceData,
                backgroundColor: balanceData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                borderColor: balanceData.map(v => v >= 0 ? '#10B981' : '#EF4444'),
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: chartColors.text } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Selisih: Rp ${ctx.raw.toLocaleString('id-ID')}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: chartColors.text }, grid: { color: chartColors.grid } },
                y: {
                    ticks: {
                        color: chartColors.text,
                        callback: (v) => 'Rp ' + (v / 1000000).toFixed(1) + 'jt'
                    },
                    grid: { color: chartColors.grid }
                }
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
