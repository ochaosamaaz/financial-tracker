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
        ],
        wants: [
            { id: 'hiburan', name: 'Hiburan', icon: 'fa-film' },
            { id: 'belanja', name: 'Belanja', icon: 'fa-shopping-bag' },
            { id: 'makan_luar', name: 'Makan di Luar', icon: 'fa-hamburger' },
            { id: 'langganan', name: 'Langganan', icon: 'fa-tv' },
            { id: 'liburan', name: 'Liburan', icon: 'fa-plane' },
        ],
        savings: [
            { id: 'tabungan', name: 'Tabungan', icon: 'fa-piggy-bank' },
            { id: 'investasi', name: 'Investasi', icon: 'fa-chart-line' },
            { id: 'dana_darurat', name: 'Dana Darurat', icon: 'fa-shield-alt' },
        ],
        other: [
            { id: 'lainnya_keluar', name: 'Lainnya', icon: 'fa-ellipsis-h' },
        ]
    },
    income: [
        { id: 'gaji', name: 'Gaji', icon: 'fa-briefcase' },
        { id: 'freelance', name: 'Freelance', icon: 'fa-laptop' },
        { id: 'bisnis', name: 'Bisnis', icon: 'fa-store' },
        { id: 'investasi_masuk', name: 'Hasil Investasi', icon: 'fa-chart-line' },
        { id: 'hadiah', name: 'Hadiah/Bonus', icon: 'fa-gift' },
        { id: 'lainnya_masuk', name: 'Lainnya', icon: 'fa-ellipsis-h' },
    ]
};

