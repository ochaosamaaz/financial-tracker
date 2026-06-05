// ===== CHAT INPUT - Natural Language Parser =====

class ChatParser {
    constructor(tracker) {
        this.tracker = tracker;
        this.init();
    }

    init() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        sendBtn.addEventListener('click', () => this.processMessage());
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.processMessage(); });
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
            const typeLabel = result.type === 'income' ? '📥 Pemasukan' : '📤 Pengeluaran';
            this.addBubble(
                `✅ Berhasil dicatat!\n\n` +
                `${typeLabel}\n` +
                `💰 ${this.tracker.formatMoney(result.amount)}\n` +
                `📂 ${catInfo ? catInfo.name : result.category}\n` +
                `📅 ${this.tracker.formatDate(result.date)}\n` +
                `${result.note ? '📝 ' + result.note : ''}`,
                'bot'
            );
        } else {
            this.addBubble(
                '❌ Hmm, saya belum mengerti.\n\nCoba format seperti:\n' +
                '• "pemasukan 5jt gaji"\n' +
                '• "keluar 50rb makan siang"\n' +
                '• "masuk 1.500.000 freelance"\n' +
                '• "bayar 200rb listrik"',
                'bot'
            );
        }
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }

    parse(text) {
        text = text.toLowerCase().trim();

        // Determine type
        let type = null;
        const incomeKw = ['pemasukan', 'masuk', 'terima', 'dapat', 'income', 'gajian', 'pendapatan', 'lapor pemasukan'];
        const expenseKw = ['pengeluaran', 'keluar', 'bayar', 'beli', 'expense', 'lapor pengeluaran', 'belanja', 'jajan', 'buat'];
        for (const kw of incomeKw) { if (text.includes(kw)) { type = 'income'; break; } }
        if (!type) { for (const kw of expenseKw) { if (text.includes(kw)) { type = 'expense'; break; } } }
        if (!type) type = 'expense';

        // Extract amount
        const amount = this.extractAmount(text);
        if (!amount) return null;

        // Extract category & note
        const { category, note } = this.extractCategory(text, type);

        return { type, amount, category, note, date: new Date().toISOString().split('T')[0] };
    }

    extractAmount(text) {
        let match = text.match(/(\d+[.,]?\d*)\s*(jt|juta)/i);
        if (match) return Math.round(parseFloat(match[1].replace(',', '.')) * 1000000);

        match = text.match(/(\d+[.,]?\d*)\s*(rb|ribu)/i);
        if (match) return Math.round(parseFloat(match[1].replace(',', '.')) * 1000);

        match = text.match(/(\d{1,3}(?:[.,]\d{3})+)/);
        if (match) return parseInt(match[1].replace(/[.,]/g, ''));

        match = text.match(/(\d{4,})/);
        if (match) return parseInt(match[1]);

        return null;
    }

    extractCategory(text, type) {
        let category = type === 'income' ? 'lainnya_masuk' : 'lainnya_keluar';
        let note = '';

        const map = {
            'gaji': 'gaji', 'salary': 'gaji',
            'freelance': 'freelance', 'project': 'freelance', 'proyek': 'freelance',
            'bisnis': 'bisnis', 'jualan': 'bisnis', 'usaha': 'bisnis',
            'investasi': type === 'income' ? 'investasi_masuk' : 'investasi',
            'dividen': 'investasi_masuk', 'saham': 'investasi_masuk', 'reksadana': 'investasi',
            'bonus': 'bonus', 'thr': 'bonus',
            'royalti': 'royalti',
            'jasa': 'jasa',
            'makan': 'makanan', 'minum': 'makanan', 'kopi': 'makanan', 'snack': 'makanan', 'sarapan': 'makanan', 'lunch': 'makanan', 'dinner': 'makanan',
            'bensin': 'transportasi', 'bbm': 'transportasi', 'transport': 'transportasi', 'ojol': 'transportasi', 'grab': 'transportasi', 'gojek': 'transportasi', 'parkir': 'transportasi', 'tol': 'transportasi',
            'listrik': 'listrik', 'air': 'listrik', 'pln': 'listrik', 'wifi': 'listrik', 'internet': 'listrik', 'token': 'listrik',
            'sewa': 'sewa', 'kost': 'sewa', 'kontrakan': 'sewa', 'cicilan': 'sewa', 'kpr': 'sewa', 'kredit': 'sewa',
            'obat': 'kesehatan', 'dokter': 'kesehatan', 'rs': 'kesehatan', 'apotek': 'kesehatan', 'vitamin': 'kesehatan',
            'sekolah': 'pendidikan', 'kuliah': 'pendidikan', 'kursus': 'pendidikan', 'buku': 'pendidikan', 'spp': 'pendidikan',
            'belanja bulanan': 'belanja_bulanan', 'groceries': 'belanja_bulanan', 'supermarket': 'belanja_bulanan',
            'nonton': 'hiburan', 'film': 'hiburan', 'game': 'hiburan', 'spotify': 'hiburan', 'netflix': 'hiburan', 'konser': 'hiburan', 'bioskop': 'hiburan',
            'baju': 'pakaian', 'sepatu': 'pakaian', 'tas': 'pakaian', 'pakaian': 'pakaian',
            'shopee': 'belanja', 'tokped': 'belanja', 'online': 'belanja',
            'restoran': 'makan_luar', 'cafe': 'makan_luar', 'starbucks': 'makan_luar', 'makan luar': 'makan_luar',
            'langganan': 'langganan', 'subscribe': 'langganan', 'streaming': 'langganan',
            'liburan': 'liburan', 'hotel': 'liburan', 'tiket': 'liburan', 'traveling': 'liburan',
            'sosial': 'sosial', 'amplop': 'sosial', 'nikahan': 'sosial', 'zakat': 'sosial', 'sedekah': 'sosial', 'infaq': 'sosial',
            'tabung': 'tabungan', 'nabung': 'tabungan', 'saving': 'tabungan',
            'darurat': 'dana_darurat', 'emergency': 'dana_darurat',
        };

        for (const [keyword, catId] of Object.entries(map)) {
            if (text.includes(keyword)) { category = catId; break; }
        }

        // Extract note
        let noteText = text;
        const removeWords = ['lapor', 'pemasukan', 'pengeluaran', 'masuk', 'keluar', 'bayar', 'beli', 'terima', 'dapat', 'buat'];
        removeWords.forEach(w => noteText = noteText.replace(new RegExp(w, 'g'), ''));
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
