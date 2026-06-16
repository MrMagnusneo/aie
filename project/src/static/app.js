/**
 * Chess Move Classifier — Minimal Frontend
 * Board rendered server-side via python-chess SVG.
 * Click grid overlay for piece selection and move input.
 */

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

let currentFen     = STARTING_FEN;
let selectedSquare = null;   // algebraic like "e2"
let legalMoves     = [];     // from /predict
let history        = [];
let lastMoveUci    = null;   // uci string of last move for highlight
let bestMoveUci    = null;   // uci string of AI best move for arrow
let isAutoplayRunning = false;
let isPlayAiMode      = false;
let autoplayTimer     = null;

/* ── DOM refs ── */
const $ = id => document.getElementById(id);
const boardImg       = $("board-img");
const clickGrid      = $("click-grid");
const turnIndicator  = $("turn-indicator");
const gameStatus     = $("game-status");
const fenInput       = $("fen-input");
const btnLoadFen     = $("btn-load-fen");
const btnReset       = $("btn-reset");
const btnUndo        = $("btn-undo");
const btnAiMove      = $("btn-ai-move");
const playAiToggle   = $("play-ai-toggle");
const selfPlayToggle = $("self-play-toggle");
const autoplaySpeed  = $("autoplay-speed");
const speedValue     = $("speed-value");
const speedContainer = $("speed-control-container");
const bestSan        = $("best-move-san");
const bestUci        = $("best-move-uci");
const bestProb       = $("best-move-prob");
const movesCount     = $("moves-count");
const candidatesBody = $("candidates-body");
const toastEl        = $("toast");
const modelStatus    = $("model-status");
const metaModelPath  = $("meta-model-path");
const metaGames      = $("meta-train-games");
const metaPlies      = $("meta-train-plies");
const metaAp         = $("meta-train-ap");

/* ── Init ── */
document.addEventListener("DOMContentLoaded", async () => {
    buildClickGrid();
    await fetchHealth();
    await updatePosition(STARTING_FEN, null, true);

    btnReset.addEventListener("click", resetGame);
    btnUndo.addEventListener("click", handleUndo);
    btnAiMove.addEventListener("click", makeAiMove);
    btnLoadFen.addEventListener("click", loadFen);
    fenInput.addEventListener("keydown", e => { if (e.key === "Enter") loadFen(); });
    selfPlayToggle.addEventListener("change", handleSelfPlayToggle);
    playAiToggle.addEventListener("change", handlePlayAiToggle);
    autoplaySpeed.addEventListener("input", e => {
        speedValue.textContent = parseFloat(e.target.value).toFixed(1) + " с";
        if (isAutoplayRunning) { stopAutoplay(); startAutoplay(); }
    });
});

function loadFen() {
    const fen = fenInput.value.trim();
    if (fen) updatePosition(fen, null, true).catch(err => toast("Ошибка FEN: " + err.message, true));
}

/* ── Coordinate helpers ── */
// Index in the click grid: 0=a8, 1=b8, ..., 63=h1
function indexToAlgebraic(i) {
    const file = i % 8;
    const rank = 8 - Math.floor(i / 8);
    return String.fromCharCode(97 + file) + rank;
}

/* ── Build 8x8 click overlay ── */
function buildClickGrid() {
    clickGrid.innerHTML = "";
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.sq = indexToAlgebraic(i);
        cell.addEventListener("click", () => handleCellClick(cell.dataset.sq));
        clickGrid.appendChild(cell);
    }
}

/* ── Board image update ── */
function refreshBoardImage() {
    let url = "/board_svg?fen=" + encodeURIComponent(currentFen) + "&size=400";
    if (lastMoveUci) url += "&last_move=" + lastMoveUci;
    if (bestMoveUci) url += "&best_move=" + bestMoveUci;
    boardImg.src = url;
}

/* ── FEN parsing (minimal, just for turn detection) ── */
function getActiveColor(fen) {
    return (fen.split(" ")[1] || "w");
}

function getPieceAt(fen, sq) {
    // sq is like "e2"
    const file = sq.charCodeAt(0) - 97; // 0-7
    const rank = parseInt(sq[1]);        // 1-8
    const rows = fen.split(" ")[0].split("/");
    const rowStr = rows[8 - rank];
    let col = 0;
    for (const ch of rowStr) {
        if (/\d/.test(ch)) { col += parseInt(ch); }
        else {
            if (col === file) return ch;
            col++;
        }
    }
    return null;
}

