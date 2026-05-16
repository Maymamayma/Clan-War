// Configuration du jeu
const BOARD_SIZE = 10;
const PLAYER1_ZONE = { start: 0, end: 2 }; // Lignes 1-3
const PLAYER2_ZONE = { start: 7, end: 9 }; // Lignes 8-10
const NEUTRAL_ZONE = { start: 3, end: 6 }; // Lignes 4-7
const MAX_LOG_ENTRIES = 20; // Limite pour le journal de bataille

// Définition des clans
const CLANS = {
    mountains: {
        name: "Clan des Montagnes",
        units: { warrior: 3, archer: 2, mage: 1 },
        advantage: "defense"
    },
    plains: {
        name: "Clan des Plaines",
        units: { warrior: 2, archer: 3, mage: 1 },
        advantage: "range"
    },
    sages: {
        name: "Clan des Sages",
        units: { warrior: 1, archer: 2, mage: 3 },
        advantage: "magic"
    }
};

// Définition des unités
const UNIT_TYPES = {
    warrior: {
        name: "Guerrier",
        health: 100,
        attack: 20,
        defense: 15,
        range: 1,
        specialPower: "Frappe puissante",
        specialCooldown: 3
    },
    archer: {
        name: "Archer",
        health: 70,
        attack: 15,
        defense: 10,
        range: 3,
        specialPower: "Tir précis",
        specialCooldown: 2
    },
    mage: {
        name: "Mage",
        health: 50,
        attack: 25,
        defense: 5,
        range: 2,
        specialPower: "Tempête de feu",
        specialCooldown: 4
    }
};

// État du jeu
let gameState = {
    phase: "selection",
    players: [
        { id: 0, clan: null, units: [], selectedUnit: null },
        { id: 1, clan: null, units: [], selectedUnit: null }
    ],
    currentPlayer: 0,
    currentPhase: "movement",
    selectedCell: null,
    selectedUnitForAction: null,
    board: createEmptyBoard(),
    unitsToPlace: [],
    placementIndex: 0,
    dice: { player1: 0, player2: 0 },
    diceRollCount: 0,
    gameWinner: null
};

// Initialisation
document.addEventListener("DOMContentLoaded", initGame);

function initGame() {
    initSelectionScreen();
    initPlacementScreen();
    initBattleScreen();
    initDiceModal();
    initWinnerModal();
}

// Création d'un plateau vide
function createEmptyBoard() {
    const board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[row][col] = { units: [] };
        }
    }
    return board;
}

// Générer un UUID simple pour les unités
function generateUnitId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Créer une unité avec ses propriétés
function createUnit(type, playerId, position) {
    const baseUnit = UNIT_TYPES[type];
    const unit = {
        id: generateUnitId(),
        type: type,
        playerId: playerId,
        health: baseUnit.health,
        attack: baseUnit.attack,
        defense: baseUnit.defense,
        range: baseUnit.range,
        specialCooldown: 0,
        defending: false,
        position: position
    };
    // Appliquer les bonus de clan
    const clan = gameState.players[playerId].clan;
    if (clan === "mountains" && type === "warrior") {
        unit.defense += 5;
    } else if (clan === "plains" && type === "archer") {
        unit.attack += 3;
    } else if (clan === "sages" && type === "mage") {
        unit.attack += 5;
        unit.defense = Math.max(1, unit.defense - 2);
    }
    return unit;
}

// Écran de sélection des clans
function initSelectionScreen() {
    const player1Options = document.querySelectorAll(".player-setup:nth-child(1) .clan-option");
    const player2Options = document.querySelectorAll(".player-setup:nth-child(2) .clan-option");
    const startButton = document.getElementById("start-placement");

    player1Options.forEach(option => {
        option.addEventListener("click", () => {
            player1Options.forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");
            gameState.players[0].clan = option.dataset.clan;
            checkIfBothPlayersSelected();
        });
    });

    player2Options.forEach(option => {
        option.addEventListener("click", () => {
            player2Options.forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");
            gameState.players[1].clan = option.dataset.clan;
            checkIfBothPlayersSelected();
        });
    });

    function checkIfBothPlayersSelected() {
        if (gameState.players[0].clan && gameState.players[1].clan) {
            startButton.disabled = false;
        }
    }

    startButton.addEventListener("click", () => {
        gameState.phase = "placement";
        startPlacementPhase();
        switchScreen("placement-screen");
    });
}

