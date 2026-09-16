/**
 * מנוע חוקי המשחק עבור יניב (Yaniv Game Engine)
 * תומך ב-2 עד 5 שחקנים, עצירת משחק מוקדמת, מעקב היסטוריה ושחזור.
 */

export const DEFAULT_SETTINGS = {
  targetScore: 100,        // סף נקודות לפסילה (100 / 150 / 200)
  asafPenalty: 30,         // עונש על אסף (ברירת מחדל +30)
  asafRule: 'cardsPlus30', // 'cardsPlus30' = ערך הקלפים שלו + 30, או 'fixed30' = בדיוק 30
  halvingEnabled: true,    // האם חוק החצאים פעיל
  halving50To: 25,         // הגעה מדויקת ל-50 מקצצת ל-25
  halving100To: 50,        // הגעה מדויקת ל-100 מקצצת ל-50
  yanivThreshold: 7,       // סף מקסימלי לקריאת יניב (בד"כ 7)
};

export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 2;

export class YanivGame {
  constructor(players = [], settings = {}) {
    if (players.length > MAX_PLAYERS) {
      throw new Error(`במשחק יניב יכולים להשתתף לכל היותר ${MAX_PLAYERS} שחקנים`);
    }
    if (players.length < MIN_PLAYERS) {
      throw new Error(`במשחק יניב נדרשים לפחות ${MIN_PLAYERS} שחקנים`);
    }

    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.players = players.map((p, idx) => ({
      id: p.id || `player_${Date.now()}_${idx}`,
      name: p.name.trim(),
      avatar: p.avatar || '🃏',
      color: p.color || '#10b981',
      totalScore: p.totalScore || 0,
      scoresHistory: p.scoresHistory || [],
      isEliminated: !!p.isEliminated,
      eliminatedInRound: p.eliminatedInRound || null,
    }));
    this.dealerIndex = 0;
    this.currentRound = 1;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.isPaused = false;
  }

  static fromJSON(data) {
    const game = new YanivGame(data.players || [], data.settings);
    game.dealerIndex = data.dealerIndex || 0;
    game.currentRound = data.currentRound || 1;
    game.history = data.history || [];
    game.isGameOver = !!data.isGameOver;
    game.winner = data.winner || null;
    game.isPaused = !!data.isPaused;
    return game;
  }

  toJSON() {
    return {
      settings: this.settings,
      players: this.players,
      dealerIndex: this.dealerIndex,
      currentRound: this.currentRound,
      history: this.history,
      isGameOver: this.isGameOver,
      winner: this.winner,
      isPaused: this.isPaused,
    };
  }

  getActivePlayers() {
    return this.players.filter(p => !p.isEliminated);
  }

  getCurrentDealer() {
    const active = this.getActivePlayers();
    if (active.length === 0) return null;
    return active[this.dealerIndex % active.length];
  }

  /**
   * עיבוד והזנת תוצאות סבב
   */
  submitRound(callerId, cardValues) {
    if (this.isGameOver) {
      throw new Error('המשחק כבר הסתיים');
    }

    const caller = this.players.find(p => p.id === callerId);
    if (!caller || caller.isEliminated) {
      throw new Error('שחקן מכריז יניב לא תקין');
    }

    const callerCards = Number(cardValues[callerId] ?? 0);
    const activePlayers = this.getActivePlayers();

    // 1. בדיקת אסף (מישהו אחר קיבל ערך קטן או שווה לערך של המכריז)
    let asafPlayer = null;
    let minOpponentCards = Infinity;

    for (const player of activePlayers) {
      if (player.id === callerId) continue;
      const val = Number(cardValues[player.id] ?? 0);
      if (val <= callerCards) {
        if (val < minOpponentCards) {
          minOpponentCards = val;
          asafPlayer = player;
        }
      }
    }

    const isAsaf = asafPlayer !== null;
    const roundScores = {};
    const halvingEvents = [];

    // 2. חישוב נקודות סבב לכל שחקן
    for (const player of activePlayers) {
      const pid = player.id;
      const handVal = Number(cardValues[pid] ?? 0);

      if (isAsaf) {
        if (pid === callerId) {
          const penalty = this.settings.asafRule === 'fixed30'
            ? this.settings.asafPenalty
            : handVal + this.settings.asafPenalty;
          roundScores[pid] = penalty;
        } else if (pid === asafPlayer.id) {
          roundScores[pid] = 0;
        } else {
          roundScores[pid] = handVal;
        }
      } else {
        if (pid === callerId) {
          roundScores[pid] = 0;
        } else {
          roundScores[pid] = handVal;
        }
      }

      const scoreBeforeRound = player.totalScore;
      let newTotal = scoreBeforeRound + roundScores[pid];

      // 3. חוק החצאים
      let halved = false;
      let halvedFrom = null;
      let halvedTo = null;

      if (this.settings.halvingEnabled) {
        if (newTotal === 50) {
          halved = true;
          halvedFrom = 50;
          halvedTo = this.settings.halving50To;
          newTotal = halvedTo;
        } else if (newTotal === 100 && this.settings.targetScore > 100) {
          halved = true;
          halvedFrom = 100;
          halvedTo = this.settings.halving100To;
          newTotal = halvedTo;
        }
      }

      if (halved) {
        halvingEvents.push({
          playerId: pid,
          playerName: player.name,
          from: halvedFrom,
          to: halvedTo,
        });
      }

      player.scoresHistory.push(roundScores[pid]);
      player.totalScore = newTotal;
    }

    // 4. בדיקת פסילות
    const newlyEliminated = [];
    for (const player of activePlayers) {
      if (player.totalScore > this.settings.targetScore) {
        player.isEliminated = true;
        player.eliminatedInRound = this.currentRound;
        newlyEliminated.push(player);
      }
    }

    // 5. שמירת הסבב בהיסטוריה
    const roundResult = {
      roundNumber: this.currentRound,
      callerId,
      callerName: caller.name,
      callerCards,
      isAsaf,
      asafPlayerId: asafPlayer ? asafPlayer.id : null,
      asafPlayerName: asafPlayer ? asafPlayer.name : null,
      cardValues: { ...cardValues },
      roundScores: { ...roundScores },
      halvingEvents,
      newlyEliminated: newlyEliminated.map(p => ({ id: p.id, name: p.name, score: p.totalScore })),
    };

    this.history.push(roundResult);

    // 6. קידום מחלק וסבב או סיום משחק
    const remainingPlayers = this.getActivePlayers();
    if (remainingPlayers.length <= 1) {
      this.isGameOver = true;
      this.winner = remainingPlayers[0] || null;
    } else {
      this.currentRound += 1;
      this.dealerIndex = (this.dealerIndex + 1) % remainingPlayers.length;
    }

    return roundResult;
  }

