// ===== WEDDING & TRAVELING PLANNER =====

class PlannerManager {
    constructor(tracker) {
        this.tracker = tracker;
        this.currentTrip = null;
        this.bindEvents();
    }

    // ===== DATA =====
    getWeddingData() {
        if (!this.tracker.currentUser) return { budget: 0, date: '', items: [] };
        return JSON.parse(localStorage.getItem(`duit_wedding_${this.tracker.currentUser}`)) || {
            budget: 0, date: '', items: []
        };
    }

    saveWeddingData(data) {
        localStorage.setItem(`duit_wedding_${this.tracker.currentUser}`, JSON.stringify(data));
    }

    getTrips() {
        if (!this.tracker.currentUser) return [];
        return JSON.parse(localStorage.getItem(`duit_trips_${this.tracker.currentUser}`)) || [];
    }

    saveTrips(trips) {
        localStorage.setItem(`duit_trips_${this.tracker.currentUser}`, JSON.stringify(trips));
    }

    getCurrentTrip() {
        const trips = this.getTrips();
        if (!this.currentTrip && trips.length > 0) this.currentTrip = trips[0].id;
        return trips.find(t => t.id === this.currentTrip) || null;
    }

    // ===== WEDDING PLANNER =====
    refreshWedding() {
        const data = this.getWeddingData();
        const spent = data.items.reduce((s, i) => s + (i.spent || 0), 0);
        const remaining = data.budget - spent;
        const pct = data.budget > 0 ? Math.min(Math.round((spent / data.budget) * 100), 100) : 0;

        document.getElementById('wedding-total-budget').textContent = this.tracker.formatMoney(data.budget);
        document.getElementById('wedding-spent').textContent = this.tracker.formatMoney(spent);
        document.getElementById('wedding-remaining').textContent = this.tracker.formatMoney(Math.max(0, remaining));
        document.getElementById('wedding-progress-pct').textContent = `${pct}%`;
        document.getElementById('wedding-progress-fill').style.width = `${pct}%`;

        // Countdown
        if (data.date) {
            const target = new Date(data.date);
            const now = new Date();
            const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
            if (diff > 0) {
                document.getElementById('wedding-countdown-text').textContent = `${diff} hari lagi menuju hari bahagia! 💍`;
            } else if (diff === 0) {
                document.getElementById('wedding-countdown-text').textContent = `Selamat! Hari ini hari pernikahanmu! 🎉`;
            } else {
                document.getElementById('wedding-countdown-text').textContent = `Pernikahan sudah berlalu ${Math.abs(diff)} hari yang lalu 💕`;
            }
        }

        // Settings
        document.getElementById('wedding-budget-input').value = data.budget || '';
        document.getElementById('wedding-date-input').value = data.date || '';

        // Items
        this.renderWeddingItems(data);
    }

