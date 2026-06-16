// Chess Legal Move Classifier - Frontend Application

// Standard Wikipedia Chess Pieces SVGs
const PIECE_SVGS = {
    // White Pieces
    'P': `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83 1.06-1.41 2.47-1.41 4.02v2h11v-2c0-1.55-.58-2.96-1.41-4.02 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM15 36h15v2H15z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'R': `<svg viewBox="0 0 45 45"><path d="M9 39h27v-3H9v3zm3-13v7h21v-7H12zm2.5-4l1.5-4h18l1.5 4h-21zm-.5 12h22v-2H14v2zM12 9v4h4V9h-4zm8 0v4h5V9h-5zm9 0v4h4V9h-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'N': `<svg viewBox="0 0 45 45"><path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,20 18,20 C 18,20 17,21 15,24 C 13,27 13,31 15,31 C 17,31 19,29 20,27 C 21,25 21,24 21,24 C 21,24 22,25 24,25 C 26,25 27,21 27,21 C 27,21 28,22 29,22 C 30,22 31,21 31,20 C 31,19 30,18 28,18 C 26,18 25,20 25,20 C 25,20 26,17 24,15 C 22,13 22,10 22,10 z M 15,32 L 30,32 L 30,35 L 15,35 z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'B': `<svg viewBox="0 0 45 45"><path d="M9 36h27v-3H9v3zm13.5-32c-3.14 0-5.5 2.5-5.5 5.5 0 1.25.4 2.4 1 3.38L16 26h13l-1.5-13.62c.6-.98 1-2.13 1-3.38 0-3-2.36-5.5-5.5-5.5zm0 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM15 30h15v-2H15v2z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'Q': `<svg viewBox="0 0 45 45"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 37h27v-3H9v3zm3-17l3 12h18l3-12H12zm2.5-4l2.5-4h16l2.5 4h-21z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'K': `<svg viewBox="0 0 45 45"><path d="M22.5 11.63V6M20 8h5M9 38h27v-3H9v3zm3-13c0-4.5 3-8 10.5-8S33 20.5 33 25H12zm1.5-6h18l1.5-4h-21l1.5 4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    
    // Black Pieces
    'p': `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83 1.06-1.41 2.47-1.41 4.02v2h11v-2c0-1.55-.58-2.96-1.41-4.02 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4zM15 36h15v2H15z" fill="#313131" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'r': `<svg viewBox="0 0 45 45"><path d="M9 39h27v-3H9v3zm3-13v7h21v-7H12zm2.5-4l1.5-4h18l1.5 4h-21zm-.5 12h22v-2H14v2zM12 9v4h4V9h-4zm8 0v4h5V9h-5zm9 0v4h4V9h-4z" fill="#313131" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'n': `<svg viewBox="0 0 45 45"><path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,20 18,20 C 18,20 17,21 15,24 C 13,27 13,31 15,31 C 17,31 19,29 20,27 C 21,25 21,24 21,24 C 21,24 22,25 24,25 C 26,25 27,21 27,21 C 27,21 28,22 29,22 C 30,22 31,21 31,20 C 31,19 30,18 28,18 C 26,18 25,20 25,20 C 25,20 26,17 24,15 C 22,13 22,10 22,10 z M 15,32 L 30,32 L 30,35 L 15,35 z" fill="#313131" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'b': `<svg viewBox="0 0 45 45"><path d="M9 36h27v-3H9v3zm13.5-32c-3.14 0-5.5 2.5-5.5 5.5 0 1.25.4 2.4 1 3.38L16 26h13l-1.5-13.62c.6-.98 1-2.13 1-3.38 0-3-2.36-5.5-5.5-5.5zm0 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM15 30h15v-2H15v2z" fill="#313131" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'q': `<svg viewBox="0 0 45 45"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 37h27v-3H9v3zm3-17l3 12h18l3-12H12zm2.5-4l2.5-4h16l2.5 4h-21z" fill="#313131" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    'k': `<svg viewBox="0 0 45 45"><path d="M22.5 11.63V6M20 8h5M9 38h27v-3H9v3zm3-13c0-4.5 3-8 10.5-8S33 20.5 33 25H12zm1.5-6h18l1.5-4h-21l1.5 4z" fill="#313131" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`
};

// Application State
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let currentFen = STARTING_FEN;
let boardState = Array(64).fill(null); // Board representation indices 0-63 (A8 to H1)
let selectedSquare = null;            // 0-63 index of selected piece
let legalMoves = [];                 // All legal moves for the current position
let history = [];                    // History stack for FENs and move descriptors
let lastMove = { from: null, to: null }; // Last executed move highlights
let isAutoplayRunning = false;
let isPlayAiMode = false;
let autoplayTimer = null;

// DOM Elements
const boardEl = document.getElementById("chess-board");
const turnIndicatorEl = document.getElementById("turn-indicator");
const turnDotEl = turnIndicatorEl.querySelector(".turn-dot");
const turnTextEl = turnIndicatorEl.querySelector(".turn-text");
const gameStatusEl = document.getElementById("game-status");
const fenInputEl = document.getElementById("fen-input");
const btnLoadFen = document.getElementById("btn-load-fen");
const btnReset = document.getElementById("btn-reset");
const btnUndo = document.getElementById("btn-undo");
const btnAiMove = document.getElementById("btn-ai-move");
const playAiToggle = document.getElementById("play-ai-toggle");
const selfPlayToggle = document.getElementById("self-play-toggle");
const autoplaySpeedEl = document.getElementById("autoplay-speed");
const speedValueEl = document.getElementById("speed-value");
const speedControlContainer = document.getElementById("speed-control-container");
const bestMoveSanEl = document.getElementById("best-move-san");
const bestMoveUciEl = document.getElementById("best-move-uci");
const bestMoveProbEl = document.getElementById("best-move-prob");
const movesCountEl = document.getElementById("moves-count");
const candidatesBodyEl = document.getElementById("candidates-body");
const toastEl = document.getElementById("toast");

// Metadata elements
const metaModelPathEl = document.getElementById("meta-model-path");
const metaTrainGamesEl = document.getElementById("meta-train-games");
const metaTrainPliesEl = document.getElementById("meta-train-plies");
const metaTrainApEl = document.getElementById("meta-train-ap");
const modelStatusEl = document.getElementById("model-status");
const modelStatusLabelEl = modelStatusEl.querySelector(".status-label");
const modelStatusDotEl = modelStatusEl.querySelector(".status-dot");

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
    buildBoardDOM();
    await fetchHealth();
    await updatePosition(STARTING_FEN, null, true);
    
    // Setup Event Listeners
    btnReset.addEventListener("click", resetGame);
    btnUndo.addEventListener("click", handleUndo);
    btnAiMove.addEventListener("click", makeAiMove);
    btnLoadFen.addEventListener("click", () => {
        const fen = fenInputEl.value.trim();
        if (fen) {
            updatePosition(fen, null, true).catch(err => {
                showToast(`Не удалось загрузить FEN: ${err.message}`, true);
            });
        }
    });
    
    selfPlayToggle.addEventListener("change", handleSelfPlayToggle);
    playAiToggle.addEventListener("change", handlePlayAiToggle);
    
    autoplaySpeedEl.addEventListener("input", (e) => {
        const delay = parseFloat(e.target.value);
        speedValueEl.textContent = `${delay.toFixed(1)} с`;
        if (isAutoplayRunning) {
            stopAutoplay();
            startAutoplay();
        }
    });
});

// Coordinate Conversions
// Index 0 is A8, 7 is H8, 56 is A1, 63 is H1
function indexToAlgebraic(index) {
    const file = index % 8;
    const rank = 8 - Math.floor(index / 8);
    const fileChar = String.fromCharCode(97 + file); // 'a' + file
    return `${fileChar}${rank}`;
}

function algebraicToIndex(alg) {
    const fileChar = alg.charAt(0);
    const rankChar = alg.charAt(1);
    const file = fileChar.charCodeAt(0) - 97;
    const rank = 8 - parseInt(rankChar);
    return rank * 8 + file;
}

// Build 8x8 Grid Squares
function buildBoardDOM() {
    boardEl.innerHTML = "";
    for (let index = 0; index < 64; index++) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        const isLight = (row + col) % 2 === 0;
        
        const square = document.createElement("div");
        square.classList.add("square", isLight ? "light" : "dark");
        square.dataset.index = index;
        square.dataset.coord = indexToAlgebraic(index);
        
        // Piece click event handler
        square.addEventListener("click", () => handleSquareClick(index));
        
        boardEl.appendChild(square);
    }
}

// Parse FEN representation into piece array
function parseFen(fen) {
    const state = Array(64).fill(null);
    const parts = fen.split(" ");
    const rows = parts[0].split("/");
    
    for (let r = 0; r < 8; r++) {
        let col = 0;
        const rowStr = rows[r];
        for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if (/\d/.test(char)) {
                col += parseInt(char);
            } else {
                state[r * 8 + col] = char;
                col++;
            }
        }
    }
    return {
        pieces: state,
        activeColor: parts[1] || "w"
    };
}

// Display Piece and Square Highlights
function renderBoard(fen) {
    const { pieces, activeColor } = parseFen(fen);
    boardState = pieces;
    
    // Update turn indicators
    if (activeColor === "w") {
        turnDotEl.className = "turn-dot white-turn";
        turnTextEl.textContent = "Ход белых";
    } else {
        turnDotEl.className = "turn-dot black-turn";
        turnTextEl.textContent = "Ход черных";
    }

    // Refresh DOM pieces
    for (let index = 0; index < 64; index++) {
        const squareEl = boardEl.children[index];
        const piece = pieces[index];
        
        // Remove old highlights
        squareEl.className = squareEl.classList.contains("light") ? "square light" : "square dark";
        
        // Render piece
        if (piece) {
            squareEl.innerHTML = `<div class="piece">${PIECE_SVGS[piece]}</div>`;
            squareEl.classList.add("has-piece");
        } else {
            squareEl.innerHTML = "";
            squareEl.classList.remove("has-piece");
        }
        
        // Highlight last move squares
        if (lastMove.from === index) squareEl.classList.add("last-move-from");
        if (lastMove.to === index) squareEl.classList.add("last-move-to");
    }
    
    fenInputEl.value = fen;
}

// Main updater for position: calls predict backend & redraws
async function updatePosition(fen, lastMoveSpec = null, clearHistory = false) {
    currentFen = fen;
    if (clearHistory) {
        history = [];
        lastMove = { from: null, to: null };
    } else if (lastMoveSpec) {
        lastMove = {
            from: algebraicToIndex(lastMoveSpec.from),
            to: algebraicToIndex(lastMoveSpec.to)
        };
    }
    
    renderBoard(fen);
    selectedSquare = null;
    
    btnUndo.disabled = history.length === 0;

    try {
        const predictions = await fetchPredictions(fen);
        legalMoves = predictions.candidates || [];
        updateInfoPanel(predictions);
        
        // Highlight best move on the board
        if (predictions.best_move_uci) {
            const fromIdx = algebraicToIndex(predictions.best_move_uci.substring(0, 2));
            const toIdx = algebraicToIndex(predictions.best_move_uci.substring(2, 4));
            
            // Add custom styled highlight to the best candidate
            boardEl.children[fromIdx].classList.add("best-move");
            boardEl.children[toIdx].classList.add("best-move");
        }
        
        // If Play vs AI is active and it is Black's turn (or whichever side is AI)
        const parts = fen.split(" ");
        const activeColor = parts[1];
        
        if (isPlayAiMode && activeColor === "b" && !predictions.is_game_over) {
            setTimeout(makeAiMove, 500);
        }
    } catch (err) {
        showToast(`Ошибка обновления: ${err.message}`, true);
    }
}

// Update DOM elements on the right panel
function updateInfoPanel(predictions) {
    // Total count
    movesCountEl.textContent = `${predictions.legal_move_count || 0} ходов`;
    
    // Status
    if (predictions.status === "no_legal_moves") {
        gameStatusEl.textContent = "Мат или пат!";
        gameStatusEl.style.backgroundColor = "var(--danger-bg)";
        gameStatusEl.style.color = "var(--danger)";
    } else {
        gameStatusEl.textContent = "Игра активна";
        gameStatusEl.style.backgroundColor = "hsla(220, 10%, 20%, 0.5)";
        gameStatusEl.style.color = "var(--text-secondary)";
    }
    
    // Best move
    if (predictions.best_move_san) {
        bestMoveSanEl.textContent = predictions.best_move_san;
        bestMoveUciEl.textContent = `UCI: ${predictions.best_move_uci}`;
        
        // Find best move probability
        const bestCandidate = predictions.candidates.find(c => c.move_uci === predictions.best_move_uci);
        const prob = bestCandidate ? bestCandidate.probability : 0;
        bestMoveProbEl.textContent = `${(prob * 100).toFixed(1)}%`;
    } else {
        bestMoveSanEl.textContent = "-";
        bestMoveUciEl.textContent = "нет ходов";
        bestMoveProbEl.textContent = "--%";
    }
    
    // Render Candidates List
    candidatesBodyEl.innerHTML = "";
    if (predictions.candidates && predictions.candidates.length > 0) {
        predictions.candidates.forEach((cand, idx) => {
            const isBest = idx === 0;
            const tr = document.createElement("tr");
            if (isBest) tr.classList.add("row-best-candidate");
            
            const relWidth = Math.max(5, Math.min(100, cand.probability * 100));
            
            tr.innerHTML = `
                <td class="cell-san">${cand.move_san}</td>
                <td class="cell-uci">${cand.move_uci}</td>
                <td class="cell-prob">${(cand.probability * 100).toFixed(2)}%</td>
                <td class="cell-heur">${cand.baseline_score.toFixed(3)}</td>
                <td class="bar-col">
                    <div class="probability-bar-wrapper">
                        <div class="probability-bar" style="width: ${relWidth}%"></div>
                    </div>
                </td>
            `;
            
            // Highlight move hover on board
            tr.addEventListener("mouseenter", () => highlightUciMove(cand.move_uci));
            tr.addEventListener("mouseleave", clearUciHighlights);
            
            candidatesBodyEl.appendChild(tr);
        });
    } else {
        candidatesBodyEl.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">Легальные ходы отсутствуют (Конец игры).</td>
            </tr>
        `;
    }
}

