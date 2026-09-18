/* ============================================================
   SUDOKU — motor do jogo (gerador, solver) + interface
   ============================================================ */

const SIZE = 9;
const BOX = 3;

/* ---------- Utilidades de grade ---------- */

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isSafe(grid, row, col, num) {
  for (let x = 0; x < SIZE; x++) {
    if (grid[row][x] === num || grid[x][col] === num) return false;
  }
  const startRow = row - (row % BOX);
  const startCol = col - (col % BOX);
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) {
      if (grid[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
}

/* Encontra a célula vazia com menos candidatos possíveis (heurística MRV),
   o que acelera MUITO o backtracking. */
function findEmptyMRV(grid) {
  let best = null;
  let bestCandidates = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) {
        const cands = [];
        for (let n = 1; n <= 9; n++) {
          if (isSafe(grid, r, c, n)) cands.push(n);
        }
        if (cands.length === 0) return { row: r, col: c, candidates: [] };
        if (!best || cands.length < bestCandidates.length) {
          best = { row: r, col: c };
          bestCandidates = cands;
          if (cands.length === 1) return { row: r, col: c, candidates: cands };
        }
      }
    }
  }
  if (!best) return null; // tabuleiro completo
  return { row: best.row, col: best.col, candidates: bestCandidates };
}

function fillGridRandom(grid) {
  const cell = findEmptyMRV(grid);
  if (cell === null) return true;
  if (cell.candidates.length === 0) return false;
  const nums = shuffle(cell.candidates.slice());
  for (const num of nums) {
    grid[cell.row][cell.col] = num;
    if (fillGridRandom(grid)) return true;
    grid[cell.row][cell.col] = 0;
  }
  return false;
}

function generateFullGrid() {
  const grid = emptyGrid();
  fillGridRandom(grid);
  return grid;
}

/* Conta soluções até um limite (paramos em 2: só precisamos saber
   se a solução é única, não quantas existem). */
function hasUniqueSolution(grid) {
  let solutions = 0;
  function solve(g) {
    if (solutions >= 2) return;
    const cell = findEmptyMRV(g);
    if (cell === null) {
      solutions++;
      return;
    }
    if (cell.candidates.length === 0) return;
    for (const num of cell.candidates) {
      if (solutions >= 2) return;
      g[cell.row][cell.col] = num;
      solve(g);
      g[cell.row][cell.col] = 0;
    }
  }
  solve(grid);
  return solutions === 1;
}

const DIFFICULTY_CLUES = {
  facil: 46,
  media: 40,
  dificil: 34,
  especialista: 30,
  mestra: 26,
  extrema: 23,
};

const DIFFICULTY_LABELS = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
  especialista: "Especialista",
  mestra: "Mestra",
  extrema: "Extrema",
};

const DIFFICULTY_HINTS = {
  facil: 5,
  media: 4,
  dificil: 3,
  especialista: 3,
  mestra: 2,
  extrema: 2,
};

