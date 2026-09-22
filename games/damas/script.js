/* ============================================================
   DAMAS — motor do jogo (5 variantes de regras) + IA + interface
   ============================================================ */

const SIZE = 8;

function isDark(r, c) { return (r + c) % 2 === 1; }
function emptyBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); }
function cloneBoard(b) { return b.map((row) => row.map((cell) => (cell ? { ...cell } : null))); }
function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }
function opponentOf(p) { return p === 1 ? 2 : 1; }
function isPromotionRow(player, row) { return player === 1 ? row === 0 : row === SIZE - 1; }

/* ---------------- Direções de movimento/captura ---------------- */

const DIR = {
  diagFwdP1: [[-1, -1], [-1, 1]],
  diagFwdP2: [[1, -1], [1, 1]],
  diagAll: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  orthoFwdSideP1: [[-1, 0], [0, -1], [0, 1]],
  orthoFwdSideP2: [[1, 0], [0, -1], [0, 1]],
  orthoAll: [[-1, 0], [1, 0], [0, -1], [0, 1]],
};

function moveDirsFor(rules, player) { return player === 1 ? rules.moveDirsP1 : rules.moveDirsP2; }
function captureDirsFor(rules, player) { return player === 1 ? rules.captureDirsP1 : rules.captureDirsP2; }

/* ---------------- Variantes de regras ----------------
   Cada variante descreve, de forma declarativa: quantas casas usa,
   pra onde peão anda/captura, se a dama voa ou anda casa a casa,
   se a captura precisa ser sempre a de maior número de peças, se
   peão pode capturar dama, o critério de desempate quando há mais
   de uma captura máxima, e o que acontece quando um peão pisa na
   última linha no meio de uma sequência de capturas. */

const VARIANTS = {
  brasileira: {
    id: "brasileira",
    name: "Brasileira",
    fullName: "Damas Brasileira",
    blurb: "Peão captura em qualquer diagonal (pra frente ou pra trás) e a dama voa quantas casas quiser. Captura obrigatória, sempre a de maior número de peças. Um peão só vira dama se o lance parar na última linha — se ele só passar por ali no meio de uma captura, continua peão.",
    allSquares: false,
    startRowsP1: [5, 6, 7],
    startRowsP2: [0, 1, 2],
    moveDirsP1: DIR.diagFwdP1,
    moveDirsP2: DIR.diagFwdP2,
    captureDirsP1: DIR.diagAll,
    captureDirsP2: DIR.diagAll,
    kingDirs: DIR.diagAll,
    kingFlying: true,
    maxCaptureRequired: true,
    manCanCaptureKing: true,
    captureTieBreak: "count",
    promotionMode: "brazilian",
  },
  inglesa: {
    id: "inglesa",
    name: "Inglesa",
    fullName: "Damas Inglesa / Americana",
    blurb: "Peão só captura pra frente. A dama não voa — anda uma casa por vez, pra qualquer lado da diagonal. A captura é obrigatória, mas você escolhe livremente qual sequência fazer, mesmo que não seja a maior.",
    allSquares: false,
    startRowsP1: [5, 6, 7],
    startRowsP2: [0, 1, 2],
    moveDirsP1: DIR.diagFwdP1,
    moveDirsP2: DIR.diagFwdP2,
    captureDirsP1: DIR.diagFwdP1,
    captureDirsP2: DIR.diagFwdP2,
    kingDirs: DIR.diagAll,
    kingFlying: false,
    maxCaptureRequired: false,
    manCanCaptureKing: true,
    captureTieBreak: "count",
    promotionMode: "always-stop",
  },
  russa: {
    id: "russa",
    name: "Russa",
    fullName: "Damas Russa",
    blurb: "Peão captura em qualquer diagonal. Se ele chegar na última linha no meio de uma sequência de capturas, vira dama na hora e continua a mesma jogada já voando. Você escolhe livremente a sequência, não precisa ser a maior.",
    allSquares: false,
    startRowsP1: [5, 6, 7],
    startRowsP2: [0, 1, 2],
    moveDirsP1: DIR.diagFwdP1,
    moveDirsP2: DIR.diagFwdP2,
    captureDirsP1: DIR.diagAll,
    captureDirsP2: DIR.diagAll,
    kingDirs: DIR.diagAll,
    kingFlying: true,
    maxCaptureRequired: false,
    manCanCaptureKing: true,
    captureTieBreak: "count",
    promotionMode: "russian",
  },
  italiana: {
    id: "italiana",
    name: "Italiana",
    fullName: "Damas Italiana",
    blurb: "Peão só captura pra frente e nunca pode capturar uma dama — só outra dama pode. Captura obrigatória com o maior número de peças; empatando, tem que priorizar a sequência que captura (ou usa) uma dama.",
    allSquares: false,
    startRowsP1: [5, 6, 7],
    startRowsP2: [0, 1, 2],
    moveDirsP1: DIR.diagFwdP1,
    moveDirsP2: DIR.diagFwdP2,
    captureDirsP1: DIR.diagFwdP1,
    captureDirsP2: DIR.diagFwdP2,
    kingDirs: DIR.diagAll,
    kingFlying: false,
    maxCaptureRequired: true,
    manCanCaptureKing: false,
    captureTieBreak: "italian",
    promotionMode: "always-stop",
  },
  turca: {
    id: "turca",
    name: "Turca",
    fullName: "Damas Turca",
    blurb: "Nada de diagonal aqui: as peças andam em linha reta, pra frente ou pros lados, e capturam do mesmo jeito. A dama anda como uma torre do xadrez, em qualquer direção. 16 peças por jogador, captura obrigatória com a maior sequência.",
    allSquares: true,
    startRowsP1: [5, 6],
    startRowsP2: [1, 2],
    moveDirsP1: DIR.orthoFwdSideP1,
    moveDirsP2: DIR.orthoFwdSideP2,
    captureDirsP1: DIR.orthoFwdSideP1,
    captureDirsP2: DIR.orthoFwdSideP2,
    kingDirs: DIR.orthoAll,
    kingFlying: true,
    maxCaptureRequired: true,
    manCanCaptureKing: true,
    captureTieBreak: "count",
    promotionMode: "always-stop",
  },
};
const VARIANT_ORDER = ["brasileira", "inglesa", "russa", "italiana", "turca"];