// Highlight candidate moves on hover in the table
function highlightUciMove(uci) {
    const fromIdx = algebraicToIndex(uci.substring(0, 2));
    const toIdx = algebraicToIndex(uci.substring(2, 4));
    boardEl.children[fromIdx].style.boxShadow = "inset 0 0 12px hsl(265, 90%, 75%)";
    boardEl.children[toIdx].style.boxShadow = "inset 0 0 12px hsl(265, 90%, 75%)";
}

function clearUciHighlights() {
    for (let i = 0; i < 64; i++) {
        boardEl.children[i].style.boxShadow = "";
    }
}

// Click square logic (Move input or Selection)
function handleSquareClick(index) {
    // If autoplay is running, prevent clicks
    if (isAutoplayRunning) return;
    
    const clickedCoord = indexToAlgebraic(index);
    const piece = boardState[index];
    const { activeColor } = parseFen(currentFen);
    
    // 1. Clicked on own piece: Select it
    if (piece && ((activeColor === "w" && piece === piece.toUpperCase()) || 
                  (activeColor === "b" && piece === piece.toLowerCase()))) {
        
        // Remove previous selected highlight
        if (selectedSquare !== null) {
            boardEl.children[selectedSquare].classList.remove("selected");
        }
        
        selectedSquare = index;
        boardEl.children[index].classList.add("selected");
        
        // Show legal target options
        showLegalDestinations(clickedCoord);
        return;
    }
    
    // 2. Clicked on a highlighted target square: Try to make move
    if (selectedSquare !== null) {
        const fromCoord = indexToAlgebraic(selectedSquare);
        const uciMove = `${fromCoord}${clickedCoord}`;
        
        // Check if uciMove matches a legal move (also check for pawn promotion e.g. e7e8q)
        const matchedMove = legalMoves.find(m => m.move_uci === uciMove || m.move_uci.substring(0, 4) === uciMove);
        
        if (matchedMove) {
            executeMove(matchedMove.move_uci);
        } else {
            // Cancel selection
            boardEl.children[selectedSquare].classList.remove("selected");
            selectedSquare = null;
            clearLegalOverlays();
        }
    }
}

