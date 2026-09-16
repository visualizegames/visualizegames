/* ============================================================
   DAMAS (regras brasileiras) — motor do jogo + IA + interface
   ============================================================ */

const SIZE = 8;
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function isDark(r, c) { return (r + c) % 2 === 1; }
function emptyBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); }

function initialBoard() {
  const b = emptyBoard();
  for (let r = 0; r < 3; r++) for (let c = 0; c < SIZE; c++) if (isDark(r, c)) b[r][c] = { player: 2, king: false };
  for (let r = 5; r < 8; r++) for (let c = 0; c < SIZE; c++) if (isDark(r, c)) b[r][c] = { player: 1, king: false };
  return b;
}

function cloneBoard(b) { return b.map((row) => row.map((cell) => (cell ? { ...cell } : null))); }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function opponentOf(p) { return p === 1 ? 2 : 1; }
function isPromotionRow(player, row) { return player === 1 ? row === 0 : row === 7; }
function manForwardDirs(player) { return player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; }

function getSingleCaptures(board, r, c) {
  const piece = board[r][c];
  const results = [];
  if (!piece) return results;

  if (piece.king) {
    for (const [dr, dc] of DIAGONALS) {
      let cr = r + dr, cc = c + dc;
      while (inBounds(cr, cc) && board[cr][cc] === null) { cr += dr; cc += dc; }
      if (!inBounds(cr, cc)) continue;
      const occ = board[cr][cc];
      if (occ && occ.player !== piece.player) {
        let lr = cr + dr, lc = cc + dc;
        while (inBounds(lr, lc) && board[lr][lc] === null) {
          results.push({ landR: lr, landC: lc, capR: cr, capC: cc });
          lr += dr; lc += dc;
        }
      }
    }
  } else {
    for (const [dr, dc] of DIAGONALS) {
      const mr = r + dr, mc = c + dc;
      const lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const mid = inBounds(mr, mc) ? board[mr][mc] : undefined;
      if (mid && mid.player !== piece.player && board[lr][lc] === null) {
        results.push({ landR: lr, landC: lc, capR: mr, capC: mc });
      }
    }
  }
  return results;
}

function getSingleMoves(board, r, c) {
  const piece = board[r][c];
  const results = [];
  if (!piece) return results;
  if (piece.king) {
    for (const [dr, dc] of DIAGONALS) {
      let cr = r + dr, cc = c + dc;
      while (inBounds(cr, cc) && board[cr][cc] === null) {
        results.push({ landR: cr, landC: cc });
        cr += dr; cc += dc;
      }
    }
  } else {
    for (const [dr, dc] of manForwardDirs(piece.player)) {
      const cr = r + dr, cc = c + dc;
      if (inBounds(cr, cc) && board[cr][cc] === null) results.push({ landR: cr, landC: cc });
    }
  }
  return results;
}

function findCaptureSequences(board, r, c) {
  const results = [];
  function dfs(curBoard, curR, curC, capturedSoFar, pathSoFar) {
    const opts = getSingleCaptures(curBoard, curR, curC);
    if (opts.length === 0) {
      if (capturedSoFar.length > 0) {
        results.push({ path: pathSoFar.slice(), captured: capturedSoFar.slice(), length: capturedSoFar.length });
      }
      return;
    }
    for (const opt of opts) {
      const nb = cloneBoard(curBoard);
      const mover = nb[curR][curC];
      nb[curR][curC] = null;
      nb[opt.capR][opt.capC] = null;
      let justCrowned = false;
      if (!mover.king && isPromotionRow(mover.player, opt.landR)) {
        mover.king = true;
        justCrowned = true;
      }
      nb[opt.landR][opt.landC] = mover;
      const newPath = [...pathSoFar, { r: opt.landR, c: opt.landC }];
      const newCaptured = [...capturedSoFar, { r: opt.capR, c: opt.capC }];
      if (justCrowned) {
        results.push({ path: newPath, captured: newCaptured, length: newCaptured.length, crownedMidChain: true });
      } else {
        dfs(nb, opt.landR, opt.landC, newCaptured, newPath);
      }
    }
  }
  dfs(board, r, c, [], []);
  return results;
}

function getAllCaptureSequencesForPlayer(board, player) {
  const all = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        const seqs = findCaptureSequences(board, r, c);
        for (const s of seqs) all.push({ startR: r, startC: c, ...s });
      }
    }
  }
  return all;
}

