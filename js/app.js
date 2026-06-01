// ===== CIELFINANCETOOLS - Main App with Firebase Sync =====

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

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];


class DuitTracker {
    constructor() {
        this.currentUser = null;
        this.householdCode = null;
        this.members = [];
        this.transactions = [];
        this.settings = {};
        this.currentType = 'expense';
        this.selectedMonth = new Date().getMonth();
        this.selectedYear = new Date().getFullYear();
        this.viewMode = 'all'; // 'all', 'mine', 'partner'
        this.useFirebase = typeof fireSync !== 'undefined';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setTheme(localStorage.getItem('duit_theme') || 'light');
        // Check if already connected to a household
        const savedHousehold = localStorage.getItem('duit_household');
        const savedUser = localStorage.getItem('duit_current_user');
        if (savedHousehold && savedUser && this.useFirebase) {
            this.autoReconnect(savedHousehold, savedUser);
        }
    }

    async autoReconnect(code, userName) {
        try {
            fireSync.householdId = code;
            this.householdCode = code;
            this.currentUser = userName;
            this.members = await fireSync.getMembers();
            this.startListening();
            this.enterApp();
        } catch (e) {
            console.log('Auto-reconnect failed, showing login');
        }
    }


    // ===== HOUSEHOLD / COUPLE MANAGEMENT =====
    async createHousehold() {
        const name = document.getElementById('create-name').value.trim();
        const pin = document.getElementById('create-pin').value.trim();
        if (!name) return this.showToast('Masukkan nama!');
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin))
            return this.showToast('PIN harus 4 digit!');

        // Check if Firebase is available
        if (!firebaseReady || !db) {
            this.showToast('Firebase belum siap. Coba refresh halaman.');
            return;
        }

        try {
            this.showToast('Membuat rumah tangga...');
            const code = await fireSync.createHousehold(name, pin);
            this.householdCode = code;
            this.currentUser = name;
            this.members = await fireSync.getMembers();
            localStorage.setItem('duit_current_user', name);
            this.showHouseholdCode(code);
        } catch (e) {
            console.error('createHousehold error:', e);
            this.showToast('Gagal: ' + (e.message || 'Cek koneksi internet'));
        }
    }

    async joinHousehold() {
        const code = document.getElementById('join-code').value.trim();
        const name = document.getElementById('join-name').value.trim();
        const pin = document.getElementById('join-pin').value.trim();
        if (!code) return this.showToast('Masukkan kode!');
        if (!name) return this.showToast('Masukkan nama!');
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin))
            return this.showToast('PIN harus 4 digit!');

        if (!firebaseReady || !db) {
            this.showToast('Firebase belum siap. Coba refresh halaman.');
            return;
        }

        try {
            this.showToast('Bergabung...');
            await fireSync.joinHousehold(code, name, pin);
            this.householdCode = code;
            this.currentUser = name;
            this.members = await fireSync.getMembers();
            localStorage.setItem('duit_current_user', name);
            this.startListening();
            this.enterApp();
            this.showToast('Berhasil bergabung! 🎉');
        } catch (e) {
            this.showToast('Gagal: ' + e.message);
        }
    }

    showHouseholdCode(code) {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('code-screen').classList.add('active');
        document.getElementById('display-code').textContent = code;
    }

    proceedAfterCode() {
        document.getElementById('code-screen').classList.remove('active');
        this.startListening();
        this.enterApp();
    }


    // ===== FIREBASE LISTENERS =====
    startListening() {
        if (!this.useFirebase) return;
        fireSync.listenTransactions((transactions) => {
            this.transactions = transactions;
            if (this.currentUser) this.refreshAll();
        });
        fireSync.listenSettings((settings) => {
            this.settings = { ...this.settings, ...settings };
            if (this.currentUser) {
                this.loadSettings();
                this.refreshAll();
            }
        });
    }

    enterApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('code-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('current-user-display').textContent = this.currentUser;
        document.getElementById('household-code-display').textContent = this.householdCode;
        this.updateGreeting();
        this.initPeriodSelector();
        this.updateMembersList();
        this.loadSettings();
        this.refreshAll();
        if (typeof initReminder === 'function') initReminder(this);
    }

    updateMembersList() {
        const el = document.getElementById('members-list');
        if (!el) return;
        el.innerHTML = this.members.map(m => `
            <div class="member-badge ${m.name === this.currentUser ? 'me' : ''}">
                <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
                <span>${m.name}${m.name === this.currentUser ? ' (Kamu)' : ''}</span>
                <span class="member-role">${m.role === 'owner' ? '👑' : '💑'}</span>
            </div>
        `).join('');
    }

    logout() {
        if (this.useFirebase) fireSync.cleanup();
        localStorage.removeItem('duit_current_user');
        this.currentUser = null;
        this.transactions = [];
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
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
        if (!monthSel || !yearSel) return;
        monthSel.innerHTML = MONTHS_ID.map((m, i) =>
            `<option value="${i}" ${i === this.selectedMonth ? 'selected' : ''}>${m}</option>`
        ).join('');
        const currentYear = new Date().getFullYear();
        let yearsHtml = '';
        for (let y = currentYear; y >= currentYear - 5; y--)
            yearsHtml += `<option value="${y}" ${y === this.selectedYear ? 'selected' : ''}>${y}</option>`;
        yearSel.innerHTML = yearsHtml;
    }

    getSelectedMonthKey() {
        return `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}`;
    }
    getPrevMonthKey() {
        let m = this.selectedMonth - 1, y = this.selectedYear;
        if (m < 0) { m = 11; y--; }
        return `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    getMonthTransactions(monthKey) {
        let txs = this.transactions.filter(t => t.date && t.date.startsWith(monthKey));
        // Filter by view mode (couple feature)
        if (this.viewMode === 'mine') txs = txs.filter(t => t.addedBy === this.currentUser);
        else if (this.viewMode === 'partner') txs = txs.filter(t => t.addedBy !== this.currentUser);
        return txs;
    }

    // ===== TRANSACTIONS CRUD =====
    async addTransaction(tx) {
        tx.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        tx.createdAt = new Date().toISOString();
        tx.addedBy = this.currentUser;

        if (this.useFirebase && fireSync.isConnected()) {
            await fireSync.saveTransaction(tx, this.currentUser);
        } else {
            this.transactions.unshift(tx);
            this.saveLocalTransactions();
            this.refreshAll();
        }
        return tx;
    }

    async deleteTransaction(id) {
        const tx = this.transactions.find(t => t.id === id || t.firebaseId === id);
        if (this.useFirebase && fireSync.isConnected() && tx && tx.firebaseId) {
            await fireSync.deleteTransaction(tx.firebaseId);
        } else {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveLocalTransactions();
            this.refreshAll();
        }
    }

    saveLocalTransactions() {
        localStorage.setItem(`duit_tx_${this.householdCode || 'local'}`, JSON.stringify(this.transactions));
    }


    // ===== CALCULATIONS =====
    calcMonthSummary(monthKey) {
        const txs = this.getMonthTransactions(monthKey);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, balance: income - expense, count: txs.length };
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

    // ===== REFRESH =====
    refreshAll() {
        this.updateDashboard();
        this.updateBudgetPage();
        this.renderAllTransactions();
        this.updateInsights();
        if (typeof updateCharts === 'function') updateCharts(this);
    }

    // ===== DASHBOARD =====
    updateDashboard() {
        const mk = this.getSelectedMonthKey();
        const pk = this.getPrevMonthKey();
        const curr = this.calcMonthSummary(mk);
        const prev = this.calcMonthSummary(pk);
        document.getElementById('total-income').textContent = this.formatMoney(curr.income);
        document.getElementById('total-expense').textContent = this.formatMoney(curr.expense);
        document.getElementById('total-balance').textContent = this.formatMoney(curr.balance);
        document.getElementById('total-count').textContent = curr.count;
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
        this.updateMiniReports(curr, prev);
        this.updateTopExpenses(mk);
        this.updateComparison(mk, pk);
        this.updateHistoryTable();
    }


    setVsBadge(id, current, previous, invertColor = false) {
        const el = document.getElementById(id);
        if (!el) return;
        if (previous === 0) { el.textContent = ''; el.className = 'card-vs'; return; }
        const diff = ((current - previous) / previous) * 100;
        const isUp = diff > 0;
        el.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(Math.round(diff))}% VS Bulan Lalu`;
        el.className = invertColor ? `card-vs ${isUp ? 'down' : 'up'}` : `card-vs ${isUp ? 'up' : 'down'}`;
    }
    updateMiniReports(curr, prev) {
        const el = document.getElementById('mini-reports');
        if (!el) return;
        const items = [];
        if (prev.count > 0) {
            const txDiff = curr.count - prev.count;
            const txPct = ((txDiff / prev.count) * 100).toFixed(1);
            if (txDiff !== 0) items.push(`<div class="mini-item"><i class="fas fa-arrow-${txDiff > 0 ? 'up mini-up' : 'down mini-down'}"></i> Transaksi ${txDiff > 0 ? 'naik' : 'turun'} ${Math.abs(txPct)}% (${curr.count} vs ${prev.count})</div>`);
        }
        if (curr.expense > 0 && this.settings.budgetTarget > 0) {
            const budgetPct = Math.round((curr.expense / this.settings.budgetTarget) * 100);
            items.push(`<div class="mini-item"><i class="fas fa-wallet"></i> Budget terpakai ${budgetPct}%${budgetPct > 80 ? ' ⚠️' : ''}</div>`);
        }
        if (curr.income > 0) {
            const savRate = Math.round(((curr.income - curr.expense) / curr.income) * 100);
            items.push(`<div class="mini-item"><i class="fas fa-piggy-bank"></i> Saving rate: ${savRate}%</div>`);
        }
        // Couple: show who spent more
        if (this.members.length > 1 && this.viewMode === 'all') {
            const mk = this.getSelectedMonthKey();
            const allTx = this.transactions.filter(t => t.date && t.date.startsWith(mk) && t.type === 'expense');
            const byMember = {};
            allTx.forEach(t => { byMember[t.addedBy] = (byMember[t.addedBy] || 0) + t.amount; });
            const sorted = Object.entries(byMember).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) items.push(`<div class="mini-item"><i class="fas fa-users"></i> Terbanyak: ${sorted[0][0]} (${this.formatMoneyShort(sorted[0][1])})</div>`);
        }
        if (items.length === 0) items.push('<div class="mini-item">Belum ada data bulan ini</div>');
        el.innerHTML = items.join('');
    }
    updateTopExpenses(monthKey) {
        const el = document.getElementById('top-expenses-list');
        if (!el) return;
        const txs = this.getMonthTransactions(monthKey).filter(t => t.type === 'expense');
        const byCategory = {};
        txs.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) { el.innerHTML = '<div class="empty-state"><p>Belum ada</p></div>'; return; }
        el.innerHTML = sorted.map(([cat, amt], i) => {
            const info = this.getCategoryInfo(cat, 'expense');
            return `<div class="top-item"><span class="top-rank">${i+1}</span><span class="top-name">${info ? info.name : cat}</span><span class="top-amount">${this.formatMoney(amt)}</span></div>`;
        }).join('');
    }


    updateComparison(currKey, prevKey) {
        const el = document.getElementById('comparison-list');
        if (!el) return;
        const currTxs = this.getMonthTransactions(currKey).filter(t => t.type === 'expense');
        const prevTxs = this.getMonthTransactions(prevKey).filter(t => t.type === 'expense');
        const currByCat = {}, prevByCat = {};
        currTxs.forEach(t => { currByCat[t.category] = (currByCat[t.category] || 0) + t.amount; });
        prevTxs.forEach(t => { prevByCat[t.category] = (prevByCat[t.category] || 0) + t.amount; });
        const allCats = [...new Set([...Object.keys(currByCat), ...Object.keys(prevByCat)])];
        const rows = allCats.map(cat => {
            const c = currByCat[cat] || 0, p = prevByCat[cat] || 0;
            const pct = p > 0 ? Math.round(((c-p)/p)*100) : (c > 0 ? 100 : 0);
            return { cat, c, p, pct };
        }).sort((a,b) => b.c - a.c).slice(0, 12);
        if (!rows.length) { el.innerHTML = '<div class="empty-state"><p>Belum ada data</p></div>'; return; }
        el.innerHTML = rows.map(r => {
            const info = this.getCategoryInfo(r.cat, 'expense');
            const cls = r.pct > 0 ? 'up' : r.pct < 0 ? 'down' : '';
            return `<div class="comp-item"><span class="comp-cat">${info ? info.name : r.cat}</span><span class="comp-now">${this.formatMoneyShort(r.c)}</span><span class="comp-prev">${this.formatMoneyShort(r.p)}</span><span class="comp-pct ${cls}">${r.pct > 0 ? '+' : ''}${r.pct}%</span></div>`;
        }).join('');
    }
    updateHistoryTable() {
        const tbody = document.getElementById('history-tbody');
        const tfoot = document.getElementById('history-tfoot');
        if (!tbody || !tfoot) return;
        const rows = [];
        let tI=0, tE=0, tB=0, tC=0;
        for (let i = 0; i < 6; i++) {
            const d = new Date(this.selectedYear, this.selectedMonth - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
            const s = this.calcMonthSummary(key);
            rows.push({ label, ...s });
            tI += s.income; tE += s.expense; tB += s.balance; tC += s.count;
        }
        tbody.innerHTML = rows.map(r => `<tr><td>${r.label}</td><td>${this.formatMoney(r.income)}</td><td>${this.formatMoney(r.expense)}</td><td>${this.formatMoney(r.balance)}</td><td>${r.count}</td></tr>`).join('');
        tfoot.innerHTML = `<tr><td><strong>RATA-RATA</strong></td><td>${this.formatMoney(Math.round(tI/6))}</td><td>${this.formatMoney(Math.round(tE/6))}</td><td>${this.formatMoney(Math.round(tB/6))}</td><td>${Math.round(tC/6)}</td></tr>`;
    }


    // ===== BUDGET PAGE =====
    updateBudgetPage() {
        const mk = this.getSelectedMonthKey();
        const txs = this.getMonthTransactions(mk).filter(t => t.type === 'expense');
        const needsIds = CATEGORIES.expense.needs.map(c => c.id);
        const wantsIds = CATEGORIES.expense.wants.map(c => c.id);
        const savingsIds = CATEGORIES.expense.savings.map(c => c.id);
        const renderList = (items, cId, tId) => {
            const byCat = {};
            items.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
            const sorted = Object.entries(byCat).sort((a,b) => b[1] - a[1]);
            const total = sorted.reduce((s,[,v]) => s + v, 0);
            const el = document.getElementById(cId);
            if (el) el.innerHTML = sorted.length ? sorted.map(([cat,amt],i) => {
                const info = this.getCategoryInfo(cat,'expense');
                return `<div class="budget-item"><span class="bi-name">${i+1}. ${info?info.name:cat}</span><span class="bi-amount">${this.formatMoney(amt)}</span></div>`;
            }).join('') : '<p style="font-size:12px;color:var(--text-secondary)">Belum ada</p>';
            const tel = document.getElementById(tId);
            if (tel) tel.textContent = this.formatMoney(total);
            return total;
        };
        const nT = renderList(txs.filter(t => needsIds.includes(t.category)||(!wantsIds.includes(t.category)&&!savingsIds.includes(t.category))), 'budget-needs-list','budget-needs-total');
        const wT = renderList(txs.filter(t => wantsIds.includes(t.category)), 'budget-wants-list','budget-wants-total');
        const sT = renderList(txs.filter(t => savingsIds.includes(t.category)), 'budget-savings-list','budget-savings-total');
        const grand = nT + wT + sT;
        const income = this.getMonthTransactions(mk).filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
        const uPct = income > 0 ? Math.min(Math.round((grand/income)*100),100) : 0;
        const uf = document.getElementById('budget-usage-fill');
        if (uf) { uf.style.width = uPct+'%'; }
        const up = document.getElementById('budget-usage-pct');
        if (up) up.textContent = uPct+'%';
        const nPct = grand > 0 ? Math.round((nT/grand)*100) : 0;
        const wPct = grand > 0 ? Math.round((wT/grand)*100) : 0;
        const sPct = grand > 0 ? Math.round((sT/grand)*100) : 0;
        const rn = document.getElementById('ratio-needs-actual');
        const rw = document.getElementById('ratio-wants-actual');
        const rs = document.getElementById('ratio-savings-actual');
        if (rn) rn.textContent = nPct+'%';
        if (rw) rw.textContent = wPct+'%';
        if (rs) rs.textContent = sPct+'%';
    }


    // ===== INSIGHTS =====
    updateInsights() {
        const container = document.getElementById('insight-cards');
        if (!container) return;
        const mk = this.getSelectedMonthKey();
        const curr = this.calcMonthSummary(mk);
        const r = this.calcRatio(mk);
        const insights = [];
        if (curr.income > 0) {
            const sr = Math.round(((curr.income-curr.expense)/curr.income)*100);
            insights.push({ icon: sr>=20?'🎉':sr>=10?'👍':'⚠️', title: 'Tingkat Tabungan', text: `Menabung ${sr}% dari pemasukan. ${sr>=20?'Excellent!':'Tingkatkan!'}` });
        }
        if (r.total > 0 && Math.round((r.needs/r.total)*100) > 55)
            insights.push({ icon:'📊', title:'Kebutuhan > 50%', text:`Kebutuhan ${Math.round((r.needs/r.total)*100)}%. Evaluasi pengeluaran.` });
        const txs = this.getMonthTransactions(mk).filter(t=>t.type==='expense');
        const byCat = {};
        txs.forEach(t => { byCat[t.category] = (byCat[t.category]||0)+t.amount; });
        const top = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
        if (top) { const info = this.getCategoryInfo(top[0],'expense'); insights.push({ icon:'🔥', title:'Terbesar', text:`"${info?info.name:top[0]}" = ${this.formatMoney(top[1])}` }); }
        if (this.settings.budgetTarget > 0 && curr.expense > this.settings.budgetTarget*0.8) {
            const p = Math.round((curr.expense/this.settings.budgetTarget)*100);
            insights.push({ icon:p>100?'🚨':'⚠️', title:'Budget Alert', text:`Sudah ${p}% dari target` });
        }
        // Couple insight
        if (this.members.length > 1) {
            const allTx = this.transactions.filter(t => t.date && t.date.startsWith(mk));
            const myExp = allTx.filter(t => t.addedBy===this.currentUser && t.type==='expense').reduce((s,t)=>s+t.amount,0);
            const partnerExp = allTx.filter(t => t.addedBy!==this.currentUser && t.type==='expense').reduce((s,t)=>s+t.amount,0);
            insights.push({ icon:'💑', title:'Pengeluaran Pasangan', text:`Kamu: ${this.formatMoneyShort(myExp)} | Pasangan: ${this.formatMoneyShort(partnerExp)}` });
        }
        if (!insights.length) insights.push({ icon:'💡', title:'Tips', text:'Catat transaksi untuk insight!' });
        container.innerHTML = insights.map(i => `<div class="insight-card"><div class="insight-icon">${i.icon}</div><h4>${i.title}</h4><p>${i.text}</p></div>`).join('');
    }

    // ===== TRANSACTIONS PAGE =====
    renderAllTransactions() {
        const list = document.getElementById('all-transactions-list');
        if (!list) return;
        let filtered = [...this.transactions];
        // Apply view mode filter
        if (this.viewMode === 'mine') filtered = filtered.filter(t => t.addedBy === this.currentUser);
        else if (this.viewMode === 'partner') filtered = filtered.filter(t => t.addedBy !== this.currentUser);
        const typeF = document.getElementById('filter-type').value;
        const catF = document.getElementById('filter-category').value;
        const monthF = document.getElementById('filter-month').value;
        if (typeF !== 'all') filtered = filtered.filter(t => t.type === typeF);
        if (catF !== 'all') filtered = filtered.filter(t => t.category === catF);
        if (monthF) filtered = filtered.filter(t => t.date && t.date.startsWith(monthF));
        if (!filtered.length) { list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tidak ada transaksi</p></div>'; return; }
        list.innerHTML = filtered.map(t => this.renderTransactionItem(t)).join('');
        list.querySelectorAll('.delete-tx').forEach(btn => {
            btn.addEventListener('click', () => { if (confirm('Hapus?')) this.deleteTransaction(btn.dataset.id); });
        });
    }
    renderTransactionItem(t) {
        const catInfo = this.getCategoryInfo(t.category, t.type);
        const icon = catInfo ? catInfo.icon : 'fa-circle';
        const catName = catInfo ? catInfo.name : t.category;
        const byLabel = (this.members.length > 1 && t.addedBy) ? `<span class="tx-by">${t.addedBy}</span>` : '';
        return `<div class="transaction-item">
            <div class="transaction-icon ${t.type}"><i class="fas ${icon}"></i></div>
            <div class="transaction-details"><div class="tx-category">${catName} ${byLabel}</div><div class="tx-note">${t.note||'-'}</div></div>
            <span class="transaction-amount ${t.type}">${t.type==='income'?'+':'-'} ${this.formatMoney(t.amount)}</span>
            <span class="transaction-date">${this.formatDate(t.date)}</span>
            <div class="transaction-actions"><button class="delete-tx" data-id="${t.firebaseId||t.id}"><i class="fas fa-trash"></i></button></div>
        </div>`;
    }


    // ===== SETTINGS =====
    loadSettings() {
        const re = document.getElementById('reminder-enabled');
        const rt = document.getElementById('reminder-time');
        const bt = document.getElementById('budget-target');
        const st = document.getElementById('savings-target');
        if (re) re.checked = this.settings.reminderEnabled || false;
        if (rt) rt.value = this.settings.reminderTime || '20:00';
        if (bt) bt.value = this.settings.budgetTarget || '';
        if (st) st.value = this.settings.savingsTarget || '';
    }
    async saveSettings() {
        this.settings.reminderEnabled = document.getElementById('reminder-enabled').checked;
        this.settings.reminderTime = document.getElementById('reminder-time').value;
        this.settings.budgetTarget = parseInt(document.getElementById('budget-target').value) || 0;
        this.settings.savingsTarget = parseInt(document.getElementById('savings-target').value) || 0;
        if (this.useFirebase && fireSync.isConnected()) {
            await fireSync.saveSettings(this.settings);
        } else {
            localStorage.setItem(`duit_settings_local`, JSON.stringify(this.settings));
        }
        this.showToast('Pengaturan tersimpan!');
        this.refreshAll();
        if (typeof initReminder === 'function') initReminder(this);
    }
    exportCSV() {
        if (!this.transactions.length) return this.showToast('Tidak ada data!');
        const headers = ['Tanggal','Tipe','Kategori','Nominal','Keterangan','Dicatat Oleh'];
        const rows = this.transactions.map(t => {
            const info = this.getCategoryInfo(t.category, t.type);
            return [t.date, t.type==='income'?'Pemasukan':'Pengeluaran', info?info.name:t.category, t.amount, t.note||'', t.addedBy||''];
        });
        const csv = [headers,...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `duit-tracker-${this.householdCode||'data'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.showToast('Export berhasil!');
    }
    clearAllData() {
        if (!confirm('Yakin hapus SEMUA data?')) return;
        // Only clear if using local or confirm for firebase
        this.transactions = [];
        this.saveLocalTransactions();
        this.refreshAll();
        this.showToast('Data dihapus');
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
            opts += '</optgroup><optgroup label="Investasi (20%)">';
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
        if (!select) return;
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
        if (!amount || amount <= 0) return this.showToast('Nominal harus > 0!');
        if (!date) return this.showToast('Pilih tanggal!');
        this.addTransaction({ type: this.currentType, amount, category, note, date });
        this.closeModal();
        this.showToast('Transaksi ditambahkan! ✅');
    }


    // ===== HELPERS =====
    formatMoney(a) { return 'Rp ' + Math.abs(a).toLocaleString('id-ID'); }
    formatMoneyShort(a) {
        if (a >= 1000000) return 'Rp'+(a/1000000).toFixed(1)+'jt';
        if (a >= 1000) return 'Rp'+Math.round(a/1000)+'rb';
        return 'Rp'+a;
    }
    formatDate(d) {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
    }
    getCategoryInfo(catId, type) {
        if (type==='income') return CATEGORIES.income.find(c=>c.id===catId);
        return [...CATEGORIES.expense.needs,...CATEGORIES.expense.wants,...CATEGORIES.expense.savings,...CATEGORIES.expense.other].find(c=>c.id===catId);
    }
    getAllExpenseCategories() {
        return [...CATEGORIES.expense.needs,...CATEGORIES.expense.wants,...CATEGORIES.expense.savings,...CATEGORIES.expense.other];
    }
    updateGreeting() {
        const h = new Date().getHours();
        let g = h<12?'Selamat Pagi 🌅':h<15?'Selamat Siang ☀️':h<18?'Selamat Sore 🌇':'Selamat Malam 🌙';
        document.getElementById('greeting').textContent = g;
    }
    showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg; t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('duit_theme', theme);
        const icon = document.querySelector('#theme-toggle i');
        if (icon) icon.className = theme==='dark'?'fas fa-sun':'fas fa-moon';
    }
    toggleTheme() {
        const c = localStorage.getItem('duit_theme')||'light';
        this.setTheme(c==='light'?'dark':'light');
    }


    // ===== EVENT BINDINGS =====
    bindEvents() {
        // Login: Create household
        document.getElementById('create-btn')?.addEventListener('click', () => this.createHousehold());
        // Login: Join household
        document.getElementById('join-btn')?.addEventListener('click', () => this.joinHousehold());
        // Code screen: proceed
        document.getElementById('proceed-btn')?.addEventListener('click', () => this.proceedAfterCode());
        // Logout
        document.getElementById('switch-user-btn')?.addEventListener('click', () => this.logout());
        // Theme
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
        // Login tabs
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
            });
        });
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
        document.getElementById('menu-toggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
        document.getElementById('sidebar-close')?.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
        // Period selector
        document.getElementById('dash-month')?.addEventListener('change', (e) => { this.selectedMonth = parseInt(e.target.value); this.refreshAll(); });
        document.getElementById('dash-year')?.addEventListener('change', (e) => { this.selectedYear = parseInt(e.target.value); this.refreshAll(); });
        // View mode (couple filter)
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewMode = btn.dataset.view;
                this.refreshAll();
            });
        });
        // Transaction modal
        document.getElementById('add-transaction-btn')?.addEventListener('click', () => this.openModal());
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('transaction-modal')?.addEventListener('click', (e) => { if (e.target.id==='transaction-modal') this.closeModal(); });
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.type;
                this.populateCategorySelect();
            });
        });
        document.getElementById('transaction-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.submitTransaction(); });
        // Filters
        document.getElementById('filter-type')?.addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-category')?.addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-month')?.addEventListener('change', () => this.renderAllTransactions());
        // Settings
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportCSV());
        document.getElementById('clear-data-btn')?.addEventListener('click', () => this.clearAllData());
        // Copy code button
        document.getElementById('copy-code-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(this.householdCode);
            this.showToast('Kode disalin! Kirim ke pasanganmu 💑');
        });
        this.populateFilterCategories();
    }
}

// Initialize when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { app = new DuitTracker(); });
} else {
    app = new DuitTracker();
}