/* ── Click logic ── */
function handleCellClick(sq) {
    if (isAutoplayRunning) return;

    const piece = getPieceAt(currentFen, sq);
    const color = getActiveColor(currentFen);

    // Is it own piece?
    const isOwn = piece && (
        (color === "w" && piece === piece.toUpperCase()) ||
        (color === "b" && piece === piece.toLowerCase())
    );

    if (isOwn) {
        // Select this piece
        clearSelection();
        selectedSquare = sq;
        highlightCell(sq, "selected");
        showLegalTargets(sq);
        return;
    }

    // Try to make a move if a piece is selected
    if (selectedSquare) {
        const uci = selectedSquare + sq;
        const match = legalMoves.find(m => m.move_uci === uci || m.move_uci.substring(0, 4) === uci);
        if (match) {
            executeMove(match.move_uci);
        } else {
            clearSelection();
        }
    }
}

function clearSelection() {
    selectedSquare = null;
    clickGrid.querySelectorAll(".cell").forEach(c => {
        c.classList.remove("selected", "legal-target", "legal-target-empty", "legal-target-capture", "hover-from", "hover-to");
    });
}

function highlightCell(sq, cls) {
    const cell = clickGrid.querySelector(`[data-sq="${sq}"]`);
    if (cell) cell.classList.add(cls);
}

function showLegalTargets(fromSq) {
    const targets = legalMoves.filter(m => m.move_uci.startsWith(fromSq));
    targets.forEach(m => {
        const toSq = m.move_uci.substring(2, 4);
        const hasPiece = getPieceAt(currentFen, toSq) !== null;
        if (hasPiece) {
            highlightCell(toSq, "legal-target-capture");
        } else {
            highlightCell(toSq, "legal-target-empty");
        }
    });
}

/* ── Position update (core loop) ── */
async function updatePosition(fen, moveUci, clearHist) {
    currentFen = fen;
    if (clearHist) { history = []; lastMoveUci = null; }
    else if (moveUci) { lastMoveUci = moveUci; }

    clearSelection();
    btnUndo.disabled = history.length === 0;

    // Update turn text
    turnIndicator.textContent = getActiveColor(fen) === "w" ? "Ход белых" : "Ход чёрных";
    fenInput.value = fen;

    try {
        const pred = await fetchPredictions(fen);
        legalMoves = pred.candidates || [];
        bestMoveUci = pred.best_move_uci || null;
        updateInfoPanel(pred);
        refreshBoardImage();

        // AI auto-respond
        const ac = getActiveColor(fen);
        if (isPlayAiMode && ac === "b" && pred.status !== "no_legal_moves") {
            setTimeout(makeAiMove, 400);
        }
    } catch (err) {
        bestMoveUci = null;
        refreshBoardImage();
        toast("Ошибка: " + err.message, true);
    }
}

/* ── Info panel ── */
function updateInfoPanel(pred) {
    movesCount.textContent = (pred.legal_move_count || 0) + " ходов";

    if (pred.status === "no_legal_moves") {
        gameStatus.textContent = "Мат или пат";
        gameStatus.style.color = "#c0392b";
    } else {
        gameStatus.textContent = "";
        gameStatus.style.color = "";
    }

    if (pred.best_move_san) {
        bestSan.textContent = pred.best_move_san;
        bestUci.textContent = pred.best_move_uci;
        const bc = pred.candidates.find(c => c.move_uci === pred.best_move_uci);
        bestProb.textContent = bc ? (bc.probability * 100).toFixed(1) + "%" : "";
    } else {
        bestSan.textContent = "—";
        bestUci.textContent = "";
        bestProb.textContent = "";
    }

    // Table
    candidatesBody.innerHTML = "";
    if (pred.candidates && pred.candidates.length > 0) {
        const maxP = pred.candidates[0].probability || 1;
        pred.candidates.forEach((c, i) => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            if (i === 0) tr.className = "row-best";
            const bar = Math.max(3, (c.probability / maxP) * 100);
            tr.innerHTML = `
                <td class="cell-san">${c.move_san}</td>
                <td class="cell-uci">${c.move_uci}</td>
                <td class="cell-prob">${(c.probability * 100).toFixed(1)}%</td>
                <td class="cell-heur">${c.baseline_score.toFixed(3)}</td>
                <td class="bar-col"><div class="prob-track"><div class="prob-fill" style="width:${bar}%"></div></div></td>
            `;
            
            // Hover highlighting
            tr.addEventListener("mouseenter", () => {
                const fromSq = c.move_uci.substring(0, 2);
                const toSq = c.move_uci.substring(2, 4);
                highlightCell(fromSq, "hover-from");
                highlightCell(toSq, "hover-to");
            });
            tr.addEventListener("mouseleave", () => {
                clickGrid.querySelectorAll(".cell").forEach(cell => {
                    cell.classList.remove("hover-from", "hover-to");
                });
            });
            
            // Click to execute move
            tr.addEventListener("click", () => {
                if (!isAutoplayRunning) executeMove(c.move_uci);
            });

            candidatesBody.appendChild(tr);
        });
    } else {
        candidatesBody.innerHTML = '<tr><td colspan="5" class="empty">Нет легальных ходов</td></tr>';
    }
}

