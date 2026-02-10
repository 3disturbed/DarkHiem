// Cumulative XP required to reach each level (index 0 = level 1)
const XP_TABLE = [
  0,       // Level 1
  20,      // Level 2
  50,      // Level 3
  100,     // Level 4
  170,     // Level 5
  270,     // Level 6
  400,     // Level 7
  580,     // Level 8
  820,     // Level 9
  1150,    // Level 10
  1600,    // Level 11
  2200,    // Level 12
  3000,    // Level 13
  4000,    // Level 14
  5300,    // Level 15
  7000,    // Level 16
  9200,    // Level 17
  12000,   // Level 18
  15500,   // Level 19
  20000,   // Level 20
];

export const MAX_LEVEL = XP_TABLE.length;

export function getXpForLevel(level) {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return Infinity;
  return XP_TABLE[level - 1];
}

export function getLevelFromXp(totalXp) {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (totalXp >= XP_TABLE[i]) return i + 1;
  }
  return 1;
}