// Écran de placement des unités
function initPlacementScreen() {
    const placementBoard = document.getElementById("placement-board");
    const finishButton = document.getElementById("finish-placement");

    // Créer la grille de placement
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            if (row >= PLAYER1_ZONE.start && row <= PLAYER1_ZONE.end) {
                cell.classList.add("player1-zone");
            } else if (row >= PLAYER2_ZONE.start && row <= PLAYER2_ZONE.end) {
                cell.classList.add("player2-zone");
            } else {
                cell.classList.add("neutral-zone");
            }
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener("click", () => handlePlacementCellClick(row, col));
            placementBoard.appendChild(cell);
        }
    }

    finishButton.addEventListener("click", () => {
        if (gameState.unitsToPlace.length === 0) {
            gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
            if (gameState.currentPlayer === 0) {
                startBattlePhase();
            } else {
                prepareUnitsToPlace();
                updatePlacementUI();
            }
        }
    });
}

// Démarrer la phase de placement
function startPlacementPhase() {
    gameState.currentPlayer = 0;
    gameState.placementIndex = 0;
    prepareUnitsToPlace();
    updatePlacementUI();
}

// Préparer les unités à placer pour le joueur actuel
function prepareUnitsToPlace() {
    const player = gameState.players[gameState.currentPlayer];
    const clan = CLANS[player.clan];
    gameState.unitsToPlace = [];

    // Générer les unités selon la configuration du clan
    for (const [type, count] of Object.entries(clan.units)) {
        for (let i = 0; i < count; i++) {
            gameState.unitsToPlace.push({ type, playerId: gameState.currentPlayer });
        }
    }

    // Mélanger les unités pour un ordre aléatoire
    gameState.unitsToPlace.sort(() => Math.random() - 0.5);
}

// Mettre à jour l'interface de placement
function updatePlacementUI() {
    const unitsContainer = document.getElementById("units-to-place");
    const placementTurn = document.getElementById("placement-turn");
    const finishButton = document.getElementById("finish-placement");

    // Mettre à jour le texte du tour
    placementTurn.textContent = `Joueur ${gameState.currentPlayer + 1}`;

    // Effacer les unités précédentes
    unitsContainer.innerHTML = "";

    // Afficher les unités à placer
    gameState.unitsToPlace.forEach((unit, index) => {
        const unitElement = document.createElement("div");
        unitElement.classList.add("unit-to-place", unit.type, `player${gameState.currentPlayer + 1}`);
        unitElement.textContent = UNIT_TYPES[unit.type].name.charAt(0);
        unitElement.dataset.index = index;
        unitElement.addEventListener("click", () => selectUnitToPlace(index));
        unitsContainer.appendChild(unitElement);
    });

    // Sélectionner la première unité par défaut
    if (gameState.unitsToPlace.length > 0) {
        selectUnitToPlace(0);
    }

    // Activer/désactiver le bouton de fin
    finishButton.disabled = gameState.unitsToPlace.length > 0;
}

// Sélectionner une unité à placer
function selectUnitToPlace(index) {
    const units = document.querySelectorAll("#units-to-place .unit-to-place");
    units.forEach(unit => unit.classList.remove("selected"));
    if (units[index]) {
        units[index].classList.add("selected");
        gameState.placementIndex = index;
    }
}

// Gérer le clic sur une cellule pendant le placement
function handlePlacementCellClick(row, col) {
    if (gameState.unitsToPlace.length === 0) return;

    // Vérifier si la case est dans la zone du joueur
    const isPlayer1 = gameState.currentPlayer === 0;
    const validZone = isPlayer1
        ? row >= PLAYER1_ZONE.start && row <= PLAYER1_ZONE.end
        : row >= PLAYER2_ZONE.start && row <= PLAYER2_ZONE.end;

    if (!validZone) {
        addLogEntry(`Placement non autorisé hors de votre zone !`);
        return;
    }

    // Placer l'unité
    const unitToPlace = gameState.unitsToPlace[gameState.placementIndex];
    const unit = createUnit(unitToPlace.type, gameState.currentPlayer, { row, col });

    // Ajouter l'unité au plateau et au joueur
    gameState.board[row][col].units.push(unit);
    gameState.players[gameState.currentPlayer].units.push(unit);

    // Supprimer l'unité de la liste
    gameState.unitsToPlace.splice(gameState.placementIndex, 1);

    // Mettre à jour l'interface
    updatePlacementUI();
    updatePlacementBoardUI();

    // Journal
    addLogEntry(`Joueur ${gameState.currentPlayer + 1} place un ${UNIT_TYPES[unitToPlace.type].name} à (${row},${col})`);
}

// Mettre à jour l'affichage du plateau de placement
function updatePlacementBoardUI() {
    const placementBoard = document.getElementById("placement-board");
    placementBoard.querySelectorAll(".cell").forEach(cell => {
        cell.innerHTML = "";
    });

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = placementBoard.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            const cellUnits = gameState.board[row][col].units;

            if (cellUnits.length > 0) {
                cellUnits.forEach(unit => {
                    const unitElement = createUnitElement(unit);
                    cell.appendChild(unitElement);
                });
            }
        }
    }
}