/* ---------------- Tabuleiro inicial ---------------- */

function initialBoard(rules) {
  const b = emptyBoard();
  const place = (rows, player) => {
    for (const r of rows) {
      for (let c = 0; c < SIZE; c++) {
        if (rules.allSquares || isDark(r, c)) b[r][c] = { player, king: false };
      }
    }
  };
  place(rules.startRowsP2, 2);
  place(rules.startRowsP1, 1);
  return b;
}

/* ---------------- Geração de jogadas ---------------- */

function getSingleCapturesForPiece(board, r, c, player, isKing, rules) {
  const results = [];
  if (isKing) {
    const dirs = rules.kingDirs;
    if (rules.kingFlying) {
      for (const [dr, dc] of dirs) {
        let cr = r + dr, cc = c + dc;
        while (inBounds(cr, cc) && board[cr][cc] === null) { cr += dr; cc += dc; }
        if (!inBounds(cr, cc)) continue;
        const occ = board[cr][cc];
        if (occ && occ.player !== player) {
          let lr = cr + dr, lc = cc + dc;
          while (inBounds(lr, lc) && board[lr][lc] === null) {
            results.push({ landR: lr, landC: lc, capR: cr, capC: cc });
            lr += dr; lc += dc;
          }
        }
      }
    } else {
      for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
        if (!inBounds(lr, lc)) continue;
        const mid = inBounds(mr, mc) ? board[mr][mc] : undefined;
        if (mid && mid.player !== player && board[lr][lc] === null) {
          results.push({ landR: lr, landC: lc, capR: mr, capC: mc });
        }
      }
    }
  } else {
    const dirs = captureDirsFor(rules, player);
    for (const [dr, dc] of dirs) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const mid = inBounds(mr, mc) ? board[mr][mc] : undefined;
      if (mid && mid.player !== player && board[lr][lc] === null) {
        if (!rules.manCanCaptureKing && mid.king) continue;
        results.push({ landR: lr, landC: lc, capR: mr, capC: mc });
      }
    }
  }
  return results;
}