function getLegalTurns(board, player) {
  const seqs = getAllCaptureSequencesForPlayer(board, player);
  if (seqs.length > 0) {
    const max = Math.max(...seqs.map((s) => s.length));
    return { type: "capture", options: seqs.filter((s) => s.length === max), maxCaptures: max };
  }
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        for (const m of getSingleMoves(board, r, c)) moves.push({ startR: r, startC: c, landR: m.landR, landC: m.landC });
      }
    }
  }
  return { type: "move", options: moves, maxCaptures: 0 };
}

function applyMove(board, move) {
  const nb = cloneBoard(board);
  const piece = nb[move.startR][move.startC];
  nb[move.startR][move.startC] = null;
  if (!piece.king && isPromotionRow(piece.player, move.landR)) piece.king = true;
  nb[move.landR][move.landC] = piece;
  return nb;
}

function applyCaptureSequence(board, seq) {
  const nb = cloneBoard(board);
  let piece = nb[seq.startR][seq.startC];
  nb[seq.startR][seq.startC] = null;
  for (let i = 0; i < seq.path.length; i++) {
    const step = seq.path[i];
    const cap = seq.captured[i];
    nb[cap.r][cap.c] = null;
    if (!piece.king && isPromotionRow(piece.player, step.r)) piece = { ...piece, king: true };
  }
  const last = seq.path[seq.path.length - 1];
  nb[last.r][last.c] = piece;
  return nb;
}

function getResultingBoards(board, player) {
  const turns = getLegalTurns(board, player);
  if (turns.type === "capture") return turns.options.map((seq) => ({ board: applyCaptureSequence(board, seq), move: seq }));
  return turns.options.map((mv) => ({ board: applyMove(board, mv), move: mv }));
}

function countPieces(board, player) {
  let men = 0, kings = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) { if (p.king) kings++; else men++; }
    }
  }
  return { men, kings, total: men + kings };
}

/* ---------------- IA (minimax com poda alfa-beta) ---------------- */

function evaluate(board, aiPlayer) {
  const opp = opponentOf(aiPlayer);
  const me = countPieces(board, aiPlayer);
  const them = countPieces(board, opp);
  let score = (me.men * 100 + me.kings * 180) - (them.men * 100 + them.kings * 180);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.player === aiPlayer ? 1 : -1;
      if (!p.king) {
        const advancement = p.player === 1 ? 7 - r : r;
        score += sign * advancement * 2;
      }
      const centerBonus = 3 - Math.min(Math.abs(c - 3.5), 3.5);
      score += sign * centerBonus * 0.5;
    }
  }
  return score;
}