// Écran de bataille
function initBattleScreen() {
    const battleBoard = document.getElementById("battle-board");
    const rollDiceButton = document.getElementById("roll-dice");
    const endPhaseButton = document.getElementById("end-phase");
    const attackButton = document.getElementById("attack");
    const defendButton = document.getElementById("defend");
    const specialButton = document.getElementById("special");

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            if (row >= PLAYER1_ZONE.start && row <= PLAYER1_ZONE.end) {
                cell.classList.add("player1-zone");
            } else if (row >= PLAYER2_ZONE.start && row <= PLAYER2_ZONE.end) {
                cell.classList.add("player2-zone");
            } else {
                cell.classList.add("neutral-zone");
            }
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener("click", () => handleBattleCellClick(cell, row, col));
            battleBoard.appendChild(cell);
        }
    }

    rollDiceButton.addEventListener("click", rollDiceForTurn);
    endPhaseButton.addEventListener("click", endCurrentPhase);
    attackButton.addEventListener("click", initiateAttack);
    defendButton.addEventListener("click", initiateDefend);
    specialButton.addEventListener("click", initiateSpecial);
}

// Initialiser les modales
function initDiceModal() {
    const closeButton = document.getElementById("close-dice-modal");
    closeButton.addEventListener("click", () => {
        document.getElementById("dice-modal").classList.remove("active");

        if (gameState.phase === "battle" && gameState.dice.player1 > 0 && gameState.dice.player2 > 0) {
            if (gameState.dice.player1 > gameState.dice.player2) {
                gameState.currentPlayer = 0;
                addLogEntry("Le Joueur 1 commence le tour !");
            } else if (gameState.dice.player2 > gameState.dice.player1) {
                gameState.currentPlayer = 1;
                addLogEntry("Le Joueur 2 commence le tour !");
            } else {
                gameState.diceRollCount++;
                if (gameState.diceRollCount >= 3) {
                    gameState.currentPlayer = Math.random() < 0.5 ? 0 : 1;
                    addLogEntry(`Égalité répétée ! Joueur ${gameState.currentPlayer + 1} commence.`);
                } else {
                    addLogEntry("Égalité ! Relancez les dés.");
                    gameState.dice.player1 = 0;
                    gameState.dice.player2 = 0;
                    return;
                }
            }

            gameState.currentPhase = "movement";
            document.getElementById("game-phase").textContent = "Mouvement";
            document.getElementById("current-turn").textContent = `Joueur ${gameState.currentPlayer + 1}`;
            document.getElementById("roll-dice").disabled = true;
            document.getElementById("end-phase").disabled = false;
            updateBattleBoardUI();
        }
    });
}

function initWinnerModal() {
    document.getElementById("restart-game").addEventListener("click", () => {
        location.reload();
    });
}

// Démarrer la phase de bataille
function startBattlePhase() {
    gameState.phase = "battle";
    gameState.currentPlayer = 0;
    gameState.currentPhase = "dice";
    gameState.diceRollCount = 0;

    renderBattleBoard();
    document.getElementById("current-turn").textContent = "Lancer les dés";
    document.getElementById("game-phase").textContent = "Déterminer l'ordre de jeu";
    updateUnitsCount();
    addLogEntry("La bataille commence ! Lancez les dés pour déterminer qui joue en premier.");
    switchScreen("battle-screen");
}

// Fonction pour changer d'écran
function switchScreen(screenId) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
}

// Créer un élément d'unité pour l'affichage
function createUnitElement(unit) {
    const unitElement = document.createElement("div");
    unitElement.classList.add("unit", `player${unit.playerId + 1}`, unit.type);
    if (unit.defending) {
        unitElement.classList.add("defending");
    }
    unitElement.textContent = unit.type.charAt(0).toUpperCase();
    
    // Ajouter un indicateur pour le nombre d'unités si plusieurs dans la même case
    const cellUnits = gameState.board[unit.position.row][unit.position.col].units;
    if (cellUnits.length > 1) {
        const countElement = document.createElement("div");
        countElement.classList.add("unit-count");
        countElement.textContent = cellUnits.length;
        unitElement.appendChild(countElement);
    }
    
    return unitElement;
}

// Rendre le board de bataille avec les unités
function renderBattleBoard() {
    const battleBoard = document.getElementById("battle-board");
    battleBoard.querySelectorAll(".cell").forEach(cell => {
        cell.innerHTML = "";
    });

    for (let playerIndex = 0; playerIndex < gameState.players.length; playerIndex++) {
        const player = gameState.players[playerIndex];
        player.units.forEach(unit => {
            const { row, col } = unit.position;
            const cell = battleBoard.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const unitElement = createUnitElement(unit);
                cell.appendChild(unitElement);
            }
        });
    }
}

// Mettre à jour le compte des unités
function updateUnitsCount() {
    const player1Info = document.querySelector("#player1-info .units-left");
    const player2Info = document.querySelector("#player2-info .units-left");
    player1Info.textContent = `Unités restantes: ${gameState.players[0].units.length}`;
    player2Info.textContent = `Unités restantes: ${gameState.players[1].units.length}`;
}

