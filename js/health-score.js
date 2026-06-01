// ===== Financial Health Score =====

class FinancialHealthScore {
    constructor(tracker) {
        this.tracker = tracker;
    }

    calculate() {
        const mk = this.tracker.getSelectedMonthKey();
        const summary = this.tracker.calcMonthSummary(mk);
        const ratio = this.tracker.calcRatio(mk);
        const txs = this.tracker.getMonthTransactions(mk);

        const components = {
            savingsRate: this.calcSavingsRate(summary),
            budgetAdherence: this.calcBudgetAdherence(summary),
            ratioCompliance: this.calcRatioCompliance(ratio),
            consistency: this.calcConsistency(txs, mk),
            streak: this.calcStreak(mk)
        };

        const totalScore = Math.round(
            components.savingsRate.score +
            components.budgetAdherence.score +
            components.ratioCompliance.score +
            components.consistency.score +
            components.streak.score
        );

        return {
            total: Math.min(totalScore, 100),
            components,
            tips: this.generateTips(components)
        };
    }

    // Savings rate: income vs expense (30 points max)
    calcSavingsRate(summary) {
        const maxPoints = 30;
        if (summary.income <= 0) return { score: 0, max: maxPoints, label: 'Tingkat Tabungan', detail: 'Belum ada pemasukan' };
        const rate = (summary.income - summary.expense) / summary.income;
        // 20%+ savings = full points, linearly decreasing
        let score = 0;
        if (rate >= 0.2) score = maxPoints;
        else if (rate >= 0) score = (rate / 0.2) * maxPoints;
        else score = 0;
        const pct = Math.round(rate * 100);
        return { score: Math.round(score), max: maxPoints, label: 'Tingkat Tabungan', detail: `${pct}% dari pemasukan ditabung`, rate: pct };
    }

    // Budget adherence: staying within target (20 points max)
    calcBudgetAdherence(summary) {
        const maxPoints = 20;
        const target = this.tracker.settings.budgetTarget || 0;
        if (target <= 0) return { score: maxPoints * 0.5, max: maxPoints, label: 'Kepatuhan Budget', detail: 'Target belum diset' };
        const usage = summary.expense / target;
        let score = 0;
        if (usage <= 0.7) score = maxPoints;
        else if (usage <= 1.0) score = maxPoints * (1 - (usage - 0.7) / 0.3) * 0.5 + maxPoints * 0.5;
        else score = Math.max(0, maxPoints * 0.3 * (1 - (usage - 1.0)));
        const pct = Math.round(usage * 100);
        return { score: Math.round(Math.max(0, score)), max: maxPoints, label: 'Kepatuhan Budget', detail: `${pct}% budget terpakai`, usage: pct };
    }

    // 50/30/20 ratio compliance (20 points max)
    calcRatioCompliance(ratio) {
        const maxPoints = 20;
        if (ratio.total <= 0) return { score: 0, max: maxPoints, label: 'Rasio 50/30/20', detail: 'Belum ada pengeluaran' };
        const needsPct = (ratio.needs / ratio.total) * 100;
        const wantsPct = (ratio.wants / ratio.total) * 100;
        const savingsPct = (ratio.savings / ratio.total) * 100;
        // Calculate deviation from ideal
        const needsDev = Math.abs(needsPct - 50);
        const wantsDev = Math.abs(wantsPct - 30);
        const savingsDev = Math.abs(savingsPct - 20);
        const totalDev = needsDev + wantsDev + savingsDev;
        // Max total deviation is ~100, 0 deviation = full points
        let score = maxPoints * Math.max(0, 1 - totalDev / 60);
        return {
            score: Math.round(score), max: maxPoints, label: 'Rasio 50/30/20',
            detail: `Kebutuhan ${Math.round(needsPct)}% / Keinginan ${Math.round(wantsPct)}% / Tabungan ${Math.round(savingsPct)}%`,
            needs: Math.round(needsPct), wants: Math.round(wantsPct), savings: Math.round(savingsPct)
        };
    }

    // Consistency: days with transactions logged (15 points max)
    calcConsistency(txs, mk) {
        const maxPoints = 15;
        const daysInMonth = new Date(parseInt(mk.split('-')[0]), parseInt(mk.split('-')[1]), 0).getDate();
        const today = new Date();
        const isCurrentMonth = mk === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
        const uniqueDays = new Set(txs.map(t => t.date)).size;
        const ratio = daysElapsed > 0 ? uniqueDays / daysElapsed : 0;
        // 60%+ days logged = full points
        let score = 0;
        if (ratio >= 0.6) score = maxPoints;
        else score = (ratio / 0.6) * maxPoints;
        return {
            score: Math.round(score), max: maxPoints, label: 'Konsistensi Catat',
            detail: `${uniqueDays} dari ${daysElapsed} hari tercatat`,
            days: uniqueDays, total: daysElapsed
        };
    }