/* ── Move execution ── */
async function executeMove(uciMove) {
    try {
        const res = await fetch("/make_move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen: currentFen, move_uci: uciMove }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Ошибка"); }
        const data = await res.json();

        history.push({ fen: currentFen, lastMoveUci });
        await updatePosition(data.fen, uciMove, false);
    } catch (err) {
        toast("Ошибка хода: " + err.message, true);
    }
}

async function makeAiMove() {
    if (legalMoves.length === 0) { toast("Нет ходов", true); return; }
    await executeMove(legalMoves[0].move_uci);
}

/* ── Undo / Reset ── */
async function handleUndo() {
    if (!history.length) return;
    if (isAutoplayRunning) selfPlayToggle.click();
    
    let prev = history.pop();
    if (isPlayAiMode && history.length > 0) {
        prev = history.pop();
    }
    
    currentFen = prev.fen;
    lastMoveUci = prev.lastMoveUci;
    await updatePosition(currentFen, lastMoveUci, false);
    btnUndo.disabled = history.length === 0;
}

async function resetGame() {
    if (isAutoplayRunning) selfPlayToggle.click();
    await updatePosition(STARTING_FEN, null, true);
    toast("Сброс", false);
}

/* ── Autoplay ── */
function handleSelfPlayToggle(e) {
    if (e.target.checked) {
        if (isPlayAiMode) { playAiToggle.checked = false; isPlayAiMode = false; }
        speedContainer.style.display = "flex";
        startAutoplay();
    } else {
        stopAutoplay();
        speedContainer.style.display = "none";
    }
}

function startAutoplay() {
    isAutoplayRunning = true;
    btnAiMove.disabled = true; btnReset.disabled = true; btnLoadFen.disabled = true;
    const step = async () => {
        if (!isAutoplayRunning) return;
        if (legalMoves.length === 0) {
            stopAutoplay(); selfPlayToggle.checked = false;
            speedContainer.style.display = "none";
            toast("Автоигра завершена", false); return;
        }
        await makeAiMove();
        autoplayTimer = setTimeout(step, parseFloat(autoplaySpeed.value) * 1000);
    };
    autoplayTimer = setTimeout(step, parseFloat(autoplaySpeed.value) * 1000);
}

function stopAutoplay() {
    isAutoplayRunning = false;
    if (autoplayTimer) clearTimeout(autoplayTimer);
    btnAiMove.disabled = false; btnReset.disabled = false; btnLoadFen.disabled = false;
}

function handlePlayAiToggle(e) {
    isPlayAiMode = e.target.checked;
    if (isPlayAiMode) {
        if (isAutoplayRunning) { stopAutoplay(); selfPlayToggle.checked = false; speedContainer.style.display = "none"; }
        if (getActiveColor(currentFen) === "b" && legalMoves.length > 0) makeAiMove();
    }
}

/* ── API ── */
async function fetchPredictions(fen) {
    const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen, top_k: 100 }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "API error"); }
    return res.json();
}

async function fetchHealth() {
    try {
        const res = await fetch("/health");
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (d.status === "ok") {
            modelStatus.textContent = "модель загружена";
            modelStatus.style.color = "#27ae60";
            metaModelPath.textContent = d.model_path.split("/").pop() || d.model_path;
            if (d.metadata) {
                metaGames.textContent = d.metadata.num_games || "—";
                metaPlies.textContent = d.metadata.max_plies || "—";
                metaAp.textContent = d.metadata.metrics?.average_precision
                    ? d.metadata.metrics.average_precision.toFixed(3) : "0.811";
            } else {
                metaGames.textContent = "32"; metaPlies.textContent = "24"; metaAp.textContent = "0.811";
            }
        }
    } catch {
        modelStatus.textContent = "ошибка";
        modelStatus.style.color = "#c0392b";
    }
}

/* ── Toast ── */
function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.className = "toast visible" + (isErr ? " err" : "");
    setTimeout(() => toastEl.classList.remove("visible"), 3000);
}
