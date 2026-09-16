import { YanivGame } from '../js/game.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('--- Running Yaniv Game Engine Tests ---');

// Test 1: Successful Yaniv call
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ];
  const game = new YanivGame(players, { targetScore: 100 });

  assert(game.players.length === 3, 'Game initialized with 3 players');
  assert(game.currentRound === 1, 'Starts at round 1');
  assert(game.getCurrentDealer().id === 'p1', 'Alice is initial dealer');

  // Round 1: Alice calls Yaniv with 4 points. Bob has 10, Charlie has 15.
  const res1 = game.submitRound('p1', { p1: 4, p2: 10, p3: 15 });
  assert(!res1.isAsaf, 'Round 1 is not Asaf');
  assert(game.players.find(p => p.id === 'p1').totalScore === 0, 'Alice has 0 points');
  assert(game.players.find(p => p.id === 'p2').totalScore === 10, 'Bob has 10 points');
  assert(game.players.find(p => p.id === 'p3').totalScore === 15, 'Charlie has 15 points');
  assert(game.currentRound === 2, 'Advanced to round 2');
  assert(game.getCurrentDealer().id === 'p2', 'Bob is now dealer');
}

// Test 2: Asaf with cardsPlus30
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { targetScore: 100, asafRule: 'cardsPlus30', asafPenalty: 30 });

  // Alice calls Yaniv with 5. Bob has 4 (Asaf!).
  const res = game.submitRound('p1', { p1: 5, p2: 4 });
  assert(res.isAsaf, 'Asaf detected');
  assert(res.asafPlayerId === 'p2', 'Bob caught Alice with Asaf');
  assert(game.players.find(p => p.id === 'p1').totalScore === 35, 'Alice got 5 + 30 = 35');
  assert(game.players.find(p => p.id === 'p2').totalScore === 0, 'Bob got 0');
}

// Test 3: Halving Rule (50 -> 25)
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { targetScore: 100, halvingEnabled: true, halving50To: 25 });
  
  // Alice has 38 points.
  game.players[0].totalScore = 38;
  
  // Bob calls Yaniv (0 points). Alice gets 12 points -> total 50 -> cut to 25!
  const res = game.submitRound('p2', { p1: 12, p2: 3 });
  assert(res.halvingEvents.length === 1, 'Halving event triggered');
  assert(res.halvingEvents[0].playerId === 'p1', 'Alice got halved');
  assert(game.players.find(p => p.id === 'p1').totalScore === 25, 'Alice total cut to 25');
}

// Test 4: Elimination & Game Over
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { targetScore: 50 });
  game.players[1].totalScore = 40;

  // Alice calls Yaniv (0). Bob gets 15 -> Bob reaches 55 (> 50) -> eliminated!
  const res = game.submitRound('p1', { p1: 2, p2: 15 });
  assert(game.players.find(p => p.id === 'p2').isEliminated, 'Bob eliminated');
  assert(game.isGameOver, 'Game is over');
  assert(game.winner.id === 'p1', 'Alice is the winner');
}

// Test 5: Undo Round
{
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];
  const game = new YanivGame(players, { targetScore: 100 });
  game.submitRound('p1', { p1: 3, p2: 12 });
  assert(game.players.find(p => p.id === 'p2').totalScore === 12, 'Bob has 12');

  const undone = game.undoLastRound();
  assert(undone === true, 'Undo returned true');
  assert(game.currentRound === 1, 'Restored to round 1');
  assert(game.players.find(p => p.id === 'p2').totalScore === 0, 'Bob restored to 0');
  assert(game.history.length === 0, 'History empty');
}

console.log('🎉 ALL TESTS PASSED!');
