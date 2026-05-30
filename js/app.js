// ===== DUIT TRACKER PRO - Main App =====

const CATEGORIES = {
    expense: {
        needs: [
            { id: 'makanan', name: 'Makanan & Minuman', icon: 'fa-utensils' },
            { id: 'transportasi', name: 'Transportasi', icon: 'fa-car' },
            { id: 'listrik', name: 'Listrik & Air', icon: 'fa-bolt' },
            { id: 'sewa', name: 'Sewa/Cicilan', icon: 'fa-home' },
            { id: 'kesehatan', name: 'Kesehatan', icon: 'fa-heartbeat' },
            { id: 'pendidikan', name: 'Pendidikan', icon: 'fa-graduation-cap' },
            { id: 'belanja_bulanan', name: 'Belanja Bulanan', icon: 'fa-shopping-cart' },
        ],
        wants: [
            { id: 'hiburan', name: 'Hiburan', icon: 'fa-film' },
            { id: 'belanja', name: 'Belanja', icon: 'fa-shopping-bag' },
            { id: 'makan_luar', name: 'Makan di Luar', icon: 'fa-hamburger' },
            { id: 'langganan', name: 'Langganan/Streaming', icon: 'fa-tv' },
            { id: 'liburan', name: 'Liburan', icon: 'fa-plane' },
            { id: 'sosial', name: 'Sosial', icon: 'fa-heart' },
            { id: 'pakaian', name: 'Pakaian', icon: 'fa-tshirt' },
        ],
        savings: [
            { id: 'tabungan', name: 'Tabungan', icon: 'fa-piggy-bank' },
            { id: 'investasi', name: 'Investasi/Reksadana', icon: 'fa-chart-line' },
            { id: 'dana_darurat', name: 'Dana Darurat', icon: 'fa-shield-alt' },
        ],
        other: [
            { id: 'lainnya_keluar', name: 'Lainnya', icon: 'fa-ellipsis-h' },
        ]
    },
    income: [
        { id: 'gaji', name: 'Gaji Pokok', icon: 'fa-briefcase' },
        { id: 'freelance', name: 'Freelance', icon: 'fa-laptop' },
        { id: 'bisnis', name: 'Usaha & Bisnis', icon: 'fa-store' },
        { id: 'investasi_masuk', name: 'Hasil Investasi', icon: 'fa-chart-line' },
        { id: 'bonus', name: 'Bonus', icon: 'fa-gift' },
        { id: 'royalti', name: 'Royalti', icon: 'fa-music' },
        { id: 'jasa', name: 'Jasa', icon: 'fa-hands-helping' },
        { id: 'lainnya_masuk', name: 'Lainnya', icon: 'fa-ellipsis-h' },
    ]
};

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];


