/* Othello / Reversi Logic 
    Black = 1 (Player), White = -1 (Computer), Empty = 0 
*/

const ROWS = 8;
const COLS = 8;
let board = [];
let currentPlayer = 1; // 1: Black, -1: White
let gameActive = false;
let validMoves = [];

// DOM Elements
const boardEl = document.getElementById('board');
const scoreBlackEl = document.getElementById('score-black');
const scoreWhiteEl = document.getElementById('score-white');
const messageEl = document.getElementById('message-area');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('new-game-btn');
const blackBox = document.getElementById('score-black-box');
const whiteBox = document.getElementById('score-white-box');

// 初始化
function initGame() {
    // 建立 8x8 陣列
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    
    // 初始四子
    board[3][3] = -1;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = -1;

    currentPlayer = 1; // 黑棋先手
    gameActive = true;
    
    renderBoard();
    updateUI();
    checkGameState();
}

// 產生 HTML 棋盤
function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.onclick = () => handleCellClick(r, c);
            
            // 繪製棋子
            if (board[r][c] !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                piece.innerHTML = `<div class="face front"></div><div class="face back"></div>`;
                
                // 設定初始翻轉狀態
                if (board[r][c] === -1) {
                    piece.classList.add('is-white');
                } else {
                    piece.classList.add('is-black');
                }
                cell.appendChild(piece);
            }
            boardEl.appendChild(cell);
        }
    }
}

// 取得某位置的 DOM 棋子元素
function getPieceElement(r, c) {
    const cell = document.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
    return cell ? cell.querySelector('.piece') : null;
}

// 延遲函式 (用於依序翻轉)
const delay = ms => new Promise(res => setTimeout(res, ms));

// 檢查某步是否合法，若合法回傳將會翻轉的棋子列表
function getFlips(r, c, player) {
    if (board[r][c] !== 0) return [];
    
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    let totalFlips = [];

    for (let [dr, dc] of directions) {
        let rCurr = r + dr;
        let cCurr = c + dc;
        let potentialFlips = [];

        // 往該方向一直走，直到邊界或空位
        while (rCurr >= 0 && rCurr < ROWS && cCurr >= 0 && cCurr < COLS && board[rCurr][cCurr] === -player) {
            potentialFlips.push({r: rCurr, c: cCurr});
            rCurr += dr;
            cCurr += dc;
        }

        // 如果停下來的地方是自己的棋子，且中間有對手棋子
        if (potentialFlips.length > 0 && rCurr >= 0 && rCurr < ROWS && cCurr >= 0 && cCurr < COLS && board[rCurr][cCurr] === player) {
            totalFlips = totalFlips.concat(potentialFlips);
        }
    }
    return totalFlips;
}

// 處理玩家點擊
async function handleCellClick(r, c) {
    if (!gameActive || currentPlayer !== 1) return; // 只有黑棋(玩家)回合可點

    const flips = getFlips(r, c, 1);
    if (flips.length === 0) {
        // messageEl.textContent = "這裡不能下！";
        return;
    }

    // 玩家下棋
    await executeMove(r, c, 1, flips);
    
    // 檢查下一步
    const nextState = checkGameState();
    
    if (nextState === 'continue' && currentPlayer === -1) {
        // 電腦思考時間 (UX 優化：假裝思考)
        messageEl.textContent = "電腦思考中...";
        setTimeout(computerTurn, 800); 
    }
}

// 執行下棋動作 (包含放置新子與依序翻轉動畫)
async function executeMove(r, c, player, flips) {
    // 1. 更新邏輯盤面
    board[r][c] = player;
    
    // 2. 視覺：放置新子
    const cell = document.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
    
    // 標記最後落子位置 (UX)
    document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
    cell.classList.add('last-move');

    const piece = document.createElement('div');
    piece.classList.add('piece');
    // 剛生成時，先設定為與其「原本顏色」相反，再透過動畫翻轉過來，或直接設定正確類別
    // 這裡我們直接設定正確類別，因為是新放的
    piece.classList.add(player === 1 ? 'is-black' : 'is-white');
    piece.innerHTML = `<div class="face front"></div><div class="face back"></div>`;
    cell.appendChild(piece);

    // 3. 依序翻轉對手棋子 (動畫核心)
    for (let flip of flips) {
        board[flip.r][flip.c] = player; // 邏輯更新
        const pEl = getPieceElement(flip.r, flip.c);
        if (pEl) {
            // 透過移除舊 class 新增新 class 觸發 CSS transform
            if (player === 1) {
                pEl.classList.remove('is-white');
                pEl.classList.add('is-black');
            } else {
                pEl.classList.remove('is-black');
                pEl.classList.add('is-white');
            }
            // 播放音效可在此加入
        }
        await delay(150); // 延遲 150ms 翻下一顆，製造依序感
    }

    updateUI();
    currentPlayer = -currentPlayer; // 換手
}

// 計算所有合法步數
function getAllValidMoves(player) {
    let moves = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let flips = getFlips(r, c, player);
            if (flips.length > 0) {
                moves.push({r, c, flips});
            }
        }
    }
    return moves;
}