    renderWeddingItems(data) {
        const list = document.getElementById('wedding-items-list');
        if (data.items.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Belum ada item. Tambah item untuk mulai planning!</p></div>';
            return;
        }
        list.innerHTML = data.items.map((item, idx) => `
            <div class="planner-item ${item.checked ? 'checked' : ''}">
                <input type="checkbox" ${item.checked ? 'checked' : ''} data-wedding-idx="${idx}">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-budget">Budget: ${this.tracker.formatMoney(item.budget)} | Spent: ${this.tracker.formatMoney(item.spent || 0)}</span>
                </div>
                <span class="item-amount">${this.tracker.formatMoney(item.budget)}</span>
                <button class="item-delete" data-wedding-del="${idx}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        // Bind checkbox events
        list.querySelectorAll('[data-wedding-idx]').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = parseInt(cb.dataset.weddingIdx);
                data.items[idx].checked = cb.checked;
                this.saveWeddingData(data);
                this.refreshWedding();
            });
        });
        list.querySelectorAll('[data-wedding-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.weddingDel);
                if (confirm(`Hapus "${data.items[idx].name}"?`)) {
                    data.items.splice(idx, 1);
                    this.saveWeddingData(data);
                    this.refreshWedding();
                }
            });
        });
    }

    addWeddingItem() {
        const name = prompt('Nama item (contoh: Gedung, Catering, Gaun):');
        if (!name) return;
        const budgetStr = prompt('Budget untuk item ini (angka):');
        const budget = parseInt(budgetStr) || 0;
        const spentStr = prompt('Sudah dikeluarkan berapa? (0 jika belum):');
        const spent = parseInt(spentStr) || 0;

        const data = this.getWeddingData();
        data.items.push({ name, budget, spent, checked: false });
        this.saveWeddingData(data);
        this.refreshWedding();
        this.tracker.showToast(`Item "${name}" ditambahkan!`);
    }

    saveWeddingSettings() {
        const data = this.getWeddingData();
        data.budget = parseInt(document.getElementById('wedding-budget-input').value) || 0;
        data.date = document.getElementById('wedding-date-input').value;
        this.saveWeddingData(data);
        this.refreshWedding();
        this.tracker.showToast('Pengaturan wedding tersimpan!');
    }

    // ===== TRAVELING PLANNER =====
    refreshTravel() {
        const trip = this.getCurrentTrip();
        this.populateTripSelect();

        if (!trip) {
            document.getElementById('travel-total-budget').textContent = 'Rp 0';
            document.getElementById('travel-spent').textContent = 'Rp 0';
            document.getElementById('travel-remaining').textContent = 'Rp 0';
            document.getElementById('travel-progress-pct').textContent = '0%';
            document.getElementById('travel-progress-fill').style.width = '0%';
            document.getElementById('travel-items-list').innerHTML = '<div class="empty-state"><i class="fas fa-map-marked-alt"></i><p>Buat trip baru untuk mulai planning!</p></div>';
            return;
        }

        const spent = trip.items.reduce((s, i) => s + (i.spent || 0), 0);
        const remaining = trip.budget - spent;
        const pct = trip.budget > 0 ? Math.min(Math.round((spent / trip.budget) * 100), 100) : 0;

        document.getElementById('travel-total-budget').textContent = this.tracker.formatMoney(trip.budget);
        document.getElementById('travel-spent').textContent = this.tracker.formatMoney(spent);
        document.getElementById('travel-remaining').textContent = this.tracker.formatMoney(Math.max(0, remaining));
        document.getElementById('travel-progress-pct').textContent = `${pct}%`;
        document.getElementById('travel-progress-fill').style.width = `${pct}%`;

        // Countdown
        if (trip.startDate) {
            const target = new Date(trip.startDate);
            const now = new Date();
            const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
            if (diff > 0) {
                document.getElementById('travel-countdown-text').textContent = `${diff} hari lagi menuju ${trip.name}! ✈️`;
            } else if (diff === 0) {
                document.getElementById('travel-countdown-text').textContent = `Hari ini berangkat ke ${trip.name}! 🎉`;
            } else {
                document.getElementById('travel-countdown-text').textContent = `Trip ${trip.name} sudah selesai. Kenangan indah! 🌟`;
            }
        } else {
            document.getElementById('travel-countdown-text').textContent = `${trip.name} — Set tanggal untuk lihat countdown`;
        }

        this.renderTravelItems(trip);
    }

    populateTripSelect() {
        const trips = this.getTrips();
        const select = document.getElementById('trip-select');
        const currentVal = this.currentTrip;
        select.innerHTML = '<option value="">-- Pilih Trip --</option>' + 
            trips.map(t => `<option value="${t.id}" ${t.id === currentVal ? 'selected' : ''}>${t.name}</option>`).join('');
    }

    renderTravelItems(trip) {
        const list = document.getElementById('travel-items-list');
        if (trip.items.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Belum ada item. Tambah item pengeluaran trip!</p></div>';
            return;
        }
        list.innerHTML = trip.items.map((item, idx) => `
            <div class="planner-item ${item.checked ? 'checked' : ''}">
                <input type="checkbox" ${item.checked ? 'checked' : ''} data-travel-idx="${idx}">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-budget">Budget: ${this.tracker.formatMoney(item.budget)} | Spent: ${this.tracker.formatMoney(item.spent || 0)}</span>
                </div>
                <span class="item-amount">${this.tracker.formatMoney(item.budget)}</span>
                <button class="item-delete" data-travel-del="${idx}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        list.querySelectorAll('[data-travel-idx]').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = parseInt(cb.dataset.travelIdx);
                trip.items[idx].checked = cb.checked;
                this.saveTripUpdate(trip);
                this.refreshTravel();
            });
        });
        list.querySelectorAll('[data-travel-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.travelDel);
                if (confirm(`Hapus "${trip.items[idx].name}"?`)) {
                    trip.items.splice(idx, 1);
                    this.saveTripUpdate(trip);
                    this.refreshTravel();
                }
            });
        });
    }

    saveTripUpdate(trip) {
        const trips = this.getTrips();
        const idx = trips.findIndex(t => t.id === trip.id);
        if (idx !== -1) {
            trips[idx] = trip;
            this.saveTrips(trips);
        }
    }

    showTripForm() {
        document.getElementById('travel-setup').style.display = 'block';
        document.getElementById('travel-name-input').value = '';
        document.getElementById('travel-budget-input').value = '';
        document.getElementById('travel-start-date').value = '';
        document.getElementById('travel-end-date').value = '';
    }

    hideTripForm() {
        document.getElementById('travel-setup').style.display = 'none';
    }

    saveNewTrip() {
        const name = document.getElementById('travel-name-input').value.trim();
        if (!name) return this.tracker.showToast('Masukkan nama trip!');
        const budget = parseInt(document.getElementById('travel-budget-input').value) || 0;
        const startDate = document.getElementById('travel-start-date').value;
        const endDate = document.getElementById('travel-end-date').value;

        const trips = this.getTrips();
        const newTrip = {
            id: Date.now().toString(36),
            name, budget, startDate, endDate, items: []
        };
        trips.push(newTrip);
        this.saveTrips(trips);
        this.currentTrip = newTrip.id;
        this.hideTripForm();
        this.refreshTravel();
        this.tracker.showToast(`Trip "${name}" berhasil dibuat!`);
    }

    addTravelItem() {
        const trip = this.getCurrentTrip();
        if (!trip) return this.tracker.showToast('Pilih trip dulu!');

        const name = prompt('Nama item (contoh: Tiket Pesawat, Hotel, Makan):');
        if (!name) return;
        const budgetStr = prompt('Budget untuk item ini:');
        const budget = parseInt(budgetStr) || 0;
        const spentStr = prompt('Sudah dikeluarkan berapa? (0 jika belum):');
        const spent = parseInt(spentStr) || 0;

        trip.items.push({ name, budget, spent, checked: false });
        this.saveTripUpdate(trip);
        this.refreshTravel();
        this.tracker.showToast(`Item "${name}" ditambahkan!`);
    }

    // ===== EVENTS =====
    bindEvents() {
        // Wedding
        document.getElementById('save-wedding-settings').addEventListener('click', () => this.saveWeddingSettings());
        document.getElementById('add-wedding-item-btn').addEventListener('click', () => this.addWeddingItem());

        // Travel
        document.getElementById('add-trip-btn').addEventListener('click', () => this.showTripForm());
        document.getElementById('save-trip-btn').addEventListener('click', () => this.saveNewTrip());
        document.getElementById('cancel-trip-btn').addEventListener('click', () => this.hideTripForm());
        document.getElementById('add-travel-item-btn').addEventListener('click', () => this.addTravelItem());
        document.getElementById('trip-select').addEventListener('change', (e) => {
            this.currentTrip = e.target.value || null;
            this.refreshTravel();
        });
    }

    // Call this when user logs in
    refresh() {
        this.refreshWedding();
        this.refreshTravel();
    }
}

// Initialize planner after app loads
let plannerManager = null;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof app !== 'undefined') {
            plannerManager = new PlannerManager(app);
            // Hook into enterApp
            const origEnter = app.enterApp.bind(app);
            app.enterApp = function() {
                origEnter();
                if (plannerManager) plannerManager.refresh();
            };
            // If already logged in
            if (app.currentUser) plannerManager.refresh();
        }
    }, 600);
});