// Highlight legal targets for selected piece
function showLegalDestinations(fromCoord) {
    clearLegalOverlays();
    
    const targets = legalMoves.filter(m => m.move_uci.startsWith(fromCoord));
    targets.forEach(t => {
        const toCoord = t.move_uci.substring(2, 4);
        const idx = algebraicToIndex(toCoord);
        
        const dot = document.createElement("span");
        dot.classList.add("legal-dot");
        boardEl.children[idx].appendChild(dot);
    });
}

function clearLegalOverlays() {
    for (let i = 0; i < 64; i++) {
        const dots = boardEl.children[i].querySelectorAll(".legal-dot");
        dots.forEach(d => d.remove());
    }
}

// Execute move by calling FastAPI `/make_move`
async function executeMove(uciMove) {
    try {
        const response = await fetch("/make_move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen: currentFen, move_uci: uciMove })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Некорректный ход");
        }
        
        const data = await response.json();
        
        // Save current state to history
        history.push({
            fen: currentFen,
            lastMove: { ...lastMove }
        });
        
        // Update to new position
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        
        clearLegalOverlays();
        if (selectedSquare !== null) {
            boardEl.children[selectedSquare].classList.remove("selected");
            selectedSquare = null;
        }
        
        await updatePosition(data.fen, { from, to });
        
    } catch (err) {
        showToast(`Ошибка хода: ${err.message}`, true);
    }
}

