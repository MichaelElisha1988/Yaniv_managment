/**
 * מודול ניהול אחסון מקומי (Local Storage)
 * כולל מאגר שחקנים קבוע, מעקב סטטיסטיקות קריירה, ושמירת משחק פעיל/מושהה.
 */

const STORAGE_KEY = 'yaniv_active_game_v1';
const HISTORY_KEY = 'yaniv_completed_games_v1';
const PLAYERS_KEY = 'yaniv_persistent_players_v1';

export const GameStorage = {
  // =====================
  // מאגר שחקנים קבוע וסטטיסטיקות
  // =====================

  /**
   * טעינת כל השחקנים השמורים ב-LocalStorage
   */
  getSavedPlayers() {
    try {
      const data = localStorage.getItem(PLAYERS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to parse saved players:', e);
    }

    // ברירת מחדל התחלתית אם עדיין אין שחקנים
    const defaultPlayers = [
      {
        id: 'p_default_1',
        name: 'שחקן 1',
        avatar: '🦁',
        color: '#10b981',
        stats: { gamesPlayed: 0, gamesWon: 0, roundsWon: 0, asafMade: 0, asafReceived: 0, resetsCount: 0 }
      },
      {
        id: 'p_default_2',
        name: 'שחקן 2',
        avatar: '🦊',
        color: '#3b82f6',
        stats: { gamesPlayed: 0, gamesWon: 0, roundsWon: 0, asafMade: 0, asafReceived: 0, resetsCount: 0 }
      },
      {
        id: 'p_default_3',
        name: 'שחקן 3',
        avatar: '🦉',
        color: '#f59e0b',
        stats: { gamesPlayed: 0, gamesWon: 0, roundsWon: 0, asafMade: 0, asafReceived: 0, resetsCount: 0 }
      }
    ];
    this.saveAllPlayers(defaultPlayers);
    return defaultPlayers;
  },

  /**
   * שמירת כל רשימת השחקנים
   */
  saveAllPlayers(playersList) {
    try {
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(playersList));
    } catch (e) {
      console.error('Failed to save players to localStorage:', e);
    }
  },

  /**
   * הוספת או עדכון שחקן
   */
  upsertPlayer(playerData) {
    const players = this.getSavedPlayers();
    const existingIndex = players.findIndex(p => p.id === playerData.id || p.name.trim().toLowerCase() === playerData.name.trim().toLowerCase());

    if (existingIndex >= 0) {
      players[existingIndex] = {
        ...players[existingIndex],
        ...playerData,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          roundsWon: 0,
          asafMade: 0,
          asafReceived: 0,
          resetsCount: 0,
          ...players[existingIndex].stats,
          ...(playerData.stats || {})
        }
      };
    } else {
      players.push({
        id: playerData.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: playerData.name.trim(),
        avatar: playerData.avatar || '🃏',
        color: playerData.color || '#10b981',
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          roundsWon: 0,
          asafMade: 0,
          asafReceived: 0,
          resetsCount: 0,
          ...(playerData.stats || {})
        }
      });
    }

    this.saveAllPlayers(players);
    return players;
  },

  /**
   * מחיקת שחקן מהמאגר
   */
  deletePlayer(playerId) {
    const players = this.getSavedPlayers().filter(p => p.id !== playerId);
    this.saveAllPlayers(players);
    return players;
  },

  /**
   * עדכון סטטיסטיקות שחקן (כמה ניצח, כמה אספים עשה, כמה קיבל, וכמה איפוסים/חצאים השיג)
   */
  recordPlayerDeltas(playerId, { gamesPlayed = 0, gamesWon = 0, roundsWon = 0, asafMade = 0, asafReceived = 0, resetsCount = 0 }) {
    const players = this.getSavedPlayers();
    const p = players.find(x => x.id === playerId);
    if (!p) return;

    if (!p.stats) {
      p.stats = { gamesPlayed: 0, gamesWon: 0, roundsWon: 0, asafMade: 0, asafReceived: 0, resetsCount: 0 };
    }

    p.stats.gamesPlayed = Math.max(0, (p.stats.gamesPlayed || 0) + gamesPlayed);
    p.stats.gamesWon = Math.max(0, (p.stats.gamesWon || 0) + gamesWon);
    p.stats.roundsWon = Math.max(0, (p.stats.roundsWon || 0) + roundsWon);
    p.stats.asafMade = Math.max(0, (p.stats.asafMade || 0) + asafMade);
    p.stats.asafReceived = Math.max(0, (p.stats.asafReceived || 0) + asafReceived);
    p.stats.resetsCount = Math.max(0, (p.stats.resetsCount || 0) + resetsCount);

    this.saveAllPlayers(players);
  },

  // =====================
  // ניהול משחק פעיל ומושהה
  // =====================

  /**
   * שמירת המשחק הפעיל
   */
  saveActiveGame(gameData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
      return true;
    } catch (e) {
      console.error('Failed to save game to localStorage:', e);
      return false;
    }
  },

  /**
   * טעינת המשחק הפעיל
   */
  loadActiveGame() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load game from localStorage:', e);
      return null;
    }
  },

  /**
   * מחיקת המשחק הפעיל
   */
  clearActiveGame() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear active game:', e);
    }
  },

  /**
   * שמירת משחק שהסתיים בארכיון
   */
  archiveCompletedGame(gameSummary) {
    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      existing.unshift({
        id: `game_${Date.now()}`,
        date: new Date().toISOString(),
        ...gameSummary,
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
    } catch (e) {
      console.error('Failed to archive game:', e);
    }
  },

  getArchivedGames() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  // =====================
  // שמירת בחירות והעדפות משתמש
  // =====================

  savePreferences(prefs) {
    try {
      localStorage.setItem('yaniv_preferences_v1', JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  },

  loadPreferences() {
    try {
      const data = localStorage.getItem('yaniv_preferences_v1');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // =====================
  // גיבוי ושחזור נתונים (העתקה / הדבקה)
  // =====================

  /**
   * ייצוא נתונים שנבחרו כמחרוזת JSON
   */
  exportSelectedData({ includePlayers = true, includeActiveGame = true, includeHistory = true, onlySelectedPlayers = false, selectedPlayerIds = [] } = {}) {
    try {
      let players = [];
      if (includePlayers) {
        const all = this.getSavedPlayers();
        if (onlySelectedPlayers && selectedPlayerIds.length > 0) {
          players = all.filter(p => selectedPlayerIds.includes(p.id));
        } else {
          players = all;
        }
      }

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        ...(includePlayers ? { players } : {}),
        ...(includeActiveGame ? { activeGame: this.loadActiveGame() } : {}),
        ...(includeHistory ? { completedGames: this.getArchivedGames() } : {}),
      };

      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error('Failed to export data:', e);
      return '';
    }
  },

  exportAllData() {
    return this.exportSelectedData();
  },

  /**
   * ייבוא נתונים שנבחרו ממחרוזת JSON
   */
  importSelectedData(jsonString, { importPlayers = true, importActiveGame = true, importHistory = true } = {}) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'נתונים ריקים או לא תקינים' };
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'פורמט הנתונים אינו תקין' };
      }

      // ייבוא שחקנים
      if (importPlayers && Array.isArray(parsed.players)) {
        // מיזוג שחקנים לפי ID או שם כך שלא ידרסו סטטיסטיקות קיימות שלא לצורך
        const currentPlayers = this.getSavedPlayers();
        parsed.players.forEach(newP => {
          const idx = currentPlayers.findIndex(p => p.id === newP.id || p.name.trim().toLowerCase() === newP.name.trim().toLowerCase());
          if (idx >= 0) {
            currentPlayers[idx] = newP;
          } else {
            currentPlayers.push(newP);
          }
        });
        this.saveAllPlayers(currentPlayers);
      }

      // ייבוא משחק פעיל
      if (importActiveGame && parsed.activeGame) {
        this.saveActiveGame(parsed.activeGame);
      }

      // ייבוא היסטוריית משחקים
      if (importHistory && Array.isArray(parsed.completedGames)) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed.completedGames));
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to import data:', e);
      return { success: false, error: 'שגיאה בפענוח ה-JSON: ' + e.message };
    }
  },

  importAllData(jsonString) {
    return this.importSelectedData(jsonString);
  },
};


