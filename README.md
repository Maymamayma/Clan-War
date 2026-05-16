# Clan War

A turn-based strategy game developed with **HTML, CSS, and JavaScript**.  
Each player commands an army of Warriors, Archers, and Mages. The goal is to eliminate all enemy units using tactical movement, attacks, and dice rolls — all on a 10x10 grid.

## Concept

- **Turn-based strategy** on a 10×10 grid (adjustable size).
- Each cell can hold one or more units.
- The battlefield is split into three zones:
  - Player 1 zone: rows 1–3
  - Neutral zone: rows 4–7
  - Player 2 zone: rows 8–10

## Clans (Factions)

Each player chooses a clan, which determines the starting army composition and a unique advantage.

| Clan               | Warriors | Archers | Mages | Advantage                     |
| ------------------ | -------- | ------- | ----- | ----------------------------- |
| Mountain Clan      | 3        | 2       | 1     | Strengthened defense          |
| Plains Clan        | 2        | 3       | 1     | Precise ranged attacks        |
| Sages Clan         | 1        | 2       | 3     | Powerful spells, weak defense |

Units are placed in the player's first three rows (their zone).

## Unit Types

| Unit     | Role                | Range        | Speciality                               |
| -------- | ------------------- | ------------ | ---------------------------------------- |
| Warrior  | Melee fighter       | 1 cell       | High defense, strong in duels            |
| Archer   | Ranged attacker     | 2–3 cells    | Attacks from a distance without exposure |
| Mage     | Magic attacker      | 2 cells      | Area or powerful spells, low defense     |

### Stacking mechanic

When two or more units from the same clan occupy the same cell, they act together:
- **Combined defense**: they share damage resistance.
- **Combined attack**: they attack enemies inside or adjacent to the cell.

## Turn Flow

1. **Start of turn** – each player rolls a D6 to decide who plays first.
2. **Movement phase** – each unit can move one cell (or stay).
3. **Action phase** – each unit can attack, defend, or use a special power.
4. **Attack resolution** – roll a D6 to determine success and damage.

## Core Rules

1. **Clan selection** – each player picks a faction (army composition).
2. **Battle start** – deploy armies, roll for first turn.
3. **Game loop** – attack, defend, use special powers (e.g., Mage can burn an entire enemy row).
4. **Dice rolling** – D6 determines hit/miss and damage. Some units have bonuses (e.g., Archers are more accurate at range).
5. **Victory** – eliminate all enemy units.

## How to Run

Since the game is built with vanilla HTML, CSS, and JavaScript, you can run it directly in your browser:

1. **Clone or download** this repository.
2. Open `index.html` in any modern browser.
3. Play!

No build steps or server required.