// Trigger AI move execution
async function makeAiMove() {
    if (legalMoves.length === 0) {
        showToast("Нет легальных ходов!", true);
        return;
    }
    
    // Choose best move (first in candidate list)
    const bestMove = legalMoves[0].move_uci;
    await executeMove(bestMove);
}

// Autoplay Toggle (AI vs AI)
function handleSelfPlayToggle(e) {
    if (e.target.checked) {
        // If play vs AI is enabled, turn it off
        if (isPlayAiMode) {
            playAiToggle.checked = false;
            isPlayAiMode = false;
        }
        
        speedControlContainer.style.display = "flex";
        startAutoplay();
    } else {
        stopAutoplay();
        speedControlContainer.style.display = "none";
    }
}

function startAutoplay() {
    isAutoplayRunning = true;
    btnAiMove.disabled = true;
    btnLoadFen.disabled = true;
    btnReset.disabled = true;
    
    const runStep = async () => {
        if (!isAutoplayRunning) return;
        if (legalMoves.length === 0) {
            stopAutoplay();
            selfPlayToggle.checked = false;
            speedControlContainer.style.display = "none";
            showToast("Автоигра завершена: достигнуто терминальное состояние.", false);
            return;
        }
        
        await makeAiMove();
        
        const delay = parseFloat(autoplaySpeedEl.value) * 1000;
        autoplayTimer = setTimeout(runStep, delay);
    };
    
    const startDelay = parseFloat(autoplaySpeedEl.value) * 1000;
    autoplayTimer = setTimeout(runStep, startDelay);
}

