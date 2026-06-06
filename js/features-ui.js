// ===== PREMIUM FEATURES UI =====
// Handles rendering, event bindings, and navigation integration

class PremiumFeaturesUI {
    constructor() {
        this.currentFeaturePage = null;
        this.splitMode = 'equal';
    }

    init() {
        if (!premiumFeatures) {
            premiumFeatures = new PremiumFeatures(app);
        }
        this.bindNavEvents();
        this.bindModalEvents();
    }

    // ===== NAVIGATION INTEGRATION =====
    bindNavEvents() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.dataset.page;
                if (['goals', 'debts', 'wishlist'].includes(page)) {
                    this.currentFeaturePage = page;
                    setTimeout(() => this.renderPage(page), 50);
                }
            });
        });
    }

    renderCurrentPage() {
        if (this.currentFeaturePage) {
            this.renderPage(this.currentFeaturePage);
        }
    }


    renderPage(page) {
        switch (page) {
            case 'goals': this.renderGoalsPage(); break;
            case 'debts': this.renderDebtsPage(); break;
            case 'wishlist': this.renderWishlistPage(); break;
            case 'weekly': this.renderWeeklyPage(); break;
            case 'challenges': this.renderChallengesPage(); break;
            case 'comparison': this.renderComparisonPage(); break;
            case 'splitbill': this.renderSplitBillPage(); break;
            case 'recurring': this.renderRecurringPage(); break;
        }
    }

    // ===== GOALS PAGE =====
    renderGoalsPage() {
        const container = document.getElementById('page-goals');
        if (!container) return;
        container.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-bullseye"></i> Target Tabungan</h2>
                <button class="btn-primary" id="add-goal-btn"><i class="fas fa-plus"></i> Tambah Target</button>
            </div>
            <div class="goals-summary">
                <div class="goals-stats">
                    <span><i class="fas fa-flag"></i> ${premiumFeatures.goals.length} target</span>
                    <span><i class="fas fa-check-circle"></i> ${premiumFeatures.goals.filter(g => g.completed).length} tercapai</span>
                </div>
            </div>
            <div class="goals-grid" id="goals-list">
                ${premiumFeatures.renderGoals()}
            </div>
        `;
        this.bindGoalEvents();
    }


    bindGoalEvents() {
        document.getElementById('add-goal-btn')?.addEventListener('click', () => this.showGoalModal());
        document.querySelectorAll('.btn-add-progress').forEach(btn => {
            btn.addEventListener('click', () => this.showAddProgressModal(btn.dataset.id, 'goal'));
        });
        document.querySelectorAll('.btn-delete-goal').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Hapus target ini?')) {
                    await premiumFeatures.deleteGoal(btn.dataset.id);
                    this.renderGoalsPage();
                }
            });
        });
    }

    showGoalModal() {
        this.showFeatureModal('Tambah Target Tabungan', `
            <div class="form-group"><label>Nama Target</label><input type="text" id="goal-name" placeholder="Contoh: DP Rumah"></div>
            <div class="form-group"><label>Target Amount (Rp)</label><input type="number" id="goal-target" placeholder="10000000" min="1"></div>
            <div class="form-group"><label>Deadline (opsional)</label><input type="date" id="goal-deadline"></div>
            <div class="form-group"><label>Tabungan Saat Ini (Rp)</label><input type="number" id="goal-current" placeholder="0" min="0"></div>
        `, async () => {
            const name = document.getElementById('goal-name').value.trim();
            const targetAmount = parseInt(document.getElementById('goal-target').value) || 0;
            const deadline = document.getElementById('goal-deadline').value;
            const currentAmount = parseInt(document.getElementById('goal-current').value) || 0;
            if (!name) return app.showToast('Nama target harus diisi!');
            if (!targetAmount) return app.showToast('Target harus > 0!');
            await premiumFeatures.addGoal({ name, targetAmount, deadline, currentAmount });
            this.closeFeatureModal();
            this.renderGoalsPage();
            app.showToast('Target ditambahkan! 🎯');
        });
    }


    showAddProgressModal(id, type) {
        const title = type === 'goal' ? 'Tambah Tabungan' : 'Tambah Dana';
        this.showFeatureModal(title, `
            <div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="progress-amount" placeholder="500000" min="1"></div>
        `, async () => {
            const amount = parseInt(document.getElementById('progress-amount').value) || 0;
            if (!amount) return app.showToast('Masukkan jumlah!');
            if (type === 'goal') {
                await premiumFeatures.updateGoalProgress(id, amount);
                this.renderGoalsPage();
            } else {
                await premiumFeatures.updateWishlistProgress(id, amount);
                this.renderWishlistPage();
            }
            this.closeFeatureModal();
            app.showToast('Progress ditambahkan! 💪');
        });
    }

    // ===== DEBTS PAGE =====
    renderDebtsPage() {
        const container = document.getElementById('page-debts');
        if (!container) return;
        const totalHutang = premiumFeatures.getTotalDebt();
        const totalPiutang = premiumFeatures.getTotalPiutang();
        container.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-handshake"></i> Hutang / Piutang</h2>
                <button class="btn-primary" id="add-debt-btn"><i class="fas fa-plus"></i> Tambah</button>
            </div>
            <div class="debt-summary-cards">
                <div class="debt-summary-card hutang"><i class="fas fa-arrow-up"></i><span>Total Hutang</span><strong>${app.formatMoney(totalHutang)}</strong></div>
                <div class="debt-summary-card piutang"><i class="fas fa-arrow-down"></i><span>Total Piutang</span><strong>${app.formatMoney(totalPiutang)}</strong></div>
            </div>
            <div class="debts-list" id="debts-list">
                ${premiumFeatures.renderDebts()}
            </div>
        `;
        this.bindDebtEvents();
    }


    bindDebtEvents() {
        document.getElementById('add-debt-btn')?.addEventListener('click', () => this.showDebtModal());
        document.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.addEventListener('click', async () => {
                await premiumFeatures.markDebtPaid(btn.dataset.id);
                this.renderDebtsPage();
                app.showToast('Ditandai lunas! ✅');
            });
        });
        document.querySelectorAll('.btn-delete-debt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Hapus catatan ini?')) {
                    await premiumFeatures.deleteDebt(btn.dataset.id);
                    this.renderDebtsPage();
                }
            });
        });
    }

    showDebtModal() {
        this.showFeatureModal('Tambah Hutang/Piutang', `
            <div class="form-group"><label>Tipe</label>
                <div class="type-toggle">
                    <button type="button" class="type-btn active" data-dtype="hutang">Hutang (Saya berhutang)</button>
                    <button type="button" class="type-btn" data-dtype="piutang">Piutang (Orang berhutang ke saya)</button>
                </div>
            </div>
            <div class="form-group"><label>Nama Orang</label><input type="text" id="debt-person" placeholder="Nama orang"></div>
            <div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="debt-amount" placeholder="500000" min="1"></div>
            <div class="form-group"><label>Keterangan</label><input type="text" id="debt-note" placeholder="Untuk apa..."></div>
            <div class="form-group"><label>Jatuh Tempo (opsional)</label><input type="date" id="debt-due"></div>
        `, async () => {
            const type = document.querySelector('[data-dtype].active')?.dataset.dtype || 'hutang';
            const person = document.getElementById('debt-person').value.trim();
            const amount = parseInt(document.getElementById('debt-amount').value) || 0;
            const note = document.getElementById('debt-note').value.trim();
            const dueDate = document.getElementById('debt-due').value;
            if (!person) return app.showToast('Masukkan nama orang!');
            if (!amount) return app.showToast('Jumlah harus > 0!');
            await premiumFeatures.addDebt({ type, person, amount, note, dueDate });
            this.closeFeatureModal();
            this.renderDebtsPage();
            app.showToast('Catatan ditambahkan! 📝');
        });
        // Bind debt type toggle
        document.querySelectorAll('[data-dtype]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-dtype]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }


    // ===== WISHLIST PAGE =====
    renderWishlistPage() {
        const container = document.getElementById('page-wishlist');
        if (!container) return;

        // Calculate savings stats for wishlist
        const wishlist = premiumFeatures.wishlist;
        const totalTarget = wishlist.reduce((s, w) => s + (w.price || 0), 0);
        const totalSaved = wishlist.reduce((s, w) => s + (w.savedAmount || 0), 0);
        const avgSaved = wishlist.length > 0 ? Math.round(totalSaved / wishlist.length) : 0;
        const totalPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

        container.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-star"></i> Wishlist Bersama</h2>
                <button class="btn-primary" id="add-wishlist-btn"><i class="fas fa-plus"></i> Tambah Item</button>
            </div>
            <div class="wishlist-stats-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
                <div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">
                    <div style="font-size:12px;color:var(--text-secondary)">Total Target</div>
                    <div style="font-size:18px;font-weight:700;color:var(--primary)">${app.formatMoney(totalTarget)}</div>
                </div>
                <div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">
                    <div style="font-size:12px;color:var(--text-secondary)">Total Terkumpul</div>
                    <div style="font-size:18px;font-weight:700;color:var(--success)">${app.formatMoney(totalSaved)}</div>
                </div>
                <div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">
                    <div style="font-size:12px;color:var(--text-secondary)">Rata-rata / Item</div>
                    <div style="font-size:18px;font-weight:700;color:var(--info,#3B82F6)">${app.formatMoney(avgSaved)}</div>
                </div>
                <div class="stat-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;">
                    <div style="font-size:12px;color:var(--text-secondary)">Progress Total</div>
                    <div style="font-size:18px;font-weight:700;color:var(--warning)">${totalPct}%</div>
                </div>
            </div>
            ${wishlist.length > 0 ? `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:20px;">
                <h3 style="font-size:14px;margin-bottom:12px;"><i class="fas fa-chart-line" style="color:var(--primary);margin-right:8px;"></i>Progress Nabung per Item</h3>
                <canvas id="wishlist-savings-chart"></canvas>
            </div>` : ''}
            <div class="wishlist-grid" id="wishlist-list">
                ${premiumFeatures.renderWishlist()}
            </div>
        `;
        this.bindWishlistEvents();
        if (wishlist.length > 0) this.renderWishlistSavingsChart(wishlist);
    }

    renderWishlistSavingsChart(wishlist) {
        const ctx = document.getElementById('wishlist-savings-chart');
        if (!ctx) return;
        const sorted = [...wishlist].sort((a,b) => (a.priority||3) - (b.priority||3));
        const labels = sorted.map(w => w.name.length > 15 ? w.name.slice(0,15)+'...' : w.name);
        const targetData = sorted.map(w => w.price || 0);
        const savedData = sorted.map(w => w.savedAmount || 0);

        if (this._wishlistChart) this._wishlistChart.destroy();
        this._wishlistChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Target', data: targetData, backgroundColor: 'rgba(99,102,241,0.3)', borderColor: '#6366F1', borderWidth: 1, borderRadius: 4 },
                    { label: 'Terkumpul', data: savedData, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10B981', borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { position:'top', labels: { usePointStyle:true, font:{size:11} } },
                    tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: Rp ${c.raw.toLocaleString('id-ID')}` } } },
                scales: { x: { ticks: { callback: v => v>=1000000?'Rp '+(v/1000000).toFixed(1)+'jt':'Rp '+(v/1000)+'rb' } } }
            }
        });
    }

    bindWishlistEvents() {
        document.getElementById('add-wishlist-btn')?.addEventListener('click', () => this.showWishlistModal());
        document.querySelectorAll('.btn-add-wishlist-progress').forEach(btn => {
            btn.addEventListener('click', () => this.showAddProgressModal(btn.dataset.id, 'wishlist'));
        });
        document.querySelectorAll('.btn-delete-wishlist').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Hapus item ini?')) {
                    await premiumFeatures.deleteWishlistItem(btn.dataset.id);
                    this.renderWishlistPage();
                }
            });
        });
    }

    showWishlistModal() {
        this.showFeatureModal('Tambah Wishlist', `
            <div class="form-group"><label>Nama Barang</label><input type="text" id="wish-name" placeholder="Contoh: iPhone 15"></div>
            <div class="form-group"><label>Harga (Rp)</label><input type="number" id="wish-price" placeholder="15000000" min="1"></div>
            <div class="form-group"><label>Prioritas</label>
                <select id="wish-priority">
                    <option value="1">Tinggi</option>
                    <option value="2" selected>Sedang</option>
                    <option value="3">Rendah</option>
                </select>
            </div>
            <div class="form-group"><label>Sudah Ditabung (Rp)</label><input type="number" id="wish-saved" placeholder="0" min="0"></div>
        `, async () => {
            const name = document.getElementById('wish-name').value.trim();
            const price = parseInt(document.getElementById('wish-price').value) || 0;
            const priority = parseInt(document.getElementById('wish-priority').value) || 2;
            const savedAmount = parseInt(document.getElementById('wish-saved').value) || 0;
            if (!name) return app.showToast('Nama barang harus diisi!');
            if (!price) return app.showToast('Harga harus > 0!');
            await premiumFeatures.addWishlistItem({ name, price, priority, savedAmount });
            this.closeFeatureModal();
            this.renderWishlistPage();
            app.showToast('Wishlist ditambahkan! ⭐');
        });
    }


    // ===== WEEKLY REPORT PAGE (sub-feature in dashboard) =====
    renderWeeklyPage() {
        const container = document.getElementById('page-goals');
        if (!container) return;
        container.innerHTML = premiumFeatures.renderWeeklyReport();
    }

    // ===== CHALLENGES PAGE (sub-feature in insights) =====
    renderChallengesPage() {
        const container = document.getElementById('challenges-area');
        if (!container) return;
        container.innerHTML = premiumFeatures.renderChallenges() + premiumFeatures.renderAchievements();
    }

    // ===== PARTNER COMPARISON (sub-feature in insights) =====
    renderComparisonPage() {
        const container = document.getElementById('comparison-area');
        if (!container) return;
        container.innerHTML = premiumFeatures.renderPartnerComparison();
        setTimeout(() => premiumFeatures.renderPartnerChart(), 100);
    }

    // ===== SPLIT BILL PAGE =====
    renderSplitBillPage() {
        const container = document.getElementById('splitbill-area');
        if (!container) return;
        container.innerHTML = premiumFeatures.renderSplitBill();
        this.bindSplitBillEvents();
    }

    bindSplitBillEvents() {
        document.querySelectorAll('[data-split]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-split]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.splitMode = btn.dataset.split;
                this.updateSplitCustomInputs();
            });
        });
        document.getElementById('calculate-split-btn')?.addEventListener('click', () => this.calculateSplit());
    }


    updateSplitCustomInputs() {
        const customArea = document.getElementById('split-custom-inputs');
        if (!customArea) return;
        const checkedMembers = Array.from(document.querySelectorAll('#split-members input:checked')).map(c => c.value);
        if (this.splitMode === 'equal') {
            customArea.style.display = 'none';
        } else {
            customArea.style.display = 'block';
            const label = this.splitMode === 'percentage' ? '%' : 'Rp';
            customArea.innerHTML = checkedMembers.map((m, i) =>
                `<div class="form-group"><label>${m} (${label})</label><input type="number" class="split-custom-val" data-idx="${i}" placeholder="0" min="0"></div>`
            ).join('');
        }
    }

    calculateSplit() {
        const total = parseInt(document.getElementById('split-total')?.value) || 0;
        const paidBy = document.getElementById('split-paid-by')?.value || '';
        const checkedMembers = Array.from(document.querySelectorAll('#split-members input:checked')).map(c => c.value);
        if (!total) return app.showToast('Masukkan total tagihan!');
        if (!checkedMembers.length) return app.showToast('Pilih minimal 1 anggota!');

        let customSplits = null;
        if (this.splitMode !== 'equal') {
            customSplits = Array.from(document.querySelectorAll('.split-custom-val')).map(inp => parseInt(inp.value) || 0);
        }
        const splits = premiumFeatures.calculateSplit(total, checkedMembers, this.splitMode, customSplits);
        const resultArea = document.getElementById('split-result-area');
        if (resultArea) {
            resultArea.innerHTML = premiumFeatures.generateSplitSummary(total, splits, paidBy);
        }
    }

    // ===== RECURRING PAGE =====
    renderRecurringPage() {
        const container = document.getElementById('recurring-area');
        if (!container) return;
        container.innerHTML = `
            <div class="recurring-header">
                <h3><i class="fas fa-redo"></i> Transaksi Berulang</h3>
                <button class="btn-primary" id="add-recurring-btn"><i class="fas fa-plus"></i> Tambah</button>
            </div>
            <div class="recurring-list" id="recurring-list">
                ${premiumFeatures.renderRecurring()}
            </div>
        `;
        this.bindRecurringEvents();
    }


    bindRecurringEvents() {
        document.getElementById('add-recurring-btn')?.addEventListener('click', () => this.showRecurringModal());
        document.querySelectorAll('.btn-toggle-recurring').forEach(btn => {
            btn.addEventListener('click', async () => {
                await premiumFeatures.toggleRecurring(btn.dataset.id);
                this.renderRecurringPage();
            });
        });
        document.querySelectorAll('.btn-delete-recurring').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Hapus transaksi berulang ini?')) {
                    await premiumFeatures.deleteRecurring(btn.dataset.id);
                    this.renderRecurringPage();
                }
            });
        });
    }

    showRecurringModal() {
        let catOptions = '<optgroup label="Pengeluaran">';
        app.getAllExpenseCategories().forEach(c => catOptions += `<option value="${c.id}">${c.name}</option>`);
        catOptions += '</optgroup><optgroup label="Pemasukan">';
        CATEGORIES.income.forEach(c => catOptions += `<option value="${c.id}">${c.name}</option>`);
        catOptions += '</optgroup>';

        this.showFeatureModal('Tambah Transaksi Berulang', `
            <div class="form-group"><label>Nama</label><input type="text" id="rec-name" placeholder="Contoh: Bayar Kost"></div>
            <div class="form-group"><label>Tipe</label>
                <select id="rec-type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select>
            </div>
            <div class="form-group"><label>Kategori</label><select id="rec-category">${catOptions}</select></div>
            <div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="rec-amount" placeholder="1000000" min="1"></div>
            <div class="form-group"><label>Frekuensi</label>
                <select id="rec-frequency">
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly" selected>Bulanan</option>
                </select>
            </div>
        `, async () => {
            const name = document.getElementById('rec-name').value.trim();
            const type = document.getElementById('rec-type').value;
            const category = document.getElementById('rec-category').value;
            const amount = parseInt(document.getElementById('rec-amount').value) || 0;
            const frequency = document.getElementById('rec-frequency').value;
            if (!name) return app.showToast('Nama harus diisi!');
            if (!amount) return app.showToast('Jumlah harus > 0!');
            await premiumFeatures.addRecurring({ name, type, category, amount, frequency });
            this.closeFeatureModal();
            this.renderRecurringPage();
            app.showToast('Transaksi berulang ditambahkan! 🔄');
        });
    }


    // ===== GENERIC FEATURE MODAL =====
    showFeatureModal(title, formHtml, onSubmit) {
        let modal = document.getElementById('feature-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'feature-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" id="feature-modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="feature-modal-body">${formHtml}</div>
                <button class="btn-primary full-width" id="feature-modal-submit"><i class="fas fa-check"></i> Simpan</button>
            </div>
        `;
        modal.classList.add('active');
        document.getElementById('feature-modal-close').addEventListener('click', () => this.closeFeatureModal());
        modal.addEventListener('click', (e) => { if (e.target === modal) this.closeFeatureModal(); });
        document.getElementById('feature-modal-submit').addEventListener('click', onSubmit);
    }

    closeFeatureModal() {
        const modal = document.getElementById('feature-modal');
        if (modal) modal.classList.remove('active');
    }

    bindModalEvents() {
        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeFeatureModal();
        });
    }

    // ===== RENDER SUB-FEATURES INTO EXISTING PAGES =====
    renderSubFeatures() {
        // Weekly report in dashboard
        const dashWeekly = document.getElementById('weekly-report-section');
        if (dashWeekly) dashWeekly.innerHTML = premiumFeatures.renderWeeklyReport();

        // Challenges in insights page
        const challengesArea = document.getElementById('challenges-area');
        if (challengesArea) challengesArea.innerHTML = premiumFeatures.renderChallenges() + premiumFeatures.renderAchievements();

        // Partner comparison in insights (enhanced with savings)
        const compArea = document.getElementById('comparison-area');
        if (compArea) {
            compArea.innerHTML = this.renderCoupleFinanceComparison() + premiumFeatures.renderPartnerComparison();
            setTimeout(() => {
                premiumFeatures.renderPartnerChart();
                this.renderCoupleFinanceChart();
            }, 100);
        }

        // Split bill in transactions page
        const splitArea = document.getElementById('splitbill-area');
        if (splitArea) {
            splitArea.innerHTML = premiumFeatures.renderSplitBill();
            this.bindSplitBillEvents();
        }

        // Recurring in transactions page
        const recArea = document.getElementById('recurring-area');
        if (recArea) {
            this.renderRecurringPage();
        }
    }

    // ===== COUPLE FINANCE COMPARISON =====
    renderCoupleFinanceComparison() {
        if (app.members.length < 2) return '';
        const mk = app.getSelectedMonthKey();
        const allTx = app.transactions.filter(t => t.date && t.date.startsWith(mk));
        const savingsIds = ['tabungan','investasi','dana_darurat'];
        const memberStats = {};

        app.members.forEach(m => {
            const mTx = allTx.filter(t => t.addedBy === m.name);
            const income = mTx.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
            const expense = mTx.filter(t => t.type === 'expense' && !savingsIds.includes(t.category)).reduce((s,t) => s + t.amount, 0);
            const savings = mTx.filter(t => t.type === 'expense' && savingsIds.includes(t.category)).reduce((s,t) => s + t.amount, 0);
            memberStats[m.name] = { income, expense, savings, net: income - expense };
        });

        const members = Object.keys(memberStats);
        const totalIncome = members.reduce((s,m) => s + memberStats[m].income, 0);
        const totalExpense = members.reduce((s,m) => s + memberStats[m].expense, 0);
        const totalSavings = members.reduce((s,m) => s + memberStats[m].savings, 0);

        return `
        <div class="couple-finance-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px;">
            <h3 style="margin-bottom:16px;font-size:16px;"><i class="fas fa-heart" style="color:var(--danger);margin-right:8px;"></i> Keuangan Pasangan Bulan Ini</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
                ${members.map(m => {
                    const s = memberStats[m];
                    const savPct = s.income > 0 ? Math.round((s.savings / s.income) * 100) : 0;
                    return `
                    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;text-align:center;border:1px solid var(--border);">
                        <div style="font-weight:700;font-size:14px;margin-bottom:8px;">${m}</div>
                        <div style="font-size:11px;color:var(--success)">+${app.formatMoneyShort(s.income)}</div>
                        <div style="font-size:11px;color:var(--danger)">-${app.formatMoneyShort(s.expense)}</div>
                        <div style="font-size:11px;color:var(--info,#3B82F6)">↗${app.formatMoneyShort(s.savings)}</div>
                        <div style="margin-top:6px;font-size:12px;font-weight:600;color:var(--primary)">Nabung ${savPct}%</div>
                    </div>`;
                }).join('')}
                <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;text-align:center;border:2px solid var(--primary);">
                    <div style="font-weight:700;font-size:14px;margin-bottom:8px;">Total Berdua</div>
                    <div style="font-size:11px;color:var(--success)">+${app.formatMoneyShort(totalIncome)}</div>
                    <div style="font-size:11px;color:var(--danger)">-${app.formatMoneyShort(totalExpense)}</div>
                    <div style="font-size:11px;color:var(--info,#3B82F6)">↗${app.formatMoneyShort(totalSavings)}</div>
                    <div style="margin-top:6px;font-size:12px;font-weight:600;color:var(--success)">Sisa: ${app.formatMoneyShort(totalIncome - totalExpense)}</div>
                </div>
            </div>
            <canvas id="couple-finance-chart"></canvas>
        </div>`;
    }

    renderCoupleFinanceChart() {
        const ctx = document.getElementById('couple-finance-chart');
        if (!ctx || app.members.length < 2) return;

        const mk = app.getSelectedMonthKey();
        const allTx = app.transactions.filter(t => t.date && t.date.startsWith(mk));
        const savingsIds = ['tabungan','investasi','dana_darurat'];
        const members = app.members.map(m => m.name);

        const incomeData = members.map(m => allTx.filter(t => t.addedBy === m && t.type === 'income').reduce((s,t) => s + t.amount, 0));
        const expenseData = members.map(m => allTx.filter(t => t.addedBy === m && t.type === 'expense' && !savingsIds.includes(t.category)).reduce((s,t) => s + t.amount, 0));
        const savingsData = members.map(m => allTx.filter(t => t.addedBy === m && t.type === 'expense' && savingsIds.includes(t.category)).reduce((s,t) => s + t.amount, 0));

        if (this._coupleChart) this._coupleChart.destroy();
        this._coupleChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: members,
                datasets: [
                    { label: 'Pemasukan', data: incomeData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
                    { label: 'Pengeluaran', data: expenseData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
                    { label: 'Tabungan', data: savingsData, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11 } } },
                    tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: Rp ${c.raw.toLocaleString('id-ID')}` } }
                },
                scales: {
                    y: { ticks: { callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'jt' : (v/1000)+'rb' }, beginAtZero: true }
                }
            }
        });
    }
}

// Global UI instance
let premiumUI = null;

// Initialize when DOM and app are ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof app !== 'undefined') {
            premiumFeatures = new PremiumFeatures(app);
            premiumUI = new PremiumFeaturesUI();
            premiumUI.init();
            // Hook into app's refreshAll to update sub-features
            const origRefresh = app.refreshAll.bind(app);
            app.refreshAll = function() {
                origRefresh();
                if (premiumUI) premiumUI.renderSubFeatures();
            };
        }
    }, 500);
});