// Aj Wter une entrée au journal de combat
function addLogEntry(message) {
    const logEntries = document.getElementById("log-entries");
    const entry = document.createElement("div");
    entry.classList.add("log-entry");
    entry.textContent = message;
    logEntries.appendChild(entry);

    // Limiter le nombre d'entrées
    const entries = logEntries.querySelectorAll(".log-entry");
    if (entries.length > MAX_LOG_ENTRIES) {
        entries[0].remove();
    }

    logEntries.scrollTop = logEntries.scrollHeight;
}

// Gérer le lancer de dé
function rollDiceForTurn() {
    const diceModal = document.getElementById("dice-modal");
    const diceElement = document.getElementById("dice");
    const diceResult = document.getElementById("dice-result");

    diceModal.classList.add("active");
    diceElement.classList.add("rolling");
    diceElement.querySelector(".dice-value").textContent = "?";
    diceResult.textContent = "Lancement en cours...";

    setTimeout(() => {
        diceElement.classList.remove("rolling");
        const result = Math.floor(Math.random() * 6) + 1;
        diceElement.querySelector(".dice-value").textContent = result;

        if (gameState.dice.player1 === 0) {
            gameState.dice.player1 = result;
            diceResult.textContent = `Joueur 1 a obtenu un ${result}. Joueur 2, à vous de lancer !`;
            addLogEntry(`Joueur 1 lance le dé : ${result}`);
        } else {
            gameState.dice.player2 = result;
            diceResult.textContent = `Joueur 2 a obtenu un ${result}.`;
            addLogEntry(`Joueur 2 lance le dé : ${result}`);
        }
    }, 1000);
}

// Gérer le clic sur une cellule en mode bataille
function handleBattleCellClick(cell, row, col) {
    if (gameState.currentPhase !== "movement" && gameState.currentPhase !== "action") {
        return;
    }

    const cellUnits = gameState.board[row][col].units;

    if (gameState.currentPhase === "movement") {
        if (gameState.selectedCell) {
            moveUnit(gameState.selectedCell, row, col);
        } else if (cellUnits.length > 0) {
            const unitBelongsToCurrentPlayer = cellUnits.some(unit => unit.playerId === gameState.currentPlayer);
            if (unitBelongsToCurrentPlayer) {
                selectCell(cell, row, col);
            }
        }
    } else if (gameState.currentPhase === "action") {
        if (gameState.selectedUnitForAction) {
            attackUnit(row, col);
        } else if (cellUnits.length > 0) {
            const unitBelongsToCurrentPlayer = cellUnits.some(unit => unit.playerId === gameState.currentPlayer);
            if (unitBelongsToCurrentPlayer) {
                selectUnitForAction(cell, row, col);
            }
        }
    }
}

// Sélectionner une cellule pour déplacement
function selectCell(cell, row, col) {
    if (gameState.selectedCell) {
        const prevCell = document.querySelector(`.cell[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`);
        if (prevCell) {
            prevCell.classList.remove("selected");
        }
    }

    cell.classList.add("selected");
    gameState.selectedCell = { row, col };
    highlightValidMoves(row, col);
}

// Mettre en évidence les mouvements valides
function highlightValidMoves(row, col) {
    // Supprimer les surbrillances précédentes
    document.querySelectorAll(".cell.valid-move").forEach(cell => {
        cell.classList.remove("valid-move");
    });

    const cellUnits = gameState.board[row][col].units;
    if (cellUnits.length === 0) return;

    // Vérifier que les unités appartiennent au joueur actuel et n'ont pas encore bougé
    const canMove = cellUnits.some(unit => unit.playerId === gameState.currentPlayer && !unit.hasMoved);
    if (!canMove) return;

    const validMoves = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 }
    ];

    const filteredMoves = validMoves.filter(move => {
        return move.row >= 0 && move.row < BOARD_SIZE &&
               move.col >= 0 && move.col < BOARD_SIZE &&
               (gameState.board[move.row][move.col].units.length === 0 || // Case vide
                gameState.board[move.row][move.col].units.every(unit => unit.playerId === gameState.currentPlayer)); // Ou case avec unités alliées
    });

    filteredMoves.forEach(move => {
        const cell = document.querySelector(`.cell[data-row="${move.row}"][data-col="${move.col}"]`);
        if (cell) {
            cell.classList.add("valid-move");
        }
    });
}


