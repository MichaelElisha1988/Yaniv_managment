import { YanivGame, MAX_PLAYERS, MIN_PLAYERS } from '../js/game.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('--- Running Yaniv Game Engine Tests (5 Players, Pause & Finish Early) ---');

// Test 1: Max 5 players enforcement
{
  const sixPlayers = [
    { id: '1', name: 'P1' },
    { id: '2', name: 'P2' },
    { id: '3', name: 'P3' },
    { id: '4', name: 'P4' },
    { id: '5', name: 'P5' },
    { id: '6', name: 'P6' },
  ];
  let threw = false;
  try {
    new YanivGame(sixPlayers);
  } catch (e) {
    threw = true;
  }
  assert(threw, `Enforces max ${MAX_PLAYERS} players limit`);

  const fivePlayers = sixPlayers.slice(0, 5);
  const game = new YanivGame(fivePlayers);
  assert(game.players.length === 5, 'Allows exactly 5 players');
}

// Test 2: Finish Early functionality
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ];
  const game = new YanivGame(players);
  // Round 1: Alice calls Yaniv (0). Bob has 12, Charlie has 20.
  game.submitRound('p1', { p1: 4, p2: 12, p3: 20 });

  assert(game.isGameOver === false, 'Game still active after 1 round');

  // Finish game early
  const winner = game.finishEarly();
  assert(game.isGameOver === true, 'Game marked as over');
  assert(winner.id === 'p1', 'Alice is declared winner (lowest score: 0)');
}

// Test 3: Asaf tracking in stats
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { asafRule: 'cardsPlus30' });

  // Alice calls Yaniv with 5. Bob has 3 (Asaf!).
  const res = game.submitRound('p1', { p1: 5, p2: 3 });
  assert(res.isAsaf === true, 'Asaf occurred');
  assert(res.asafPlayerId === 'p2', 'Bob caught Alice with Asaf');
  assert(res.callerId === 'p1', 'Alice is caller who got caught');

  const stats = game.getStats();
  assert(stats.asafCount === 1, 'Total asaf count is 1');
  assert(stats.playerStats['p2'].asafSuccess === 1, 'Bob made 1 asaf');
  assert(stats.playerStats['p1'].asafVictim === 1, 'Alice received 1 asaf');
  assert(res.roundScores['p2'] === 3, 'Bob gets his card points (3) for making Asaf');
  assert(game.players.find(p => p.id === 'p2').totalScore === 3, 'Bob total score is 3');
}

// Test 4: Reset from 50 to 0
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { halvingEnabled: true, halving50To: 0 });
  game.players[0].totalScore = 42;

  // Alice gets 8 -> reaches exactly 50 -> resets to 0!
  const res = game.submitRound('p2', { p1: 8, p2: 2 });
  assert(res.halvingEvents.length === 1, 'Halving triggered');
  assert(res.halvingEvents[0].to === 0, 'Target is 0');
  assert(game.players.find(p => p.id === 'p1').totalScore === 0, 'Alice score successfully reset to 0');
}

// Test 5: Reaching exactly 100 drops to 50 even when targetScore is 100
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { targetScore: 100, halvingEnabled: true });
  game.players[0].totalScore = 80;

  // Alice gets 20 -> reaches exactly 100 -> drops to 50!
  const res = game.submitRound('p2', { p1: 20, p2: 1 });
  assert(res.halvingEvents.length === 1, 'Halving triggered on 100 points');
  assert(res.halvingEvents[0].from === 100 && res.halvingEvents[0].to === 50, 'Dropped from 100 to 50');
  assert(game.players.find(p => p.id === 'p1').totalScore === 50, 'Alice score is 50');
  assert(game.players.find(p => p.id === 'p1').isEliminated === false, 'Alice is NOT eliminated');
}

console.log('🎉 ALL ENGINE TESTS PASSED!');


