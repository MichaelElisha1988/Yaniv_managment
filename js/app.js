/**
 * נקודת כניסה ראשית לאפליקציה (Yaniv Manager App)
 */

import { YanivGame, DEFAULT_SETTINGS } from './game.js';
import { YanivUI } from './ui.js';
import { GameStorage } from './storage.js';
import { fireConfetti } from './confetti.js';

const AVATARS = ['👑', '🦊', '🦁', '🐺', '🦉', '🐯', '🐼', '🦅', '🦄', '🐲', '🎩', '⚡'];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];

class App {
  constructor() {
    this.ui = new YanivUI();
    this.game = null;
    this.setupPlayers = [
      { name: 'שחקן 1', avatar: '🦁', color: '#10b981' },
      { name: 'שחקן 2', avatar: '🦊', color: '#3b82f6' },
      { name: 'שחקן 3', avatar: '🦉', color: '#f59e0b' },
    ];
    this.setupSettings = { ...DEFAULT_SETTINGS };

    this.init();
  }

  init() {
    this.bindEvents();

    // בדיקה האם יש משחק פעיל שמור
    const savedData = GameStorage.loadActiveGame();
    if (savedData && savedData.players && savedData.players.length >= 2) {
      try {
        this.game = YanivGame.fromJSON(savedData);
        if (this.game.isGameOver) {
          this.ui.renderGameOver(
            this.game,
            () => this.handleRematch(),
            () => this.handleStartNewGamePrompt()
          );
        } else {
          this.ui.switchView('view-active-game');
          this.ui.renderActiveGame(this.game);
          this.ui.showToast('משחק קודם שוחזר בהצלחה', '🔄');
        }
        return;
      } catch (e) {
        console.error('Error resuming saved game:', e);
        GameStorage.clearActiveGame();
      }
    }

    // ברירת מחדל: מסך הגדרות
    this.ui.switchView('view-setup');
    this.ui.renderSetupPlayers(this.setupPlayers, (idx) => this.removePlayer(idx));
  }

