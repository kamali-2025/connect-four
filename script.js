const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modeBtn = document.getElementById("mode-btn");
const ROWS = 6;
const COLS = 7;

let currentPlayer = "yellow";
let gameOver = false;
let vsAI = true;
let aiThinking = false;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// --- 8-Bit Retro Sound Generator (No external files needed) ---
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
  [523, 659, 784, 1046].forEach((note, i) => playTone(note, 0.14, "square", i * 0.1));
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

  board[r][col] = currentPlayer;
  const slot = document.querySelector(`.slot[data-row='${r}'][data-col='${col}']`);
  slot.classList.add(currentPlayer);
  playDropSound();

  const winningCells = checkWin(r, col, currentPlayer);
  if (winningCells) {
    gameOver = true;
    highlightWinner(winningCells);
    playWinSound();
    const winnerName = currentPlayer === "yellow" ? "Yellow" : (vsAI ? "Computer" : "Pink");
    statusElement.textContent = `${winnerName} Wins!`;
    resetBtn.style.display = "inline-block";
    return;
  }

  if (board.flat().every(cell => cell !== null)) {
    gameOver = true;
    statusElement.textContent = "It's a Draw!";
    resetBtn.style.display = "inline-block";
    return;
  }

  currentPlayer = currentPlayer === "yellow" ? "pink" : "yellow";

  if (vsAI && currentPlayer === "pink") {
    statusElement.textContent = "Computer is thinking...";
    aiThinking = true;
    setTimeout(() => {
      aiThinking = false;
      handleMove(chooseAIMove());
    }, 450);
  } else {
    statusElement.textContent = `${currentPlayer === "yellow" ? "Yellow" : "Pink"}'s Turn`;
  }
}

function chooseAIMove() {
  const validCols = [];
  for (let c = 0; c < COLS; c++) {
    if (getAvailableRow(c) !== -1) validCols.push(c);
  }

  // 1. Check if AI ("pink") can win right now
  for (const c of validCols) {
    const r = getAvailableRow(c);
    board[r][c] = "pink";
    const win = checkWin(r, c, "pink");
    board[r][c] = null;
    if (win) return c;
  }

  // 2. Check if Player ("yellow") is about to win and block them
  for (const c of validCols) {
    const r = getAvailableRow(c);
    board[r][c] = "yellow";
    const block = checkWin(r, c, "yellow");
    board[r][c] = null;
    if (block) return c;
  }

  // 3. Otherwise prefer center columns, or pick randomly
  if (validCols.includes(3) && Math.random() < 0.6) return 3;
  return validCols[Math.floor(Math.random() * validCols.length)];
}

function checkWin(row, col, player) {
  const directions = [
    [[0, 1], [0, -1]],   // Horizontal
    [[1, 0], [-1, 0]],   // Vertical
    [[1, 1], [-1, -1]],  // Diagonal \
    [[1, -1], [-1, 1]]   // Diagonal /
  ];

  for (const [dir1, dir2] of directions) {
    const cells = [[row, col]];
    for (const [dr, dc] of [dir1, dir2]) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push([r, c]);
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
}

modeBtn.addEventListener("click", () => {
  vsAI = !vsAI;
  modeBtn.textContent = vsAI ? "Mode: 1 Player (vs AI)" : "Mode: 2 Players";
  resetGame();
});

resetBtn.addEventListener("click", resetGame);

createBoard();
