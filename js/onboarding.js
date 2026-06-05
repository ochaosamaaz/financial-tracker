// ===== Onboarding Tour =====

class OnboardingTour {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                title: 'Selamat Datang! 🎉',
                description: 'CielFinanceTools membantu kamu dan pasangan mengelola keuangan bersama. Yuk kenalan sama fitur-fiturnya!',
                target: null,
                position: 'center'
            },
            {
                title: 'Dashboard',
                description: 'Lihat ringkasan keuangan bulanan: pemasukan, pengeluaran, saldo, dan grafik di sini.',
                target: '#page-dashboard .summary-cards',
                position: 'bottom'
            },
            {
                title: 'Chat Input',
                description: 'Catat transaksi dengan bahasa natural! Ketik "keluar 50rb makan" dan otomatis tercatat.',
                target: '[data-page="chat"]',
                position: 'right'
            },
            {
                title: 'Budget 50/30/20',
                description: 'Pantau alokasi pengeluaran: 50% kebutuhan, 30% keinginan, 20% tabungan/investasi.',
                target: '[data-page="budget"]',
                position: 'right'
            },
            {
                title: 'Pengaturan',
                description: 'Atur target budget bulanan, reminder harian, dan export data di menu Pengaturan.',
                target: '[data-page="settings"]',
                position: 'right'
            }
        ];
        this.overlay = null;
        this.tooltip = null;
    }

    shouldShow() {
        return !localStorage.getItem('onboarding_completed');
    }

    start() {
        if (!this.shouldShow()) return;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep();
    }

    createOverlay() {
        // Remove existing if any
        const existing = document.getElementById('onboarding-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'onboarding-overlay';
        this.overlay.className = 'onboarding-overlay';
        this.overlay.innerHTML = `
            <div class="onboarding-highlight" id="onboarding-highlight"></div>
            <div class="onboarding-tooltip" id="onboarding-tooltip">
                <div class="onboarding-step-indicator" id="onboarding-indicator"></div>
                <h4 class="onboarding-title" id="onboarding-title"></h4>
                <p class="onboarding-desc" id="onboarding-desc"></p>
                <div class="onboarding-actions">
                    <button class="onboarding-btn skip" id="onboarding-skip">Lewati</button>
                    <button class="onboarding-btn next" id="onboarding-next">Lanjut</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Bind events
        document.getElementById('onboarding-skip').addEventListener('click', () => this.finish());
        document.getElementById('onboarding-next').addEventListener('click', () => this.next());

        // Animate in
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });
    }

    showStep() {
        const step = this.steps[this.currentStep];
        const title = document.getElementById('onboarding-title');
        const desc = document.getElementById('onboarding-desc');
        const indicator = document.getElementById('onboarding-indicator');
        const highlight = document.getElementById('onboarding-highlight');
        const tooltip = document.getElementById('onboarding-tooltip');
        const nextBtn = document.getElementById('onboarding-next');

        // Update content
        title.textContent = step.title;
        desc.textContent = step.description;
        indicator.textContent = `${this.currentStep + 1} / ${this.steps.length}`;

        // Update button text
        if (this.currentStep === this.steps.length - 1) {
            nextBtn.textContent = 'Selesai ✓';
        } else {
            nextBtn.textContent = 'Lanjut →';
        }

        // Position highlight and tooltip
        if (step.target && step.position !== 'center') {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                highlight.style.display = 'block';
                highlight.style.top = (rect.top - 6) + 'px';
                highlight.style.left = (rect.left - 6) + 'px';
                highlight.style.width = (rect.width + 12) + 'px';
                highlight.style.height = (rect.height + 12) + 'px';

                // Position tooltip
                tooltip.classList.remove('center', 'bottom', 'right', 'left');
                tooltip.classList.add(step.position);

                if (step.position === 'bottom') {
                    tooltip.style.top = (rect.bottom + 16) + 'px';
                    tooltip.style.left = Math.max(16, rect.left) + 'px';
                    tooltip.style.transform = 'none';
                } else if (step.position === 'right') {
                    tooltip.style.top = rect.top + 'px';
                    tooltip.style.left = (rect.right + 16) + 'px';
                    tooltip.style.transform = 'none';
                }
            } else {
                highlight.style.display = 'none';
                tooltip.classList.add('center');
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }
        } else {
            highlight.style.display = 'none';
            tooltip.classList.remove('bottom', 'right', 'left');
            tooltip.classList.add('center');
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }

        // Animate tooltip
        tooltip.classList.remove('animate-in');
        requestAnimationFrame(() => {
            tooltip.classList.add('animate-in');
        });
    }

    next() {
        if (this.currentStep >= this.steps.length - 1) {
            this.finish();
            return;
        }
        this.currentStep++;
        this.showStep();
    }

    finish() {
        localStorage.setItem('onboarding_completed', 'true');
        if (this.overlay) {
            this.overlay.classList.remove('active');
            this.overlay.classList.add('fade-out');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }, 400);
        }
    }

    // Reset for testing
    static reset() {
        localStorage.removeItem('onboarding_completed');
    }
}

// Initialize onboarding after app enters
let onboardingTour;
function initOnboarding() {
    onboardingTour = new OnboardingTour();
    // Hook into enterApp to trigger onboarding
    if (typeof app !== 'undefined' && app) {
        const originalEnterApp = app.enterApp.bind(app);
        app.enterApp = function() {
            originalEnterApp();
            setTimeout(() => {
                if (onboardingTour.shouldShow()) {
                    onboardingTour.start();
                }
            }, 800);
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initOnboarding, 200));
} else {
    setTimeout(initOnboarding, 200);
}
