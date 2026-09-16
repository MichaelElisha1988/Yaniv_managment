/**
 * מודול ניהול אחסון מקומי (Local Storage)
 */

const STORAGE_KEY = 'yaniv_active_game_v1';
const HISTORY_KEY = 'yaniv_completed_games_v1';

export const GameStorage = {
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
   * שמירת משחק שהסתיים בארכיון משחקים
   */
  archiveCompletedGame(gameSummary) {
    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      existing.unshift({
        id: `game_${Date.now()}`,
        date: new Date().toISOString(),
        ...gameSummary,
      });
      // שומרים עד 20 משחקים אחרונים
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
    } catch (e) {
      console.error('Failed to archive game:', e);
    }
  },

  /**
   * קבלת ארכיון המשחקים
   */
  getArchivedGames() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },
};
