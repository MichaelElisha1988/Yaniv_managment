/**
 * מודול ניהול ממשק המשתמש (UI Manager)
 */

import { fireConfetti } from './confetti.js';

export class YanivUI {
  constructor() {
    this.selectedCallerId = null;
    this.roundCardInputs = {};
  }

  showToast(message, icon = 'ℹ️', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * החלפת מסכים
   */
  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * רינדור רשימת השחקנים במסך ההגדרות
   */
  renderSetupPlayers(players, onRemove) {
    const container = document.getElementById('setup-players-list');
    if (!container) return;

    if (players.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 18px; color: var(--text-muted); font-size: 0.95rem;">
          עדיין לא נוספו שחקנים. הוסף לפחות 2 שחקנים כדי להתחיל.
        </div>`;
      return;
    }

    container.innerHTML = players.map((p, idx) => `
      <div class="player-chip">
        <div class="player-chip-info">
          <span class="player-chip-order">#${idx + 1}</span>
          <div class="avatar-badge" style="border-color: ${p.color}">${p.avatar}</div>
          <span class="player-chip-name">${this.escapeHtml(p.name)}</span>
        </div>
        <button type="button" class="btn-delete-chip" data-idx="${idx}" title="הסר שחקן">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        onRemove(idx);
      });
    });
  }

  /**
   * רינדור לוח המשחק הראשי
   */
  renderActiveGame(game) {
    // 1. אינדיקטור סבב ומחלק
    const roundBadge = document.getElementById('active-round-num');
    if (roundBadge) roundBadge.textContent = `סבב ${game.currentRound}`;

    const dealer = game.getCurrentDealer();
    const dealerName = document.getElementById('active-dealer-name');
    if (dealerName && dealer) {
      dealerName.textContent = `${dealer.avatar} ${dealer.name}`;
    }

    // 2. כרטיסי שחקנים
    const grid = document.getElementById('scoreboard-grid');
    if (!grid) return;

    const leaderboard = game.getLeaderboard();
    const targetScore = game.settings.targetScore;

    grid.innerHTML = leaderboard.map((player, rankIdx) => {
      const isLeader = rankIdx === 0 && !player.isEliminated;
      const isDealer = dealer && dealer.id === player.id;
      const pct = Math.min(100, Math.round((player.totalScore / targetScore) * 100));

      let progressColor = 'var(--accent-emerald)';
      if (pct > 75) progressColor = 'var(--accent-ruby)';
      else if (pct > 50) progressColor = 'var(--accent-gold)';

      // בדיקת חצי אחרון
      const lastRound = game.history[game.history.length - 1];
      const hadHalvingLastRound = lastRound && lastRound.halvingEvents.some(h => h.playerId === player.id);

      // ניקוד סבב אחרון
      let lastScoreText = '';
      if (player.scoresHistory.length > 0) {
        const lastScore = player.scoresHistory[player.scoresHistory.length - 1];
        if (lastScore === 0) {
          lastScoreText = `<span class="last-round-badge zero">+0 (ניצח)</span>`;
        } else {
          lastScoreText = `<span class="last-round-badge positive">+${lastScore}</span>`;
        }
      }

      return `
        <div class="player-card ${isLeader ? 'is-leader' : ''} ${player.isEliminated ? 'is-eliminated' : ''}" data-player-id="${player.id}">
          ${hadHalvingLastRound ? `<div class="halved-badge">✂️ חצי!</div>` : ''}

          <div class="player-card-header">
            <div class="player-main-info">
              <div class="player-avatar" style="border-color: ${player.color}">${player.avatar}</div>
              <div class="player-name-wrapper">
                <div class="player-name">
                  ${this.escapeHtml(player.name)}
                  ${isDealer ? `<span class="dealer-tag" style="font-size:0.68rem; padding: 2px 6px;">🪙 מחלק</span>` : ''}
                </div>
                <div>
                  ${player.isEliminated
                    ? `<span class="eliminated-tag">נפסל (סבב ${player.eliminatedInRound})</span>`
                    : `<span class="badge-rank badge-rank-${rankIdx + 1}">מקום ${rankIdx + 1}</span>`}
                </div>
              </div>
            </div>

            <div class="player-score-box">
              <div class="score-number">${player.totalScore}</div>
              <div class="score-label">מתוך ${targetScore}</div>
            </div>
          </div>

          <div class="progress-bar-bg" title="${pct}% לפסילה">
            <div class="progress-bar-fill" style="width: ${pct}%; background: ${progressColor};"></div>
          </div>

          <div class="player-card-footer">
            <span>${lastScoreText || 'טרם שוחק'}</span>
            <span>${player.isEliminated ? 'מחוץ למשחק' : `${targetScore - player.totalScore} נק' לפסילה`}</span>
          </div>
        </div>
      `;
    }).join('');

    // כפתור Undo - מוצג רק אם יש היסטוריה
    const undoBtn = document.getElementById('btn-undo-round');
    if (undoBtn) {
      undoBtn.style.display = game.history.length > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * פתיחת מודאל הזנת תוצאות סבב
   */
  openRecordRoundModal(game, onSubmit) {
    const modal = document.getElementById('modal-record-round');
    if (!modal) return;

    const activePlayers = game.getActivePlayers();
    this.selectedCallerId = activePlayers[0]?.id || null;
    this.roundCardInputs = {};

    activePlayers.forEach(p => {
      this.roundCardInputs[p.id] = 0;
    });

    this.renderModalContent(game, onSubmit);
    modal.classList.add('open');
  }

  /**
   * רינדור תוכן מודאל הזנת הסבב
   */
  renderModalContent(game, onSubmit) {
    const activePlayers = game.getActivePlayers();

    // 1. בחירת המכריז (Caller)
    const callerContainer = document.getElementById('modal-caller-selector');
    if (callerContainer) {
      callerContainer.innerHTML = activePlayers.map(p => `
        <div class="caller-card ${p.id === this.selectedCallerId ? 'selected' : ''}" data-caller-id="${p.id}">
          <div class="caller-avatar">${p.avatar}</div>
          <div class="caller-name">${this.escapeHtml(p.name)}</div>
        </div>
      `).join('');

      callerContainer.querySelectorAll('.caller-card').forEach(el => {
        el.addEventListener('click', () => {
          this.selectedCallerId = el.getAttribute('data-caller-id');
          this.renderModalContent(game, onSubmit);
        });
      });
    }

    // 2. שדות הזנת ניקוד לכל שחקן
    const scoreContainer = document.getElementById('modal-players-scores');
    if (scoreContainer) {
      scoreContainer.innerHTML = activePlayers.map(p => {
        const isCaller = p.id === this.selectedCallerId;
        const currentVal = this.roundCardInputs[p.id] ?? 0;
        const quickChips = [0, 1, 2, 3, 4, 5, 7, 10, 14, 20];

        return `
          <div class="score-entry-row" data-player-id="${p.id}">
            <div class="score-entry-header">
              <div class="score-entry-player">
                <span>${p.avatar}</span>
                <span>${this.escapeHtml(p.name)}</span>
                ${isCaller ? `<span class="badge-caller">הכריז יניב 📣</span>` : ''}
              </div>
              <div class="score-input-container">
                <label style="font-size:0.8rem; color:var(--text-muted);">ערך קלפים:</label>
                <input type="number" min="0" max="100" class="score-number-input" 
                       id="input-score-${p.id}" value="${currentVal}" />
              </div>
            </div>

            <div class="quick-chips">
              ${quickChips.map(chipVal => `
                <button type="button" class="chip-btn ${currentVal === chipVal ? 'active' : ''}" 
                        data-player="${p.id}" data-val="${chipVal}">${chipVal}</button>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');

      // אירועי לחיצה על כפתורי הקיצור של הניקוד
      scoreContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-player');
          const val = parseInt(btn.getAttribute('data-val'), 10);
          this.roundCardInputs[pid] = val;
          const input = document.getElementById(`input-score-${pid}`);
          if (input) input.value = val;

          // עדכון סמנים פעילים
          btn.parentElement.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.updateLivePreview(game);
        });
      });

      // אירועי שינוי ידני ב-input
      scoreContainer.querySelectorAll('.score-number-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const pid = input.id.replace('input-score-', '');
          const val = Math.max(0, parseInt(e.target.value || '0', 10));
          this.roundCardInputs[pid] = val;
          this.updateLivePreview(game);
        });
      });
    }

    this.updateLivePreview(game);

    // כפתור אישור סבב
    const submitBtn = document.getElementById('modal-btn-confirm-round');
    if (submitBtn) {
      submitBtn.onclick = () => {
        if (!this.selectedCallerId) {
          this.showToast('בחר מי הכריז יניב', '⚠️');
          return;
        }
        onSubmit(this.selectedCallerId, this.roundCardInputs);
        this.closeRecordRoundModal();
      };
    }
  }

  /**
   * עדכון אינדיקציה חיה של אסף בתוך המודאל
   */
  updateLivePreview(game) {
    const previewBox = document.getElementById('modal-round-preview-box');
    if (!previewBox) return;

    if (!this.selectedCallerId) {
      previewBox.innerHTML = '';
      return;
    }

    const caller = game.players.find(p => p.id === this.selectedCallerId);
    const callerCards = Number(this.roundCardInputs[this.selectedCallerId] ?? 0);
    const activePlayers = game.getActivePlayers();

    let asafPlayer = null;
    let minOpponent = Infinity;

    for (const p of activePlayers) {
      if (p.id === this.selectedCallerId) continue;
      const v = Number(this.roundCardInputs[p.id] ?? 0);
      if (v <= callerCards) {
        if (v < minOpponent) {
          minOpponent = v;
          asafPlayer = p;
        }
      }
    }

    if (asafPlayer) {
      const penalty = game.settings.asafRule === 'fixed30' ? 30 : callerCards + 30;
      previewBox.innerHTML = `
        <div class="asaf-alert-banner">
          <span style="font-size: 1.5rem;">🚨</span>
          <div>
            <div><strong>התרעת אסף!</strong> ${this.escapeHtml(asafPlayer.name)} (${minOpponent}) עוקף/משווה את ${this.escapeHtml(caller.name)} (${callerCards})!</div>
            <div style="font-size: 0.8rem; opacity: 0.9;">${this.escapeHtml(caller.name)} יספוג עונש אסף של +${penalty} נקודות. ${this.escapeHtml(asafPlayer.name)} יקבל 0 נקודות.</div>
          </div>
        </div>
      `;
    } else {
      previewBox.innerHTML = `
        <div style="color: var(--accent-emerald); font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
          <span>✅</span>
          <span>יניב מוצלח! ${this.escapeHtml(caller.name)} מקבל 0 נקודות.</span>
        </div>
      `;
    }
  }

  closeRecordRoundModal() {
    const modal = document.getElementById('modal-record-round');
    if (modal) modal.classList.remove('open');
  }

  /**
   * פתיחת מודאל היסטוריית סבבים ולוח ניקוד מפורט
   */
  openHistoryModal(game) {
    const modal = document.getElementById('modal-history');
    if (!modal) return;

    const tbody = document.getElementById('history-table-body');
    const thead = document.getElementById('history-table-head');
    if (!tbody || !thead) return;

    // כותרת טבלה עם כל השחקנים
    thead.innerHTML = `
      <tr>
        <th>סבב</th>
        <th>יניב / אסף</th>
        ${game.players.map(p => `<th>${p.avatar} ${this.escapeHtml(p.name)}</th>`).join('')}
      </tr>
    `;

    if (game.history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${game.players.length + 2}" style="padding: 24px; color: var(--text-muted);">
            עדיין לא שוחקו סבבים.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = game.history.map(round => {
        let statusBadge = '';
        if (round.isAsaf) {
          statusBadge = `<span style="color:var(--accent-ruby); font-weight:700;">🚨 אסף! (${round.asafPlayerName})</span>`;
        } else {
          statusBadge = `<span style="color:var(--accent-emerald); font-weight:700;">📣 יניב (${round.callerName})</span>`;
        }

        return `
          <tr>
            <td><strong>#${round.roundNumber}</strong></td>
            <td>${statusBadge}</td>
            ${game.players.map(p => {
              const score = round.roundScores[p.id];
              if (score === undefined) {
                return `<td style="color: var(--text-muted);">-</td>`;
              }
              const isCaller = round.callerId === p.id;
              const isAsafWinner = round.asafPlayerId === p.id;
              const isHalved = round.halvingEvents.some(h => h.playerId === p.id);

              let cls = '';
              if (score === 0) cls = 'score-cell-winner';
              else if (isCaller && round.isAsaf) cls = 'score-cell-asaf';

              return `
                <td class="${cls}">
                  ${score}
                  ${isHalved ? `<span title="חצי!" style="font-size:0.75rem;">✂️</span>` : ''}
                </td>
              `;
            }).join('')}
          </tr>
        `;
      }).join('');
    }

    modal.classList.add('open');
  }

  closeHistoryModal() {
    const modal = document.getElementById('modal-history');
    if (modal) modal.classList.remove('open');
  }

  /**
   * הצגת מסך ניצחון וסיום משחק
   */
  renderGameOver(game, onRematch, onNewGame) {
    this.switchView('view-game-over');
    fireConfetti(3500);

    const winner = game.winner;
    const winnerNameEl = document.getElementById('winner-name');
    const winnerAvatarEl = document.getElementById('winner-avatar');
    const statsContainer = document.getElementById('victory-stats-grid');
    const leaderboardPodium = document.getElementById('victory-podium-list');

    if (winnerNameEl && winner) {
      winnerNameEl.textContent = winner.name;
    }
    if (winnerAvatarEl && winner) {
      winnerAvatarEl.textContent = winner.avatar;
    }

    const stats = game.getStats();
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-box">
          <div class="stat-num">${stats.totalRounds}</div>
          <div class="stat-label">סך סבבים</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${stats.yanivCount}</div>
          <div class="stat-label">יניב מוצלח</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${stats.asafCount}</div>
          <div class="stat-label">אספים שקרו</div>
        </div>
      `;
    }

    if (leaderboardPodium) {
      const sorted = game.getLeaderboard();
      leaderboardPodium.innerHTML = sorted.map((p, idx) => `
        <div class="player-chip" style="margin-bottom: 8px;">
          <div class="player-chip-info">
            <span class="badge-rank badge-rank-${idx + 1}">#${idx + 1}</span>
            <div class="avatar-badge" style="border-color:${p.color}">${p.avatar}</div>
            <span class="player-chip-name">${this.escapeHtml(p.name)}</span>
          </div>
          <div style="font-family: var(--font-num); font-size: 1.2rem; font-weight:800; color: ${idx === 0 ? 'var(--accent-gold)' : 'var(--text-main)'};">
            ${p.totalScore} נק'
          </div>
        </div>
      `).join('');
    }

    const btnRematch = document.getElementById('btn-rematch');
    if (btnRematch) btnRematch.onclick = onRematch;

    const btnNewGame = document.getElementById('btn-new-game-over');
    if (btnNewGame) btnNewGame.onclick = onNewGame;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
