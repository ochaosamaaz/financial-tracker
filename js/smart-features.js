// ===== SMART FEATURES: PDF Report, Budget Per Category, Smart Notifications =====

// ===========================
// FEATURE 4: LAPORAN BULANAN PDF
// ===========================
class MonthlyReport {
    constructor(tracker) { this.tracker = tracker; }

    generate() {
        const t = this.tracker;
        const mk = t.getSelectedMonthKey();
        const txs = t.getMonthTransactions(mk);
        const income = txs.filter(x => x.type === 'income').reduce((s,x) => s + x.amount, 0);
        const expense = txs.filter(x => x.type === 'expense').reduce((s,x) => s + x.amount, 0);
        const balance = income - expense;
        const monthName = new Date(t.selectedYear, t.selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        // Category breakdown
        const byCat = {};
        txs.filter(x => x.type === 'expense').forEach(x => {
            const info = t.getCategoryInfo(x.category, 'expense');
            const name = info ? info.name : x.category;
            byCat[name] = (byCat[name] || 0) + x.amount;
        });
        const sorted = Object.entries(byCat).sort((a,b) => b[1] - a[1]);

        // Income breakdown
        const byIncome = {};
        txs.filter(x => x.type === 'income').forEach(x => {
            const info = t.getCategoryInfo(x.category, 'income');
            const name = info ? info.name : x.category;
            byIncome[name] = (byIncome[name] || 0) + x.amount;
        });
        const sortedIncome = Object.entries(byIncome).sort((a,b) => b[1] - a[1]);

        // Budget category status
        const catBudgets = JSON.parse(localStorage.getItem(`duit_cat_budgets_${t.householdCode || 'local'}`)) || {};
        let budgetRows = '';
        Object.entries(catBudgets).forEach(([catId, limit]) => {
            const spent = txs.filter(x => x.type === 'expense' && x.category === catId).reduce((s,x) => s + x.amount, 0);
            const info = t.getCategoryInfo(catId, 'expense');
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const status = pct >= 100 ? '🚨 OVER' : pct >= 80 ? '⚠️ Hampir' : '✅ Aman';
            budgetRows += `<tr><td>${info ? info.name : catId}</td><td>Rp ${spent.toLocaleString('id-ID')}</td><td>Rp ${limit.toLocaleString('id-ID')}</td><td>${pct}%</td><td>${status}</td></tr>`;
        });

        // Health score
        let healthInfo = '';
        if (typeof healthScore !== 'undefined') {
            const result = healthScore.calculate();
            healthInfo = `<div class="report-health"><h3>Financial Health Score: ${result.total}/100</h3>
                ${result.components ? Object.values(result.components).map(c => `<p>${c.label}: ${c.score}/${c.max} — ${c.detail}</p>`).join('') : ''}
            </div>`;
        }

        const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Laporan Keuangan ${monthName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1E293B;max-width:800px;margin:auto}
h1{color:#6C63FF;font-size:28px;margin-bottom:4px}
h2{color:#475569;font-size:18px;margin:24px 0 12px;border-bottom:2px solid #E2E8F0;padding-bottom:6px}
h3{color:#6C63FF;font-size:16px;margin-bottom:8px}
.subtitle{color:#64748B;font-size:14px;margin-bottom:24px}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.summary-card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;text-align:center}
.summary-card .label{font-size:12px;color:#64748B}
.summary-card .value{font-size:22px;font-weight:700;margin-top:4px}
.income .value{color:#10B981} .expense .value{color:#EF4444} .balance .value{color:#6C63FF}
table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #E2E8F0}
th{background:#F1F5F9;font-weight:600;color:#475569}
tr:hover td{background:#F8FAFC}
.report-health{background:#EEF2FF;border-radius:12px;padding:20px;margin-bottom:20px}
.report-health p{font-size:13px;color:#475569;margin:4px 0}
.footer{text-align:center;color:#94A3B8;font-size:11px;margin-top:40px;border-top:1px solid #E2E8F0;padding-top:16px}
@media print{body{padding:20px}h1{font-size:22px}}
</style></head><body>
<h1>📊 Laporan Keuangan</h1>
<p class="subtitle">${monthName} — ${t.currentUser}${t.householdCode ? ' (Household: ' + t.householdCode + ')' : ''}</p>

<div class="summary-grid">
    <div class="summary-card income"><div class="label">Total Pemasukan</div><div class="value">Rp ${income.toLocaleString('id-ID')}</div></div>
    <div class="summary-card expense"><div class="label">Total Pengeluaran</div><div class="value">Rp ${expense.toLocaleString('id-ID')}</div></div>
    <div class="summary-card balance"><div class="label">Sisa Saldo</div><div class="value">Rp ${balance.toLocaleString('id-ID')}</div></div>
</div>

${healthInfo}

<h2>💰 Pemasukan</h2>
<table><thead><tr><th>Sumber</th><th>Jumlah</th><th>%</th></tr></thead><tbody>
${sortedIncome.map(([name, amt]) => `<tr><td>${name}</td><td>Rp ${amt.toLocaleString('id-ID')}</td><td>${income > 0 ? Math.round((amt/income)*100) : 0}%</td></tr>`).join('')}
</tbody></table>

<h2>📉 Pengeluaran per Kategori</h2>
<table><thead><tr><th>Kategori</th><th>Jumlah</th><th>%</th></tr></thead><tbody>
${sorted.map(([name, amt]) => `<tr><td>${name}</td><td>Rp ${amt.toLocaleString('id-ID')}</td><td>${expense > 0 ? Math.round((amt/expense)*100) : 0}%</td></tr>`).join('')}
<tr style="font-weight:700;background:#FEE2E2"><td>TOTAL</td><td>Rp ${expense.toLocaleString('id-ID')}</td><td>100%</td></tr>
</tbody></table>

${budgetRows ? `<h2>🎯 Budget per Kategori</h2>
<table><thead><tr><th>Kategori</th><th>Terpakai</th><th>Limit</th><th>%</th><th>Status</th></tr></thead><tbody>${budgetRows}</tbody></table>` : ''}

<h2>📋 Detail Transaksi (${txs.length} transaksi)</h2>
<table><thead><tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Jumlah</th><th>Ket</th></tr></thead><tbody>
${txs.slice(0, 50).map(x => {
    const info = t.getCategoryInfo(x.category, x.type);
    return `<tr><td>${x.date}</td><td>${x.type === 'income' ? '↗ Masuk' : '↘ Keluar'}</td><td>${info ? info.name : x.category}</td><td>Rp ${x.amount.toLocaleString('id-ID')}</td><td>${x.note || '-'}</td></tr>`;
}).join('')}
${txs.length > 50 ? `<tr><td colspan="5" style="text-align:center;color:#94A3B8">... dan ${txs.length - 50} transaksi lainnya</td></tr>` : ''}
</tbody></table>

<div class="footer">
    <p>Digenerate otomatis oleh CielFinanceTools — ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
</div>
</body></html>`;

        // Open in new window for print/save
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
            win.onload = () => setTimeout(() => win.print(), 500);
        } else {
            // Fallback: download as HTML
            const a = document.createElement('a');
            a.href = url; a.download = `Laporan-${mk}-${t.currentUser}.html`;
            a.click();
        }
        URL.revokeObjectURL(url);
        t.showToast('Laporan dibuat! Print atau Save as PDF 📄');
    }
}

// ===========================
// FEATURE 5: BUDGET PER KATEGORI
// ===========================
class CategoryBudget {
    constructor(tracker) {
        this.tracker = tracker;
        this.budgets = {};
        this.load();
    }

    getStorageKey() {
        return `duit_cat_budgets_${this.tracker.householdCode || 'local'}`;
    }

    load() {
        this.budgets = JSON.parse(localStorage.getItem(this.getStorageKey())) || {};
    }

    save() {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.budgets));
    }

    setBudget(categoryId, limit) {
        if (limit > 0) this.budgets[categoryId] = limit;
        else delete this.budgets[categoryId];
        this.save();
    }

    getStatus(categoryId) {
        const limit = this.budgets[categoryId];
        if (!limit) return null;
        const mk = this.tracker.getSelectedMonthKey();
        const spent = this.tracker.getMonthTransactions(mk)
            .filter(t => t.type === 'expense' && t.category === categoryId)
            .reduce((s, t) => s + t.amount, 0);
        const pct = Math.round((spent / limit) * 100);
        return { limit, spent, pct, remaining: limit - spent, over: spent > limit };
    }

    getAllStatuses() {
        const results = [];
        Object.keys(this.budgets).forEach(catId => {
            const status = this.getStatus(catId);
            if (status) results.push({ catId, ...status });
        });
        return results.sort((a, b) => b.pct - a.pct);
    }

    checkAlerts() {
        const alerts = [];
        this.getAllStatuses().forEach(s => {
            const info = this.tracker.getCategoryInfo(s.catId, 'expense');
            const name = info ? info.name : s.catId;
            if (s.pct >= 100) alerts.push({ type: 'danger', msg: `🚨 ${name}: Budget terlampaui! (${s.pct}%)` });
            else if (s.pct >= 80) alerts.push({ type: 'warning', msg: `⚠️ ${name}: Budget hampir habis (${s.pct}%)` });
        });
        return alerts;
    }

    renderSettingsUI() {
        const allCats = this.tracker.getAllExpenseCategories();
        return `
        <div class="setting-group">
            <h3><i class="fas fa-sliders-h"></i> Budget per Kategori</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Set limit pengeluaran per kategori. Kosongkan = tanpa limit.</p>
            <div class="cat-budget-list" id="cat-budget-list">
                ${allCats.map(cat => {
                    const limit = this.budgets[cat.id] || '';
                    return `<div class="cat-budget-item" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <span style="flex:1;font-size:13px;"><i class="fas ${cat.icon}" style="width:20px;color:var(--primary)"></i> ${cat.name}</span>
                        <input type="number" class="cat-budget-input" data-cat="${cat.id}" value="${limit}" placeholder="0" style="width:130px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text);">
                    </div>`;
                }).join('')}
            </div>
            <button class="btn-primary" id="save-cat-budgets-btn" style="margin-top:12px;"><i class="fas fa-save"></i> Simpan Budget Kategori</button>
        </div>`;
    }

    renderDashboardWidget() {
        const statuses = this.getAllStatuses();
        if (statuses.length === 0) return '';
        return `
        <div class="cat-budget-widget" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:20px;">
            <h3 style="font-size:14px;margin-bottom:14px;"><i class="fas fa-sliders-h" style="color:var(--primary);margin-right:8px;"></i> Budget per Kategori</h3>
            ${statuses.map(s => {
                const info = this.tracker.getCategoryInfo(s.catId, 'expense');
                const name = info ? info.name : s.catId;
                const color = s.pct >= 100 ? 'var(--danger)' : s.pct >= 80 ? 'var(--warning)' : 'var(--success)';
                const icon = info ? info.icon : 'fa-circle';
                return `<div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                        <span><i class="fas ${icon}" style="margin-right:6px;color:${color}"></i>${name}</span>
                        <span style="color:${color};font-weight:600;">${this.tracker.formatMoneyShort(s.spent)} / ${this.tracker.formatMoneyShort(s.limit)} (${s.pct}%)</span>
                    </div>
                    <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                        <div style="height:100%;width:${Math.min(s.pct,100)}%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }

    bindEvents() {
        document.getElementById('save-cat-budgets-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.cat-budget-input').forEach(inp => {
                const cat = inp.dataset.cat;
                const val = parseInt(inp.value) || 0;
                this.setBudget(cat, val);
            });
            this.tracker.showToast('Budget per kategori tersimpan! 🎯');
            this.tracker.refreshAll();
        });
    }
}

// ===========================
// FEATURE 6: NOTIFIKASI SMART
// ===========================
class SmartNotifications {
    constructor(tracker) {
        this.tracker = tracker;
        this.notifications = [];
    }

    requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    sendBrowserNotif(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '💰', badge: '💰' });
        }
    }

    generateAlerts() {
        const t = this.tracker;
        const alerts = [];
        const mk = t.getSelectedMonthKey();
        const summary = t.calcMonthSummary(mk);

        // 1. Budget total warning
        if (t.settings.budgetTarget > 0) {
            const pct = Math.round((summary.expense / t.settings.budgetTarget) * 100);
            if (pct >= 100) alerts.push({ icon: '🚨', type: 'danger', msg: `Budget bulan ini sudah terlampaui! (${pct}%)` });
            else if (pct >= 80) alerts.push({ icon: '⚠️', type: 'warning', msg: `Budget sudah ${pct}% terpakai. Hati-hati!` });
            else if (pct >= 50) alerts.push({ icon: '📊', type: 'info', msg: `Budget terpakai ${pct}%. Masih aman 👍` });
        }

        // 2. Category budget alerts
        if (typeof catBudgetManager !== 'undefined') {
            const catAlerts = catBudgetManager.checkAlerts();
            alerts.push(...catAlerts.map(a => ({ icon: a.type === 'danger' ? '🚨' : '⚠️', type: a.type, msg: a.msg })));
        }

        // 3. Savings rate check
        if (summary.income > 0) {
            const savRate = Math.round(((summary.income - summary.expense) / summary.income) * 100);
            if (savRate < 0) alerts.push({ icon: '💸', type: 'danger', msg: `Pengeluaran lebih besar dari pemasukan! Saving rate: ${savRate}%` });
            else if (savRate < 10) alerts.push({ icon: '📉', type: 'warning', msg: `Saving rate hanya ${savRate}%. Target minimal 20%!` });
            else if (savRate >= 30) alerts.push({ icon: '🎉', type: 'success', msg: `Saving rate ${savRate}%! Excellent, pertahankan!` });
        }

        // 4. No transaction today
        const today = new Date().toISOString().split('T')[0];
        const todayTx = t.transactions.filter(x => x.date === today);
        if (todayTx.length === 0) {
            alerts.push({ icon: '📝', type: 'info', msg: 'Belum ada transaksi hari ini. Jangan lupa catat!' });
        }

        // 5. Streak info
        if (typeof premiumFeatures !== 'undefined' && premiumFeatures.streakData) {
            const streak = premiumFeatures.streakData.currentStreak || 0;
            if (streak >= 7) alerts.push({ icon: '🔥', type: 'success', msg: `Streak hemat ${streak} hari! Keep going!` });
        }

        // 6. Goal deadline approaching
        if (typeof premiumFeatures !== 'undefined') {
            premiumFeatures.goals.filter(g => !g.completed && g.deadline).forEach(g => {
                const days = premiumFeatures.getGoalDaysLeft(g);
                const pct = premiumFeatures.getGoalProgress(g);
                if (days !== null && days <= 7 && pct < 100) {
                    alerts.push({ icon: '⏰', type: 'warning', msg: `Target "${g.name}" tinggal ${days} hari! Progress: ${pct}%` });
                }
            });
        }

        this.notifications = alerts;
        return alerts;
    }

    renderPanel() {
        const alerts = this.generateAlerts();
        if (alerts.length === 0) return '<div style="text-align:center;padding:20px;color:var(--text-secondary)"><i class="fas fa-check-circle" style="font-size:24px;color:var(--success);display:block;margin-bottom:8px;"></i>Semua aman! Tidak ada peringatan.</div>';
        return alerts.map(a => {
            const bgColor = a.type === 'danger' ? 'var(--danger-light,#FEE2E2)' : a.type === 'warning' ? 'var(--warning-light,#FEF3C7)' : a.type === 'success' ? 'var(--success-light,#D1FAE5)' : 'var(--primary-light,#EEF2FF)';
            return `<div style="background:${bgColor};border-radius:10px;padding:12px 16px;margin-bottom:8px;font-size:13px;display:flex;align-items:center;gap:10px;">
                <span style="font-size:18px;">${a.icon}</span>
                <span>${a.msg}</span>
            </div>`;
        }).join('');
    }

    renderBadge() {
        const alerts = this.generateAlerts();
        const important = alerts.filter(a => a.type === 'danger' || a.type === 'warning');
        return important.length > 0 ? `<span class="notif-badge">${important.length}</span>` : '';
    }

    checkAndNotify() {
        const alerts = this.generateAlerts();
        const important = alerts.filter(a => a.type === 'danger' || a.type === 'warning');
        if (important.length > 0) {
            this.sendBrowserNotif('CielFinance Alert', important[0].msg);
        }
    }
}

// ===== INITIALIZATION =====
let monthlyReport, catBudgetManager, smartNotif;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof app === 'undefined') return;

        monthlyReport = new MonthlyReport(app);
        catBudgetManager = new CategoryBudget(app);
        smartNotif = new SmartNotifications(app);

        // Request notification permission
        smartNotif.requestPermission();

        // Hook into enterApp
        const origEnter = app.enterApp.bind(app);
        app.enterApp = function() {
            origEnter();
            catBudgetManager.load();
            setTimeout(() => smartNotif.checkAndNotify(), 2000);
        };

        // Hook into refreshAll to render budget widget + update notif badge
        const origRefresh = app.refreshAll.bind(app);
        app.refreshAll = function() {
            origRefresh();
            // Budget widget on dashboard
            const budgetWidget = document.getElementById('cat-budget-widget-area');
            if (budgetWidget) budgetWidget.innerHTML = catBudgetManager.renderDashboardWidget();
            // Notification badge
            const notifBtn = document.getElementById('notif-btn');
            if (notifBtn) {
                const existing = notifBtn.querySelector('.notif-badge');
                if (existing) existing.remove();
                const badge = smartNotif.renderBadge();
                if (badge) notifBtn.insertAdjacentHTML('beforeend', badge);
            }
        };

        // Add report button event
        document.getElementById('download-report-btn')?.addEventListener('click', () => monthlyReport.generate());

        // Notification panel toggle
        document.getElementById('notif-btn')?.addEventListener('click', () => {
            let panel = document.getElementById('notif-panel');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = 'notif-panel';
                panel.style.cssText = 'position:fixed;top:60px;right:20px;width:350px;max-height:70vh;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-lg);padding:20px;z-index:1000;';
                document.body.appendChild(panel);
            }
            if (panel.style.display === 'block') {
                panel.style.display = 'none';
            } else {
                panel.innerHTML = `<h3 style="font-size:14px;margin-bottom:12px;"><i class="fas fa-bell" style="color:var(--primary);margin-right:8px;"></i>Notifikasi & Alerts</h3>` + smartNotif.renderPanel();
                panel.style.display = 'block';
            }
        });

        // Close panel on outside click
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notif-panel');
            if (panel && panel.style.display === 'block' && !panel.contains(e.target) && !e.target.closest('#notif-btn')) {
                panel.style.display = 'none';
            }
        });

        // If already logged in
        if (app.currentUser) {
            catBudgetManager.load();
        }
    }, 700);
});