// Déplacer une unité
function moveUnit(from, toRow, toCol) {
    const toCell = document.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);
    if (!toCell || !toCell.classList.contains("valid-move")) {
        addLogEntry("Mouvement non valide !");
        return;
    }

    const fromRow = from.row;
    const fromCol = from.col;
    const fromUnits = gameState.board[fromRow][fromCol].units;
    const playerUnits = fromUnits.filter(unit => unit.playerId === gameState.currentPlayer && !unit.hasMoved);
    if (playerUnits.length === 0) {
        addLogEntry("Aucune unité déplaçable dans cette case !");
        return;
    }

    playerUnits.forEach(unit => {
        const unitIndex = fromUnits.findIndex(u => u.id === unit.id);
        if (unitIndex !== -1) {
            fromUnits.splice(unitIndex, 1);
            unit.position = { row: toRow, col: toCol };
            unit.hasMoved = true; // Marquer l'unité comme ayant bougé
            gameState.board[toRow][toCol].units.push(unit);
            const playerUnitIndex = gameState.players[gameState.currentPlayer].units.findIndex(u => u.id === unit.id);
            if (playerUnitIndex !== -1) {
                gameState.players[gameState.currentPlayer].units[playerUnitIndex].position = { row: toRow, col: toCol };
                gameState.players[gameState.currentPlayer].units[playerUnitIndex].hasMoved = true;
            }
        }
    });

    const prevCell = document.querySelector(`.cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
    if (prevCell) {
        prevCell.classList.remove("selected");
    }

    document.querySelectorAll(".cell.valid-move").forEach(cell => {
        cell.classList.remove("valid-move");
    });

    gameState.selectedCell = null;
    updateBattleBoardUI();
    addLogEntry(`Unité(s) déplacée(s) de (${fromRow},${fromCol}) à (${toRow},${toCol})`);
}

// Terminer la phase actuelle (mise à jour pour réinitialiser hasMoved)
function endCurrentPhase() {
    if (gameState.selectedCell) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`);
        if (cell) {
            cell.classList.remove("selected");
        }
        gameState.selectedCell = null;
    }

    if (gameState.selectedUnitForAction) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedUnitForAction.row}"][data-col="${gameState.selectedUnitForAction.col}"]`);
        if (cell) {
            cell.classList.remove("selected");
        }
        gameState.selectedUnitForAction = null;
    }

    document.querySelectorAll(".cell.valid-move, .cell.valid-attack").forEach(cell => {
        cell.classList.remove("valid-move");
        cell.classList.remove("valid-attack");
    });

    document.getElementById("attack").disabled = true;
    document.getElementById("defend").disabled = true;
    document.getElementById("special").disabled = true;

    if (gameState.currentPhase === "movement") {
        gameState.currentPhase = "action";
        document.getElementById("game-phase").textContent = "Action";
        addLogEntry(`${gameState.currentPlayer === 0 ? "Joueur 1" : "Joueur 2"} - Phase d'action`);
    } else {
        gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
        gameState.currentPhase = "movement";
        gameState.players[gameState.currentPlayer].units.forEach(unit => {
            if (unit.specialCooldown > 0) {
                unit.specialCooldown--;
            }
            unit.defending = false;
            unit.hasMoved = false; // Réinitialiser pour le nouveau tour
        });
        document.getElementById("current-turn").textContent = `Joueur ${gameState.currentPlayer + 1}`;
        document.getElementById("game-phase").textContent = "Mouvement";
        addLogEntry(`Tour du Joueur ${gameState.currentPlayer + 1} - Phase de mouvement`);
    }
}
// Mettre à jour l'affichage du plateau de bataille
function updateBattleBoardUI() {
    const battleBoard = document.getElementById("battle-board");
    battleBoard.querySelectorAll(".cell").forEach(cell => {
        cell.innerHTML = "";
    });

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = battleBoard.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            const cellUnits = gameState.board[row][col].units;

            if (cellUnits.length > 0) {
                cellUnits.forEach(unit => {
                    const unitElement = createUnitElement(unit);
                    cell.appendChild(unitElement);
                });
            }
        }
    }
}

// Sélectionner une unité pour action
function selectUnitForAction(cell, row, col) {
    if (gameState.selectedUnitForAction) {
        const prevCell = document.querySelector(`.cell[data-row="${gameState.selectedUnitForAction.row}"][data-col="${gameState.selectedUnitForAction.col}"]`);
        if (prevCell) {
            prevCell.classList.remove("selected");
        }
        document.querySelectorAll(".cell.valid-attack").forEach(cell => {
            cell.classList.remove("valid-attack");
        });
    }

    cell.classList.add("selected");
    gameState.selectedUnitForAction = { row, col };

    document.getElementById("attack").disabled = false;
    document.getElementById("defend").disabled = false;

    const cellUnits = gameState.board[row][col].units;
    const unitWithReadySpecial = cellUnits.find(unit => 
        unit.playerId === gameState.currentPlayer && unit.specialCooldown === 0
    );
    document.getElementById("special").disabled = !unitWithReadySpecial;
    highlightValidTargets(row, col);
}

