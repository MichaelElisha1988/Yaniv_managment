/**
 * מריץ בדיקות בדפדפן (Browser Test Runner)
 * מופעל ונטען אך ורק כאשר האפליקציה רצה בסביבת localhost.
 */

import { YanivGame, MAX_PLAYERS } from '../js/game.js';
import { GameStorage } from '../js/storage.js';

export function runBrowserTests() {
  console.group('%c🧪 יניב מנג\'ר - בדיקות יחידה (Localhost Dev Mode)', 'color: #10b981; font-weight: bold; font-size: 13px;');

  const results = [];

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      results.push({ passed: false, message });
      throw new Error(`FAIL: ${message}`);
    }
    console.log(`%c✓ PASS: ${message}`, 'color: #10b981;');
    results.push({ passed: true, message });
  }

  try {
    // 1. בדיקת מגבלת 5 שחקנים
    let threw = false;
    try {
      new YanivGame([
        { id: '1', name: '1' },
        { id: '2', name: '2' },
        { id: '3', name: '3' },
        { id: '4', name: '4' },
        { id: '5', name: '5' },
        { id: '6', name: '6' }
      ]);
    } catch (e) {
      threw = true;
    }
    assert(threw, `חסימת יותר מ-${MAX_PLAYERS} שחקנים`);

    // 2. סבב יניב תקין
    const p = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }, { id: 'p3', name: 'Charlie' }];
    const g = new YanivGame(p);
    const r1 = g.submitRound('p1', { p1: 3, p2: 10, p3: 15 });
    assert(!r1.isAsaf, 'זיהוי יניב מוצלח ללא אסף');
    assert(g.players.find(x => x.id === 'p1').totalScore === 0, 'מכריז יניב מקבל 0 נקודות');

    // 3. זיהוי אסף
    const g2 = new YanivGame([{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }]);
    const r2 = g2.submitRound('p1', { p1: 5, p2: 4 });
    assert(r2.isAsaf, 'זיהוי אסף כאשר ליריב ניקוד נמוך יותר');
    assert(r2.asafPlayerId === 'p2', 'היריב מזוהה כמבצע האסף');
    assert(r2.roundScores['p2'] === 4, 'מבצע האסף מקבל את ערך קלפיו');

    // 4. חוק החצאים (איפוס ל-0)
    const g3 = new YanivGame([{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }], { halvingEnabled: true, halving50To: 0 });
    g3.players[0].totalScore = 40;
    const r3 = g3.submitRound('p2', { p1: 10, p2: 2 });
    assert(r3.halvingEvents.length === 1 && g3.players[0].totalScore === 0, 'איפוס מ-50 ל-0 מופעל בהצלחה');

    // 4.1 חוק החצאים (הגעה ל-100 מורידה ל-50 ביעד 100)
    const g4 = new YanivGame([{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }], { targetScore: 100, halvingEnabled: true });
    g4.players[0].totalScore = 80;
    const r4 = g4.submitRound('p2', { p1: 20, p2: 2 });
    assert(r4.halvingEvents.length === 1 && g4.players[0].totalScore === 50 && !g4.players[0].isEliminated, 'הגעה מדויקת ל-100 מורידה ל-50 ולא פוסלת');

    // 5. סיום מוקדם
    const winner = g.finishEarly();
    assert(g.isGameOver && winner.id === 'p1', 'סיום משחק מוקדם מזהה מוביל');

    // 6. ביטול סבב (Undo)
    const undoRes = g2.undoLastRound();
    assert(undoRes === true, 'ביטול סבב אחרון מחזיר true');

    // 7. ייצוא נתונים
    const exported = GameStorage.exportAllData();
    assert(typeof exported === 'string' && exported.includes('version'), 'ייצוא נתונים מפיק JSON תקין');

    console.log(`%c🎉 כל הבדיקות (${results.length}/${results.length}) עברו בהצלחה!`, 'color: #3b82f6; font-weight: bold;');
    renderDevBadge(results.length, results.length);
  } catch (err) {
    console.error('טסטים נכשלו:', err);
    renderDevBadge(results.filter(r => r.passed).length, results.length, true);
  } finally {
    console.groupEnd();
  }
}

function renderDevBadge(passed, total, hasError = false) {
  let badge = document.getElementById('dev-tests-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'dev-tests-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 6px;
      left: 6px;
      z-index: 999;
      font-size: 0.72rem;
      font-family: monospace;
      padding: 3px 8px;
      border-radius: 9999px;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      transition: transform 0.2s;
    `;
    badge.title = 'לחץ להרצה חוזרת של הטסטים (זמין בלוקאל הוסט בלבד)';
    badge.onclick = () => runBrowserTests();
    document.body.appendChild(badge);
  }

  if (hasError) {
    badge.style.background = 'rgba(244, 63, 94, 0.85)';
    badge.style.color = '#fff';
    badge.textContent = `🧪 ${passed}/${total} בדיקות`;
  } else {
    badge.style.background = 'rgba(16, 185, 129, 0.85)';
    badge.style.color = '#fff';
    badge.textContent = `🧪 ${passed}/${total} טסטים עברו (Localhost)`;
  }
}