    // Streak: consecutive days under budget (15 points max)
    calcStreak(mk) {
        const maxPoints = 15;
        const target = this.tracker.settings.budgetTarget || 0;
        if (target <= 0) return { score: maxPoints * 0.3, max: maxPoints, label: 'Streak Hemat', detail: 'Target belum diset' };
        const dailyTarget = target / 30;
        const txs = this.tracker.getMonthTransactions(mk).filter(t => t.type === 'expense');
        // Group expenses by day
        const byDay = {};
        txs.forEach(t => {
            if (t.date) {
                byDay[t.date] = (byDay[t.date] || 0) + t.amount;
            }
        });
        // Count max consecutive days under daily target
        const year = parseInt(mk.split('-')[0]);
        const month = parseInt(mk.split('-')[1]) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const isCurrentMonth = mk === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
        let streak = 0, maxStreak = 0;
        for (let d = 1; d <= maxDay; d++) {
            const dateStr = `${mk}-${String(d).padStart(2, '0')}`;
            const daySpend = byDay[dateStr] || 0;
            if (daySpend <= dailyTarget) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 0;
            }
        }
        // 10+ days streak = full points
        let score = 0;
        if (maxStreak >= 10) score = maxPoints;
        else score = (maxStreak / 10) * maxPoints;
        return {
            score: Math.round(score), max: maxPoints, label: 'Streak Hemat',
            detail: `${maxStreak} hari berturut-turut hemat`,
            streak: maxStreak
        };
    }

    generateTips(components) {
        const tips = [];
        if (components.savingsRate.score < 15) {
            tips.push({ icon: '💡', text: 'Tingkatkan tabungan! Target minimal 20% dari pemasukan.' });
        }
        if (components.budgetAdherence.score < 10) {
            tips.push({ icon: '⚠️', text: 'Pengeluaran melebihi budget. Evaluasi pengeluaran non-esensial.' });
        }
        if (components.ratioCompliance.score < 10) {
            tips.push({ icon: '📊', text: 'Sesuaikan rasio 50/30/20. Kurangi keinginan, tambah tabungan.' });
        }
        if (components.consistency.score < 8) {
            tips.push({ icon: '📝', text: 'Catat transaksi lebih rutin. Gunakan chat input untuk kemudahan!' });
        }
        if (components.streak.score < 8) {
            tips.push({ icon: '🔥', text: 'Jaga pengeluaran harian agar streak hemat makin panjang!' });
        }
        if (tips.length === 0) {
            tips.push({ icon: '🎉', text: 'Excellent! Keuanganmu sehat. Pertahankan!' });
        }
        return tips;
    }

    render() {
        const container = document.getElementById('health-score-section');
        if (!container) return;

        const result = this.calculate();
        const score = result.total;
        const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
        const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';

        container.innerHTML = `
            <div class="health-score-container">
                <div class="health-score-header">
                    <h3><i class="fas fa-heartbeat"></i> Financial Health Score</h3>
                    <span class="health-grade" style="background:${color}">${grade}</span>
                </div>
                <div class="health-score-body">
                    <div class="health-gauge-wrapper">
                        <div class="health-gauge">
                            <svg viewBox="0 0 120 120" class="gauge-svg">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="10"/>
                                <circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="10"
                                    stroke-dasharray="${(score / 100) * 314.16} 314.16"
                                    stroke-linecap="round" transform="rotate(-90 60 60)"
                                    class="gauge-progress"/>
                            </svg>
                            <div class="gauge-center">
                                <span class="gauge-score">${score}</span>
                                <span class="gauge-label">/ 100</span>
                            </div>
                        </div>
                    </div>
                    <div class="health-breakdown">
                        ${Object.values(result.components).map(c => `
                            <div class="health-component">
                                <div class="hc-header">
                                    <span class="hc-label">${c.label}</span>
                                    <span class="hc-score">${c.score}/${c.max}</span>
                                </div>
                                <div class="hc-bar"><div class="hc-fill" style="width:${(c.score/c.max)*100}%;background:${c.score/c.max >= 0.7 ? 'var(--success)' : c.score/c.max >= 0.4 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
                                <span class="hc-detail">${c.detail}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="health-tips">
                    <h4><i class="fas fa-lightbulb"></i> Tips</h4>
                    ${result.tips.map(t => `<div class="health-tip"><span class="tip-icon">${t.icon}</span><span>${t.text}</span></div>`).join('')}
                </div>
            </div>
        `;
    }
}

// Initialize health score after app loads
let healthScore;
function initHealthScore() {
    if (typeof app !== 'undefined' && app) {
        healthScore = new FinancialHealthScore(app);
        // Hook into refreshAll
        const originalRefreshAll = app.refreshAll.bind(app);
        app.refreshAll = function() {
            originalRefreshAll();
            if (healthScore) healthScore.render();
        };
        healthScore.render();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initHealthScore, 100));
} else {
    setTimeout(initHealthScore, 100);
}