// 檢查遊戲狀態 (換手、無子可下、結束)
function checkGameState() {
    updateUI();
    
    // 清除舊提示
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('valid'));

    const currentMoves = getAllValidMoves(currentPlayer);
    
    // 顯示玩家的合法步數提示
    if (currentPlayer === 1) {
        currentMoves.forEach(m => {
            const cell = document.querySelector(`.cell[data-row='${m.r}'][data-col='${m.c}']`);
            if (cell) cell.classList.add('valid');
        });
    }

    if (currentMoves.length === 0) {
        // 當前玩家無步可走，檢查對手
        const opponentMoves = getAllValidMoves(-currentPlayer);
        if (opponentMoves.length === 0) {
            // 雙方都無步可走，遊戲結束
            gameActive = false;
            endGame();
            return 'end';
        } else {
            // PASS
            messageEl.textContent = `${currentPlayer === 1 ? "黑棋" : "白棋"} 無步可走，PASS！`;
            currentPlayer = -currentPlayer;
            updateUI();
            
            // 如果 Pass 後輪到電腦，觸發電腦
            if (currentPlayer === -1) {
                setTimeout(computerTurn, 1000);
            } else {
                checkGameState(); // 重新檢查玩家是否現在有步可走
            }
            return 'pass';
        }
    }
    return 'continue';
}

// === 電腦 AI 邏輯 ===

async function computerTurn() {
    if (!gameActive) return;

    const difficulty = difficultySelect.value;
    const moves = getAllValidMoves(-1); // 電腦是白棋 (-1)

    if (moves.length === 0) return; // 理論上由 checkGameState 處理，防呆

    let bestMove = null;

    if (difficulty === 'basic') {
        // 基本棋力：隨機選 或 貪婪 (選翻最多的)
        // 這裡採用簡單的貪婪策略：吃越多越好，若相同則隨機
        moves.sort((a, b) => b.flips.length - a.flips.length);
        // 為了不讓它每次都完全一樣，取前 3 名隨機
        const topCount = Math.min(moves.length, 3);
        const randIndex = Math.floor(Math.random() * topCount);
        bestMove = moves[randIndex];
    } else {
        // 進階棋力：位置權重評估
        bestMove = getAdvancedMove(moves);
    }

    await executeMove(bestMove.r, bestMove.c, -1, bestMove.flips);
    
    // 電腦下完，檢查狀態
    checkGameState();
}

// 進階 AI：權重表策略
function getAdvancedMove(moves) {
    // 權重表：角落最高分，星位(角落旁)扣分，邊緣加分
    const weights = [
        [100, -20, 10,  5,  5, 10, -20, 100],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [ 10,  -2, -1, -1, -1, -1,  -2,  10],
        [  5,  -2, -1, -1, -1, -1,  -2,   5],
        [  5,  -2, -1, -1, -1, -1,  -2,   5],
        [ 10,  -2, -1, -1, -1, -1,  -2,  10],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [100, -20, 10,  5,  5, 10, -20, 100]
    ];

    let maxScore = -Infinity;
    let candidates = [];

    for (let move of moves) {
        let score = weights[move.r][move.c];
        
        // 簡單的 Minimax 概念補充：如果這步讓對方下一個角落，則大幅扣分 (簡易版 lookahead)
        // 這裡僅實作靜態評估 + 翻轉數量加權
        score += move.flips.length; // 吃越多也是一種優勢，但權重低於佔角

        if (score > maxScore) {
            maxScore = score;
            candidates = [move];
        } else if (score === maxScore) {
            candidates.push(move);
        }
    }
    
    // 從最高分的候選中隨機選一個
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// === UI 更新與工具 ===

function updateUI() {
    // 計算分數
    let blackScore = 0;
    let whiteScore = 0;
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            if(board[r][c] === 1) blackScore++;
            else if(board[r][c] === -1) whiteScore++;
        }
    }

    scoreBlackEl.textContent = blackScore;
    scoreWhiteEl.textContent = whiteScore;

    // 標示當前回合
    if (currentPlayer === 1) {
        blackBox.classList.add('active');
        whiteBox.classList.remove('active');
        messageEl.textContent = "輪到黑棋 (玩家)";
    } else {
        whiteBox.classList.add('active');
        blackBox.classList.remove('active');
        messageEl.textContent = "輪到白棋 (電腦)";
    }
}

function endGame() {
    let blackScore = parseInt(scoreBlackEl.textContent);
    let whiteScore = parseInt(scoreWhiteEl.textContent);
    let msg = "";
    if (blackScore > whiteScore) msg = "遊戲結束！黑棋獲勝！";
    else if (whiteScore > blackScore) msg = "遊戲結束！白棋獲勝！";
    else msg = "遊戲結束！平手！";
    
    messageEl.textContent = msg;
    alert(msg);
}

// 事件監聽
newGameBtn.addEventListener('click', initGame);

// 啟動遊戲
initGame();