// Mettre en évidence les cibles valides pour attaque
function highlightValidTargets(row, col) {
    document.querySelectorAll(".cell.valid-attack").forEach(cell => {
        cell.classList.remove("valid-attack");
    });

    const cellUnits = gameState.board[row][col].units;
    if (cellUnits.length === 0) return;

    let maxRange = 1;
    cellUnits.forEach(unit => {
        if (unit.playerId === gameState.currentPlayer && unit.range > maxRange) {
            maxRange = unit.range;
        }
    });

    for (let r = Math.max(0, row - maxRange); r <= Math.min(BOARD_SIZE - 1, row + maxRange); r++) {
        for (let c = Math.max(0, col - maxRange); c <= Math.min(BOARD_SIZE - 1, col + maxRange); c++) {
            const distance = Math.abs(r - row) + Math.abs(c - col);
            if (distance <= maxRange && distance > 0) {
                const targetUnits = gameState.board[r][c].units;
                const hasEnemyUnits = targetUnits.some(unit => unit.playerId !== gameState.currentPlayer);
                if (hasEnemyUnits) {
                    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (cell) {
                        cell.classList.add("valid-attack");
                    }
                }
            }
        }
    }
}

// Terminer la phase actuelle
function endCurrentPhase() {
    if (gameState.selectedCell) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`);
        if (cell) {
            cell.classList.remove("selected");
        }
        gameState.selectedCell = null;
    }

    if (gameState.selectedUnitForAction) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedUnitForAction.row}"][data-col="${gameState.selectedUnitForAction.col}"]`);
        if (cell) {
            cell.classList.remove("selected");
        }
        gameState.selectedUnitForAction = null;
    }

    document.querySelectorAll(".cell.valid-move, .cell.valid-attack").forEach(cell => {
        cell.classList.remove("valid-move");
        cell.classList.remove("valid-attack");
    });

    document.getElementById("attack").disabled = true;
    document.getElementById("defend").disabled = true;
    document.getElementById("special").disabled = true;

    if (gameState.currentPhase === "movement") {
        gameState.currentPhase = "action";
        document.getElementById("game-phase").textContent = "Action";
        addLogEntry(`${gameState.currentPlayer === 0 ? "Joueur 1" : "Joueur 2"} - Phase d'action`);
    } else {
        gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
        gameState.currentPhase = "movement";
        gameState.players[gameState.currentPlayer].units.forEach(unit => {
            if (unit.specialCooldown > 0) {
                unit.specialCooldown--;
            }
            unit.defending = false;
        });
        document.getElementById("current-turn").textContent = `Joueur ${gameState.currentPlayer + 1}`;
        document.getElementById("game-phase").textContent = "Mouvement";
        addLogEntry(`Tour du Joueur ${gameState.currentPlayer + 1} - Phase de mouvement`);
    }
}

// Initier une attaque
function initiateAttack() {
    if (!gameState.selectedUnitForAction) return;
    highlightValidTargets(gameState.selectedUnitForAction.row, gameState.selectedUnitForAction.col);
}

// Attaquer une unité
function attackUnit(targetRow, targetCol) {
    if (!gameState.selectedUnitForAction) return;

    const attackerRow = gameState.selectedUnitForAction.row;
    const attackerCol = gameState.selectedUnitForAction.col;
    const targetCell = document.querySelector(`.cell[data-row="${targetRow}"][data-col="${targetCol}"]`);
    if (!targetCell || !targetCell.classList.contains("valid-attack")) {
        addLogEntry("Cible non valide pour l'attaque !");
        return;
    }

    const attackerUnits = gameState.board[attackerRow][attackerCol].units.filter(
        unit => unit.playerId === gameState.currentPlayer
    );
    const defenderUnits = gameState.board[targetRow][targetCol].units.filter(
        unit => unit.playerId !== gameState.currentPlayer
    );

    if (attackerUnits.length === 0 || defenderUnits.length === 0) return;

    let totalAttack = 0;
    attackerUnits.forEach(unit => {
        totalAttack += unit.attack;
        if (gameState.players[unit.playerId].clan === "plains" && unit.type === "archer") {
            totalAttack += 3;
        } else if (gameState.players[unit.playerId].clan === "sages" && unit.type === "mage") {
            totalAttack += 5;
        }
    });

    let totalDefense = 0;
    defenderUnits.forEach(unit => {
        let defenseValue = unit.defense;
        if (unit.defending) {
            defenseValue *= 1.5;
        }
        totalDefense += defenseValue;
        if (gameState.players[unit.playerId].clan === "mountains" && unit.type === "warrior") {
            totalDefense += 5;
        }
    });

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let damage = Math.max(1, Math.floor((totalAttack * (diceRoll / 3)) - (totalDefense / 4)));
    showDiceModal(diceRoll, `${damage} points de dégâts!`);
    applyDamage(defenderUnits, damage, targetRow, targetCol);
    resetAttackSelection();
    checkGameOver();
}