function minimax(board, player, aiPlayer, depth, alpha, beta) {
  const turns = getLegalTurns(board, player);
  if (turns.options.length === 0) return player === aiPlayer ? -100000 - depth : 100000 + depth;
  if (depth === 0) return evaluate(board, aiPlayer);

  const results = getResultingBoards(board, player);
  const maximizing = player === aiPlayer;
  if (maximizing) {
    let best = -Infinity;
    for (const { board: nb } of results) {
      const val = minimax(nb, opponentOf(player), aiPlayer, depth - 1, alpha, beta);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const { board: nb } of results) {
    const val = minimax(nb, opponentOf(player), aiPlayer, depth - 1, alpha, beta);
    if (val < best) best = val;
    if (val < beta) beta = val;
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAIMove(board, aiPlayer, depth) {
  const results = getResultingBoards(board, aiPlayer);
  if (results.length === 0) return null;
  let bestVal = -Infinity;
  let bestMoves = [];
  for (const r of results) {
    const val = minimax(r.board, opponentOf(aiPlayer), aiPlayer, depth - 1, -Infinity, Infinity);
    if (val > bestVal) { bestVal = val; bestMoves = [r]; } else if (val === bestVal) { bestMoves.push(r); }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

const DIFFICULTY_DEPTH = { facil: 2, normal: 4, dificil: 6 };

/* ============================================================
   ESTADO DO JOGO
   ============================================================ */

const state = {
  board: initialBoard(),
  turn: 1,
  difficulty: "normal",
  selected: null,
  legalTurns: null,
  activeCapturePiece: null,
  activeCaptureSequences: null,
  checkpoints: [],
  hintsLeft: 3,
  hintCells: null,
  aiThinking: false,
  gameOver: false,
  seconds: 0,
  timerId: null,
};

const STORAGE_KEY = "damas_stats_v1";

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { wins: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { wins: 0 };
  }
}
function saveStats(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignora */ }
}

/* ============================================================
   DOM
   ============================================================ */

const boardEl = document.getElementById("board");
const difficultyButtons = document.querySelectorAll(".diff-btn");
const turnStatusEl = document.getElementById("turn-status");
const turnHintEl = document.getElementById("turn-hint");
const turnIconEl = document.getElementById("turn-icon");
const p1CountEl = document.getElementById("p1-count");
const p2CountEl = document.getElementById("p2-count");
const winsCountEl = document.getElementById("wins-count");
const timerEl = document.getElementById("timer");
const undoBtn = document.getElementById("undo-btn");
const hintBtn = document.getElementById("hint-btn");
const hintsCountEl = document.getElementById("hints-count");
const newGameBtn = document.getElementById("new-game-btn");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayActions = document.getElementById("overlay-actions");

/* ============================================================
   TABULEIRO (DOM)
   ============================================================ */

function buildBoardDOM() {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + (isDark(r, c) ? "dark" : "light");
      sq.dataset.row = r;
      sq.dataset.col = c;
      if (isDark(r, c)) sq.addEventListener("click", () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
}

function getSquareEl(r, c) { return boardEl.children[r * SIZE + c]; }

function crownSVG() {
  return '<svg class="crown" viewBox="0 0 24 24" width="55%" height="55%" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 18h16l1-9-5 3-4-6-4 6-5-3 1 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    "</svg>";
}

function renderBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const sq = getSquareEl(r, c);
      sq.classList.remove("selected", "legal-move", "eligible", "hint-cell", "playable");
      sq.innerHTML = "";
      const piece = state.board[r][c];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = "piece " + (piece.player === 2 ? "p2" : "p1");
        if (piece.king) pieceEl.innerHTML = crownSVG();
        sq.appendChild(pieceEl);
      }
    }
  }

  if (!state.gameOver && !state.aiThinking && state.turn === 1) {
    const eligible = new Set();
    if (state.activeCapturePiece) {
      eligible.add(`${state.activeCapturePiece.r},${state.activeCapturePiece.c}`);
    } else if (state.legalTurns) {
      for (const opt of state.legalTurns.options) eligible.add(`${opt.startR},${opt.startC}`);
    }
    eligible.forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      getSquareEl(r, c).classList.add("eligible", "playable");
    });
  }

  if (state.selected) {
    getSquareEl(state.selected.r, state.selected.c).classList.add("selected", "playable");
    for (const opt of getCurrentStepOptions()) {
      getSquareEl(opt.r, opt.c).classList.add("legal-move", "playable");
    }
  }

  if (state.hintCells) {
    for (const cell of state.hintCells) getSquareEl(cell.r, cell.c).classList.add("hint-cell");
  }
}

/* Retorna as casas clicáveis nesse exato momento (próximo passo, seja
   movimento simples ou próximo pulo de uma sequência de captura). */
