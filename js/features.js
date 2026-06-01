// ===== PREMIUM FEATURES MODULE =====
// Duit Tracker Pro - Extended Features

class PremiumFeatures {
    constructor(appInstance) {
        this.app = appInstance;
        this.goals = [];
        this.debts = [];
        this.recurring = [];
        this.wishlist = [];
        this.achievements = [];
        this.challenges = [];
        this.streakData = { currentStreak: 0, lastDate: null };
        this.useFirebase = typeof fireSync !== 'undefined' && fireSync.isConnected();
        this.init();
    }

    init() {
        this.loadAllData();
        this.checkRecurring();
        this.updateStreakData();
    }

    getHouseholdCode() {
        return this.app.householdCode || 'local';
    }

    // ===== FIREBASE / LOCAL STORAGE HELPERS =====
    async saveToFirebase(path, data) {
        if (this.useFirebase && fireSync.isConnected()) {
            const code = this.getHouseholdCode();
            await db.ref(`households/${code}/${path}`).set(data);
        }
    }


    async pushToFirebase(path, data) {
        if (this.useFirebase && fireSync.isConnected()) {
            const code = this.getHouseholdCode();
            const ref = db.ref(`households/${code}/${path}`).push();
            data.firebaseId = ref.key;
            await ref.set(data);
            return data;
        }
        return data;
    }

    async removeFromFirebase(path, firebaseId) {
        if (this.useFirebase && fireSync.isConnected()) {
            const code = this.getHouseholdCode();
            await db.ref(`households/${code}/${path}/${firebaseId}`).remove();
        }
    }

    async updateInFirebase(path, firebaseId, data) {
        if (this.useFirebase && fireSync.isConnected()) {
            const code = this.getHouseholdCode();
            await db.ref(`households/${code}/${path}/${firebaseId}`).update(data);
        }
    }

    saveLocal(key, data) {
        localStorage.setItem(`duit_${key}_${this.getHouseholdCode()}`, JSON.stringify(data));
    }

    loadLocal(key) {
        try {
            return JSON.parse(localStorage.getItem(`duit_${key}_${this.getHouseholdCode()}`)) || [];
        } catch (e) { return []; }
    }


    loadAllData() {
        this.goals = this.loadLocal('goals');
        this.debts = this.loadLocal('debts');
        this.recurring = this.loadLocal('recurring');
        this.wishlist = this.loadLocal('wishlist');
        this.achievements = this.loadLocal('achievements');
        this.streakData = JSON.parse(localStorage.getItem(`duit_streak_${this.getHouseholdCode()}`)) || { currentStreak: 0, lastDate: null };
        this.challenges = this.loadLocal('challenges');
        if (!this.challenges.length) this.initDefaultChallenges();
        this.listenFirebase();
    }

    listenFirebase() {
        if (!this.useFirebase || !fireSync.isConnected()) return;
        const code = this.getHouseholdCode();

        db.ref(`households/${code}/goals`).on('value', (snap) => {
            if (snap.exists()) {
                this.goals = Object.entries(snap.val()).map(([k, v]) => ({ ...v, firebaseId: k }));
                this.saveLocal('goals', this.goals);
                if (typeof premiumUI !== 'undefined') premiumUI.renderCurrentPage();
            }
        });

        db.ref(`households/${code}/debts`).on('value', (snap) => {
            if (snap.exists()) {
                this.debts = Object.entries(snap.val()).map(([k, v]) => ({ ...v, firebaseId: k }));
                this.saveLocal('debts', this.debts);
                if (typeof premiumUI !== 'undefined') premiumUI.renderCurrentPage();
            }
        });


        db.ref(`households/${code}/recurring`).on('value', (snap) => {
            if (snap.exists()) {
                this.recurring = Object.entries(snap.val()).map(([k, v]) => ({ ...v, firebaseId: k }));
                this.saveLocal('recurring', this.recurring);
                if (typeof premiumUI !== 'undefined') premiumUI.renderCurrentPage();
            }
        });

        db.ref(`households/${code}/wishlist`).on('value', (snap) => {
            if (snap.exists()) {
                this.wishlist = Object.entries(snap.val()).map(([k, v]) => ({ ...v, firebaseId: k }));
                this.saveLocal('wishlist', this.wishlist);
                if (typeof premiumUI !== 'undefined') premiumUI.renderCurrentPage();
            }
        });
    }

