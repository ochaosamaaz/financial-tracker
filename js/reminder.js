// ===== DAILY REMINDER SYSTEM =====

let reminderInterval = null;

function initReminder(tracker) {
    if (reminderInterval) clearInterval(reminderInterval);
    if (!tracker.settings.reminderEnabled) return;

    // Check every 60 seconds
    reminderInterval = setInterval(() => checkReminder(tracker), 60000);
    checkReminder(tracker);
}

function checkReminder(tracker) {
    if (!tracker.settings.reminderEnabled || !tracker.currentUser) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reminderTime = tracker.settings.reminderTime || '20:00';

    if (currentTime === reminderTime) {
        const lastReminder = localStorage.getItem(`duit_reminder_${tracker.currentUser}`);
        const today = now.toISOString().split('T')[0];
        if (lastReminder !== today) {
            showReminderNotification(tracker);
            localStorage.setItem(`duit_reminder_${tracker.currentUser}`, today);
        }
    }
}

function showReminderNotification(tracker) {
    const today = new Date().toISOString().split('T')[0];
    const todayTx = tracker.transactions.filter(t => t.date === today);
    let message = '';

    if (todayTx.length === 0) {
        message = '📝 Hei! Belum ada catatan hari ini. Yuk catat pengeluaranmu!';
    } else {
        const spent = todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        message = `✅ Hari ini: ${todayTx.length} transaksi. Pengeluaran: ${tracker.formatMoney(spent)}`;
    }

    tracker.showToast(message);

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('CielFinanceTools', { body: message.replace(/[📝✅💰]/g, ''), icon: '💰' });
    }
}

// Request notification permission when reminder enabled
document.addEventListener('DOMContentLoaded', () => {
    const cb = document.getElementById('reminder-enabled');
    if (cb) {
        cb.addEventListener('change', () => {
            if (cb.checked && 'Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
        });
    }
});
