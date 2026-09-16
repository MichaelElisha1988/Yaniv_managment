/**
 * מודול ניהול ממשק המשתמש (UI Manager)
 * מותאם מובייל (Mobile-First) עם תצוגת סטטיסטיקות שחקנים, מודאל עצירה והזנה מהירה.
 */

import { fireConfetti } from './confetti.js';
import { MAX_PLAYERS, MIN_PLAYERS } from './game.js';

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
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * רינדור באנר משחק מושהה / פעיל במסך ההגדרות
   */
  renderResumeBanner(activeGame, onResume) {
    const banner = document.getElementById('resume-game-banner');
    if (!banner) return;

    if (activeGame && !activeGame.isGameOver) {
      banner.style.display = 'flex';
      const infoEl = document.getElementById('resume-banner-text');
      if (infoEl) {
        infoEl.innerHTML = `<strong>משחק מושהה בסבב ${activeGame.currentRound}</strong> (${activeGame.players.length} שחקנים)`;
      }
      const resumeBtn = document.getElementById('btn-resume-banner');
      if (resumeBtn) {
        resumeBtn.onclick = onResume;
      }
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * רינדור מאגר השחקנים הקבוע במסך ההגדרות (עם סטטיסטיקות קריירה)
   */
  renderRoster(savedPlayers, selectedIds, onToggleSelect, onDeletePlayer) {
    const container = document.getElementById('roster-players-list');
    const countBadge = document.getElementById('selected-players-count');

    if (countBadge) {
      countBadge.textContent = `${selectedIds.length} / ${MAX_PLAYERS} שחקנים נבחרו`;
      if (selectedIds.length >= MIN_PLAYERS && selectedIds.length <= MAX_PLAYERS) {
        countBadge.className = 'player-count-badge valid';
      } else {
        countBadge.className = 'player-count-badge invalid';
      }
    }

    if (!container) return;

    if (savedPlayers.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 16px; color: var(--text-muted); font-size: 0.9rem;">
          עדיין אין שחקנים שמורים. הוסף שחקן למעלה כדי להתחיל.
        </div>`;
      return;
    }

    container.innerHTML = savedPlayers.map(p => {
      const isSelected = selectedIds.includes(p.id);
      const stats = p.stats || { gamesWon: 0, asafMade: 0, asafReceived: 0, gamesPlayed: 0 };

      return `
        <div class="roster-card ${isSelected ? 'is-selected' : ''}" data-player-id="${p.id}">
          <div class="roster-card-main">
            <div class="roster-player-info">
              <div class="checkbox-custom">${isSelected ? '✓' : ''}</div>
              <div class="avatar-badge" style="border-color: ${p.color}">${p.avatar}</div>
              <span class="roster-name">${this.escapeHtml(p.name)}</span>
            </div>
            <button type="button" class="btn-delete-roster" data-player-id="${p.id}" title="מחק שחקן מהמאגר">✕</button>
          </div>

          <!-- Career Stats -->
          <div class="career-stats-row">
            <span class="stat-pill wins" title="ניצחונות במשחק">
              <span>🏆</span> <span>ניצח:</span> <strong>${stats.gamesWon || 0}</strong>
            </span>
            <span class="stat-pill asaf-made" title="אספים שעשה בהצלחה">
              <span>⚡</span> <span>עשה אסף:</span> <strong>${stats.asafMade || 0}</strong>
            </span>
            <span class="stat-pill asaf-got" title="אספים שחטף כשהכריז">
              <span>💥</span> <span>קיבל אסף:</span> <strong>${stats.asafReceived || 0}</strong>
            </span>
            <span class="stat-pill resets" title="סך איפוסים וחצאים שהשיג">
              <span>✂️</span> <span>איפוסים:</span> <strong>${stats.resetsCount || 0}</strong>
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Toggle selection click
    container.querySelectorAll('.roster-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-roster')) return;
        const pid = card.getAttribute('data-player-id');
        onToggleSelect(pid);
      });
    });

    // Delete player click
    container.querySelectorAll('.btn-delete-roster').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.getAttribute('data-player-id');
        onDeletePlayer(pid);
      });
    });
  }

  /**
   * רינדור לוח המשחק הראשי
   */
  renderActiveGame(game) {
    const roundBadge = document.getElementById('active-round-num');
    if (roundBadge) roundBadge.textContent = `סבב ${game.currentRound}`;

    const dealer = game.getCurrentDealer();
    const dealerName = document.getElementById('active-dealer-name');
    if (dealerName && dealer) {
      dealerName.textContent = `${dealer.avatar} ${dealer.name}`;
    }

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

      const lastRound = game.history[game.history.length - 1];
      const hadHalvingLastRound = lastRound && lastRound.halvingEvents.some(h => h.playerId === player.id);

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

  renderModalContent(game, onSubmit) {
    const activePlayers = game.getActivePlayers();

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
                <label style="font-size:0.78rem; color:var(--text-muted);">ערך קלפים:</label>
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

      scoreContainer.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-player');
          const val = parseInt(btn.getAttribute('data-val'), 10);
          this.roundCardInputs[pid] = val;
          const input = document.getElementById(`input-score-${pid}`);
          if (input) input.value = val;

          btn.parentElement.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.updateLivePreview(game);
        });
      });

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
          <span style="font-size: 1.4rem;">🚨</span>
          <div>
            <div><strong>התרעת אסף!</strong> ${this.escapeHtml(asafPlayer.name)} (${minOpponent}) עוקף/משווה את ${this.escapeHtml(caller.name)} (${callerCards})!</div>
            <div style="font-size: 0.78rem; opacity: 0.9;">${this.escapeHtml(caller.name)} יספוג עונש אסף (+${penalty} נק'). ${this.escapeHtml(asafPlayer.name)} יקבל 0 נק'.</div>
          </div>
        </div>
      `;
    } else {
      previewBox.innerHTML = `
        <div style="color: var(--accent-emerald); font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
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
   * מודאל עצירת משחק (Pause Modal)
   */
  openPauseModal(game, { onResume, onPauseAndExit, onFinishEarly, onAbort }) {
    const modal = document.getElementById('modal-pause-game');
    if (!modal) return;

    const roundSpan = document.getElementById('pause-current-round-text');
    if (roundSpan) {
      roundSpan.textContent = `משחק מושהה בסבב ${game.currentRound}`;
    }

    const btnResume = document.getElementById('btn-pause-resume');
    if (btnResume) {
      btnResume.onclick = () => {
        this.closePauseModal();
        if (onResume) onResume();
      };
    }

    const btnSaveExit = document.getElementById('btn-pause-save-exit');
    if (btnSaveExit) {
      btnSaveExit.onclick = () => {
        this.closePauseModal();
        if (onPauseAndExit) onPauseAndExit();
      };
    }

    const btnFinishEarly = document.getElementById('btn-pause-finish-early');
    if (btnFinishEarly) {
      btnFinishEarly.onclick = () => {
        this.closePauseModal();
        if (onFinishEarly) onFinishEarly();
      };
    }

    const btnAbort = document.getElementById('btn-pause-abort');
    if (btnAbort) {
      btnAbort.onclick = () => {
        this.closePauseModal();
        if (onAbort) onAbort();
      };
    }

    modal.classList.add('open');
  }

  closePauseModal() {
    const modal = document.getElementById('modal-pause-game');
    if (modal) modal.classList.remove('open');
  }

  /**
   * מודאל היסטוריה
   */
  openHistoryModal(game) {
    const modal = document.getElementById('modal-history');
    if (!modal) return;

    const tbody = document.getElementById('history-table-body');
    const thead = document.getElementById('history-table-head');
    if (!tbody || !thead) return;

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
          <td colspan="${game.players.length + 2}" style="padding: 20px; color: var(--text-muted);">
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
   * מסך סיום משחק
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
        <div class="roster-card is-selected" style="margin-bottom: 8px; cursor: default;">
          <div class="roster-card-main">
            <div class="roster-player-info">
              <span class="badge-rank badge-rank-${idx + 1}">#${idx + 1}</span>
              <div class="avatar-badge" style="border-color:${p.color}">${p.avatar}</div>
              <span class="roster-name">${this.escapeHtml(p.name)}</span>
            </div>
            <div style="font-family: var(--font-num); font-size: 1.15rem; font-weight:800; color: ${idx === 0 ? 'var(--accent-gold)' : 'var(--text-main)'};">
              ${p.totalScore} נק'
            </div>
          </div>
        </div>
      `).join('');
    }

    const btnRematch = document.getElementById('btn-rematch');
    if (btnRematch) btnRematch.onclick = onRematch;

    const btnNewGame = document.getElementById('btn-new-game-over');
    if (btnNewGame) btnNewGame.onclick = onNewGame;
  }

  /**
   * פופאפ אישור מותאם אישית ויפה (מחליף את confirm של הדפדפן)
   * @returns {Promise<boolean>}
   */
  confirmDialog({ title = 'אישור פעולה', message = 'האם להמשיך?', icon = '⚠️', confirmText = 'אישור', cancelText = 'ביטול', isDanger = false } = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirm');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      const iconEl = document.getElementById('confirm-modal-icon');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const btnApprove = document.getElementById('confirm-btn-approve');
      const btnCancel = document.getElementById('confirm-btn-cancel');

      if (iconEl) iconEl.textContent = icon;
      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.textContent = message;

      if (btnApprove) {
        btnApprove.textContent = confirmText;
        if (isDanger) {
          btnApprove.className = 'btn-primary';
          btnApprove.style.background = 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)';
          btnApprove.style.boxShadow = '0 4px 14px rgba(244, 63, 94, 0.4)';
        } else {
          btnApprove.className = 'btn-primary btn-gold';
          btnApprove.style.background = '';
          btnApprove.style.boxShadow = '';
        }
      }

      if (btnCancel) {
        btnCancel.textContent = cancelText;
      }

      const cleanup = (result) => {
        modal.classList.remove('open');
        btnApprove.onclick = null;
        btnCancel.onclick = null;
        resolve(result);
      };

      btnApprove.onclick = () => cleanup(true);
      btnCancel.onclick = () => cleanup(false);

      modal.classList.add('open');
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