function generatePuzzle(difficulty) {
  const solution = generateFullGrid();
  const puzzle = cloneGrid(solution);
  const targetClues = DIFFICULTY_CLUES[difficulty] ?? 30;

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  let clues = 81;
  for (const [r, c] of positions) {
    if (clues <= targetClues) break;
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;
    if (hasUniqueSolution(cloneGrid(puzzle))) {
      clues--;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return { puzzle, solution, clues };
}

/* ============================================================
   ESTADO DO JOGO
   ============================================================ */

const state = {
  difficulty: "especialista",
  solution: null,
  given: null, // matriz booleana: true = número fixo do enunciado
  values: null, // matriz atual de valores (0 = vazio)
  notes: null, // matriz de Set() com anotações
  hinted: null, // matriz booleana: true = valor revelado por dica
  selected: null, // { row, col }
  errors: 0,
  maxErrors: 3,
  hintsLeft: 3,
  notesMode: false,
  seconds: 0,
  timerId: null,
  paused: false,
  gameOver: false,
  won: false,
  history: [],
  completedUnits: null, // { rows: [bool*9], cols: [bool*9], boxes: [bool*9] }
};

const STORAGE_KEY = "sudoku_stats_v1";

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { resolved: 0, bestTimes: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { resolved: 0, bestTimes: {} };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    /* localStorage indisponível — ignora silenciosamente */
  }
}

/* ============================================================
   ELEMENTOS DOM
   ============================================================ */

const boardEl = document.getElementById("board");
const difficultyButtons = document.querySelectorAll(".diff-btn");
const errorsEl = document.getElementById("errors-count");
const timerEl = document.getElementById("timer");
const pauseBtn = document.getElementById("pause-btn");
const hintsCountEl = document.getElementById("hints-count");
const hintBtn = document.getElementById("hint-btn");
const notesBtn = document.getElementById("notes-btn");
const undoBtn = document.getElementById("undo-btn");
const eraseBtn = document.getElementById("erase-btn");
const newGameBtn = document.getElementById("new-game-btn");
const resolvedCountEl = document.getElementById("resolved-count");
const numberPad = document.getElementById("number-pad");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayActions = document.getElementById("overlay-actions");
const pauseOverlay = document.getElementById("pause-overlay");

/* ============================================================
   CONSTRUÇÃO DO TABULEIRO
   ============================================================ */

function buildBoardDOM() {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (c === 2 || c === 5) cell.classList.add("border-right");
      if (r === 2 || r === 5) cell.classList.add("border-bottom");

      const valueEl = document.createElement("span");
      valueEl.className = "cell-value";
      cell.appendChild(valueEl);

      const notesEl = document.createElement("div");
      notesEl.className = "cell-notes";
      for (let n = 1; n <= 9; n++) {
        const noteDigit = document.createElement("span");
        noteDigit.textContent = n;
        notesEl.appendChild(noteDigit);
      }
      cell.appendChild(notesEl);

      cell.addEventListener("click", () => selectCell(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function getCellEl(r, c) {
  return boardEl.children[r * SIZE + c];
}

/* ============================================================
   NOVO JOGO
   ============================================================ */

function startNewGame(difficulty) {
  state.difficulty = difficulty;
  newGameBtn.disabled = true;
  newGameBtn.textContent = "Gerando...";

  // Pequeno atraso para o navegador repintar o botão antes do trabalho pesado
  setTimeout(() => {
    const { puzzle, solution } = generatePuzzle(difficulty);

    state.solution = solution;
    state.given = puzzle.map((row) => row.map((v) => v !== 0));
    state.values = cloneGrid(puzzle);
    state.notes = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => new Set())
    );
    state.hinted = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    state.selected = null;
    state.errors = 0;
    state.hintsLeft = DIFFICULTY_HINTS[difficulty] ?? 3;
    state.notesMode = false;
    state.seconds = 0;
    state.paused = false;
    state.gameOver = false;
    state.won = false;
    state.history = [];
    state.completedUnits = {
      rows: Array(SIZE).fill(false),
      cols: Array(SIZE).fill(false),
      boxes: Array(SIZE).fill(false),
    };
    recomputeCompletedUnits();

    notesBtn.classList.remove("active");
    hideOverlay();
    hidePauseOverlay();
    stopTimer();
    startTimer();
    renderAll();

    newGameBtn.disabled = false;
    newGameBtn.textContent = "Novo jogo";
  }, 20);
}

/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */

function renderAll() {
  renderDifficultyTabs();
  renderBoard();
  renderSidebar();
  renderNumberPad();
}

function renderDifficultyTabs() {
  difficultyButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === state.difficulty);
  });
}

function renderBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cellEl = getCellEl(r, c);
      const value = state.values[r][c];
      const isGiven = state.given[r][c];
      const valueEl = cellEl.querySelector(".cell-value");
      const notesEl = cellEl.querySelector(".cell-notes");

      cellEl.classList.toggle("given", isGiven);
      cellEl.classList.toggle("hinted", !!state.hinted[r][c] && value !== 0);
      cellEl.classList.remove("wrong");

      if (value !== 0) {
        valueEl.textContent = value;
        notesEl.style.display = "none";
        valueEl.style.display = "flex";
      } else {
        valueEl.textContent = "";
        valueEl.style.display = "none";
        const notes = state.notes[r][c];
        if (notes.size > 0) {
          notesEl.style.display = "grid";
          Array.from(notesEl.children).forEach((span, i) => {
            span.textContent = notes.has(i + 1) ? i + 1 : "";
          });
        } else {
          notesEl.style.display = "none";
        }
      }
    }
  }
  applyHighlights();
}

