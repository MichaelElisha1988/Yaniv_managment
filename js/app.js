/**
 * נקודת כניסה ראשית לאפליקציה (Yaniv Manager App)
 * כולל ניהול מאגר שחקנים קבוע, מעקב סטטיסטיקות, עצירת משחק באמצע, ומגבלת 5 שחקנים.
 */

import { YanivGame, DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS } from './game.js';
import { YanivUI } from './ui.js';
import { GameStorage } from './storage.js';
import { fireConfetti } from './confetti.js';

const AVATARS = ['👑', '🦊', '🦁', '🐺', '🦉', '🐯', '🐼', '🦅', '🦄', '🐲', '🎩', '⚡'];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];

class App {
  constructor() {
    this.ui = new YanivUI();
    this.game = null;
    this.savedPlayers = [];
    this.selectedPlayerIds = [];
    this.setupSettings = { ...DEFAULT_SETTINGS };

    this.init();
  }

  init() {
    this.loadRoster();
    this.bindEvents();

    // בדיקה האם יש משחק פעיל / מושהה שמור
    const savedData = GameStorage.loadActiveGame();
    if (savedData && savedData.players && savedData.players.length >= MIN_PLAYERS) {
      try {
        this.game = YanivGame.fromJSON(savedData);

        if (this.game.isGameOver) {
          this.ui.renderGameOver(
            this.game,
            () => this.handleRematch(),
            () => this.handleStartNewGamePrompt()
          );
          return;
        }

        // אם המשחק מושהה, נציג את מסך ההגדרות עם באנר המשך
        if (this.game.isPaused) {
          this.showSetupView();
          return;
        }

        // אחרת, חזרה ישירה למשחק הפעיל
        this.ui.switchView('view-active-game');
        this.ui.renderActiveGame(this.game);
        this.ui.showToast('משחק שוחזר בהצלחה', '🔄');
        return;
      } catch (e) {
        console.error('Error resuming saved game:', e);
        GameStorage.clearActiveGame();
      }
    }

    this.showSetupView();
  }

  loadRoster() {
    this.savedPlayers = GameStorage.getSavedPlayers();
    // כברירת מחדל, נבחר עד 3-4 שחקנים ראשונים מהמאגר
    if (this.selectedPlayerIds.length === 0) {
      this.selectedPlayerIds = this.savedPlayers.slice(0, Math.min(3, MAX_PLAYERS)).map(p => p.id);
    }
  }

  showSetupView() {
    this.ui.switchView('view-setup');
    this.ui.renderResumeBanner(this.game, () => this.resumeActiveGame());
    this.ui.renderRoster(
      this.savedPlayers,
      this.selectedPlayerIds,
      (pid) => this.togglePlayerSelection(pid),
      (pid) => this.deletePlayerFromRoster(pid)
    );
  }

  togglePlayerSelection(pid) {
    const idx = this.selectedPlayerIds.indexOf(pid);
    if (idx >= 0) {
      this.selectedPlayerIds.splice(idx, 1);
    } else {
      if (this.selectedPlayerIds.length >= MAX_PLAYERS) {
        this.ui.showToast(`במשחק יניב יכולים להשתתף לכל היותר ${MAX_PLAYERS} שחקנים`, '⚠️');
        return;
      }
      this.selectedPlayerIds.push(pid);
    }

    this.ui.renderRoster(
      this.savedPlayers,
      this.selectedPlayerIds,
      (id) => this.togglePlayerSelection(id),
      (id) => this.deletePlayerFromRoster(id)
    );
  }

  async deletePlayerFromRoster(pid) {
    const player = this.savedPlayers.find(p => p.id === pid);
    const name = player ? player.name : 'השחקן';

    const confirmed = await this.ui.confirmDialog({
      title: 'מחיקת שחקן',
      message: `האם למחוק את "${name}" ממאגר השחקנים? הנתונים והסטטיסטיקות שנצברו יימחקו.`,
      icon: '🗑️',
      confirmText: 'מחק שחקן',
      cancelText: 'ביטול',
      isDanger: true,
    });

    if (confirmed) {
      this.savedPlayers = GameStorage.deletePlayer(pid);
      this.selectedPlayerIds = this.selectedPlayerIds.filter(id => id !== pid);
      this.ui.renderRoster(
        this.savedPlayers,
        this.selectedPlayerIds,
        (id) => this.togglePlayerSelection(id),
        (id) => this.deletePlayerFromRoster(id)
      );
      this.ui.showToast(`השחקן "${name}" הוסר מהמאגר`, '🗑️');
    }
  }

