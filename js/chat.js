// ===== CHAT-BASED INPUT - Natural Language Parser =====

class ChatParser {
    constructor(tracker) {
        this.tracker = tracker;
        this.init();
    }

    init() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');

        sendBtn.addEventListener('click', () => this.processMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processMessage();
        });
    }

    processMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        this.addBubble(message, 'user');
        input.value = '';

        const result = this.parse(message);
        if (result) {
            const tx = this.tracker.addTransaction(result);
            const catInfo = this.tracker.getCategoryInfo(result.category, result.type);
            const typeLabel = result.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            this.addBubble(
                `✅ Tercatat!\n\n` +
                `📝 Tipe: ${typeLabel}\n` +
                `💰 Nominal: ${this.tracker.formatMoney(result.amount)}\n` +
                `📂 Kategori: ${catInfo ? catInfo.name : result.category}\n` +
                `📅 Tanggal: ${this.tracker.formatDate(result.date)}\n` +
                `${result.note ? '📌 Catatan: ' + result.note : ''}`,
                'bot'
            );
        } else {
            this.addBubble(
                '❌ Maaf, saya tidak bisa memahami pesan tersebut.\n\n' +
                'Coba format seperti:\n' +
                '• "pemasukan 5.000.000 gaji"\n' +
                '• "pengeluaran 50.000 makan siang"\n' +
                '• "keluar 200rb bensin"\n' +
                '• "masuk 1jt freelance"',
                'bot'
            );
        }

        // Scroll to bottom
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }

    parse(text) {
        text = text.toLowerCase().trim();

        // Determine type
        let type = null;
        const incomeKeywords = ['pemasukan', 'masuk', 'terima', 'dapat', 'income', 'gajian', 'lapor pemasukan', 'pendapatan'];
        const expenseKeywords = ['pengeluaran', 'keluar', 'bayar', 'beli', 'expense', 'lapor pengeluaran', 'belanja', 'jajan'];

        for (const kw of incomeKeywords) {
            if (text.includes(kw)) { type = 'income'; break; }
        }
        if (!type) {
            for (const kw of expenseKeywords) {
                if (text.includes(kw)) { type = 'expense'; break; }
            }
        }
        // Default to expense if no type detected but amount found
        if (!type) type = 'expense';

        // Extract amount
        let amount = this.extractAmount(text);
        if (!amount) return null;

        // Extract category and note
        const { category, note } = this.extractCategory(text, type);

        return {
            type,
            amount,
            category,
            note,
            date: new Date().toISOString().split('T')[0]
        };
    }

    extractAmount(text) {
        // Handle formats: 5.000.000, 5000000, 50rb, 50ribu, 1jt, 1juta, 1.5jt
        let amount = null;

        // Pattern: number with jt/juta (millions)
        let match = text.match(/(\d+[.,]?\d*)\s*(jt|juta)/i);
        if (match) {
            amount = parseFloat(match[1].replace(',', '.')) * 1000000;
            return Math.round(amount);
        }

        // Pattern: number with rb/ribu (thousands)
        match = text.match(/(\d+[.,]?\d*)\s*(rb|ribu)/i);
        if (match) {
            amount = parseFloat(match[1].replace(',', '.')) * 1000;
            return Math.round(amount);
        }

        // Pattern: formatted number like 5.000.000 or 5,000,000
        match = text.match(/(\d{1,3}(?:[.,]\d{3})+)/);
        if (match) {
            amount = parseInt(match[1].replace(/[.,]/g, ''));
            return amount;
        }

        // Pattern: plain number
        match = text.match(/(\d{4,})/);
        if (match) {
            amount = parseInt(match[1]);
            return amount;
        }

        return null;
    }

    extractCategory(text, type) {
        let category = type === 'income' ? 'lainnya_masuk' : 'lainnya_keluar';
        let note = '';

        // Category keyword mapping
        const categoryMap = {
            // Income
            'gaji': 'gaji', 'salary': 'gaji',
            'freelance': 'freelance', 'project': 'freelance',
            'bisnis': 'bisnis', 'jualan': 'bisnis', 'usaha': 'bisnis',
            'investasi': type === 'income' ? 'investasi_masuk' : 'investasi',
            'dividen': 'investasi_masuk', 'saham': 'investasi_masuk',
            'bonus': 'hadiah', 'hadiah': 'hadiah', 'thr': 'hadiah',
            // Expense - needs
            'makan': 'makanan', 'minum': 'makanan', 'kopi': 'makanan', 'snack': 'makanan',
            'bensin': 'transportasi', 'transport': 'transportasi', 'ojol': 'transportasi', 'grab': 'transportasi', 'gojek': 'transportasi', 'parkir': 'transportasi',
            'listrik': 'listrik', 'air': 'listrik', 'pln': 'listrik', 'wifi': 'listrik', 'internet': 'listrik',
            'sewa': 'sewa', 'kost': 'sewa', 'kontrakan': 'sewa', 'cicilan': 'sewa', 'kpr': 'sewa',
            'obat': 'kesehatan', 'dokter': 'kesehatan', 'rumah sakit': 'kesehatan', 'apotek': 'kesehatan',
            'sekolah': 'pendidikan', 'kuliah': 'pendidikan', 'kursus': 'pendidikan', 'buku': 'pendidikan',
            // Expense - wants
            'nonton': 'hiburan', 'film': 'hiburan', 'game': 'hiburan', 'spotify': 'hiburan', 'netflix': 'hiburan',
            'baju': 'belanja', 'sepatu': 'belanja', 'tas': 'belanja', 'shopee': 'belanja', 'tokped': 'belanja', 'belanja': 'belanja',
            'restoran': 'makan_luar', 'cafe': 'makan_luar', 'starbucks': 'makan_luar',
            'langganan': 'langganan', 'subscribe': 'langganan',
            'liburan': 'liburan', 'hotel': 'liburan', 'tiket': 'liburan', 'traveling': 'liburan',
            // Expense - savings
            'tabung': 'tabungan', 'nabung': 'tabungan', 'saving': 'tabungan',
            'invest': 'investasi', 'reksadana': 'investasi', 'crypto': 'investasi',
            'darurat': 'dana_darurat', 'emergency': 'dana_darurat',
        };

        // Find matching category
        for (const [keyword, catId] of Object.entries(categoryMap)) {
            if (text.includes(keyword)) {
                category = catId;
                break;
            }
        }

        // Extract note - remove type keywords, amount, and try to get remaining meaningful text
        let noteText = text;
        const removeWords = ['lapor', 'pemasukan', 'pengeluaran', 'masuk', 'keluar', 'bayar', 'beli', 'terima', 'dapat', 'income', 'expense'];
        removeWords.forEach(w => noteText = noteText.replace(w, ''));
        // Remove amounts
        noteText = noteText.replace(/(\d+[.,]?\d*)\s*(jt|juta|rb|ribu)/gi, '');
        noteText = noteText.replace(/\d{1,3}(?:[.,]\d{3})+/g, '');
        noteText = noteText.replace(/\d{4,}/g, '');
        note = noteText.replace(/\s+/g, ' ').trim();
        if (note.length < 2) note = '';

        return { category, note };
    }

    addBubble(text, sender) {
        const container = document.getElementById('chat-messages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        container.appendChild(bubble);
    }
}

// Initialize after app loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new ChatParser(app), 100);
});