function getSingleCaptures(board, r, c, rules) {
  const piece = board[r][c];
  if (!piece) return [];
  return getSingleCapturesForPiece(board, r, c, piece.player, piece.king, rules);
}

function getSingleMoves(board, r, c, rules) {
  const piece = board[r][c];
  const results = [];
  if (!piece) return results;
  if (piece.king) {
    const dirs = rules.kingDirs;
    if (rules.kingFlying) {
      for (const [dr, dc] of dirs) {
        let cr = r + dr, cc = c + dc;
        while (inBounds(cr, cc) && board[cr][cc] === null) {
          results.push({ landR: cr, landC: cc });
          cr += dr; cc += dc;
        }
      }
    } else {
      for (const [dr, dc] of dirs) {
        const cr = r + dr, cc = c + dc;
        if (inBounds(cr, cc) && board[cr][cc] === null) results.push({ landR: cr, landC: cc });
      }
    }
  } else {
    for (const [dr, dc] of moveDirsFor(rules, piece.player)) {
      const cr = r + dr, cc = c + dc;
      if (inBounds(cr, cc) && board[cr][cc] === null) results.push({ landR: cr, landC: cc });
    }
  }
  return results;
}

/* Resolve se, ao pousar em (landR,landC) no meio de uma captura, um
   peão vira dama e/ou a sequência para aí -- o comportamento muda por
   variante:
   - "always-stop" (Inglesa/Italiana/Turca): sempre para e vira dama,
     mesmo que ainda houvesse captura disponível dali.
   - "brazilian": só vira dama (e para) se NÃO houver mais captura
     disponível dali ainda como peão; se houver, continua capturando
     como peão -- só "passou" pela casa de coroação.
   - "russian": vira dama na hora e PODE continuar capturando no
     mesmo lance já como dama voadora, se houver mais captura. */
function resolveMidChainPromotion(nb, landR, landC, player, isKingNow, rules) {
  if (isKingNow) return { isKing: true, stop: false };
  if (!isPromotionRow(player, landR)) return { isKing: false, stop: false };
  if (rules.promotionMode === "russian") return { isKing: true, stop: false };
  if (rules.promotionMode === "always-stop") return { isKing: true, stop: true };
  const moreAsPawn = getSingleCapturesForPiece(nb, landR, landC, player, false, rules).length > 0;
  return { isKing: !moreAsPawn, stop: !moreAsPawn };
}

function findCaptureSequences(board, r, c, rules) {
  const results = [];
  const startPiece = board[r][c];

  function dfs(curBoard, curR, curC, isKingNow, capturedSoFar, pathSoFar) {
    const opts = getSingleCapturesForPiece(curBoard, curR, curC, startPiece.player, isKingNow, rules);
    if (opts.length === 0) {
      if (capturedSoFar.length > 0) {
        results.push({ path: pathSoFar.slice(), captured: capturedSoFar.slice(), length: capturedSoFar.length, endedAsKing: isKingNow });
      }
      return;
    }
    for (const opt of opts) {
      const nb = cloneBoard(curBoard);
      nb[curR][curC] = null;
      nb[opt.capR][opt.capC] = null;

      const { isKing, stop } = resolveMidChainPromotion(nb, opt.landR, opt.landC, startPiece.player, isKingNow, rules);
      nb[opt.landR][opt.landC] = { player: startPiece.player, king: isKing };

      const newPath = [...pathSoFar, { r: opt.landR, c: opt.landC }];
      const newCaptured = [...capturedSoFar, { r: opt.capR, c: opt.capC }];

      if (stop) {
        results.push({ path: newPath, captured: newCaptured, length: newCaptured.length, crownedMidChain: true, endedAsKing: true });
      } else {
        dfs(nb, opt.landR, opt.landC, isKing, newCaptured, newPath);
      }
    }
  }
  dfs(board, r, c, startPiece.king, [], []);
  return results;
}

