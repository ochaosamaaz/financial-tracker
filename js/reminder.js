// ===== DAILY REMINDER SYSTEM =====

let reminderInterval = null;

function initReminder(tracker) {
    // Clear existing interval
    if (reminderInterval) clearInterval(reminderInterval);

    if (!tracker.settings.reminderEnabled) return;

    // Check every minute
    reminderInterval = setInterval(() => {
        checkReminder(tracker);
    }, 60000);

    // Also check immediately
    checkReminder(tracker);
}

function checkReminder(tracker) {
    if (!tracker.settings.reminderEnabled) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reminderTime = tracker.settings.reminderTime || '20:00';

    // Check if it's reminder time (within 1 minute window)
    if (currentTime === reminderTime) {
        const lastReminder = localStorage.getItem(`duit_last_reminder_${tracker.currentUser}`);
        const today = now.toISOString().split('T')[0];

        // Only show once per day
        if (lastReminder !== today) {
            showReminderNotification(tracker);
            localStorage.setItem(`duit_last_reminder_${tracker.currentUser}`, today);
        }
    }
}

function showReminderNotification(tracker) {
    // Check if today has transactions
    const today = new Date().toISOString().split('T')[0];
    const todayTx = tracker.transactions.filter(t => t.date === today);

    let message = '';
    if (todayTx.length === 0) {
        message = '📝 Hei! Kamu belum mencatat transaksi hari ini. Yuk catat sekarang supaya keuanganmu tetap terpantau!';
    } else {
        const totalSpent = todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        message = `✅ Hari ini kamu sudah mencatat ${todayTx.length} transaksi. Total pengeluaran: ${tracker.formatMoney(totalSpent)}`;
    }

    // Show as toast
    tracker.showToast(message);

    // Also try browser notification
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification('Duit Tracker Pro - Reminder', {
                body: message.replace(/[📝✅💰]/g, ''),
                icon: '💰'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    new Notification('Duit Tracker Pro - Reminder', {
                        body: message.replace(/[📝✅💰]/g, ''),
                    });
                }
            });
        }
    }
}

// Request notification permission on settings page
document.addEventListener('DOMContentLoaded', () => {
    const reminderCheckbox = document.getElementById('reminder-enabled');
    if (reminderCheckbox) {
        reminderCheckbox.addEventListener('change', () => {
            if (reminderCheckbox.checked && 'Notification' in window) {
                Notification.requestPermission();
            }
        });
    }
});