class DuitTracker {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('duit_users')) || [];
        this.transactions = [];
        this.settings = {};
        this.currentType = 'expense';
        this.selectedMonth = new Date().getMonth();
        this.selectedYear = new Date().getFullYear();
        this.init();
    }

    init() {
        this.renderUserList();
        this.bindEvents();
        this.setTheme(localStorage.getItem('duit_theme') || 'light');
    }

    // ===== LOGIN / USER MANAGEMENT =====
    renderUserList() {
        const list = document.getElementById('user-list');
        if (this.users.length === 0) {
            list.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;text-align:center;padding:12px;">Belum ada akun.</p>';
            return;
        }
        list.innerHTML = this.users.map(u => `
            <div class="user-card" data-user="${u.name}">
                <div class="avatar">${u.name.charAt(0).toUpperCase()}</div>
                <span class="user-name">${u.name}</span>
                <button class="delete-user" data-user="${u.name}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
        list.querySelectorAll('.user-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-user')) this.promptPin(card.dataset.user);
            });
        });
        list.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.deleteUser(btn.dataset.user); });
        });
    }

    addUser() {
        const name = document.getElementById('new-user-name').value.trim();
        const pin = document.getElementById('new-user-pin').value.trim();
        if (!name) return this.showToast('Masukkan nama!');
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return this.showToast('PIN harus 4 digit angka!');
        if (this.users.find(u => u.name === name)) return this.showToast('Nama sudah ada!');
        this.users.push({ name, pin });
        localStorage.setItem('duit_users', JSON.stringify(this.users));
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-pin').value = '';
        this.renderUserList();
        this.showToast(`Akun "${name}" berhasil dibuat!`);
    }

    deleteUser(name) {
        if (!confirm(`Hapus akun "${name}" beserta semua datanya?`)) return;
        this.users = this.users.filter(u => u.name !== name);
        localStorage.setItem('duit_users', JSON.stringify(this.users));
        localStorage.removeItem(`duit_tx_${name}`);
        localStorage.removeItem(`duit_settings_${name}`);
        this.renderUserList();
        this.showToast(`Akun "${name}" dihapus`);
    }

    promptPin(name) {
        document.getElementById('pin-user-name').textContent = name;
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-error').textContent = '';
        document.getElementById('pin-modal').classList.add('active');
        document.getElementById('pin-input').focus();
        this._pendingUser = name;
    }

    submitPin() {
        const pin = document.getElementById('pin-input').value;
        const user = this.users.find(u => u.name === this._pendingUser);
        if (!user) return;
        if (user.pin === pin) {
            document.getElementById('pin-modal').classList.remove('active');
            this.loginUser(user.name);
        } else {
            document.getElementById('pin-error').textContent = 'PIN salah!';
        }
    }

    loginUser(name) {
        this.currentUser = name;
        this.transactions = JSON.parse(localStorage.getItem(`duit_tx_${name}`)) || [];
        this.settings = JSON.parse(localStorage.getItem(`duit_settings_${name}`)) || {
            reminderEnabled: false, reminderTime: '20:00', budgetTarget: 6000000, savingsTarget: 1000000
        };
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('current-user-display').textContent = name;
        this.updateGreeting();
        this.initPeriodSelector();
        this.loadSettings();
        this.refreshAll();
        if (typeof initReminder === 'function') initReminder(this);
    }

    logout() {
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        this.currentUser = null;
        // Reset nav
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector('[data-page="dashboard"]').classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-dashboard').classList.add('active');
    }


    // ===== PERIOD SELECTOR =====
    initPeriodSelector() {
        const monthSel = document.getElementById('dash-month');
        const yearSel = document.getElementById('dash-year');
        monthSel.innerHTML = MONTHS_ID.map((m, i) => `<option value="${i}" ${i === this.selectedMonth ? 'selected' : ''}>${m}</option>`).join('');
        const currentYear = new Date().getFullYear();
        let yearsHtml = '';
        for (let y = currentYear; y >= currentYear - 5; y--) {
            yearsHtml += `<option value="${y}" ${y === this.selectedYear ? 'selected' : ''}>${y}</option>`;
        }
        yearSel.innerHTML = yearsHtml;
    }

    getSelectedMonthKey() {
        return `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}`;
    }

    getPrevMonthKey() {
        let m = this.selectedMonth - 1;
        let y = this.selectedYear;
        if (m < 0) { m = 11; y--; }
        return `${y}-${String(m + 1).padStart(2, '0')}`;
    }

    getMonthTransactions(monthKey) {
        return this.transactions.filter(t => t.date && t.date.startsWith(monthKey));
    }

    // ===== TRANSACTIONS CRUD =====
    addTransaction(tx) {
        tx.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        tx.createdAt = new Date().toISOString();
        this.transactions.unshift(tx);
        this.saveTransactions();
        this.refreshAll();
        return tx;
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
        this.refreshAll();
    }

    saveTransactions() {
        localStorage.setItem(`duit_tx_${this.currentUser}`, JSON.stringify(this.transactions));
    }

    // ===== CALCULATIONS =====
    calcMonthSummary(monthKey) {
        const txs = this.getMonthTransactions(monthKey);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const count = txs.length;
        return { income, expense, balance: income - expense, count };
    }

    calcRatio(monthKey) {
        const txs = this.getMonthTransactions(monthKey).filter(t => t.type === 'expense');
        const total = txs.reduce((s, t) => s + t.amount, 0);
        const needsIds = CATEGORIES.expense.needs.map(c => c.id);
        const wantsIds = CATEGORIES.expense.wants.map(c => c.id);
        const savingsIds = CATEGORIES.expense.savings.map(c => c.id);
        const needs = txs.filter(t => needsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const wants = txs.filter(t => wantsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const savings = txs.filter(t => savingsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const other = total - needs - wants - savings;
        return { needs: needs + other, wants, savings, total };
    }


    // ===== REFRESH ALL =====
    refreshAll() {
        this.updateDashboard();
        this.updateBudgetPage();
        this.renderAllTransactions();
        this.updateInsights();
        if (typeof updateCharts === 'function') updateCharts(this);
    }

    // ===== DASHBOARD UPDATE =====
    updateDashboard() {
        const mk = this.getSelectedMonthKey();
        const pk = this.getPrevMonthKey();
        const curr = this.calcMonthSummary(mk);
        const prev = this.calcMonthSummary(pk);

        document.getElementById('total-income').textContent = this.formatMoney(curr.income);
        document.getElementById('total-expense').textContent = this.formatMoney(curr.expense);
        document.getElementById('total-balance').textContent = this.formatMoney(curr.balance);
        document.getElementById('total-count').textContent = curr.count;

        // VS previous month
        this.setVsBadge('vs-income', curr.income, prev.income);
        this.setVsBadge('vs-expense', curr.expense, prev.expense, true);
        this.setVsBadge('vs-balance', curr.balance, prev.balance);
        this.setVsBadge('vs-count', curr.count, prev.count);

        // Target bar
        const target = this.settings.budgetTarget || 6000000;
        const pct = target > 0 ? Math.min((curr.expense / target) * 100, 100) : 0;
        const fill = document.getElementById('target-fill');
        fill.style.width = pct + '%';
        fill.className = 'target-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
        document.getElementById('target-current').textContent = this.formatMoney(curr.expense);
        document.getElementById('target-max').textContent = '/ ' + this.formatMoney(target);

        // Mini reports
        this.updateMiniReports(curr, prev);
        // Top expenses
        this.updateTopExpenses(mk);
        // Comparison list
        this.updateComparison(mk, pk);
        // History table
        this.updateHistoryTable();
    }

    setVsBadge(id, current, previous, invertColor = false) {
        const el = document.getElementById(id);
        if (!el) return;
        if (previous === 0) { el.textContent = ''; el.className = 'card-vs'; return; }
        const diff = ((current - previous) / previous) * 100;
        const isUp = diff > 0;
        el.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(Math.round(diff))}% VS Bulan Lalu`;
        if (invertColor) {
            el.className = `card-vs ${isUp ? 'down' : 'up'}`;
        } else {
            el.className = `card-vs ${isUp ? 'up' : 'down'}`;
        }
    }

    updateMiniReports(curr, prev) {
        const el = document.getElementById('mini-reports');
        const items = [];
        if (prev.count > 0) {
            const txDiff = curr.count - prev.count;
            const txPct = ((txDiff / prev.count) * 100).toFixed(1);
            if (txDiff !== 0) {
                items.push(`<div class="mini-item"><i class="fas fa-arrow-${txDiff > 0 ? 'up mini-up' : 'down mini-down'}"></i> Transaksi ${txDiff > 0 ? 'naik' : 'turun'} ${Math.abs(txPct)}% (${curr.count} vs ${prev.count})</div>`);
            }
        }
        if (curr.expense > 0 && this.settings.budgetTarget > 0) {
            const budgetPct = Math.round((curr.expense / this.settings.budgetTarget) * 100);
            items.push(`<div class="mini-item"><i class="fas fa-wallet"></i> Budget terpakai ${budgetPct}%${budgetPct > 80 ? ' ⚠️' : ''}</div>`);
        }
        if (curr.income > 0) {
            const savRate = Math.round(((curr.income - curr.expense) / curr.income) * 100);
            items.push(`<div class="mini-item"><i class="fas fa-piggy-bank"></i> Saving rate: ${savRate}%</div>`);
        }
        if (items.length === 0) items.push('<div class="mini-item">Belum ada data bulan ini</div>');
        el.innerHTML = items.join('');
    }

    updateTopExpenses(monthKey) {
        const el = document.getElementById('top-expenses-list');
        const txs = this.getMonthTransactions(monthKey).filter(t => t.type === 'expense');
        const byCategory = {};
        txs.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) { el.innerHTML = '<div class="empty-state"><p>Belum ada pengeluaran</p></div>'; return; }
        el.innerHTML = sorted.map(([cat, amt], i) => {
            const info = this.getCategoryInfo(cat, 'expense');
            return `<div class="top-item"><span class="top-rank">${i + 1}</span><span class="top-name">${info ? info.name : cat}</span><span class="top-amount">${this.formatMoney(amt)}</span></div>`;
        }).join('');
    }

    updateComparison(currKey, prevKey) {
        const el = document.getElementById('comparison-list');
        const currTxs = this.getMonthTransactions(currKey).filter(t => t.type === 'expense');
        const prevTxs = this.getMonthTransactions(prevKey).filter(t => t.type === 'expense');
        const currByCategory = {};
        const prevByCategory = {};
        currTxs.forEach(t => { currByCategory[t.category] = (currByCategory[t.category] || 0) + t.amount; });
        prevTxs.forEach(t => { prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount; });
        const allCats = [...new Set([...Object.keys(currByCategory), ...Object.keys(prevByCategory)])];
        const rows = allCats.map(cat => {
            const c = currByCategory[cat] || 0;
            const p = prevByCategory[cat] || 0;
            const pct = p > 0 ? Math.round(((c - p) / p) * 100) : (c > 0 ? 100 : 0);
            return { cat, c, p, pct };
        }).sort((a, b) => b.c - a.c).slice(0, 12);
        if (rows.length === 0) { el.innerHTML = '<div class="empty-state"><p>Belum ada data</p></div>'; return; }
        el.innerHTML = rows.map(r => {
            const info = this.getCategoryInfo(r.cat, 'expense');
            const pctClass = r.pct > 0 ? 'up' : r.pct < 0 ? 'down' : '';
            return `<div class="comp-item"><span class="comp-cat">${info ? info.name : r.cat}</span><span class="comp-now">${this.formatMoneyShort(r.c)}</span><span class="comp-prev">${this.formatMoneyShort(r.p)}</span><span class="comp-pct ${pctClass}">${r.pct > 0 ? '+' : ''}${r.pct}%</span></div>`;
        }).join('');
    }


    updateHistoryTable() {
        const tbody = document.getElementById('history-tbody');
        const tfoot = document.getElementById('history-tfoot');
        const rows = [];
        let totalInc = 0, totalExp = 0, totalBal = 0, totalCount = 0;
        for (let i = 0; i < 6; i++) {
            const d = new Date(this.selectedYear, this.selectedMonth - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
            const s = this.calcMonthSummary(key);
            rows.push({ label, ...s });
            totalInc += s.income; totalExp += s.expense; totalBal += s.balance; totalCount += s.count;
        }
        tbody.innerHTML = rows.map(r => `<tr><td>${r.label}</td><td>${this.formatMoney(r.income)}</td><td>${this.formatMoney(r.expense)}</td><td>${this.formatMoney(r.balance)}</td><td>${r.count}</td></tr>`).join('');
        tfoot.innerHTML = `<tr><td><strong>RATA-RATA</strong></td><td>${this.formatMoney(Math.round(totalInc/6))}</td><td>${this.formatMoney(Math.round(totalExp/6))}</td><td>${this.formatMoney(Math.round(totalBal/6))}</td><td>${Math.round(totalCount/6)}</td></tr>`;
    }

    // ===== BUDGET PAGE =====
    updateBudgetPage() {
        const mk = this.getSelectedMonthKey();
        const txs = this.getMonthTransactions(mk).filter(t => t.type === 'expense');
        const needsIds = CATEGORIES.expense.needs.map(c => c.id);
        const wantsIds = CATEGORIES.expense.wants.map(c => c.id);
        const savingsIds = CATEGORIES.expense.savings.map(c => c.id);

        const renderList = (items, containerId, totalId) => {
            const byCategory = {};
            items.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
            const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
            const total = sorted.reduce((s, [, v]) => s + v, 0);
            const el = document.getElementById(containerId);
            el.innerHTML = sorted.length ? sorted.map(([cat, amt], i) => {
                const info = this.getCategoryInfo(cat, 'expense');
                return `<div class="budget-item"><span class="bi-name">${i + 1}. ${info ? info.name : cat}</span><span class="bi-amount">${this.formatMoney(amt)}</span></div>`;
            }).join('') : '<p style="font-size:12px;color:var(--text-secondary)">Belum ada data</p>';
            document.getElementById(totalId).textContent = this.formatMoney(total);
            return total;
        };

        const needsTotal = renderList(txs.filter(t => needsIds.includes(t.category) || (!wantsIds.includes(t.category) && !savingsIds.includes(t.category))), 'budget-needs-list', 'budget-needs-total');
        const wantsTotal = renderList(txs.filter(t => wantsIds.includes(t.category)), 'budget-wants-list', 'budget-wants-total');
        const savingsTotal = renderList(txs.filter(t => savingsIds.includes(t.category)), 'budget-savings-list', 'budget-savings-total');

        const grandTotal = needsTotal + wantsTotal + savingsTotal;
        const income = this.getMonthTransactions(mk).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const usagePct = income > 0 ? Math.min(Math.round((grandTotal / income) * 100), 100) : 0;
        document.getElementById('budget-usage-fill').style.width = usagePct + '%';
        document.getElementById('budget-usage-pct').textContent = usagePct + '%';

        const needsPct = grandTotal > 0 ? Math.round((needsTotal / grandTotal) * 100) : 0;
        const wantsPct = grandTotal > 0 ? Math.round((wantsTotal / grandTotal) * 100) : 0;
        const savingsPct = grandTotal > 0 ? Math.round((savingsTotal / grandTotal) * 100) : 0;
        document.getElementById('ratio-needs-actual').textContent = needsPct + '%';
        document.getElementById('ratio-wants-actual').textContent = wantsPct + '%';
        document.getElementById('ratio-savings-actual').textContent = savingsPct + '%';
    }

    // ===== INSIGHTS =====
    updateInsights() {
        const container = document.getElementById('insight-cards');
        const mk = this.getSelectedMonthKey();
        const curr = this.calcMonthSummary(mk);
        const r = this.calcRatio(mk);
        const insights = [];

        if (curr.income > 0) {
            const savingsRate = Math.round(((curr.income - curr.expense) / curr.income) * 100);
            const emoji = savingsRate >= 20 ? '🎉' : savingsRate >= 10 ? '👍' : '⚠️';
            insights.push({ icon: emoji, title: 'Tingkat Tabungan', text: `Kamu menabung ${savingsRate}% dari pemasukan. ${savingsRate >= 20 ? 'Excellent!' : 'Coba tingkatkan lagi!'}` });
        }
        if (r.total > 0) {
            const needsPct = Math.round((r.needs / r.total) * 100);
            if (needsPct > 55) insights.push({ icon: '📊', title: 'Kebutuhan > 50%', text: `Pengeluaran kebutuhan ${needsPct}%. Coba evaluasi mana yang bisa dikurangi.` });
        }
        const txs = this.getMonthTransactions(mk).filter(t => t.type === 'expense');
        const byCategory = {};
        txs.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
        const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
        if (top) {
            const info = this.getCategoryInfo(top[0], 'expense');
            insights.push({ icon: '🔥', title: 'Pengeluaran Terbesar', text: `"${info ? info.name : top[0]}" = ${this.formatMoney(top[1])}` });
        }
        if (this.settings.budgetTarget > 0 && curr.expense > this.settings.budgetTarget * 0.8) {
            const pct = Math.round((curr.expense / this.settings.budgetTarget) * 100);
            insights.push({ icon: pct > 100 ? '🚨' : '⚠️', title: 'Budget Alert', text: `Pengeluaran sudah ${pct}% dari target (${this.formatMoney(this.settings.budgetTarget)})` });
        }
        if (insights.length === 0) insights.push({ icon: '💡', title: 'Tips', text: 'Mulai catat transaksi untuk insight yang berguna!' });
        container.innerHTML = insights.map(i => `<div class="insight-card"><div class="insight-icon">${i.icon}</div><h4>${i.title}</h4><p>${i.text}</p></div>`).join('');
    }


    // ===== TRANSACTIONS PAGE =====
    renderAllTransactions() {
        const list = document.getElementById('all-transactions-list');
        let filtered = [...this.transactions];
        const typeFilter = document.getElementById('filter-type').value;
        const catFilter = document.getElementById('filter-category').value;
        const monthFilter = document.getElementById('filter-month').value;
        if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
        if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter);
        if (monthFilter) filtered = filtered.filter(t => t.date && t.date.startsWith(monthFilter));
        if (filtered.length === 0) { list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada transaksi</p></div>'; return; }
        list.innerHTML = filtered.map(t => this.renderTransactionItem(t)).join('');
        list.querySelectorAll('.delete-tx').forEach(btn => {
            btn.addEventListener('click', () => { if (confirm('Hapus transaksi ini?')) this.deleteTransaction(btn.dataset.id); });
        });
    }

    renderTransactionItem(t) {
        const catInfo = this.getCategoryInfo(t.category, t.type);
        const icon = catInfo ? catInfo.icon : 'fa-circle';
        const catName = catInfo ? catInfo.name : t.category;
        return `<div class="transaction-item">
            <div class="transaction-icon ${t.type}"><i class="fas ${icon}"></i></div>
            <div class="transaction-details"><div class="tx-category">${catName}</div><div class="tx-note">${t.note || '-'}</div></div>
            <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${this.formatMoney(t.amount)}</span>
            <span class="transaction-date">${this.formatDate(t.date)}</span>
            <div class="transaction-actions"><button class="delete-tx" data-id="${t.id}"><i class="fas fa-trash"></i></button></div>
        </div>`;
    }

    // ===== SETTINGS =====
    loadSettings() {
        document.getElementById('reminder-enabled').checked = this.settings.reminderEnabled;
        document.getElementById('reminder-time').value = this.settings.reminderTime || '20:00';
        document.getElementById('budget-target').value = this.settings.budgetTarget || '';
        document.getElementById('savings-target').value = this.settings.savingsTarget || '';
    }

    saveSettings() {
        this.settings.reminderEnabled = document.getElementById('reminder-enabled').checked;
        this.settings.reminderTime = document.getElementById('reminder-time').value;
        this.settings.budgetTarget = parseInt(document.getElementById('budget-target').value) || 0;
        this.settings.savingsTarget = parseInt(document.getElementById('savings-target').value) || 0;
        localStorage.setItem(`duit_settings_${this.currentUser}`, JSON.stringify(this.settings));
        this.showToast('Pengaturan tersimpan!');
        this.refreshAll();
        if (typeof initReminder === 'function') initReminder(this);
    }

    exportCSV() {
        if (this.transactions.length === 0) return this.showToast('Tidak ada data!');
        const headers = ['Tanggal', 'Tipe', 'Kategori', 'Nominal', 'Keterangan'];
        const rows = this.transactions.map(t => {
            const info = this.getCategoryInfo(t.category, t.type);
            return [t.date, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', info ? info.name : t.category, t.amount, t.note || ''];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `duit-tracker-${this.currentUser}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.showToast('Data di-export!');
    }

    clearAllData() {
        if (!confirm('Yakin hapus SEMUA data transaksi?')) return;
        this.transactions = [];
        this.saveTransactions();
        this.refreshAll();
        this.showToast('Semua data dihapus');
    }


    // ===== MODAL =====
    openModal() {
        document.getElementById('transaction-modal').classList.add('active');
        document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
        this.populateCategorySelect();
    }
    closeModal() {
        document.getElementById('transaction-modal').classList.remove('active');
        document.getElementById('transaction-form').reset();
    }
    populateCategorySelect() {
        const select = document.getElementById('form-category');
        let opts = '';
        if (this.currentType === 'expense') {
            opts += '<optgroup label="Kebutuhan (50%)">';
            CATEGORIES.expense.needs.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
            opts += '</optgroup><optgroup label="Keinginan (30%)">';
            CATEGORIES.expense.wants.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
            opts += '</optgroup><optgroup label="Tabungan/Investasi (20%)">';
            CATEGORIES.expense.savings.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
            opts += '</optgroup><optgroup label="Lainnya">';
            CATEGORIES.expense.other.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
            opts += '</optgroup>';
        } else {
            CATEGORIES.income.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
        }
        select.innerHTML = opts;
    }
    populateFilterCategories() {
        const select = document.getElementById('filter-category');
        let opts = '<option value="all">Semua Kategori</option><optgroup label="Pengeluaran">';
        this.getAllExpenseCategories().forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
        opts += '</optgroup><optgroup label="Pemasukan">';
        CATEGORIES.income.forEach(c => opts += `<option value="${c.id}">${c.name}</option>`);
        opts += '</optgroup>';
        select.innerHTML = opts;
    }
    submitTransaction() {
        const amount = parseInt(document.getElementById('form-amount').value);
        const category = document.getElementById('form-category').value;
        const note = document.getElementById('form-note').value;
        const date = document.getElementById('form-date').value;
        if (!amount || amount <= 0) return this.showToast('Nominal harus lebih dari 0!');
        if (!date) return this.showToast('Pilih tanggal!');
        this.addTransaction({ type: this.currentType, amount, category, note, date });
        this.closeModal();
        this.showToast('Transaksi ditambahkan! ✅');
    }

    // ===== HELPERS =====
    formatMoney(amount) { return 'Rp ' + Math.abs(amount).toLocaleString('id-ID'); }
    formatMoneyShort(amount) {
        if (amount >= 1000000) return 'Rp ' + (amount / 1000000).toFixed(1) + 'jt';
        if (amount >= 1000) return 'Rp ' + Math.round(amount / 1000) + 'rb';
        return 'Rp ' + amount;
    }
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    getCategoryInfo(catId, type) {
        if (type === 'income') return CATEGORIES.income.find(c => c.id === catId);
        return [...CATEGORIES.expense.needs, ...CATEGORIES.expense.wants, ...CATEGORIES.expense.savings, ...CATEGORIES.expense.other].find(c => c.id === catId);
    }
    getAllExpenseCategories() {
        return [...CATEGORIES.expense.needs, ...CATEGORIES.expense.wants, ...CATEGORIES.expense.savings, ...CATEGORIES.expense.other];
    }
    updateGreeting() {
        const h = new Date().getHours();
        let g = 'Selamat Pagi 🌅';
        if (h >= 12 && h < 15) g = 'Selamat Siang ☀️';
        else if (h >= 15 && h < 18) g = 'Selamat Sore 🌇';
        else if (h >= 18) g = 'Selamat Malam 🌙';
        document.getElementById('greeting').textContent = g;
    }
    showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg; t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('duit_theme', theme);
        const icon = document.querySelector('#theme-toggle i');
        if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    toggleTheme() {
        const c = localStorage.getItem('duit_theme') || 'light';
        this.setTheme(c === 'light' ? 'dark' : 'light');
    }


    // ===== EVENT BINDINGS =====
    bindEvents() {
        // Add user
        document.getElementById('add-user-btn').addEventListener('click', () => this.addUser());
        document.getElementById('new-user-name').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('new-user-pin').focus(); });
        document.getElementById('new-user-pin').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addUser(); });

        // PIN modal
        document.getElementById('pin-submit-btn').addEventListener('click', () => this.submitPin());
        document.getElementById('pin-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.submitPin(); });
        document.getElementById('pin-modal-close').addEventListener('click', () => document.getElementById('pin-modal').classList.remove('active'));

        // Logout
        document.getElementById('switch-user-btn').addEventListener('click', () => this.logout());

        // Theme
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Sidebar nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(`page-${item.dataset.page}`).classList.add('active');
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        // Mobile
        document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
        document.getElementById('sidebar-close').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));

        // Period selector
        document.getElementById('dash-month').addEventListener('change', (e) => { this.selectedMonth = parseInt(e.target.value); this.refreshAll(); });
        document.getElementById('dash-year').addEventListener('change', (e) => { this.selectedYear = parseInt(e.target.value); this.refreshAll(); });

        // Transaction modal
        document.getElementById('add-transaction-btn').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('transaction-modal').addEventListener('click', (e) => { if (e.target.id === 'transaction-modal') this.closeModal(); });
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.type;
                this.populateCategorySelect();
            });
        });
        document.getElementById('transaction-form').addEventListener('submit', (e) => { e.preventDefault(); this.submitTransaction(); });

        // Filters
        document.getElementById('filter-type').addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-category').addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-month').addEventListener('change', () => this.renderAllTransactions());

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCSV());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearAllData());

        // Populate filter categories
        this.populateFilterCategories();
    }
}

// Initialize
const app = new DuitTracker();