function applyHighlights() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      getCellEl(r, c).classList.remove("selected", "related", "same-value");
    }
  }
  if (!state.selected) return;
  const { row, col } = state.selected;
  const selVal = state.values[row][col];
  const startRow = row - (row % BOX);
  const startCol = col - (col % BOX);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const inRow = r === row;
      const inCol = c === col;
      const inBox = r >= startRow && r < startRow + BOX && c >= startCol && c < startCol + BOX;
      if (inRow || inCol || inBox) {
        getCellEl(r, c).classList.add("related");
      }
      if (selVal !== 0 && state.values[r][c] === selVal) {
        getCellEl(r, c).classList.add("same-value");
      }
    }
  }
  getCellEl(row, col).classList.add("selected");
}

function renderSidebar() {
  errorsEl.textContent = `${state.errors}/${state.maxErrors}`;
  errorsEl.classList.toggle("danger", state.errors >= state.maxErrors - 1);
  hintsCountEl.textContent = state.hintsLeft;
  hintBtn.disabled = state.hintsLeft <= 0;
  timerEl.textContent = formatTime(state.seconds);
  const stats = loadStats();
  resolvedCountEl.textContent = stats.resolved.toLocaleString("pt-BR");
}

function renderNumberPad() {
  const counts = Array(10).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = state.values[r][c];
      if (v !== 0) counts[v]++;
    }
  }
  Array.from(numberPad.children).forEach((btn) => {
    const n = Number(btn.dataset.number);
    btn.classList.toggle("depleted", counts[n] >= 9);
  });
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ============================================================
   INTERAÇÃO
   ============================================================ */

function selectCell(r, c) {
  if (state.gameOver || state.won || state.paused) return;
  state.selected = { row: r, col: c };
  applyHighlights();
}

function pushHistory() {
  state.history.push({
    values: cloneGrid(state.values),
    notes: state.notes.map((row) => row.map((set) => new Set(set))),
    hinted: state.hinted.map((row) => row.slice()),
    errors: state.errors,
  });
  if (state.history.length > 200) state.history.shift();
}

function undo() {
  if (state.gameOver || state.won || state.paused) return;
  const prev = state.history.pop();
  if (!prev) return;
  state.values = prev.values;
  state.notes = prev.notes;
  state.hinted = prev.hinted;
  state.errors = prev.errors;
  recomputeCompletedUnits();
  renderBoard();
  renderSidebar();
  renderNumberPad();
}

function eraseSelected() {
  if (state.gameOver || state.won || state.paused || !state.selected) return;
  const { row, col } = state.selected;
  if (state.given[row][col]) return;
  pushHistory();
  state.values[row][col] = 0;
  state.notes[row][col].clear();
  state.hinted[row][col] = false;
  recomputeCompletedUnits();
  renderBoard();
  renderNumberPad();
}

function toggleNotesMode() {
  state.notesMode = !state.notesMode;
  notesBtn.classList.toggle("active", state.notesMode);
}

function inputNumber(n) {
  if (state.gameOver || state.won || state.paused || !state.selected) return;
  const { row, col } = state.selected;
  if (state.given[row][col]) return;

  if (state.notesMode) {
    pushHistory();
    const notes = state.notes[row][col];
    if (notes.has(n)) notes.delete(n);
    else notes.add(n);
    renderBoard();
    return;
  }

  pushHistory();
  const correct = state.solution[row][col] === n;

  if (correct) {
    state.values[row][col] = n;
    state.notes[row][col].clear();
    clearPeerNotes(row, col, n);
    renderBoard();
    renderNumberPad();
    checkAndFlashCompletions(row, col);
    checkWin();
  } else {
    state.errors++;
    const cellEl = getCellEl(row, col);
    cellEl.classList.add("wrong");
    cellEl.querySelector(".cell-value").style.display = "flex";
    cellEl.querySelector(".cell-value").textContent = n;
    renderSidebar();
    setTimeout(() => {
      cellEl.classList.remove("wrong");
      renderBoard();
    }, 500);
    if (state.errors >= state.maxErrors) {
      setTimeout(() => endGame(false), 550);
    }
  }
}

