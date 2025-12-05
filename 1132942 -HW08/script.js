// 1. 先選取所有需要的 DOM 元素 (包含計分板元素)
const boardEl = document.getElementById('board'); // 修正變數名稱 E1 -> El
const cells = Array.from(document.querySelectorAll('.cell'));
const btnReset = document.getElementById('reset');
const btnResetAll = document.getElementById('reset-all');
const turnEl = document.getElementById('turn');
const stateEl = document.getElementById('state');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

// 2. 初始化變數
let board, current, active;
let scoreX = 0;
let scoreO = 0;
let scoreDraw = 0;

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diags
];

function init() {
    board = Array(9).fill('');
    current = 'X';
    active = true;
    cells.forEach(c => {
        c.textContent = '';
        c.className = 'cell'; // 重置 class，移除 win 或 x/o 樣式
        c.disabled = false;
    });
    turnEl.textContent = current;
    stateEl.textContent = '';
}

function place(idx) {
    if (!active || board[idx]) return;
    
    board[idx] = current;
    const cell = cells[idx];
    cell.textContent = current;
    cell.classList.add(current.toLowerCase());
    
    const result = evaluate();
    if (result.finished) {
        endGame(result);
    } else {
        switchTurn();
    }
}

function switchTurn() {
    current = current === 'X' ? 'O' : 'X';
    turnEl.textContent = current;
}

function evaluate() {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { finished: true, winner: board[a], line };
        }
    }
    if (board.every(v => v)) return { finished: true, winner: null };
    return { finished: false };
}

function endGame({ winner, line }) {
    active = false;
    if (winner) {
        stateEl.textContent = `${winner} 勝利！`;
        line.forEach(i => cells[i].classList.add('win'));
        
        // 3. 補上計分邏輯
        if (winner === 'X') {
            scoreX++;
        } else {
            scoreO++;
        }
    } else {
        stateEl.textContent = '平手';
        // 3. 補上平手計分
        scoreDraw++;
    }
    
    // 4. 更新畫面分數
    updateScoreboard();
    
    cells.forEach(c => c.disabled = true);
}

function updateScoreboard() {
    scoreXEl.textContent = scoreX;
    scoreOEl.textContent = scoreO;
    scoreDrawEl.textContent = scoreDraw;
}

// Event Listeners
cells.forEach(cell => {
    cell.addEventListener('click', () => {
        const idx = +cell.getAttribute('data-idx');
        place(idx);
    });
});

btnResetAll.addEventListener('click', () => {
    scoreX = scoreO = scoreDraw = 0;
    updateScoreboard();
    init();
});

btnReset.addEventListener('click', () => { init() });

// 啟動遊戲
init();