    // =========================================
    // 1. TARGET TABUNGAN (SAVINGS GOALS)
    // =========================================
    async addGoal(goal) {
        goal.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        goal.createdAt = new Date().toISOString();
        goal.currentAmount = goal.currentAmount || 0;
        goal.createdBy = this.app.currentUser;
        goal = await this.pushToFirebase('goals', goal);
        this.goals.push(goal);
        this.saveLocal('goals', this.goals);
        this.checkAchievement('first_goal');
        return goal;
    }


    async updateGoalProgress(goalId, amount) {
        const goal = this.goals.find(g => g.id === goalId || g.firebaseId === goalId);
        if (!goal) return;
        goal.currentAmount = (goal.currentAmount || 0) + amount;
        if (goal.currentAmount >= goal.targetAmount) {
            goal.completed = true;
            this.checkAchievement('goal_completed');
        }
        if (goal.firebaseId) {
            await this.updateInFirebase('goals', goal.firebaseId, { currentAmount: goal.currentAmount, completed: goal.completed || false });
        }
        this.saveLocal('goals', this.goals);
        return goal;
    }

    async deleteGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId || g.firebaseId === goalId);
        if (goal && goal.firebaseId) await this.removeFromFirebase('goals', goal.firebaseId);
        this.goals = this.goals.filter(g => g.id !== goalId && g.firebaseId !== goalId);
        this.saveLocal('goals', this.goals);
    }

    getGoalProgress(goal) {
        if (!goal.targetAmount || goal.targetAmount === 0) return 0;
        return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
    }

    getGoalDaysLeft(goal) {
        if (!goal.deadline) return null;
        const diff = new Date(goal.deadline) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }


    renderGoals() {
        if (!this.goals.length) {
            return '<div class="empty-state"><i class="fas fa-bullseye"></i><p>Belum ada target tabungan. Tambahkan sekarang!</p></div>';
        }
        return this.goals.map(g => {
            const pct = this.getGoalProgress(g);
            const daysLeft = this.getGoalDaysLeft(g);
            const statusClass = g.completed ? 'completed' : (pct > 70 ? 'almost' : '');
            return `<div class="goal-card ${statusClass}" data-id="${g.firebaseId || g.id}">
                <div class="goal-header">
                    <h4>${g.name}</h4>
                    <div class="goal-actions">
                        <button class="btn-add-progress" data-id="${g.firebaseId || g.id}" title="Tambah tabungan"><i class="fas fa-plus"></i></button>
                        <button class="btn-delete-goal" data-id="${g.firebaseId || g.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
                <div class="goal-info">
                    <span class="goal-amount">${this.app.formatMoney(g.currentAmount)} / ${this.app.formatMoney(g.targetAmount)}</span>
                    <span class="goal-pct">${pct}%</span>
                </div>
                <div class="goal-meta">
                    ${daysLeft !== null ? `<span><i class="fas fa-clock"></i> ${daysLeft} hari lagi</span>` : ''}
                    ${g.completed ? '<span class="goal-badge-done"><i class="fas fa-check-circle"></i> Tercapai!</span>' : ''}
                </div>
            </div>`;
        }).join('');
    }


    // =========================================
    // 2. HUTANG / PIUTANG (DEBT TRACKER)
    // =========================================
    async addDebt(debt) {
        debt.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        debt.createdAt = new Date().toISOString();
        debt.status = 'unpaid';
        debt.createdBy = this.app.currentUser;
        debt = await this.pushToFirebase('debts', debt);
        this.debts.push(debt);
        this.saveLocal('debts', this.debts);
        return debt;
    }

    async markDebtPaid(debtId) {
        const debt = this.debts.find(d => d.id === debtId || d.firebaseId === debtId);
        if (!debt) return;
        debt.status = 'paid';
        debt.paidAt = new Date().toISOString();
        if (debt.firebaseId) {
            await this.updateInFirebase('debts', debt.firebaseId, { status: 'paid', paidAt: debt.paidAt });
        }
        this.saveLocal('debts', this.debts);
        return debt;
    }

    async deleteDebt(debtId) {
        const debt = this.debts.find(d => d.id === debtId || d.firebaseId === debtId);
        if (debt && debt.firebaseId) await this.removeFromFirebase('debts', debt.firebaseId);
        this.debts = this.debts.filter(d => d.id !== debtId && d.firebaseId !== debtId);
        this.saveLocal('debts', this.debts);
    }

    getTotalDebt() {
        return this.debts.filter(d => d.type === 'hutang' && d.status === 'unpaid').reduce((s, d) => s + d.amount, 0);
    }

    getTotalPiutang() {
        return this.debts.filter(d => d.type === 'piutang' && d.status === 'unpaid').reduce((s, d) => s + d.amount, 0);
    }


    renderDebts() {
        if (!this.debts.length) {
            return '<div class="empty-state"><i class="fas fa-handshake"></i><p>Belum ada catatan hutang/piutang</p></div>';
        }
        const unpaid = this.debts.filter(d => d.status === 'unpaid');
        const paid = this.debts.filter(d => d.status === 'paid');
        let html = '';
        if (unpaid.length) {
            html += '<h4 class="debt-section-title">Belum Lunas</h4>';
            html += unpaid.map(d => this.renderDebtCard(d)).join('');
        }
        if (paid.length) {
            html += '<h4 class="debt-section-title paid-title">Sudah Lunas</h4>';
            html += paid.map(d => this.renderDebtCard(d)).join('');
        }
        return html;
    }

    renderDebtCard(d) {
        const isHutang = d.type === 'hutang';
        const statusBadge = d.status === 'paid'
            ? '<span class="debt-status-badge paid"><i class="fas fa-check"></i> Lunas</span>'
            : '<span class="debt-status-badge unpaid"><i class="fas fa-clock"></i> Belum Lunas</span>';
        const dueInfo = d.dueDate ? `<span class="debt-due"><i class="fas fa-calendar"></i> ${this.app.formatDate(d.dueDate)}</span>` : '';
        return `<div class="debt-card ${d.status}" data-id="${d.firebaseId || d.id}">
            <div class="debt-type-badge ${d.type}">${isHutang ? 'HUTANG' : 'PIUTANG'}</div>
            <div class="debt-content">
                <div class="debt-person"><i class="fas fa-user"></i> ${isHutang ? 'Ke: ' : 'Dari: '}${d.person}</div>
                <div class="debt-amount ${d.type}">${this.app.formatMoney(d.amount)}</div>
                <div class="debt-note">${d.note || '-'}</div>
                <div class="debt-footer">
                    ${statusBadge} ${dueInfo}
                </div>
            </div>
            <div class="debt-actions">
                ${d.status === 'unpaid' ? `<button class="btn-mark-paid" data-id="${d.firebaseId || d.id}" title="Tandai lunas"><i class="fas fa-check-circle"></i></button>` : ''}
                <button class="btn-delete-debt" data-id="${d.firebaseId || d.id}" title="Hapus"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }


    // =========================================
    // 3. SPLIT BILL
    // =========================================
    calculateSplit(total, members, mode, customSplits) {
        const result = [];
        if (mode === 'equal') {
            const perPerson = Math.round(total / members.length);
            members.forEach(m => {
                result.push({ name: m, amount: perPerson });
            });
        } else if (mode === 'custom' && customSplits) {
            members.forEach((m, i) => {
                result.push({ name: m, amount: customSplits[i] || 0 });
            });
        } else if (mode === 'percentage' && customSplits) {
            members.forEach((m, i) => {
                const pct = customSplits[i] || 0;
                result.push({ name: m, amount: Math.round(total * pct / 100) });
            });
        }
        return result;
    }

    generateSplitSummary(total, splits, paidBy) {
        let html = '<div class="split-result">';
        html += `<div class="split-total"><strong>Total:</strong> ${this.app.formatMoney(total)}</div>`;
        html += `<div class="split-paid-by"><strong>Dibayar oleh:</strong> ${paidBy}</div>`;
        html += '<div class="split-breakdown">';
        splits.forEach(s => {
            const owes = s.name !== paidBy;
            html += `<div class="split-item ${owes ? 'owes' : 'paid'}">
                <span class="split-name">${s.name}</span>
                <span class="split-amount">${this.app.formatMoney(s.amount)}</span>
                ${owes ? `<span class="split-label">harus bayar ke ${paidBy}</span>` : '<span class="split-label">sudah bayar</span>'}
            </div>`;
        });
        html += '</div></div>';
        return html;
    }


    renderSplitBill() {
        const members = this.app.members.length > 0
            ? this.app.members.map(m => m.name)
            : [this.app.currentUser || 'Kamu'];
        return `<div class="split-bill-form">
            <div class="form-group">
                <label>Total Tagihan (Rp)</label>
                <input type="number" id="split-total" placeholder="0" min="1">
            </div>
            <div class="form-group">
                <label>Dibayar Oleh</label>
                <select id="split-paid-by">
                    ${members.map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Anggota yang ikut</label>
                <div class="split-members-check" id="split-members">
                    ${members.map(m => `<label class="check-label"><input type="checkbox" value="${m}" checked> ${m}</label>`).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Mode Pembagian</label>
                <div class="type-toggle">
                    <button type="button" class="type-btn active" data-split="equal">Rata</button>
                    <button type="button" class="type-btn" data-split="percentage">Persentase</button>
                    <button type="button" class="type-btn" data-split="custom">Custom</button>
                </div>
            </div>
            <div id="split-custom-inputs" style="display:none"></div>
            <button class="btn-primary full-width" id="calculate-split-btn"><i class="fas fa-calculator"></i> Hitung Split</button>
            <div id="split-result-area"></div>
        </div>`;
    }


    // =========================================
    // 4. RECURRING TRANSACTIONS
    // =========================================
    async addRecurring(item) {
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        item.createdAt = new Date().toISOString();
        item.lastGenerated = null;
        item.active = true;
        item.createdBy = this.app.currentUser;
        item = await this.pushToFirebase('recurring', item);
        this.recurring.push(item);
        this.saveLocal('recurring', this.recurring);
        return item;
    }

    async deleteRecurring(itemId) {
        const item = this.recurring.find(r => r.id === itemId || r.firebaseId === itemId);
        if (item && item.firebaseId) await this.removeFromFirebase('recurring', item.firebaseId);
        this.recurring = this.recurring.filter(r => r.id !== itemId && r.firebaseId !== itemId);
        this.saveLocal('recurring', this.recurring);
    }

    async toggleRecurring(itemId) {
        const item = this.recurring.find(r => r.id === itemId || r.firebaseId === itemId);
        if (!item) return;
        item.active = !item.active;
        if (item.firebaseId) await this.updateInFirebase('recurring', item.firebaseId, { active: item.active });
        this.saveLocal('recurring', this.recurring);
        return item;
    }

    checkRecurring() {
        const today = new Date().toISOString().split('T')[0];
        this.recurring.filter(r => r.active).forEach(r => {
            if (this.shouldGenerate(r, today)) {
                this.generateRecurringTransaction(r, today);
            }
        });
    }


    shouldGenerate(recurring, today) {
        if (recurring.lastGenerated === today) return false;
        const lastGen = recurring.lastGenerated ? new Date(recurring.lastGenerated) : null;
        const now = new Date(today);
        if (!lastGen) return true;
        const diffDays = Math.floor((now - lastGen) / (1000 * 60 * 60 * 24));
        switch (recurring.frequency) {
            case 'daily': return diffDays >= 1;
            case 'weekly': return diffDays >= 7;
            case 'monthly': return diffDays >= 28;
            default: return false;
        }
    }

    async generateRecurringTransaction(recurring, today) {
        const tx = {
            type: recurring.type || 'expense',
            amount: recurring.amount,
            category: recurring.category,
            note: `[Otomatis] ${recurring.name}`,
            date: today
        };
        await this.app.addTransaction(tx);
        recurring.lastGenerated = today;
        if (recurring.firebaseId) {
            await this.updateInFirebase('recurring', recurring.firebaseId, { lastGenerated: today });
        }
        this.saveLocal('recurring', this.recurring);
    }

    renderRecurring() {
        if (!this.recurring.length) {
            return '<div class="empty-state"><i class="fas fa-redo"></i><p>Belum ada transaksi berulang</p></div>';
        }
        return this.recurring.map(r => {
            const freqLabel = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' }[r.frequency] || r.frequency;
            return `<div class="recurring-card ${r.active ? '' : 'inactive'}" data-id="${r.firebaseId || r.id}">
                <div class="recurring-info">
                    <h4>${r.name}</h4>
                    <span class="recurring-amount ${r.type}">${r.type === 'income' ? '+' : '-'} ${this.app.formatMoney(r.amount)}</span>
                    <span class="recurring-freq"><i class="fas fa-sync-alt"></i> ${freqLabel}</span>
                </div>
                <div class="recurring-actions">
                    <button class="btn-toggle-recurring" data-id="${r.firebaseId || r.id}" title="${r.active ? 'Nonaktifkan' : 'Aktifkan'}"><i class="fas fa-${r.active ? 'pause' : 'play'}"></i></button>
                    <button class="btn-delete-recurring" data-id="${r.firebaseId || r.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }


    // =========================================
    // 5. WEEKLY REPORT & SPENDING STREAK
    // =========================================
    getWeeklyReport() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const weekStart = startOfWeek.toISOString().split('T')[0];

        const weekTxs = this.app.transactions.filter(t => t.date >= weekStart);
        const income = weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savings = income - expense;
        const avgDaily = expense / 7;
        const topCategory = this.getTopCategoryThisWeek(weekTxs);

        return { income, expense, savings, avgDaily, topCategory, txCount: weekTxs.length };
    }

    getTopCategoryThisWeek(weekTxs) {
        const expenses = weekTxs.filter(t => t.type === 'expense');
        const byCat = {};
        expenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return null;
        const info = this.app.getCategoryInfo(sorted[0][0], 'expense');
        return { name: info ? info.name : sorted[0][0], amount: sorted[0][1] };
    }

    updateStreakData() {
        const today = new Date().toISOString().split('T')[0];
        const dailyBudget = (this.app.settings.budgetTarget || 6000000) / 30;
        const todayExpense = this.app.transactions
            .filter(t => t.date === today && t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0);

        if (todayExpense <= dailyBudget) {
            if (this.streakData.lastDate === this.getYesterday()) {
                this.streakData.currentStreak++;
            } else if (this.streakData.lastDate !== today) {
                this.streakData.currentStreak = 1;
            }
            this.streakData.lastDate = today;
        }
        localStorage.setItem(`duit_streak_${this.getHouseholdCode()}`, JSON.stringify(this.streakData));
        if (this.streakData.currentStreak >= 7) this.checkAchievement('streak_7');
        if (this.streakData.currentStreak >= 30) this.checkAchievement('streak_30');
    }


    getYesterday() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }

    renderWeeklyReport() {
        const report = this.getWeeklyReport();
        const streak = this.streakData.currentStreak;
        return `<div class="weekly-report-container">
            <div class="weekly-header">
                <h3><i class="fas fa-calendar-week"></i> Laporan Minggu Ini</h3>
                <div class="streak-badge"><i class="fas fa-fire"></i> ${streak} hari hemat berturut-turut</div>
            </div>
            <div class="weekly-cards">
                <div class="weekly-card income-card">
                    <i class="fas fa-arrow-down"></i>
                    <span class="weekly-card-label">Pemasukan</span>
                    <span class="weekly-card-value">${this.app.formatMoney(report.income)}</span>
                </div>
                <div class="weekly-card expense-card">
                    <i class="fas fa-arrow-up"></i>
                    <span class="weekly-card-label">Pengeluaran</span>
                    <span class="weekly-card-value">${this.app.formatMoney(report.expense)}</span>
                </div>
                <div class="weekly-card savings-card">
                    <i class="fas fa-piggy-bank"></i>
                    <span class="weekly-card-label">Sisa / Tabungan</span>
                    <span class="weekly-card-value">${this.app.formatMoney(report.savings)}</span>
                </div>
                <div class="weekly-card avg-card">
                    <i class="fas fa-chart-bar"></i>
                    <span class="weekly-card-label">Rata-rata / Hari</span>
                    <span class="weekly-card-value">${this.app.formatMoney(Math.round(report.avgDaily))}</span>
                </div>
            </div>
            ${report.topCategory ? `<div class="weekly-top-cat"><i class="fas fa-fire"></i> Kategori terbesar: <strong>${report.topCategory.name}</strong> (${this.app.formatMoney(report.topCategory.amount)})</div>` : ''}
            <div class="weekly-txcount"><i class="fas fa-receipt"></i> Total ${report.txCount} transaksi minggu ini</div>
        </div>`;
    }


    // =========================================
    // 6. PARTNER COMPARISON
    // =========================================
    getPartnerComparison() {
        if (this.app.members.length < 2) return null;
        const mk = this.app.getSelectedMonthKey();
        const allTx = this.app.transactions.filter(t => t.date && t.date.startsWith(mk) && t.type === 'expense');
        const memberData = {};

        this.app.members.forEach(m => {
            memberData[m.name] = { total: 0, byCategory: {} };
        });

        allTx.forEach(t => {
            const member = t.addedBy || 'Unknown';
            if (!memberData[member]) memberData[member] = { total: 0, byCategory: {} };
            memberData[member].total += t.amount;
            memberData[member].byCategory[t.category] = (memberData[member].byCategory[t.category] || 0) + t.amount;
        });

        return memberData;
    }

    renderPartnerComparison() {
        const data = this.getPartnerComparison();
        if (!data || Object.keys(data).length < 2) {
            return '<div class="empty-state"><i class="fas fa-users"></i><p>Butuh minimal 2 anggota untuk perbandingan</p></div>';
        }

        const members = Object.keys(data);
        const allCats = new Set();
        members.forEach(m => Object.keys(data[m].byCategory).forEach(c => allCats.add(c)));

        let html = `<div class="partner-comparison">
            <div class="partner-totals">`;
        members.forEach(m => {
            html += `<div class="partner-total-card">
                <div class="partner-avatar">${m.charAt(0).toUpperCase()}</div>
                <span class="partner-name">${m}</span>
                <span class="partner-amount">${this.app.formatMoney(data[m].total)}</span>
            </div>`;
        });
        html += `</div><div class="partner-chart-area"><canvas id="partner-chart"></canvas></div>
            <div class="partner-detail-list">`;


        Array.from(allCats).forEach(cat => {
            const info = this.app.getCategoryInfo(cat, 'expense');
            const catName = info ? info.name : cat;
            html += `<div class="partner-cat-row"><span class="partner-cat-name">${catName}</span>`;
            members.forEach(m => {
                const amt = data[m].byCategory[cat] || 0;
                html += `<span class="partner-cat-val">${this.app.formatMoneyShort(amt)}</span>`;
            });
            html += '</div>';
        });

        html += '</div></div>';
        return html;
    }

    renderPartnerChart() {
        const data = this.getPartnerComparison();
        if (!data || Object.keys(data).length < 2) return;
        const canvas = document.getElementById('partner-chart');
        if (!canvas) return;

        const members = Object.keys(data);
        const allCats = new Set();
        members.forEach(m => Object.keys(data[m].byCategory).forEach(c => allCats.add(c)));
        const categories = Array.from(allCats).slice(0, 8);
        const labels = categories.map(c => {
            const info = this.app.getCategoryInfo(c, 'expense');
            return info ? info.name : c;
        });

        const colors = ['#6C63FF', '#EC4899', '#10B981', '#F59E0B'];
        const datasets = members.map((m, i) => ({
            label: m,
            data: categories.map(c => data[m].byCategory[c] || 0),
            backgroundColor: colors[i % colors.length],
        }));

        if (this._partnerChart) this._partnerChart.destroy();
        this._partnerChart = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }


    // =========================================
    // 7. CHALLENGES & ACHIEVEMENTS
    // =========================================
    initDefaultChallenges() {
        const month = new Date().toISOString().slice(0, 7);
        this.challenges = [
            { id: 'spend_under_3jt', name: 'Hemat Hero', desc: 'Habiskan kurang dari 3jt bulan ini', target: 3000000, type: 'max_expense', month, completed: false },
            { id: 'save_1jt', name: 'Super Saver', desc: 'Tabung minimal 1jt bulan ini', target: 1000000, type: 'min_savings', month, completed: false },
            { id: 'no_wants_week', name: 'Anti Lapar Mata', desc: '7 hari tanpa belanja keinginan', target: 7, type: 'no_wants_days', month, completed: false },
            { id: 'track_every_day', name: 'Rajin Catat', desc: 'Catat transaksi setiap hari selama sebulan', target: 30, type: 'daily_track', month, completed: false },
        ];
        this.saveLocal('challenges', this.challenges);
    }

    checkChallengeProgress() {
        const mk = this.app.getSelectedMonthKey();
        const summary = this.app.calcMonthSummary(mk);
        this.challenges.forEach(ch => {
            switch (ch.type) {
                case 'max_expense':
                    ch.progress = summary.expense;
                    ch.completed = summary.expense <= ch.target && summary.expense > 0;
                    break;
                case 'min_savings':
                    ch.progress = Math.max(0, summary.income - summary.expense);
                    ch.completed = (summary.income - summary.expense) >= ch.target;
                    break;
                case 'no_wants_days':
                    ch.progress = this.calcNoWantsDays();
                    ch.completed = ch.progress >= ch.target;
                    break;
                case 'daily_track':
                    ch.progress = this.calcDaysWithTransactions();
                    ch.completed = ch.progress >= ch.target;
                    break;
            }
            if (ch.completed) this.checkAchievement('challenge_' + ch.id);
        });
        this.saveLocal('challenges', this.challenges);
    }


    calcNoWantsDays() {
        const wantsIds = CATEGORIES.expense.wants.map(c => c.id);
        const mk = this.app.getSelectedMonthKey();
        const txs = this.app.transactions.filter(t => t.date && t.date.startsWith(mk) && t.type === 'expense');
        const daysWithWants = new Set();
        txs.filter(t => wantsIds.includes(t.category)).forEach(t => daysWithWants.add(t.date));
        const daysInMonth = new Date(this.app.selectedYear, this.app.selectedMonth + 1, 0).getDate();
        const today = new Date().getDate();
        const elapsed = Math.min(today, daysInMonth);
        return Math.max(0, elapsed - daysWithWants.size);
    }

    calcDaysWithTransactions() {
        const mk = this.app.getSelectedMonthKey();
        const days = new Set();
        this.app.transactions.filter(t => t.date && t.date.startsWith(mk)).forEach(t => days.add(t.date));
        return days.size;
    }

    // Achievement system
    checkAchievement(achievementId) {
        const allAchievements = this.getAchievementDefinitions();
        const def = allAchievements.find(a => a.id === achievementId);
        if (!def) return;
        if (this.achievements.find(a => a.id === achievementId)) return; // already earned
        this.achievements.push({ id: achievementId, earnedAt: new Date().toISOString() });
        this.saveLocal('achievements', this.achievements);
        if (this.app && this.app.showToast) {
            this.app.showToast(`🏆 Achievement: ${def.name}!`);
        }
    }

    getAchievementDefinitions() {
        return [
            { id: 'first_transaction', name: 'Pemula', desc: 'Catat transaksi pertama', icon: '🌟' },
            { id: 'first_goal', name: 'Visioner', desc: 'Buat target tabungan pertama', icon: '🎯' },
            { id: 'goal_completed', name: 'Goal Getter', desc: 'Capai satu target tabungan', icon: '🏆' },
            { id: 'streak_7', name: 'Hemat Warrior', desc: '7 hari berturut-turut di bawah budget', icon: '🔥' },
            { id: 'streak_30', name: 'Hemat Legend', desc: '30 hari berturut-turut di bawah budget', icon: '💎' },
            { id: 'challenge_spend_under_3jt', name: 'Hemat Hero', desc: 'Selesaikan challenge hemat 3jt', icon: '🦸' },
            { id: 'challenge_save_1jt', name: 'Super Saver', desc: 'Tabung 1jt dalam sebulan', icon: '💰' },
            { id: 'challenge_no_wants_week', name: 'Anti Lapar Mata', desc: '7 hari tanpa keinginan', icon: '🧘' },
            { id: 'challenge_track_every_day', name: 'Rajin Catat', desc: 'Catat setiap hari sebulan penuh', icon: '📝' },
            { id: '10_transactions', name: 'Aktif Banget', desc: 'Sudah 10 transaksi', icon: '📊' },
            { id: '50_transactions', name: 'Pro Tracker', desc: '50 transaksi tercatat', icon: '🚀' },
        ];
    }


    renderChallenges() {
        this.checkChallengeProgress();
        return `<div class="challenges-section">
            <h3><i class="fas fa-trophy"></i> Tantangan Bulan Ini</h3>
            <div class="challenge-list">
                ${this.challenges.map(ch => {
                    const pct = ch.type === 'max_expense'
                        ? Math.min(100, Math.round(((ch.target - ch.progress) / ch.target) * 100))
                        : Math.min(100, Math.round((ch.progress / ch.target) * 100));
                    return `<div class="challenge-card ${ch.completed ? 'completed' : ''}">
                        <div class="challenge-icon">${ch.completed ? '✅' : '🎯'}</div>
                        <div class="challenge-info">
                            <h4>${ch.name}</h4>
                            <p>${ch.desc}</p>
                            <div class="challenge-progress-bar"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    renderAchievements() {
        const allDefs = this.getAchievementDefinitions();
        return `<div class="achievements-section">
            <h3><i class="fas fa-medal"></i> Pencapaian</h3>
            <div class="achievements-grid">
                ${allDefs.map(def => {
                    const earned = this.achievements.find(a => a.id === def.id);
                    return `<div class="achievement-badge ${earned ? 'earned' : 'locked'}">
                        <span class="achievement-icon">${def.icon}</span>
                        <span class="achievement-name">${def.name}</span>
                        <span class="achievement-desc">${def.desc}</span>
                        ${earned ? `<span class="achievement-date">${this.app.formatDate(earned.earnedAt)}</span>` : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }


    // =========================================
    // 8. WISHLIST BERSAMA
    // =========================================
    async addWishlistItem(item) {
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        item.createdAt = new Date().toISOString();
        item.savedAmount = item.savedAmount || 0;
        item.addedBy = this.app.currentUser;
        item = await this.pushToFirebase('wishlist', item);
        this.wishlist.push(item);
        this.saveLocal('wishlist', this.wishlist);
        return item;
    }

    async updateWishlistProgress(itemId, amount) {
        const item = this.wishlist.find(w => w.id === itemId || w.firebaseId === itemId);
        if (!item) return;
        item.savedAmount = (item.savedAmount || 0) + amount;
        if (item.savedAmount >= item.price) item.purchased = true;
        if (item.firebaseId) {
            await this.updateInFirebase('wishlist', item.firebaseId, { savedAmount: item.savedAmount, purchased: item.purchased || false });
        }
        this.saveLocal('wishlist', this.wishlist);
        return item;
    }

    async deleteWishlistItem(itemId) {
        const item = this.wishlist.find(w => w.id === itemId || w.firebaseId === itemId);
        if (item && item.firebaseId) await this.removeFromFirebase('wishlist', item.firebaseId);
        this.wishlist = this.wishlist.filter(w => w.id !== itemId && w.firebaseId !== itemId);
        this.saveLocal('wishlist', this.wishlist);
    }

    renderWishlist() {
        if (!this.wishlist.length) {
            return '<div class="empty-state"><i class="fas fa-star"></i><p>Wishlist kosong. Tambahkan impianmu!</p></div>';
        }
        const sorted = [...this.wishlist].sort((a, b) => (a.priority || 3) - (b.priority || 3));
        return sorted.map(item => {
            const pct = item.price > 0 ? Math.min(100, Math.round((item.savedAmount / item.price) * 100)) : 0;
            const priorityLabel = { 1: 'Tinggi', 2: 'Sedang', 3: 'Rendah' }[item.priority] || 'Sedang';
            const priorityClass = { 1: 'high', 2: 'medium', 3: 'low' }[item.priority] || 'medium';
            return `<div class="wishlist-card ${item.purchased ? 'purchased' : ''}" data-id="${item.firebaseId || item.id}">
                <div class="wishlist-priority ${priorityClass}">${priorityLabel}</div>
                <div class="wishlist-content">
                    <h4>${item.name}</h4>
                    <div class="wishlist-price">${this.app.formatMoney(item.price)}</div>
                    <div class="wishlist-progress-bar"><div class="wishlist-progress-fill" style="width:${pct}%"></div></div>
                    <div class="wishlist-progress-text">${this.app.formatMoney(item.savedAmount)} / ${this.app.formatMoney(item.price)} (${pct}%)</div>
                    ${item.addedBy ? `<div class="wishlist-added-by"><i class="fas fa-user"></i> ${item.addedBy}</div>` : ''}
                </div>
                <div class="wishlist-actions">
                    <button class="btn-add-wishlist-progress" data-id="${item.firebaseId || item.id}" title="Tambah tabungan"><i class="fas fa-plus"></i></button>
                    <button class="btn-delete-wishlist" data-id="${item.firebaseId || item.id}" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }
}

// Global instance (initialized after app is ready)
let premiumFeatures = null;