function getAllCaptureSequencesForPlayer(board, player, rules) {
  const all = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        const seqs = findCaptureSequences(board, r, c, rules);
        for (const s of seqs) all.push({ startR: r, startC: c, ...s });
      }
    }
  }
  return all;
}

/* Critério de desempate específico da Damas Italiana: entre as
   sequências que já capturam o maior número de peças, prioriza (1) as
   que capturam mais damas adversárias e, ainda empatado, (2) as que
   capturam usando uma dama própria (em vez de um peão). */
function applyItalianTieBreak(seqs, board) {
  const kingsCaptured = (s) => s.captured.filter(({ r, c }) => board[r][c] && board[r][c].king).length;
  const maxKings = Math.max(...seqs.map(kingsCaptured));
  let pool = maxKings > 0 ? seqs.filter((s) => kingsCaptured(s) === maxKings) : seqs;

  const moverIsKing = (s) => board[s.startR][s.startC] && board[s.startR][s.startC].king;
  const anyMoverKing = pool.some(moverIsKing);
  if (anyMoverKing) pool = pool.filter(moverIsKing);
  return pool;
}

function getLegalTurns(board, player, rules) {
  const seqs = getAllCaptureSequencesForPlayer(board, player, rules);
  if (seqs.length > 0) {
    let selected = seqs;
    if (rules.maxCaptureRequired) {
      const max = Math.max(...seqs.map((s) => s.length));
      selected = seqs.filter((s) => s.length === max);
    }
    if (rules.captureTieBreak === "italian") selected = applyItalianTieBreak(selected, board);
    return { type: "capture", options: selected, maxCaptures: Math.max(...selected.map((s) => s.length)) };
  }
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r][c];
      if (p && p.player === player) {
        for (const m of getSingleMoves(board, r, c, rules)) moves.push({ startR: r, startC: c, landR: m.landR, landC: m.landC });
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
  const startPiece = nb[seq.startR][seq.startC];
  nb[seq.startR][seq.startC] = null;
  for (let i = 0; i < seq.path.length; i++) {
    const cap = seq.captured[i];
    nb[cap.r][cap.c] = null;
  }
  const last = seq.path[seq.path.length - 1];
  nb[last.r][last.c] = { player: startPiece.player, king: seq.endedAsKing || startPiece.king };
  return nb;
}

function getResultingBoards(board, player, rules) {
  const turns = getLegalTurns(board, player, rules);
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

function evaluate(board, aiPlayer, rules) {
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
        const advancement = p.player === 1 ? SIZE - 1 - r : r;
        score += sign * advancement * 2;
      }
      const centerBonus = 3 - Math.min(Math.abs(c - 3.5), 3.5);
      score += sign * centerBonus * 0.5;
    }
  }
  return score;
}