// Appliquer les dégâts aux unités
function applyDamage(units, damage, row, col) {
    const damagePerUnit = Math.ceil(damage / units.length); // Répartir les dégâts équitablement
    let unitsToRemove = [];

    units.forEach(unit => {
        unit.health -= damagePerUnit;
        if (unit.health <= 0) {
            unitsToRemove.push(unit.id);
        }
    });

    unitsToRemove.forEach(unitId => {
        removeUnit(unitId, row, col);
    });

    addLogEntry(`Attaque sur (${row},${col}) : ${damage} dégâts, ${unitsToRemove.length} unité(s) éliminée(s)`);
    updateBattleBoardUI();
    updateUnitsCount();
}

// Supprimer une unité
function removeUnit(unitId, row, col) {
    const cellUnits = gameState.board[row][col].units;
    const unitIndex = cellUnits.findIndex(u => u.id === unitId);
    if (unitIndex !== -1) {
        cellUnits.splice(unitIndex, 1);
    }

    const playerUnits = gameState.players[cellUnits[0]?.playerId || 0].units;
    const playerUnitIndex = playerUnits.findIndex(u => u.id === unitId);
    if (playerUnitIndex !== -1) {
        playerUnits.splice(playerUnitIndex, 1);
    }
}

// Réinitialiser la sélection d'attaque
function resetAttackSelection() {
    if (gameState.selectedUnitForAction) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedUnitForAction.row}"][data-col="${gameState.selectedUnitForAction.col}"]`);
        if (cell) {
            cell.classList.remove("selected");
        }
    }

    document.querySelectorAll(".cell.valid-attack").forEach(cell => {
        cell.classList.remove("valid-attack");
    });

    gameState.selectedUnitForAction = null;
    document.getElementById("attack").disabled = true;
    document.getElementById("defend").disabled = true;
    document.getElementById("special").disabled = true;
}

// Afficher le modal de dé
function showDiceModal(result, message) {
    const diceModal = document.getElementById("dice-modal");
    const diceElement = document.getElementById("dice");
    const diceResult = document.getElementById("dice-result");

    diceModal.classList.add("active");
    diceElement.classList.remove("rolling");
    diceElement.querySelector(".dice-value").textContent = result;
    diceResult.textContent = message;
}

// Initier une défense
function initiateDefend() {
    if (!gameState.selectedUnitForAction) return;

    const row = gameState.selectedUnitForAction.row;
    const col = gameState.selectedUnitForAction.col;
    const playerUnits = gameState.board[row][col].units.filter(
        unit => unit.playerId === gameState.currentPlayer
    );

    playerUnits.forEach(unit => {
        unit.defending = true;
    });

    updateBattleBoardUI();
    addLogEntry(`Unité(s) en position de défense à (${row},${col})`);
    resetAttackSelection();
}

// Initier un pouvoir spécial
function initiateSpecial() {
    if (!gameState.selectedUnitForAction) return;

    const row = gameState.selectedUnitForAction.row;
    const col = gameState.selectedUnitForAction.col;
    const playerUnits = gameState.board[row][col].units.filter(
        unit => unit.playerId === gameState.currentPlayer && unit.specialCooldown === 0
    );

    if (playerUnits.length === 0) return;

    const unit = playerUnits[0];

    switch (unit.type) {
        case "warrior":
            useWarriorSpecial(unit, row, col);
            break;
        case "archer":
            useArcherSpecial(unit, row, col);
            break;
        case "mage":
            useMageSpecial(unit, row, col);
            break;
    }

    unit.specialCooldown = UNIT_TYPES[unit.type].specialCooldown;
    resetAttackSelection();
}

// Utiliser le pouvoir spécial du guerrier
function useWarriorSpecial(unit, row, col) {
    const targets = [];
    const adjacentCells = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 }
    ];

    adjacentCells.forEach(cell => {
        if (cell.row >= 0 && cell.row < BOARD_SIZE && 
            cell.col >= 0 && cell.col < BOARD_SIZE) {
            const cellUnits = gameState.board[cell.row][cell.col].units;
            const hasEnemyUnits = cellUnits.some(u => u.playerId !== unit.playerId);
            if (hasEnemyUnits) {
                targets.push(cell);
            }
        }
    });

    if (targets.length === 0) {
        addLogEntry("Aucune cible à portée pour Frappe Puissante!");
        return;
    }

    const target = targets[Math.floor(Math.random() * targets.length)];
    const damage = Math.floor(unit.attack * 1.5);
    const enemyUnits = gameState.board[target.row][target.col].units.filter(
        u => u.playerId !== unit.playerId
    );

    addLogEntry(`${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} utilise Frappe Puissante sur (${target.row},${target.col})!`);
    showDiceModal("⚔️", `Frappe Puissante! ${damage} dégâts`);
    applyDamage(enemyUnits, damage, target.row, target.col);
}