  bindEvents() {
    // 1. הוספת שחקן חדש למאגר הקבוע
    const formAddPlayer = document.getElementById('form-add-player');
    const inputPlayerName = document.getElementById('input-player-name');

    if (formAddPlayer && inputPlayerName) {
      formAddPlayer.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = inputPlayerName.value.trim();
        if (!name) return;

        const avatar = AVATARS[this.savedPlayers.length % AVATARS.length];
        const color = COLORS[this.savedPlayers.length % COLORS.length];

        const newPlayer = {
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name,
          avatar,
          color,
          stats: { gamesPlayed: 0, gamesWon: 0, roundsWon: 0, asafMade: 0, asafReceived: 0 },
        };

        this.savedPlayers = GameStorage.upsertPlayer(newPlayer);

        // אם יש מקום, נוסיף אותו מיד לנבחרים
        if (this.selectedPlayerIds.length < MAX_PLAYERS) {
          this.selectedPlayerIds.push(newPlayer.id);
        }

        inputPlayerName.value = '';
        inputPlayerName.blur();

        this.ui.renderRoster(
          this.savedPlayers,
          this.selectedPlayerIds,
          (id) => this.togglePlayerSelection(id),
          (id) => this.deletePlayerFromRoster(id)
        );

        this.ui.showToast(`השחקן "${name}" נשמר במאגר בהצלחה`, '✅');
      });
    }

    // 2. הגדרת יעד נקודות (100 / 150 / 200)
    document.querySelectorAll('[data-setting="targetScore"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setting="targetScore"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setupSettings.targetScore = parseInt(btn.getAttribute('data-value'), 10);
      });
    });

    // 3. חוק אסף
    document.querySelectorAll('[data-setting="asafRule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setting="asafRule"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setupSettings.asafRule = btn.getAttribute('data-value');
      });
    });

    // 4. חוק החצאים
    const toggleHalving = document.getElementById('toggle-halving');
    const halvingOptionsBox = document.getElementById('halving-options-box');
    if (toggleHalving) {
      toggleHalving.addEventListener('change', (e) => {
        this.setupSettings.halvingEnabled = e.target.checked;
        if (halvingOptionsBox) {
          halvingOptionsBox.style.display = e.target.checked ? 'block' : 'none';
        }
      });
    }

    // 4.1 יעד איפוס ל-50 (25 או 0)
    document.querySelectorAll('[data-setting="halving50To"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setting="halving50To"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setupSettings.halving50To = parseInt(btn.getAttribute('data-value'), 10);
      });
    });

    // 5. התחלת משחק חדש
    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
      btnStartGame.addEventListener('click', () => this.startGame());
    }

    // 6. הזנת סבב
    const btnRecordRound = document.getElementById('btn-record-round');
    if (btnRecordRound) {
      btnRecordRound.addEventListener('click', () => {
        if (!this.game) return;
        this.ui.openRecordRoundModal(this.game, (callerId, cardValues) => {
          this.submitRound(callerId, cardValues);
        });
      });
    }

    const btnCloseModalRecord = document.getElementById('modal-btn-close-record');
    if (btnCloseModalRecord) {
      btnCloseModalRecord.addEventListener('click', () => {
        this.ui.closeRecordRoundModal();
      });
    }

    // 7. לוח ניקוד והיסטוריה
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

    // 8. ביטול סבב (Undo)
    const btnUndoRound = document.getElementById('btn-undo-round');
    if (btnUndoRound) {
      btnUndoRound.addEventListener('click', async () => {
        if (!this.game) return;
        const confirmed = await this.ui.confirmDialog({
          title: 'ביטול סבב אחרון',
          message: 'האם לבטל את תוצאות הסבב האחרון ולהחזיר את לוח הניקוד לקדמותו?',
          icon: '↩️',
          confirmText: 'כן, בטל סבב',
          cancelText: 'השאר כך',
          isDanger: false,
        });

        if (confirmed) {
          const success = this.game.undoLastRound();
          if (success) {
            GameStorage.saveActiveGame(this.game.toJSON());
            this.ui.renderActiveGame(this.game);
            this.ui.showToast('הסבב האחרון בוטל בהצלחה', '↩️');
          }
        }
      });
    }

    // 9. כפתור עצירת משחק (Pause)
    const btnPauseGame = document.getElementById('btn-pause-game');
    if (btnPauseGame) {
      btnPauseGame.addEventListener('click', () => {
        if (!this.game) return;
        this.ui.openPauseModal(this.game, {
          onResume: () => {
            this.ui.showToast('ממשיכים במשחק', '▶️');
          },
          onPauseAndExit: () => {
            this.pauseAndExitToMenu();
          },
          onFinishEarly: () => {
            this.finishGameEarly();
          },
          onAbort: () => {
            this.abortGame();
          }
        });
      });
    }

    // 10. כפתור משחק חדש בראש הדף
    const btnNewGameHeader = document.getElementById('btn-new-game-header');
    if (btnNewGameHeader) {
      btnNewGameHeader.addEventListener('click', () => {
        this.handleStartNewGamePrompt();
      });
    }

    // 11. העתקה / הדבקת נתונים (Backup / Restore)
    const btnOpenDataModal = document.getElementById('btn-open-data-modal');
    const modalData = document.getElementById('modal-data-sync');
    const btnCloseData = document.getElementById('modal-btn-close-data');
    const textareaExport = document.getElementById('textarea-export-json');
    const textareaImport = document.getElementById('textarea-import-json');
    const btnCopyExport = document.getElementById('btn-copy-export-json');
    const btnPasteImport = document.getElementById('btn-paste-from-clipboard');
    const btnApplyImport = document.getElementById('btn-apply-import-json');

    if (btnOpenDataModal && modalData) {
      btnOpenDataModal.addEventListener('click', () => {
        if (textareaExport) {
          textareaExport.value = GameStorage.exportAllData();
        }
        if (textareaImport) {
          textareaImport.value = '';
        }
        modalData.classList.add('open');
      });
    }

    if (btnCloseData && modalData) {
      btnCloseData.addEventListener('click', () => {
        modalData.classList.remove('open');
      });
    }

    if (btnCopyExport && textareaExport) {
      btnCopyExport.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textareaExport.value);
          } else {
            textareaExport.select();
            document.execCommand('copy');
          }
          this.ui.showToast('כל הנתונים הועתקו ללוח! 📋', '✅');
        } catch (e) {
          textareaExport.select();
          this.ui.showToast('סמן והעתק את הטקסט באופן ידני', 'ℹ️');
        }
      });
    }

    if (btnPasteImport && textareaImport) {
      btnPasteImport.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              textareaImport.value = text;
              this.ui.showToast('הנתונים הודבקו מהלוח', '📋');
            }
          } else {
            this.ui.showToast('הדבק ישירות בתוך תיבת הטקסט', 'ℹ️');
          }
        } catch (e) {
          this.ui.showToast('לא ניתן לקרוא אוטומטית מהלוח, הדבק ידנית', 'ℹ️');
        }
      });
    }

    if (btnApplyImport && textareaImport) {
      btnApplyImport.addEventListener('click', async () => {
        const val = textareaImport.value.trim();
        if (!val) {
          this.ui.showToast('נא להדביק נתוני JSON תקפים תחילה', '⚠️');
          return;
        }

        const confirmed = await this.ui.confirmDialog({
          title: 'שחזור וטעינת נתונים',
          message: 'פעולה זו תטען את מאגר השחקנים, המשחק וההיסטוריה מתוך הנתונים שהודבקו. האם להמשיך?',
          icon: '📥',
          confirmText: 'כן, טען נתונים',
          cancelText: 'ביטול',
          isDanger: true,
        });

        if (!confirmed) return;

        const result = GameStorage.importAllData(val);
        if (!result.success) {
          this.ui.showToast(result.error || 'שגיאה בייבוא הנתונים', '❌');
          return;
        }

        // טעינה מחודשת של הנתונים והמשחק
        this.loadRoster();
        const activeGameData = GameStorage.loadActiveGame();
        if (activeGameData && activeGameData.players && activeGameData.players.length >= 2) {
          this.game = YanivGame.fromJSON(activeGameData);
        } else {
          this.game = null;
        }

        modalData.classList.remove('open');
        this.showSetupView();
        this.ui.showToast('כל הנתונים שוחזרו ונטענו בהצלחה! 🚀', '🎉', 4000);
      });
    }
  }

  startGame() {
    if (this.selectedPlayerIds.length < MIN_PLAYERS) {
      this.ui.showToast(`נא לבחור לפחות ${MIN_PLAYERS} שחקנים`, '⚠️');
      return;
    }
    if (this.selectedPlayerIds.length > MAX_PLAYERS) {
      this.ui.showToast(`ניתן לבחור עד ${MAX_PLAYERS} שחקנים בלבד`, '⚠️');
      return;
    }

    const playersToPlay = this.savedPlayers.filter(p => this.selectedPlayerIds.includes(p.id));

    this.game = new YanivGame(playersToPlay, this.setupSettings);
    GameStorage.saveActiveGame(this.game.toJSON());

    this.ui.switchView('view-active-game');
    this.ui.renderActiveGame(this.game);
    this.ui.showToast(`המשחק התחיל! ${playersToPlay.length} שחקנים`, '🚀');
  }

  resumeActiveGame() {
    if (!this.game) return;
    this.game.isPaused = false;
    GameStorage.saveActiveGame(this.game.toJSON());
    this.ui.switchView('view-active-game');
    this.ui.renderActiveGame(this.game);
    this.ui.showToast('חזרת למשחק הפעיל!', '▶️');
  }

  pauseAndExitToMenu() {
    if (!this.game) return;
    this.game.isPaused = true;
    GameStorage.saveActiveGame(this.game.toJSON());
    this.showSetupView();
    this.ui.showToast('המשחק הושהה ונשמר! ניתן להמשיך בכל עת', '💾');
  }

  finishGameEarly() {
    if (!this.game) return;
    const winner = this.game.finishEarly();
    this.handleGameFinished();
    this.ui.showToast(`המשחק הסתיים מוקדם! ${winner.name} מנצח!`, '🏁');
  }

  async abortGame() {
    const confirmed = await this.ui.confirmDialog({
      title: 'ביטול משחק',
      message: 'האם לבטל ולמחוק את המשחק הנוכחי? נתוני הסבבים ששוחקו במשחק זה לא יישמרו.',
      icon: '🗑️',
      confirmText: 'כן, בטל משחק',
      cancelText: 'המשך לשחק',
      isDanger: true,
    });

    if (confirmed) {
      GameStorage.clearActiveGame();
      this.game = null;
      this.showSetupView();
      this.ui.showToast('המשחק בוטל', '🗑️');
    }
  }

  submitRound(callerId, cardValues) {
    try {
      const result = this.game.submitRound(callerId, cardValues);
      GameStorage.saveActiveGame(this.game.toJSON());

      // עדכון סטטיסטיקות שחקנים ב-localStorage
      if (result.isAsaf) {
        // המכריז קיבל אסף
        GameStorage.recordPlayerDeltas(result.callerId, { asafReceived: 1 });
        // התופס עשה אסף
        if (result.asafPlayerId) {
          GameStorage.recordPlayerDeltas(result.asafPlayerId, { asafMade: 1 });
        }
        this.ui.showToast(`🚨 אסף! ${result.asafPlayerName} תפס את ${result.callerName}!`, '💥', 4000);
      } else {
        // יניב מוצלח למכריז
        GameStorage.recordPlayerDeltas(result.callerId, { roundsWon: 1 });
        this.ui.showToast(`📣 יניב מוצלח ל-${result.callerName}! (0 נק')`, '🎉', 3000);
      }

      // חגיגת חצאים
      if (result.halvingEvents.length > 0) {
        result.halvingEvents.forEach(h => {
          setTimeout(() => {
            this.ui.showToast(`✂️ חצי! הניקוד של ${h.playerName} נחתך מ-${h.from} ל-${h.to}!`, '✨', 4000);
            fireConfetti(1500);
          }, 600);
        });
      }

      // שחקנים שנפסלו
      if (result.newlyEliminated.length > 0) {
        result.newlyEliminated.forEach(el => {
          setTimeout(() => {
            this.ui.showToast(`⛔ ${el.name} נפסל (${el.score} נקודות)!`, '💀', 4000);
          }, 1000);
        });
      }

      // בדיקת סיום משחק
      if (this.game.isGameOver) {
        this.handleGameFinished();
      } else {
        this.ui.renderActiveGame(this.game);
      }
    } catch (err) {
      console.error(err);
      this.ui.showToast(err.message || 'שגיאה בעיבוד הסבב', '❌');
    }
  }

  handleGameFinished() {
    const winner = this.game.winner;

    // עדכון ניצחון ומשחקים ששוחקו לכל המשתתפים
    if (winner) {
      GameStorage.recordPlayerDeltas(winner.id, { gamesWon: 1 });
    }
    this.game.players.forEach(p => {
      GameStorage.recordPlayerDeltas(p.id, { gamesPlayed: 1 });
    });

    // רענון נתוני השחקנים השמורים
    this.loadRoster();

    // ארכיון
    GameStorage.archiveCompletedGame({
      winner: winner?.name,
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
    }, 1000);
  }

  handleRematch() {
    if (!this.game) return;
    const currentPlayers = this.game.players.map(p => {
      const saved = this.savedPlayers.find(sp => sp.id === p.id);
      return saved || { name: p.name, avatar: p.avatar, color: p.color, id: p.id };
    });

    this.game = new YanivGame(currentPlayers, this.game.settings);
    GameStorage.saveActiveGame(this.game.toJSON());

    this.ui.switchView('view-active-game');
    this.ui.renderActiveGame(this.game);
    this.ui.showToast('משחק חוזר החל! בהצלחה!', '🔁');
  }

  handleStartNewGamePrompt() {
    if (this.game && !this.game.isGameOver) {
      this.pauseAndExitToMenu();
      return;
    }

    GameStorage.clearActiveGame();
    this.game = null;
    this.loadRoster();
    this.showSetupView();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.yanivApp = new App();
});