function minimax(board, player, aiPlayer, depth, alpha, beta, rules) {
  const turns = getLegalTurns(board, player, rules);
  if (turns.options.length === 0) return player === aiPlayer ? -100000 - depth : 100000 + depth;
  if (depth === 0) return evaluate(board, aiPlayer, rules);

  const results = getResultingBoards(board, player, rules);
  const maximizing = player === aiPlayer;
  if (maximizing) {
    let best = -Infinity;
    for (const { board: nb } of results) {
      const val = minimax(nb, opponentOf(player), aiPlayer, depth - 1, alpha, beta, rules);
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const { board: nb } of results) {
    const val = minimax(nb, opponentOf(player), aiPlayer, depth - 1, alpha, beta, rules);
    if (val < best) best = val;
    if (val < beta) beta = val;
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAIMove(board, aiPlayer, depth, rules) {
  const results = getResultingBoards(board, aiPlayer, rules);
  if (results.length === 0) return null;
  let bestVal = -Infinity;
  let bestMoves = [];
  for (const r of results) {
    const val = minimax(r.board, opponentOf(aiPlayer), aiPlayer, depth - 1, -Infinity, Infinity, rules);
    if (val > bestVal) { bestVal = val; bestMoves = [r]; } else if (val === bestVal) { bestMoves.push(r); }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

const DIFFICULTY_DEPTH = { facil: 2, normal: 4, dificil: 6 };
function depthFor(difficulty, variant) {
  const base = DIFFICULTY_DEPTH[difficulty] ?? 4;
  // Damas Turca tem 16 peças (em vez de 12) e dama que voa em 4 direções
  // ortogonais -- o fator de ramificação é maior, então reduz 1 nível
  // pra manter o tempo de resposta da IA parecido com o das outras variantes.
  if (variant === "turca") return Math.max(2, base - 1);
  return base;
}

/* ============================================================
   ESTADO DO JOGO
   ============================================================ */

const state = {
  variant: "brasileira",
  rules: VARIANTS.brasileira,
  board: initialBoard(VARIANTS.brasileira),
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

const STORAGE_KEY = "damas_stats_v2";

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
function saveStats(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignora */ }
}
function getVariantWins(variant) {
  const stats = loadStats();
  return (stats[variant] && stats[variant].wins) || 0;
}
function incrementVariantWins(variant) {
  const stats = loadStats();
  if (!stats[variant]) stats[variant] = { wins: 0 };
  stats[variant].wins++;
  saveStats(stats);
  return stats[variant].wins;
}

/* ============================================================
   DOM
   ============================================================ */

const boardEl = document.getElementById("board");
const variantButtons = document.querySelectorAll("#variant-tabs .diff-btn");
const variantBlurbEl = document.getElementById("variant-blurb");
const difficultyButtons = document.querySelectorAll("#difficulty-tabs .diff-btn");
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
      const playable = state.rules.allSquares || isDark(r, c);
      sq.className = "square " + (isDark(r, c) ? "dark" : "light");
      sq.dataset.row = r;
      sq.dataset.col = c;
      if (playable) sq.addEventListener("click", () => onSquareClick(r, c));
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

  winsCountEl.textContent = getVariantWins(state.variant);

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

function startNewGame(difficulty, variant) {
  state.difficulty = difficulty || state.difficulty;
  state.variant = variant || state.variant;
  state.rules = VARIANTS[state.variant];
  state.board = initialBoard(state.rules);
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

  buildBoardDOM();

  difficultyButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.difficulty === state.difficulty));
  variantButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.variant === state.variant));
  if (variantBlurbEl) variantBlurbEl.textContent = state.rules.blurb;

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
  state.legalTurns = getLegalTurns(state.board, 1, state.rules);

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
  const { isKing } = resolveMidChainPromotion(nb, r, c, mover.player, mover.king, state.rules);
  nb[r][c] = { player: mover.player, king: isKing };
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

  const p2Turns = getLegalTurns(state.board, 2, state.rules);
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
    const depth = depthFor(state.difficulty, state.variant);
    const result = chooseAIMove(state.board, 2, depth, state.rules);
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
  const depth = Math.max(3, depthFor(state.difficulty, state.variant));
  const result = chooseAIMove(state.board, 1, depth, state.rules);
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
    incrementVariantWins(state.variant);
    renderSidebar();
    showOverlay("🏆 Você venceu!", reason || "O computador não tem mais peças.", [
      { label: "Jogar novamente", action: () => startNewGame(state.difficulty, state.variant) },
    ]);
  } else {
    showOverlay("Fim de jogo", reason || "O computador venceu esta partida.", [
      { label: "Tentar de novo", action: () => startNewGame(state.difficulty, state.variant) },
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

variantButtons.forEach((btn) => {
  btn.addEventListener("click", () => startNewGame(state.difficulty, btn.dataset.variant));
});
difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => startNewGame(btn.dataset.difficulty, state.variant));
});
newGameBtn.addEventListener("click", () => startNewGame(state.difficulty, state.variant));
undoBtn.addEventListener("click", undo);
hintBtn.addEventListener("click", useHint);

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

startNewGame(state.difficulty, state.variant);

const footerYearEl = document.getElementById("footer-year");
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
