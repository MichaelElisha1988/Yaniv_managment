// Mock localStorage for node test
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

import { GameStorage } from '../js/storage.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('--- Testing Data Export & Import ---');

// 1. Initial saved players
const initialPlayers = GameStorage.getSavedPlayers();
assert(initialPlayers.length >= 2, 'Initial players populated');

// 2. Add custom player
GameStorage.upsertPlayer({
  id: 'p_test_1',
  name: 'יוסי',
  avatar: '🦁',
  color: '#10b981',
  stats: { gamesPlayed: 5, gamesWon: 2, roundsWon: 8, asafMade: 3, asafReceived: 1 }
});

// 3. Export data
const exportedJSON = GameStorage.exportAllData();
assert(typeof exportedJSON === 'string', 'Export returns JSON string');
const parsed = JSON.parse(exportedJSON);
assert(parsed.version === 1, 'Version is 1');
assert(parsed.players.some(p => p.name === 'יוסי'), 'Export contains custom player יוסי');

// 4. Clear storage & verify empty
global.localStorage.clear();
assert(global.localStorage.getItem('yaniv_persistent_players_v1') === null, 'Storage cleared');

// 5. Import data back
const importResult = GameStorage.importAllData(exportedJSON);
assert(importResult.success === true, 'Import successful');

const restoredPlayers = GameStorage.getSavedPlayers();
const restoredYossi = restoredPlayers.find(p => p.name === 'יוסי');
assert(restoredYossi !== undefined, 'Restored player יוסי exists');
assert(restoredYossi.stats.gamesWon === 2, 'Restored statistics match (gamesWon: 2)');
assert(restoredYossi.stats.asafMade === 3, 'Restored statistics match (asafMade: 3)');

// 6. Test invalid JSON import
const badResult = GameStorage.importAllData('bad json string');
assert(badResult.success === false, 'Properly rejects bad JSON');

console.log('🎉 ALL STORAGE TESTS PASSED!');