// Utiliser le pouvoir spécial de l'archer
function useArcherSpecial(unit, row, col) {
    const targets = [];
    for (let r = Math.max(0, row - unit.range); r <= Math.min(BOARD_SIZE - 1, row + unit.range); r++) {
        for (let c = Math.max(0, col - unit.range); c <= Math.min(BOARD_SIZE - 1, col + unit.range); c++) {
            const distance = Math.abs(r - row) + Math.abs(c - col);
            if (distance <= unit.range && distance > 0) {
                const cellUnits = gameState.board[r][c].units;
                const hasEnemyUnits = cellUnits.some(u => u.playerId !== unit.playerId);
                if (hasEnemyUnits) {
                    targets.push({ row: r, col: c });
                }
            }
        }
    }

    if (targets.length === 0) {
        addLogEntry("Aucune cible à portée pour Tir Précis!");
        return;
    }

    const target = targets[Math.floor(Math.random() * targets.length)];
    const damage = unit.attack;
    const enemyUnits = gameState.board[target.row][target.col].units.filter(
        u => u.playerId !== unit.playerId
    );

    addLogEntry(`${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} utilise Tir Précis sur (${target.row},${target.col})!`);
    showDiceModal("🏹", `Tir Précis! ${damage * 2} dégâts`);
    applyDamage(enemyUnits, damage * 2, target.row, target.col);
}

// Utiliser le pouvoir spécial du mage
function useMageSpecial(unit, row, col) {
    let targetsRow = null;
    let targetsCells = [];
    const attackLine = Math.random() > 0.5;

    if (attackLine) {
        const possibleRows = [];
        for (let r = Math.max(0, row - unit.range); r <= Math.min(BOARD_SIZE - 1, row + unit.range); r++) {
            if (r !== row) {
                let hasEnemies = false;
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const cellUnits = gameState.board[r][c].units;
                    if (cellUnits.some(u => u.playerId !== unit.playerId)) {
                        hasEnemies = true;
                        break;
                    }
                }
                if (hasEnemies) {
                    possibleRows.push(r);
                }
            }
        }

        if (possibleRows.length > 0) {
            targetsRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
            for (let c = 0; c < BOARD_SIZE; c++) {
                targetsCells.push({ row: targetsRow, col: c });
            }
        }
    } else {
        const possibleCols = [];
        for (let c = Math.max(0, col - unit.range); c <= Math.min(BOARD_SIZE - 1, col + unit.range); c++) {
            if (c !== col) {
                let hasEnemies = false;
                for (let r = 0; r < BOARD_SIZE; r++) {
                    const cellUnits = gameState.board[r][c].units;
                    if (cellUnits.some(u => u.playerId !== unit.playerId)) {
                        hasEnemies = true;
                        break;
                    }
                }
                if (hasEnemies) {
                    possibleCols.push(c);
                }
            }
        }

        if (possibleCols.length > 0) {
            const targetsCol = possibleCols[Math.floor(Math.random() * possibleCols.length)];
            for (let r = 0; r < BOARD_SIZE; r++) {
                targetsCells.push({ row: r, col: targetsCol });
            }
        }
    }

    if (targetsCells.length === 0) {
        addLogEntry("Aucune cible à portée pour Tempête de Feu!");
        return;
    }

    const baseDamage = unit.attack * 0.7;
    addLogEntry(`${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)} lance Tempête de Feu!`);
    showDiceModal("🔥", `Tempête de Feu! ${Math.floor(baseDamage)} dégâts par case`);

    let totalEliminatedUnits = 0;
    targetsCells.forEach(target => {
        const enemyUnits = gameState.board[target.row][target.col].units.filter(
            u => u.playerId !== unit.playerId
        );
        if (enemyUnits.length > 0) {
            const initialEnemyCount = enemyUnits.length;
            applyDamage(enemyUnits, Math.floor(baseDamage), target.row, target.col);
            const eliminatedCount = initialEnemyCount - gameState.board[target.row][target.col].units.filter(
                u => u.playerId !== unit.playerId
            ).length;
            totalEliminatedUnits += eliminatedCount;
        }
    });

    addLogEntry(`La Tempête de Feu a éliminé ${totalEliminatedUnits} unité(s)!`);
}

// Vérifier si le jeu est terminé
function checkGameOver() {
    const player1Units = gameState.players[0].units.length;
    const player2Units = gameState.players[1].units.length;
    updateUnitsCount();

    if (player1Units === 0 || player2Units === 0) {
        const winner = player1Units > 0 ? 1 : 2;
        gameState.gameWinner = winner;
        const winnerModal = document.getElementById("winner-modal");
        const winnerMessage = document.getElementById("winner-message");
        winnerMessage.textContent = `Le Joueur ${winner} a gagné la bataille!`;
        winnerModal.classList.add("active");
    }
}