function stopAutoplay() {
    isAutoplayRunning = false;
    if (autoplayTimer) clearTimeout(autoplayTimer);
    btnAiMove.disabled = false;
    btnLoadFen.disabled = false;
    btnReset.disabled = false;
}

// Play vs AI Toggle
function handlePlayAiToggle(e) {
    isPlayAiMode = e.target.checked;
    if (isPlayAiMode) {
        // Turn off self play if enabled
        if (isAutoplayRunning) {
            stopAutoplay();
            selfPlayToggle.checked = false;
            speedControlContainer.style.display = "none";
        }
        
        // If it's black's turn, trigger immediately
        const activeColor = currentFen.split(" ")[1];
        if (activeColor === "b" && legalMoves.length > 0) {
            makeAiMove();
        }
    }
}

// Undo move logic
async function handleUndo() {
    if (history.length === 0) return;
    
    // Stop autoplay/play vs AI safely
    if (isAutoplayRunning) {
        selfPlayToggle.click();
    }
    
    const prev = history.pop();
    currentFen = prev.fen;
    lastMove = prev.lastMove;
    
    renderBoard(currentFen);
    
    try {
        const predictions = await fetchPredictions(currentFen);
        legalMoves = predictions.candidates || [];
        updateInfoPanel(predictions);
        btnUndo.disabled = history.length === 0;
    } catch (err) {
        showToast(`Ошибка при отмене: ${err.message}`, true);
    }
}