  bindEvents() {
    // 1. הוספת שחקן במסך ההגדרות
    const formAddPlayer = document.getElementById('form-add-player');
    const inputPlayerName = document.getElementById('input-player-name');

    if (formAddPlayer && inputPlayerName) {
      formAddPlayer.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = inputPlayerName.value.trim();
        if (!name) return;

        if (this.setupPlayers.length >= 8) {
          this.ui.showToast('ניתן להוסיף עד 8 שחקנים', '⚠️');
          return;
        }

        const avatar = AVATARS[this.setupPlayers.length % AVATARS.length];
        const color = COLORS[this.setupPlayers.length % COLORS.length];

        this.setupPlayers.push({ name, avatar, color });
        inputPlayerName.value = '';
        inputPlayerName.focus();

        this.ui.renderSetupPlayers(this.setupPlayers, (idx) => this.removePlayer(idx));
      });
    }

    // 2. בחירת יעד נקודות לפסילה (100, 150, 200)
    document.querySelectorAll('[data-setting="targetScore"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setting="targetScore"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setupSettings.targetScore = parseInt(btn.getAttribute('data-value'), 10);
      });
    });

    // 3. חוק אסף (cardsPlus30 או fixed30)
    document.querySelectorAll('[data-setting="asafRule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setting="asafRule"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setupSettings.asafRule = btn.getAttribute('data-value');
      });
    });

    // 4. חוק החצאים (Toggle)
    const toggleHalving = document.getElementById('toggle-halving');
    if (toggleHalving) {
      toggleHalving.addEventListener('change', (e) => {
        this.setupSettings.halvingEnabled = e.target.checked;
      });
    }

    // 5. כפתור התחלת משחק
    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
      btnStartGame.addEventListener('click', () => this.startGame());
    }

    // 6. כפתור הזנת סבב חדש
    const btnRecordRound = document.getElementById('btn-record-round');
    if (btnRecordRound) {
      btnRecordRound.addEventListener('click', () => {
        if (!this.game) return;
        this.ui.openRecordRoundModal(this.game, (callerId, cardValues) => {
          this.submitRound(callerId, cardValues);
        });
      });
    }

    // 7. כפתור סגירת מודאל הזנת סבב
    const btnCloseModalRecord = document.getElementById('modal-btn-close-record');
    if (btnCloseModalRecord) {
      btnCloseModalRecord.addEventListener('click', () => {
        this.ui.closeRecordRoundModal();
      });
    }

    // 8. כפתור היסטוריית סבבים
    const btnViewHistory = document.getElementById('btn-view-history');
    if (btnViewHistory) {
      btnViewHistory.addEventListener('click', () => {
        if (this.game) this.ui.openHistoryModal(this.game);
      });
    }

    const btnCloseModalHistory = document.getElementById('modal-btn-close-history');
    if (btnCloseModalHistory) {
      btnCloseModalHistory.addEventListener('click', () => {
        this.ui.closeHistoryModal();
      });
    }

    // 9. כפתור ביטול סבב אחרון (Undo)
    const btnUndoRound = document.getElementById('btn-undo-round');
    if (btnUndoRound) {
      btnUndoRound.addEventListener('click', () => {
        if (!this.game) return;
        if (confirm('האם לבטל את תוצאות הסבב האחרון?')) {
          const success = this.game.undoLastRound();
          if (success) {
            GameStorage.saveActiveGame(this.game.toJSON());
            this.ui.renderActiveGame(this.game);
            this.ui.showToast('הסבב האחרון בוטל בהצלחה', '↩️');
          }
        }
      });
    }

    // 10. כפתור משחק חדש בראש הדף
    const btnNewGameHeader = document.getElementById('btn-new-game-header');
    if (btnNewGameHeader) {
      btnNewGameHeader.addEventListener('click', () => {
        this.handleStartNewGamePrompt();
      });
    }
  }

  removePlayer(idx) {
    if (this.setupPlayers.length <= 2) {
      this.ui.showToast('חובה לפחות 2 שחקנים במשחק', '⚠️');
      return;
    }
    this.setupPlayers.splice(idx, 1);
    this.ui.renderSetupPlayers(this.setupPlayers, (i) => this.removePlayer(i));
  }

  startGame() {
    if (this.setupPlayers.length < 2) {
      this.ui.showToast('נא להוסיף לפחות 2 שחקנים כדי להתחיל', '⚠️');
      return;
    }

    this.game = new YanivGame(this.setupPlayers, this.setupSettings);
    GameStorage.saveActiveGame(this.game.toJSON());

    this.ui.switchView('view-active-game');
    this.ui.renderActiveGame(this.game);
    this.ui.showToast(`המשחק התחיל! יעד פסילה: ${this.setupSettings.targetScore} נק'`, '🚀');
  }

  submitRound(callerId, cardValues) {
    try {
      const result = this.game.submitRound(callerId, cardValues);
      GameStorage.saveActiveGame(this.game.toJSON());

      // בדיקת אירועים מיוחדים להתרעות וחגיגות
      if (result.isAsaf) {
        this.ui.showToast(`🚨 אסף! ${result.asafPlayerName} תפס את ${result.callerName}!`, '💥', 4000);
      } else {
        this.ui.showToast(`📣 יניב מוצלח ל-${result.callerName}! (0 נק')`, '🎉', 3000);
      }

      // חגיגת חצאים
      if (result.halvingEvents.length > 0) {
        result.halvingEvents.forEach(h => {
          setTimeout(() => {
            this.ui.showToast(`✂️ חצי! הניקוד של ${h.playerName} נחתך מ-${h.from} ל-${h.to}!`, '✨', 4500);
            fireConfetti(1500);
          }, 600);
        });
      }

      // בדיקת פסילות חדשות
      if (result.newlyEliminated.length > 0) {
        result.newlyEliminated.forEach(el => {
          setTimeout(() => {
            this.ui.showToast(`⛔ ${el.name} נפסל (${el.score} נקודות)!`, '💀', 4000);
          }, 1000);
        });
      }

      // האם המשחק נגמר
      if (this.game.isGameOver) {
        GameStorage.archiveCompletedGame({
          winner: this.game.winner?.name,
          rounds: this.game.history.length,
          targetScore: this.game.settings.targetScore,
          players: this.game.players.map(p => ({ name: p.name, score: p.totalScore })),
        });
        GameStorage.clearActiveGame();

        setTimeout(() => {
          this.ui.renderGameOver(
            this.game,
            () => this.handleRematch(),
            () => this.handleStartNewGamePrompt()
          );
        }, 1200);
      } else {
        this.ui.renderActiveGame(this.game);
      }
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || 'שגיאה בעיבוד הסבב', '❌');
    }
  }

  handleRematch() {
    if (!this.game) return;
    const currentPlayers = this.game.players.map(p => ({
      name: p.name,
      avatar: p.avatar,
      color: p.color,
    }));

    this.game = new YanivGame(currentPlayers, this.game.settings);
    GameStorage.saveActiveGame(this.game.toJSON());

    this.ui.switchView('view-active-game');
    this.ui.renderActiveGame(this.game);
    this.ui.showToast('משחק חוזר החל! בהצלחה!', '🔁');
  }

  handleStartNewGamePrompt() {
    if (this.game && !this.game.isGameOver) {
      if (!confirm('האם לסיים את המשחק הנוכחי ולהתחיל משחק חדש?')) {
        return;
      }
    }

    GameStorage.clearActiveGame();
    this.game = null;
    this.ui.switchView('view-setup');
    this.ui.renderSetupPlayers(this.setupPlayers, (idx) => this.removePlayer(idx));
  }
}

// הפעלת האפליקציה בטעינת ה-DOM
document.addEventListener('DOMContentLoaded', () => {
  window.yanivApp = new App();
});