function getCurrentStepOptions() {
  if (!state.selected) return [];
  if (state.legalTurns.type === "move") {
    return state.legalTurns.options
      .filter((m) => m.startR === state.selected.r && m.startC === state.selected.c)
      .map((m) => ({ r: m.landR, c: m.landC }));
  }
  // captura: opções = próximo passo de cada sequência ainda viável
  const seen = new Set();
  const out = [];
  for (const seq of state.activeCaptureSequences || []) {
    if (seq.path.length === 0) continue;
    const step = seq.path[0];
    const key = `${step.r},${step.c}`;
    if (!seen.has(key)) { seen.add(key); out.push(step); }
  }
  return out;
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function renderSidebar() {
  const p1 = countPieces(state.board, 1);
  const p2 = countPieces(state.board, 2);
  p1CountEl.textContent = p1.total;
  p2CountEl.textContent = p2.total;
  timerEl.textContent = formatTime(state.seconds);
  hintsCountEl.textContent = state.hintsLeft;
  hintBtn.disabled = state.hintsLeft <= 0 || state.gameOver;
  undoBtn.disabled = state.checkpoints.length < 2 || state.gameOver || state.turn !== 1 || state.aiThinking;

  const stats = loadStats();
  winsCountEl.textContent = stats.wins || 0;

  if (state.gameOver) {
    turnIconEl.style.color = "var(--text-soft)";
  } else if (state.aiThinking) {
    turnStatusEl.textContent = "Vez do computador";
    turnHintEl.textContent = "Pensando...";
    turnIconEl.style.color = "var(--p2, #b23b3b)";
  } else if (state.turn === 1) {
    turnIconEl.style.color = "var(--p1, #4f6fe0)";
    if (state.activeCapturePiece) {
      turnStatusEl.textContent = "Sua vez";
      turnHintEl.textContent = "Continue capturando com a mesma peça";
    } else if (state.legalTurns && state.legalTurns.type === "capture") {
      turnStatusEl.textContent = "Sua vez";
      turnHintEl.textContent = "Captura obrigatória — escolha uma peça destacada";
    } else {
      turnStatusEl.textContent = "Sua vez";
      turnHintEl.textContent = "Escolha uma peça para mover";
    }
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderAll() { renderBoard(); renderSidebar(); }

/* ============================================================
   FLUXO DE JOGO
   ============================================================ */

function startNewGame(difficulty) {
  state.difficulty = difficulty || state.difficulty;
  state.board = initialBoard();
  state.turn = 1;
  state.selected = null;
  state.activeCapturePiece = null;
  state.activeCaptureSequences = null;
  state.hintsLeft = 3;
  state.hintCells = null;
  state.aiThinking = false;
  state.gameOver = false;
  state.seconds = 0;
  state.checkpoints = [];

  difficultyButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.difficulty === state.difficulty));

  hideOverlay();
  stopTimer();
  startTimer();
  beginHumanTurn(true);
}

function beginHumanTurn(isCheckpoint) {
  state.turn = 1;
  state.selected = null;
  state.activeCapturePiece = null;
  state.activeCaptureSequences = null;
  state.legalTurns = getLegalTurns(state.board, 1);

  if (isCheckpoint !== false) state.checkpoints.push(cloneBoard(state.board));

  if (state.legalTurns.options.length === 0) {
    endGame(false, "Você não tem mais movimentos possíveis.");
    return;
  }
  renderAll();
}

function onSquareClick(r, c) {
  if (state.gameOver || state.aiThinking || state.turn !== 1) return;
  state.hintCells = null;

  const piece = state.board[r][c];

  // Clique numa casa de destino válida?
  const stepOptions = getCurrentStepOptions();
  const isStepTarget = stepOptions.some((o) => o.r === r && o.c === c);

  if (isStepTarget && state.selected) {
    performStep(r, c);
    return;
  }

  // Não é mid-chain: pode trocar a seleção
  if (state.activeCapturePiece) return; // no meio de uma captura, não pode trocar de peça

  if (piece && piece.player === 1) {
    const eligible = state.legalTurns.options.some((opt) => opt.startR === r && opt.startC === c);
    if (!eligible) { renderAll(); return; } // peça sem jogada válida (captura obrigatória em outra peça)
    state.selected = { r, c };
    if (state.legalTurns.type === "capture") {
      state.activeCaptureSequences = state.legalTurns.options.filter((s) => s.startR === r && s.startC === c);
    }
    renderAll();
    return;
  }

  // clique vazio: desseleciona
  state.selected = null;
  state.activeCaptureSequences = null;
  renderAll();
}

function performStep(r, c) {
  if (state.legalTurns.type === "move") {
    const move = state.legalTurns.options.find(
      (m) => m.startR === state.selected.r && m.startC === state.selected.c && m.landR === r && m.landC === c
    );
    state.board = applyMove(state.board, move);
    finishHumanTurn();
    return;
  }

  // captura: aplica só o primeiro passo restante de cada sequência que bate com o clique, depois estreita
  const matching = state.activeCaptureSequences.filter((seq) => seq.path.length > 0 && seq.path[0].r === r && seq.path[0].c === c);
  const step = matching[0];
  const cap = step.captured[0];

  const nb = cloneBoard(state.board);
  const mover = nb[state.selected.r][state.selected.c];
  nb[state.selected.r][state.selected.c] = null;
  nb[cap.r][cap.c] = null;
  if (!mover.king && isPromotionRow(mover.player, r)) mover.king = true;
  nb[r][c] = mover;
  state.board = nb;

  // estreita as sequências: mantém só as que concordam com o passo escolhido, removendo o passo já dado
  state.activeCaptureSequences = matching.map((seq) => ({
    ...seq,
    path: seq.path.slice(1),
    captured: seq.captured.slice(1),
  }));
  state.activeCapturePiece = { r, c };
  state.selected = { r, c };

  const stillGoing = state.activeCaptureSequences.some((seq) => seq.path.length > 0);
  if (stillGoing) {
    renderAll();
  } else {
    finishHumanTurn();
  }
}

function finishHumanTurn() {
  state.selected = null;
  state.activeCapturePiece = null;
  state.activeCaptureSequences = null;

  const p2Turns = getLegalTurns(state.board, 2);
  if (p2Turns.options.length === 0) {
    endGame(true, "O computador ficou sem movimentos possíveis.");
    return;
  }

  state.turn = 2;
  state.legalTurns = p2Turns;
  renderAll();
  triggerAITurn();
}

function triggerAITurn() {
  state.aiThinking = true;
  renderAll();
  setTimeout(() => {
    const depth = DIFFICULTY_DEPTH[state.difficulty] ?? 4;
    const result = chooseAIMove(state.board, 2, depth);
    if (result) state.board = result.board;
    state.aiThinking = false;
    beginHumanTurn();
  }, 450);
}

function undo() {
  if (state.checkpoints.length < 2 || state.gameOver || state.turn !== 1 || state.aiThinking) return;
  state.checkpoints.pop();
  const prev = state.checkpoints[state.checkpoints.length - 1];
  state.board = cloneBoard(prev);
  state.hintCells = null;
  beginHumanTurn(false);
}

function useHint() {
  if (state.gameOver || state.aiThinking || state.turn !== 1 || state.hintsLeft <= 0) return;
  const depth = Math.max(3, DIFFICULTY_DEPTH[state.difficulty] ?? 4);
  const result = chooseAIMove(state.board, 1, depth);
  if (!result) return;
  const move = result.move;
  const cells = [{ r: move.startR, c: move.startC }];
  if (move.path) move.path.forEach((p) => cells.push({ r: p.r, c: p.c }));
  else cells.push({ r: move.landR, c: move.landC });
  state.hintCells = cells;
  state.hintsLeft--;
  renderAll();
  setTimeout(() => {
    state.hintCells = null;
    renderAll();
  }, 3500);
}

/* ============================================================
   CRONÔMETRO
   ============================================================ */

function startTimer() {
  state.timerId = setInterval(() => {
    if (!state.gameOver) {
      state.seconds++;
      timerEl.textContent = formatTime(state.seconds);
    }
  }, 1000);
}
function stopTimer() { if (state.timerId) clearInterval(state.timerId); state.timerId = null; }

/* ============================================================
   FIM DE JOGO
   ============================================================ */

function endGame(humanWon, reason) {
  state.gameOver = true;
  stopTimer();
  state.selected = null;
  renderAll();

  if (humanWon) {
    const stats = loadStats();
    stats.wins = (stats.wins || 0) + 1;
    saveStats(stats);
    renderSidebar();
    showOverlay("🏆 Você venceu!", reason || "O computador não tem mais peças.", [
      { label: "Jogar novamente", action: () => startNewGame(state.difficulty) },
    ]);
  } else {
    showOverlay("Fim de jogo", reason || "O computador venceu esta partida.", [
      { label: "Tentar de novo", action: () => startNewGame(state.difficulty) },
    ]);
  }
}

function showOverlay(title, text, actions) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayActions.innerHTML = "";
  actions.forEach(({ label, action }) => {
    const btn = document.createElement("button");
    btn.className = "overlay-btn";
    btn.textContent = label;
    btn.addEventListener("click", action);
    overlayActions.appendChild(btn);
  });
  overlay.classList.add("visible");
}
function hideOverlay() { overlay.classList.remove("visible"); }

/* ============================================================
   EVENTOS
   ============================================================ */

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => startNewGame(btn.dataset.difficulty));
});
newGameBtn.addEventListener("click", () => startNewGame(state.difficulty));
undoBtn.addEventListener("click", undo);
hintBtn.addEventListener("click", useHint);

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

buildBoardDOM();
startNewGame(state.difficulty);

const footerYearEl = document.getElementById("footer-year");
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