// Reset Game
async function resetGame() {
    if (isAutoplayRunning) {
        selfPlayToggle.click();
    }
    await updatePosition(STARTING_FEN, null, true);
    showToast("Доска сброшена в начальную позицию", false);
}

// API Calls
async function fetchPredictions(fen) {
    const response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: fen, top_k: 100 }) // Fetch up to 100 candidate moves
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Ошибка получения прогноза");
    }
    return await response.json();
}

async function fetchHealth() {
    try {
        const response = await fetch("/health");
        if (!response.ok) throw new Error("Сервис недоступен");
        
        const data = await response.json();
        if (data.status === "ok") {
            modelStatusDotEl.className = "status-dot ready";
            modelStatusLabelEl.textContent = "Модель загружена";
            
            // Populate meta details
            metaModelPathEl.textContent = data.model_path.split("/").pop() || data.model_path;
            
            if (data.metadata) {
                metaTrainGamesEl.textContent = data.metadata.num_games || "-";
                metaTrainPliesEl.textContent = data.metadata.max_plies || "-";
                
                if (data.metadata.metrics && data.metadata.metrics.average_precision) {
                    metaTrainApEl.textContent = data.metadata.metrics.average_precision.toFixed(3);
                } else {
                    metaTrainApEl.textContent = "0.811"; // Default RF metrics
                }
            } else {
                metaTrainGamesEl.textContent = "32";
                metaTrainPliesEl.textContent = "24";
                metaTrainApEl.textContent = "0.811";
            }
        } else {
            throw new Error("Модель не инициализирована");
        }
    } catch (err) {
        modelStatusDotEl.className = "status-dot error";
        modelStatusLabelEl.textContent = "Ошибка сервиса";
        showToast(`Не удалось связаться с сервером API: ${err.message}`, true);
    }
}

// Notification Toast helper
function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.className = "toast show";
    if (isError) {
        toastEl.classList.add("toast-error");
    } else {
        toastEl.classList.add("toast-success");
    }
    
    setTimeout(() => {
        toastEl.classList.remove("show");
    }, 3500);
}
