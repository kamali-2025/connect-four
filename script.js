const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modeBtn = document.getElementById("mode-btn");
const resetScoreBtn = document.getElementById("reset-score-btn");
const yellowWinsEl = document.getElementById("yellow-wins");
const pinkWinsEl = document.getElementById("pink-wins");
const pinkLabelEl = document.getElementById("pink-label");
const timerEl = document.getElementById("timer");
const timerBox = document.getElementById("timer-box");

const ROWS = 6;
const COLS = 7;
const TURN_TIME = 15;

let currentPlayer = "yellow";
let gameOver = false;
let vsAI = true;
let aiThinking = false;
let yellowScore = 0;
let pinkScore = 0;
let timeLeft = TURN_TIME;
let timerInterval = null;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// --- 8-Bit Retro Sound Generator ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration, type = "square", delay = 0) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function playDropSound() {
  playTone(320, 0.08, "square", 0);
  playTone(180, 0.1, "square", 0.06);
}

function playWinSound() {
  const notes = new Array(523, 659, 784, 1046);
  notes.forEach((note, i) => playTone(note, 0.14, "square", i * 0.1));
}

function playTimeoutSound() {
  playTone(200, 0.15, "sawtooth", 0);
  playTone(140, 0.2, "sawtooth", 0.12);
}

// --- Turn Timer ---
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = TURN_TIME;
  timerEl.textContent = timeLeft;
  timerBox.classList.remove("urgent");

  if (gameOver || (vsAI && currentPlayer === "pink")) return;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 3 && timeLeft > 0) {
      timerBox.classList.add("urgent");
      playTone(600, 0.05, "square", 0);
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      playTimeoutSound();
      switchTurn(true);
    }
  }, 1000);
}

function switchTurn(timedOut = false) {
  currentPlayer = currentPlayer === "yellow" ? "pink" : "yellow";
  const prefix = timedOut ? "Time's up! " : "";

  if (vsAI && currentPlayer === "pink") {
    clearInterval(timerInterval);
    timerBox.classList.remove("urgent");
    statusElement.textContent = `${prefix}Computer is thinking...`;
    aiThinking = true;
    setTimeout(() => {
      aiThinking = false;
      handleMove(chooseAIMove());
    }, 450);
  } else {
    statusElement.textContent = `${prefix}${currentPlayer === "yellow" ? "Yellow" : "Pink"}'s Turn`;
    startTimer();
  }
}

// --- Board & Gameplay ---
function createBoard() {
  boardElement.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const slot = document.createElement("div");
      slot.classList.add("slot");
      slot.dataset.row = r;
      slot.dataset.col = c;
      slot.addEventListener("click", () => {
        if (!aiThinking) handleMove(c);
      });
      boardElement.appendChild(slot);
    }
  }
}

function getAvailableRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) return r;
  }
  return -1;
}

function handleMove(col) {
  if (gameOver) return;
  const r = getAvailableRow(col);
  if (r === -1) return;

  clearInterval(timerInterval);
  board[r][col] = currentPlayer;
  const slot = document.querySelector(`.slot[data-row='${r}'][data-col='${col}']`);
  slot.classList.add(currentPlayer);
  playDropSound();

  const winningCells = checkWin(r, col, currentPlayer);
  if (winningCells) {
    gameOver = true;
    timerBox.classList.remove("urgent");
    highlightWinner(winningCells);
    playWinSound();

    if (currentPlayer === "yellow") {
      yellowScore++;
      yellowWinsEl.textContent = yellowScore;
    } else {
      pinkScore++;
      pinkWinsEl.textContent = pinkScore;
    }

    const winnerName = currentPlayer === "yellow" ? "Yellow" : (vsAI ? "Computer" : "Pink");
    statusElement.textContent = `${winnerName} Wins!`;
    resetBtn.style.display = "inline-block";
    return;
  }

  if (board.flat().every(cell => cell !== null)) {
    gameOver = true;
    timerBox.classList.remove("urgent");
    statusElement.textContent = "It's a Draw!";
    resetBtn.style.display = "inline-block";
    return;
  }

  switchTurn(false);
}

function chooseAIMove() {
  const validCols = [];
  for (let c = 0; c < COLS; c++) {
    if (getAvailableRow(c) !== -1) validCols.push(c);
  }

  for (const c of validCols) {
    const r = getAvailableRow(c);
    board[r][c] = "pink";
    const win = checkWin(r, c, "pink");
    board[r][c] = null;
    if (win) return c;
  }

  for (const c of validCols) {
    const r = getAvailableRow(c);
    board[r][c] = "yellow";
    const block = checkWin(r, c, "yellow");
    board[r][c] = null;
    if (block) return c;
  }

  if (validCols.includes(3) && Math.random() < 0.6) return 3;
  return validCols[Math.floor(Math.random() * validCols.length)];
}

function checkWin(row, col, player) {
  const directions = new Array(
    new Array(new Array(0, 1), new Array(0, -1)),
    new Array(new Array(1, 0), new Array(-1, 0)),
    new Array(new Array(1, 1), new Array(-1, -1)),
    new Array(new Array(1, -1), new Array(-1, 1))
  );

  for (const [dir1, dir2] of directions) {
    const cells = new Array(new Array(row, col));
    for (const [dr, dc] of new Array(dir1, dir2)) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push(new Array(r, c));
        r += dr;
        c += dc;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function highlightWinner(cells) {
  for (const [r, c] of cells) {
    const slot = document.querySelector(`.slot[data-row='${r}'][data-col='${c}']`);
    slot.classList.add("winner");
  }
}

function resetGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  currentPlayer = "yellow";
  gameOver = false;
  aiThinking = false;
  statusElement.textContent = "Yellow's Turn";
  resetBtn.style.display = "none";
  createBoard();
  startTimer();
}

modeBtn.addEventListener("click", () => {
  vsAI = !vsAI;
  modeBtn.textContent = vsAI ? "Mode: 1 Player (vs AI)" : "Mode: 2 Players";
  pinkLabelEl.textContent = vsAI ? "AI" : "PINK";
  yellowScore = 0;
  pinkScore = 0;
  yellowWinsEl.textContent = 0;
  pinkWinsEl.textContent = 0;
  resetGame();
});

resetScoreBtn.addEventListener("click", () => {
  yellowScore = 0;
  pinkScore = 0;
  yellowWinsEl.textContent = 0;
  pinkWinsEl.textContent = 0;
  resetGame();
});

resetBtn.addEventListener("click", resetGame);

createBoard();
startTimer();