  /**
   * סיום משחק מוקדם (עצירה באמצע המשחק והכרזה על המנצח לפי הניקוד הנמוך ביותר)
   */
  finishEarly() {
    const active = this.getActivePlayers();
    if (active.length === 0) {
      this.winner = this.getLeaderboard()[0] || null;
    } else {
      const sorted = [...active].sort((a, b) => a.totalScore - b.totalScore);
      this.winner = sorted[0];
    }
    this.isGameOver = true;
    this.isPaused = false;
    return this.winner;
  }

  /**
   * ביטול הסבב האחרון
   */
  undoLastRound() {
    if (this.history.length === 0) {
      return false;
    }

    const lastRound = this.history.pop();

    for (const player of this.players) {
      if (player.scoresHistory.length >= lastRound.roundNumber) {
        player.scoresHistory.pop();
      }
      if (player.eliminatedInRound === lastRound.roundNumber) {
        player.isEliminated = false;
        player.eliminatedInRound = null;
      }
    }

    this.recalculateTotalsFromHistory();

    this.currentRound = lastRound.roundNumber;
    this.isGameOver = false;
    this.winner = null;

    const remaining = this.getActivePlayers();
    if (this.dealerIndex > 0) {
      this.dealerIndex = (this.dealerIndex - 1 + (remaining.length || 1)) % (remaining.length || 1);
    }

    return true;
  }

  recalculateTotalsFromHistory() {
    for (const player of this.players) {
      player.totalScore = 0;
      player.isEliminated = false;
      player.eliminatedInRound = null;
    }

    this.history.forEach((round, rIndex) => {
      const rNum = rIndex + 1;
      for (const [pid, scoreAdded] of Object.entries(round.roundScores)) {
        const player = this.players.find(p => p.id === pid);
        if (!player) continue;

        let total = player.totalScore + scoreAdded;

        const halfEvent = round.halvingEvents.find(h => h.playerId === pid);
        if (halfEvent) {
          total = halfEvent.to;
        }

        player.totalScore = total;

        if (total > this.settings.targetScore && !player.isEliminated) {
          player.isEliminated = true;
          player.eliminatedInRound = rNum;
        }
      }
    });

    const active = this.getActivePlayers();
    if (active.length <= 1 && this.history.length > 0) {
      this.isGameOver = true;
      this.winner = active[0] || null;
    }
  }

  getLeaderboard() {
    return [...this.players].sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      return a.totalScore - b.totalScore;
    });
  }

  getStats() {
    const stats = {
      totalRounds: this.history.length,
      yanivCount: 0,
      asafCount: 0,
      playerStats: {},
    };

    this.players.forEach(p => {
      stats.playerStats[p.id] = {
        name: p.name,
        avatar: p.avatar,
        yanivCalls: 0,
        asafSuccess: 0,
        asafVictim: 0,
        halvesCount: 0,
        zerosCount: 0,
        highestRoundScore: 0,
      };
    });

    this.history.forEach(round => {
      if (round.isAsaf) {
        stats.asafCount++;
        if (stats.playerStats[round.callerId]) {
          stats.playerStats[round.callerId].asafVictim++;
        }
        if (round.asafPlayerId && stats.playerStats[round.asafPlayerId]) {
          stats.playerStats[round.asafPlayerId].asafSuccess++;
        }
      } else {
        stats.yanivCount++;
        if (stats.playerStats[round.callerId]) {
          stats.playerStats[round.callerId].yanivCalls++;
        }
      }

      round.halvingEvents.forEach(h => {
        if (stats.playerStats[h.playerId]) {
          stats.playerStats[h.playerId].halvesCount++;
        }
      });

      for (const [pid, score] of Object.entries(round.roundScores)) {
        const pStat = stats.playerStats[pid];
        if (pStat) {
          if (score === 0) pStat.zerosCount++;
          if (score > pStat.highestRoundScore) pStat.highestRoundScore = score;
        }
      }
    });

    return stats;
  }
}