function clearPeerNotes(row, col, n) {
  const startRow = row - (row % BOX);
  const startCol = col - (col % BOX);
  for (let i = 0; i < SIZE; i++) {
    state.notes[row][i].delete(n);
    state.notes[i][col].delete(n);
  }
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) {
      state.notes[startRow + r][startCol + c].delete(n);
    }
  }
}

/* ============================================================
   FLASH DE FILEIRA / COLUNA / GRADE 3x3 CONCLUÍDA
   ============================================================ */

function unitCellsForRow(r) {
  return Array.from({ length: SIZE }, (_, c) => [r, c]);
}
function unitCellsForCol(c) {
  return Array.from({ length: SIZE }, (_, r) => [r, c]);
}
function unitCellsForBox(boxIndex) {
  const startRow = Math.floor(boxIndex / BOX) * BOX;
  const startCol = (boxIndex % BOX) * BOX;
  const cells = [];
  for (let r = 0; r < BOX; r++) {
    for (let c = 0; c < BOX; c++) cells.push([startRow + r, startCol + c]);
  }
  return cells;
}

function isUnitComplete(cells) {
  // Só valores corretos ficam em state.values (o errado nunca é gravado ali),
  // então "sem nenhuma célula vazia" já basta pra saber que a unidade está certa.
  return cells.every(([r, c]) => state.values[r][c] !== 0);
}

/* Recalcula quais unidades já estão completas, sem disparar nenhum efeito
   visual — usado depois de desfazer, apagar ou começar um jogo novo. */
function recomputeCompletedUnits() {
  for (let i = 0; i < SIZE; i++) {
    state.completedUnits.rows[i] = isUnitComplete(unitCellsForRow(i));
    state.completedUnits.cols[i] = isUnitComplete(unitCellsForCol(i));
    state.completedUnits.boxes[i] = isUnitComplete(unitCellsForBox(i));
  }
}

/* Verifica se a jogada em (row, col) acabou de completar a fileira, a
   coluna e/ou a grade 3x3 correspondente, e dispara o flash se sim. */
function checkAndFlashCompletions(row, col) {
  const boxIndex = Math.floor(row / BOX) * BOX + Math.floor(col / BOX);
  const newlyCompleted = [];

  if (!state.completedUnits.rows[row] && isUnitComplete(unitCellsForRow(row))) {
    state.completedUnits.rows[row] = true;
    newlyCompleted.push(unitCellsForRow(row));
  }
  if (!state.completedUnits.cols[col] && isUnitComplete(unitCellsForCol(col))) {
    state.completedUnits.cols[col] = true;
    newlyCompleted.push(unitCellsForCol(col));
  }
  if (!state.completedUnits.boxes[boxIndex] && isUnitComplete(unitCellsForBox(boxIndex))) {
    state.completedUnits.boxes[boxIndex] = true;
    newlyCompleted.push(unitCellsForBox(boxIndex));
  }

  if (newlyCompleted.length > 0) {
    const cellSet = new Set();
    newlyCompleted.forEach((cells) => cells.forEach(([r, c]) => cellSet.add(`${r},${c}`)));
    flashCells(Array.from(cellSet, (key) => key.split(",").map(Number)));
  }
}

function flashCells(cells) {
  cells.forEach(([r, c]) => getCellEl(r, c).classList.add("unit-complete"));
  setTimeout(() => {
    cells.forEach(([r, c]) => getCellEl(r, c).classList.remove("unit-complete"));
  }, 650);
}