class DuitTracker {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('duit_users')) || [];
        this.transactions = [];
        this.settings = {};
        this.currentType = 'expense';
        this.editingId = null;
        this.init();
    }


    init() {
        this.renderUserList();
        this.bindEvents();
        this.setTheme(localStorage.getItem('duit_theme') || 'default');
        // Auto-login if only one user
        if (this.users.length === 1) {
            this.loginUser(this.users[0]);
        }
    }

    // ===== USER MANAGEMENT =====
    renderUserList() {
        const list = document.getElementById('user-list');
        if (this.users.length === 0) {
            list.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">Belum ada pengguna. Tambahkan di bawah.</p>';
            return;
        }
        list.innerHTML = this.users.map(user => `
            <div class="user-card" data-user="${user}">
                <div class="avatar">${user.charAt(0).toUpperCase()}</div>
                <span class="user-name">${user}</span>
                <button class="delete-user" data-user="${user}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        list.querySelectorAll('.user-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-user')) {
                    this.loginUser(card.dataset.user);
                }
            });
        });
        list.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteUser(btn.dataset.user);
            });
        });
    }

    addUser(name) {
        name = name.trim();
        if (!name) return this.showToast('Masukkan nama!');
        if (this.users.includes(name)) return this.showToast('Nama sudah ada!');
        this.users.push(name);
        localStorage.setItem('duit_users', JSON.stringify(this.users));
        this.renderUserList();
        document.getElementById('new-user-name').value = '';
        this.showToast(`User "${name}" ditambahkan!`);
    }

    deleteUser(name) {
        if (!confirm(`Hapus user "${name}" beserta semua datanya?`)) return;
        this.users = this.users.filter(u => u !== name);
        localStorage.setItem('duit_users', JSON.stringify(this.users));
        localStorage.removeItem(`duit_tx_${name}`);
        localStorage.removeItem(`duit_settings_${name}`);
        this.renderUserList();
        this.showToast(`User "${name}" dihapus`);
    }

    loginUser(name) {
        this.currentUser = name;
        this.transactions = JSON.parse(localStorage.getItem(`duit_tx_${name}`)) || [];
        this.settings = JSON.parse(localStorage.getItem(`duit_settings_${name}`)) || {
            reminderEnabled: false,
            reminderTime: '20:00',
            budgetTarget: 0,
            savingsTarget: 0
        };
        document.getElementById('user-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('current-user-display').textContent = name;
        this.updateGreeting();
        this.loadSettings();
        this.refreshAll();
        initReminder(this);
    }

    switchUser() {
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('user-screen').classList.add('active');
        this.currentUser = null;
    }


    // ===== TRANSACTIONS =====
    addTransaction(tx) {
        tx.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        tx.createdAt = new Date().toISOString();
        this.transactions.unshift(tx);
        this.saveTransactions();
        this.refreshAll();
        return tx;
    }

    updateTransaction(id, data) {
        const idx = this.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            this.transactions[idx] = { ...this.transactions[idx], ...data };
            this.saveTransactions();
            this.refreshAll();
        }
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
        this.refreshAll();
    }

    saveTransactions() {
        localStorage.setItem(`duit_tx_${this.currentUser}`, JSON.stringify(this.transactions));
    }

    getMonthlyTransactions(month = null) {
        const now = new Date();
        const target = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return this.transactions.filter(t => t.date && t.date.startsWith(target));
    }

    // ===== CALCULATIONS =====
    isSavingsCategory(categoryId) {
        const savingsIds = CATEGORIES.expense.savings.map(c => c.id);
        return savingsIds.includes(categoryId);
    }

    calcSummary() {
        const monthly = this.getMonthlyTransactions();
        const income = monthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        // Savings categories (tabungan, investasi, dana_darurat) are NOT expenses
        const expense = monthly.filter(t => t.type === 'expense' && !this.isSavingsCategory(t.category)).reduce((s, t) => s + t.amount, 0);
        const savings = monthly.filter(t => t.type === 'expense' && this.isSavingsCategory(t.category)).reduce((s, t) => s + t.amount, 0);

        const allIncome = this.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const allExpense = this.transactions.filter(t => t.type === 'expense' && !this.isSavingsCategory(t.category)).reduce((s, t) => s + t.amount, 0);
        const allSavings = this.transactions.filter(t => t.type === 'expense' && this.isSavingsCategory(t.category)).reduce((s, t) => s + t.amount, 0);

        // Balance = income - real expenses (savings are not subtracted, they are part of your wealth)
        return { 
            income, expense, savings, 
            balance: allIncome - allExpense, 
            monthlyIncome: income, 
            monthlyExpense: expense, 
            monthlySavings: savings,
            totalSavings: allSavings 
        };
    }

    calcRatio() {
        const monthly = this.getMonthlyTransactions();
        const expenses = monthly.filter(t => t.type === 'expense');
        const totalSpending = expenses.reduce((s, t) => s + t.amount, 0);
        
        const needsIds = CATEGORIES.expense.needs.map(c => c.id);
        const wantsIds = CATEGORIES.expense.wants.map(c => c.id);
        const savingsIds = CATEGORIES.expense.savings.map(c => c.id);

        const needs = expenses.filter(t => needsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const wants = expenses.filter(t => wantsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const savings = expenses.filter(t => savingsIds.includes(t.category)).reduce((s, t) => s + t.amount, 0);
        const other = totalSpending - needs - wants - savings;

        return { needs: needs + other, wants, savings, total: totalSpending };
    }


    // ===== UI UPDATES =====
    refreshAll() {
        this.updateSummaryCards();
        this.updateRatio();
        this.renderRecentTransactions();
        this.renderAllTransactions();
        this.updateInsights();
        if (typeof updateCharts === 'function') updateCharts(this);
    }

    updateSummaryCards() {
        const s = this.calcSummary();
        document.getElementById('total-balance').textContent = this.formatMoney(s.balance);
        document.getElementById('total-income').textContent = this.formatMoney(s.income);
        document.getElementById('total-expense').textContent = this.formatMoney(s.expense);
        document.getElementById('total-savings').textContent = this.formatMoney(s.monthlySavings);
    }

    updateRatio() {
        const r = this.calcRatio();
        const total = r.total || 1;
        const needsPct = Math.round((r.needs / total) * 100);
        const wantsPct = Math.round((r.wants / total) * 100);
        const savingsPct = Math.round((r.savings / total) * 100);

        document.getElementById('ratio-needs').style.width = `${needsPct}%`;
        document.getElementById('ratio-wants').style.width = `${wantsPct}%`;
        document.getElementById('ratio-savings').style.width = `${savingsPct}%`;
        document.getElementById('ratio-needs-pct').textContent = `${needsPct}%`;
        document.getElementById('ratio-wants-pct').textContent = `${wantsPct}%`;
        document.getElementById('ratio-savings-pct').textContent = `${savingsPct}%`;
        document.getElementById('ratio-needs-amount').textContent = this.formatMoney(r.needs);
        document.getElementById('ratio-wants-amount').textContent = this.formatMoney(r.wants);
        document.getElementById('ratio-savings-amount').textContent = this.formatMoney(r.savings);
    }

    renderRecentTransactions() {
        const list = document.getElementById('recent-list');
        const recent = this.transactions.slice(0, 5);
        if (recent.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Belum ada transaksi</p></div>';
            return;
        }
        list.innerHTML = recent.map(t => this.renderTransactionItem(t, false)).join('');
    }

    renderAllTransactions() {
        const list = document.getElementById('all-transactions-list');
        let filtered = [...this.transactions];
        
        const typeFilter = document.getElementById('filter-type').value;
        const catFilter = document.getElementById('filter-category').value;
        const monthFilter = document.getElementById('filter-month').value;

        if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
        if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter);
        if (monthFilter) filtered = filtered.filter(t => t.date && t.date.startsWith(monthFilter));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Tidak ada transaksi ditemukan</p></div>';
            return;
        }
        list.innerHTML = filtered.map(t => this.renderTransactionItem(t, true)).join('');
        list.querySelectorAll('.delete-tx').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Hapus transaksi ini?')) this.deleteTransaction(btn.dataset.id);
            });
        });
    }

    renderTransactionItem(t, showActions = false) {
        const catInfo = this.getCategoryInfo(t.category, t.type);
        const icon = catInfo ? catInfo.icon : 'fa-circle';
        const catName = catInfo ? catInfo.name : t.category;
        // Savings categories show as positive (like income)
        const isSavings = t.type === 'expense' && this.isSavingsCategory(t.category);
        const displayType = isSavings ? 'savings' : t.type;
        const prefix = t.type === 'income' ? '+' : isSavings ? '↗' : '-';
        return `
            <div class="transaction-item">
                <div class="transaction-icon ${displayType}"><i class="fas ${icon}"></i></div>
                <div class="transaction-details">
                    <div class="tx-category">${catName}${isSavings ? ' <small style="color:var(--savings-color)">(Tabungan)</small>' : ''}</div>
                    <div class="tx-note">${t.note || '-'}</div>
                </div>
                <span class="transaction-amount ${displayType}">
                    ${prefix} ${this.formatMoney(t.amount)}
                </span>
                <span class="transaction-date">${this.formatDate(t.date)}</span>
                ${showActions ? `<div class="transaction-actions"><button class="delete-tx" data-id="${t.id}"><i class="fas fa-trash"></i></button></div>` : ''}
            </div>
        `;
    }


    // ===== INSIGHTS =====
    updateInsights() {
        const container = document.getElementById('insight-cards');
        const s = this.calcSummary();
        const r = this.calcRatio();
        const insights = [];

        // Savings rate
        if (s.income > 0) {
            const savingsRate = Math.round(((s.income - s.expense) / s.income) * 100);
            const emoji = savingsRate >= 20 ? '🎉' : savingsRate >= 10 ? '👍' : '⚠️';
            insights.push({
                icon: emoji,
                title: 'Tingkat Tabungan',
                text: `Kamu menabung ${savingsRate}% dari pemasukan bulan ini. ${savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Lumayan, tingkatkan lagi!' : 'Coba kurangi pengeluaran.'}`
            });
        }

        // 50/30/20 analysis
        if (r.total > 0) {
            const needsPct = (r.needs / r.total) * 100;
            if (needsPct > 50) {
                insights.push({ icon: '📊', title: 'Kebutuhan Melebihi 50%', text: `Pengeluaran kebutuhan kamu ${Math.round(needsPct)}%. Idealnya maksimal 50% dari total.` });
            }
        }

        // Top category
        const monthly = this.getMonthlyTransactions();
        const expenseByCategory = {};
        monthly.filter(t => t.type === 'expense').forEach(t => {
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
        });
        const topCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
            const catInfo = this.getCategoryInfo(topCategory[0], 'expense');
            insights.push({
                icon: '🔥',
                title: 'Pengeluaran Terbesar',
                text: `Kategori "${catInfo ? catInfo.name : topCategory[0]}" adalah pengeluaran terbesar: ${this.formatMoney(topCategory[1])}`
            });
        }

        // Budget warning
        if (this.settings.budgetTarget > 0 && s.expense > this.settings.budgetTarget * 0.8) {
            const pct = Math.round((s.expense / this.settings.budgetTarget) * 100);
            insights.push({
                icon: s.expense > this.settings.budgetTarget ? '🚨' : '⚠️',
                title: 'Peringatan Budget',
                text: `Pengeluaran sudah ${pct}% dari target bulanan (${this.formatMoney(this.settings.budgetTarget)})`
            });
        }

        if (insights.length === 0) {
            insights.push({ icon: '💡', title: 'Tips', text: 'Mulai catat transaksimu untuk mendapatkan insight keuangan yang berguna!' });
        }

        container.innerHTML = insights.map(i => `
            <div class="insight-card">
                <div class="insight-icon">${i.icon}</div>
                <h4>${i.title}</h4>
                <p>${i.text}</p>
            </div>
        `).join('');
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
        initReminder(this);
    }

    exportCSV() {
        if (this.transactions.length === 0) return this.showToast('Tidak ada data untuk di-export');
        const headers = ['Tanggal', 'Tipe', 'Kategori', 'Nominal', 'Keterangan'];
        const rows = this.transactions.map(t => {
            const catInfo = this.getCategoryInfo(t.category, t.type);
            return [t.date, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', catInfo ? catInfo.name : t.category, t.amount, t.note || ''];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `duit-tracker-${this.currentUser}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.showToast('Data berhasil di-export!');
    }

    clearAllData() {
        if (!confirm('Yakin hapus semua data transaksi? Tindakan ini tidak bisa dibatalkan!')) return;
        this.transactions = [];
        this.saveTransactions();
        this.refreshAll();
        this.showToast('Semua data dihapus');
    }

    // ===== HELPERS =====
    formatMoney(amount) {
        return 'Rp ' + Math.abs(amount).toLocaleString('id-ID');
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    getCategoryInfo(catId, type) {
        if (type === 'income') return CATEGORIES.income.find(c => c.id === catId);
        const allExpense = [...CATEGORIES.expense.needs, ...CATEGORIES.expense.wants, ...CATEGORIES.expense.savings, ...CATEGORIES.expense.other];
        return allExpense.find(c => c.id === catId);
    }

    getAllExpenseCategories() {
        return [...CATEGORIES.expense.needs, ...CATEGORIES.expense.wants, ...CATEGORIES.expense.savings, ...CATEGORIES.expense.other];
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greet = 'Selamat Pagi';
        if (hour >= 12 && hour < 15) greet = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) greet = 'Selamat Sore';
        else if (hour >= 18) greet = 'Selamat Malam';
        document.getElementById('greeting').textContent = greet + ' 👋';
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('duit_theme', theme);
        const icon = document.querySelector('#theme-toggle i');
        // Update theme toggle icon based on light/dark
        const darkThemes = ['midnight', 'charcoal', 'dark'];
        icon.className = darkThemes.includes(theme) ? 'fas fa-sun' : 'fas fa-moon';
        // Update active theme in picker
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });
    }

    toggleTheme() {
        const current = localStorage.getItem('duit_theme') || 'default';
        const darkThemes = ['midnight', 'charcoal', 'dark'];
        // Toggle between current theme and midnight (dark)
        if (darkThemes.includes(current)) {
            this.setTheme('default');
        } else {
            this.setTheme('midnight');
        }
    }


    // ===== EVENT BINDINGS =====
    bindEvents() {
        // Add user
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.addUser(document.getElementById('new-user-name').value);
        });
        document.getElementById('new-user-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addUser(e.target.value);
        });

        // Switch user
        document.getElementById('switch-user-btn').addEventListener('click', () => this.switchUser());

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(`page-${item.dataset.page}`).classList.add('active');
                // Close sidebar on mobile
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        // Mobile menu
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
        document.getElementById('sidebar-close').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });

        // Transaction modal
        document.getElementById('add-transaction-btn').addEventListener('click', () => this.openModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('transaction-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('transaction-modal')) this.closeModal();
        });

        // Type toggle in form
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.type;
                this.populateCategorySelect();
            });
        });

        // Form submit
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitTransaction();
        });

        // Filters
        document.getElementById('filter-type').addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-category').addEventListener('change', () => this.renderAllTransactions());
        document.getElementById('filter-month').addEventListener('change', () => this.renderAllTransactions());

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCSV());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearAllData());

        // Theme picker
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.setTheme(opt.dataset.theme);
            });
        });

        // Populate filter categories
        this.populateFilterCategories();
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
        this.editingId = null;
    }

    populateCategorySelect() {
        const select = document.getElementById('form-category');
        let options = '';
        if (this.currentType === 'expense') {
            options += '<optgroup label="Kebutuhan (50%)">';
            CATEGORIES.expense.needs.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
            options += '</optgroup><optgroup label="Keinginan (30%)">';
            CATEGORIES.expense.wants.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
            options += '</optgroup><optgroup label="Tabungan (20%)">';
            CATEGORIES.expense.savings.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
            options += '</optgroup><optgroup label="Lainnya">';
            CATEGORIES.expense.other.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
            options += '</optgroup>';
        } else {
            CATEGORIES.income.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
        }
        select.innerHTML = options;
    }

    populateFilterCategories() {
        const select = document.getElementById('filter-category');
        let options = '<option value="all">Semua Kategori</option>';
        options += '<optgroup label="Pengeluaran">';
        this.getAllExpenseCategories().forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
        options += '</optgroup><optgroup label="Pemasukan">';
        CATEGORIES.income.forEach(c => options += `<option value="${c.id}">${c.name}</option>`);
        options += '</optgroup>';
        select.innerHTML = options;
    }

    submitTransaction() {
        const amount = parseInt(document.getElementById('form-amount').value);
        const category = document.getElementById('form-category').value;
        const note = document.getElementById('form-note').value;
        const date = document.getElementById('form-date').value;

        if (!amount || amount <= 0) return this.showToast('Masukkan nominal yang valid!');
        if (!date) return this.showToast('Pilih tanggal!');

        const tx = { type: this.currentType, amount, category, note, date };
        this.addTransaction(tx);
        this.closeModal();
        this.showToast('Transaksi berhasil ditambahkan! ✅');
    }
}

// Initialize app
const app = new DuitTracker();
