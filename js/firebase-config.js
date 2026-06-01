// ===== FIREBASE CONFIGURATION =====
// Duit Tracker Pro - Cloud Sync for Couples

const firebaseConfig = {
    apiKey: "AIzaSyDGnubltKfOV_sQ5iFpSN6qH249-h7nzJU",
    authDomain: "cielfinance-750a5.firebaseapp.com",
    databaseURL: "https://cielfinance-750a5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cielfinance-750a5",
    storageBucket: "cielfinance-750a5.firebasestorage.app",
    messagingSenderId: "425401784107",
    appId: "1:425401784107:web:ee5a2d5f3854bb119ad76e",
    measurementId: "G-RLYY06DC4T"
};

// Initialize Firebase (with error handling)
let db = null;
let firebaseReady = false;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseReady = true;
    console.log('Firebase connected successfully');
} catch (e) {
    console.warn('Firebase init failed:', e.message);
    firebaseReady = false;
}

// ===== FIREBASE SYNC CLASS =====
class FirebaseSync {
    constructor() {
        this.householdId = null;
        this.listeners = [];
    }

    // Generate unique household code (6 chars)
    generateHouseholdCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    }

    // Create a new household (couple/family)
    async createHousehold(ownerName, pin) {
        const code = this.generateHouseholdCode();
        const householdData = {
            code,
            createdAt: new Date().toISOString(),
            members: {
                [this.sanitizeKey(ownerName)]: {
                    name: ownerName,
                    pin,
                    role: 'owner',
                    joinedAt: new Date().toISOString()
                }
            },
            settings: {
                budgetTarget: 6000000,
                savingsTarget: 1000000,
                reminderEnabled: false,
                reminderTime: '20:00'
            },
            transactions: {}
        };

        await db.ref(`households/${code}`).set(householdData);
        this.householdId = code;
        localStorage.setItem('duit_household', code);
        return code;
    }

    // Join existing household with code
    async joinHousehold(code, memberName, pin) {
        code = code.toUpperCase().trim();
        const snapshot = await db.ref(`households/${code}`).once('value');
        if (!snapshot.exists()) {
            throw new Error('Kode rumah tangga tidak ditemukan!');
        }

        const data = snapshot.val();
        const memberKey = this.sanitizeKey(memberName);

        // Check if name already exists
        if (data.members && data.members[memberKey]) {
            throw new Error('Nama sudah terdaftar di rumah tangga ini!');
        }

        // Add member
        await db.ref(`households/${code}/members/${memberKey}`).set({
            name: memberName,
            pin,
            role: 'member',
            joinedAt: new Date().toISOString()
        });

        this.householdId = code;
        localStorage.setItem('duit_household', code);
        return data;
    }

    // Authenticate member
    async authenticate(code, memberName, pin) {
        const snapshot = await db.ref(`households/${code}/members/${this.sanitizeKey(memberName)}`).once('value');
        if (!snapshot.exists()) return false;
        const member = snapshot.val();
        return member.pin === pin;
    }

    // Get all members
    async getMembers() {
        if (!this.householdId) return [];
        const snapshot = await db.ref(`households/${this.householdId}/members`).once('value');
        if (!snapshot.exists()) return [];
        return Object.values(snapshot.val());
    }

    // Save transaction
    async saveTransaction(tx, memberName) {
        if (!this.householdId) return;
        tx.addedBy = memberName;
        const txRef = db.ref(`households/${this.householdId}/transactions`).push();
        tx.firebaseId = txRef.key;
        await txRef.set(tx);
        return tx;
    }

    // Delete transaction
    async deleteTransaction(firebaseId) {
        if (!this.householdId || !firebaseId) return;
        await db.ref(`households/${this.householdId}/transactions/${firebaseId}`).remove();
    }

    // Listen for real-time transaction updates
    listenTransactions(callback) {
        if (!this.householdId) return;
        const ref = db.ref(`households/${this.householdId}/transactions`);
        ref.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const transactions = Object.entries(data).map(([key, val]) => ({
                ...val,
                firebaseId: key
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            callback(transactions);
        });
        this.listeners.push(ref);
    }

    // Listen for settings updates
    listenSettings(callback) {
        if (!this.householdId) return;
        const ref = db.ref(`households/${this.householdId}/settings`);
        ref.on('value', (snapshot) => {
            if (snapshot.exists()) callback(snapshot.val());
        });
        this.listeners.push(ref);
    }

    // Save settings
    async saveSettings(settings) {
        if (!this.householdId) return;
        await db.ref(`households/${this.householdId}/settings`).update(settings);
    }

    // Get household info
    async getHouseholdInfo() {
        if (!this.householdId) return null;
        const snapshot = await db.ref(`households/${this.householdId}`).once('value');
        return snapshot.val();
    }

    // Cleanup listeners
    cleanup() {
        this.listeners.forEach(ref => ref.off());
        this.listeners = [];
    }

    // Utility: sanitize key for Firebase (no dots, $, #, etc.)
    sanitizeKey(str) {
        return str.replace(/[.#$\/\[\]]/g, '_').toLowerCase();
    }

    // Check if household exists
    isConnected() {
        return !!this.householdId;
    }

    // Disconnect
    disconnect() {
        this.cleanup();
        this.householdId = null;
        localStorage.removeItem('duit_household');
    }
}

// Global instance
const fireSync = new FirebaseSync();