function useHint() {
  if (state.gameOver || state.won || state.paused || state.hintsLeft <= 0) return;
  let target = state.selected;
  if (!target || state.values[target.row][target.col] !== 0) {
    // procura uma célula vazia qualquer
    outer: for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (state.values[r][c] === 0) {
          target = { row: r, col: c };
          break outer;
        }
      }
    }
  }
  if (!target || state.values[target.row][target.col] !== 0) return;

  pushHistory();
  const { row, col } = target;
  state.values[row][col] = state.solution[row][col];
  state.notes[row][col].clear();
  clearPeerNotes(row, col, state.solution[row][col]);
  state.hintsLeft--;
  state.selected = target;
  state.hinted[row][col] = true;

  renderBoard();
  renderSidebar();
  renderNumberPad();
  checkAndFlashCompletions(row, col);
  checkWin();
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.values[r][c] !== state.solution[r][c]) return;
    }
  }
  endGame(true);
}

/* ============================================================
   CRONÔMETRO
   ============================================================ */

function startTimer() {
  state.timerId = setInterval(() => {
    if (!state.paused && !state.gameOver && !state.won) {
      state.seconds++;
      timerEl.textContent = formatTime(state.seconds);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function togglePause() {
  if (state.gameOver || state.won) return;
  state.paused = !state.paused;
  if (state.paused) {
    showPauseOverlay();
    pauseBtn.textContent = "▶";
  } else {
    hidePauseOverlay();
    pauseBtn.textContent = "⏸";
  }
}

function showPauseOverlay() {
  pauseOverlay.classList.add("visible");
}
function hidePauseOverlay() {
  pauseOverlay.classList.remove("visible");
}

/* ============================================================
   FIM DE JOGO
   ============================================================ */

function endGame(won) {
  stopTimer();
  state.won = won;
  state.gameOver = !won;

  if (won) {
    const stats = loadStats();
    stats.resolved = (stats.resolved || 0) + 1;
    const key = state.difficulty;
    if (!stats.bestTimes) stats.bestTimes = {};
    if (!stats.bestTimes[key] || state.seconds < stats.bestTimes[key]) {
      stats.bestTimes[key] = state.seconds;
    }
    saveStats(stats);
    renderSidebar();

    showOverlay(
      "🎉 Resolvido!",
      `Você completou o Sudoku ${DIFFICULTY_LABELS[state.difficulty]} em ${formatTime(
        state.seconds
      )} com ${state.errors} erro(s).`,
      [
        { label: "Jogar novamente", action: () => startNewGame(state.difficulty) },
      ]
    );
  } else {
    showOverlay(
      "😕 Fim de jogo",
      `Você atingiu o limite de ${state.maxErrors} erros.`,
      [
        { label: "Tentar de novo", action: () => startNewGame(state.difficulty) },
      ]
    );
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

function hideOverlay() {
  overlay.classList.remove("visible");
}

/* ============================================================
   EVENTOS
   ============================================================ */

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => startNewGame(btn.dataset.difficulty));
});

newGameBtn.addEventListener("click", () => startNewGame(state.difficulty));
undoBtn.addEventListener("click", undo);
eraseBtn.addEventListener("click", eraseSelected);
notesBtn.addEventListener("click", toggleNotesMode);
hintBtn.addEventListener("click", useHint);
pauseBtn.addEventListener("click", togglePause);
pauseOverlay.addEventListener("click", togglePause);

document.querySelectorAll(".num-btn").forEach((btn) => {
  btn.addEventListener("click", () => inputNumber(Number(btn.dataset.number)));
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") {
    inputNumber(Number(e.key));
  } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    eraseSelected();
  } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
    moveSelection(e.key);
    e.preventDefault();
  } else if ((e.key === "a" || e.key === "A") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    toggleNotesMode();
  }
});

function moveSelection(key) {
  if (!state.selected) {
    state.selected = { row: 0, col: 0 };
    applyHighlights();
    return;
  }
  let { row, col } = state.selected;
  if (key === "ArrowUp") row = Math.max(0, row - 1);
  if (key === "ArrowDown") row = Math.min(SIZE - 1, row + 1);
  if (key === "ArrowLeft") col = Math.max(0, col - 1);
  if (key === "ArrowRight") col = Math.min(SIZE - 1, col + 1);
  selectCell(row, col);
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

buildBoardDOM();
startNewGame(state.difficulty);

const footerYearEl = document.getElementById("footer-year");
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
