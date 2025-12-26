/**
 * 九路圍棋 (9x9 Go) - 進階版
 * 包含：提子動畫、叫吃警告、地盤顯示
 */

const BOARD_SIZE = 9;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// 遊戲狀態
let board = [];
let currentPlayer = BLACK;
let gameActive = false;
let isAnimating = false; // 防止動畫期間重複落子
let passCount = 0;
let prisoners = { [BLACK]: 0, [WHITE]: 0 };
let previousBoardState = null;
let lastMove = null;

// UI 綁定
const ui = {
    board: document.getElementById('goBoard'),
    message: document.getElementById('messageArea'),
    btnNew: document.getElementById('btnNewGame'),
    btnPass: document.getElementById('btnPass'),
    mode: document.getElementById('gameMode'),
    difficulty: document.getElementById('aiDifficulty'),
    difficultyGroup: document.getElementById('difficultyGroup'),
    blackCaps: document.getElementById('blackCaptures'),
    whiteCaps: document.getElementById('whiteCaptures')
};

// 初始化
function init() {
    createBoardUI();
    ui.btnNew.addEventListener('click', startNewGame);
    ui.btnPass.addEventListener('click', handlePass);
    ui.mode.addEventListener('change', () => {
        ui.difficultyGroup.style.display = ui.mode.value === 'pvp' ? 'none' : 'flex';
    });
    startNewGame();
}

function createBoardUI() {
    ui.board.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('intersection');
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // 天元與星位
            if ((x === 4 && y === 4) || ((x === 2 || x === 6) && (y === 2 || y === 6))) {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                cell.appendChild(dot);
                cell.classList.add('tengen');
            }

            cell.addEventListener('click', () => handleHumanClick(x, y));
            ui.board.appendChild(cell);
        }
    }
}

function startNewGame() {
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
    currentPlayer = BLACK;
    gameActive = true;
    isAnimating = false;
    passCount = 0;
    prisoners = { [BLACK]: 0, [WHITE]: 0 };
    previousBoardState = null;
    lastMove = null;

    // 清除舊的標記
    document.querySelectorAll('.territory-black, .territory-white').forEach(el => el.classList.remove('territory-black', 'territory-white'));
    
    updateUI();
    ui.message.textContent = "新局開始，黑棋先行";
}

// --- 渲染與視覺效果 ---

function updateUI() {
    const cells = document.querySelectorAll('.intersection');
    cells.forEach(cell => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const stoneVal = board[y][x];

        // 1. 清理：移除舊棋子，但保留地盤標記(如果是終局)
        // 注意：我們只移除 .stone，不移除 .territory-mark
        const existingStone = cell.querySelector('.stone');
        
        // 如果棋盤狀態是空的，但UI上有棋子(且不是正在被提起的)，則移除
        if (stoneVal === EMPTY) {
            if (existingStone && !existingStone.classList.contains('captured')) {
                existingStone.remove();
            }
        } else {
            // 如果棋盤有子，但UI沒有，則新增
            if (!existingStone) {
                const stone = document.createElement('div');
                stone.classList.add('stone');
                stone.classList.add(stoneVal === BLACK ? 'black' : 'white');
                cell.appendChild(stone);
            } else {
                // 確保顏色正確 (防止極端情況)
                existingStone.className = `stone ${stoneVal === BLACK ? 'black' : 'white'}`;
            }
        }

        // 處理最後一手標記
        cell.classList.remove('last-move');
        if (lastMove && lastMove.x === x && lastMove.y === y) {
            cell.classList.add('last-move');
        }
    });

    ui.blackCaps.textContent = prisoners[WHITE];
    ui.whiteCaps.textContent = prisoners[BLACK];

    // 每次更新UI後，檢查叫吃狀態
    highlightAtari();
}

// 叫吃警告 (Highlighter)
function highlightAtari() {
    // 先移除所有警告
    document.querySelectorAll('.stone').forEach(s => s.classList.remove('atari'));

    // 檢查棋盤上每一個棋串
    let visited = new Set();
    for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
            if (board[y][x] !== EMPTY && !visited.has(`${x},${y}`)) {
                const group = getGroup(board, x, y);
                // 標記已訪問
                group.stones.forEach(s => visited.add(`${s.x},${s.y}`));

                // 如果氣只有 1，且是玩家的棋子(或是輪到該方下棋時提示)
                // 這裡設計：如果是人類玩家的棋子剩一氣，給予強烈警告
                // 如果是電腦的棋子剩一氣，也標示出來讓玩家知道可以吃
                if (group.liberties === 1) {
                    group.stones.forEach(s => {
                        const cell = document.querySelector(`.intersection[data-x="${s.x}"][data-y="${s.y}"]`);
                        const stone = cell.querySelector('.stone');
                        if (stone) stone.classList.add('atari');
                    });
                }
            }
        }
    }
}

// 提子動畫處理
async function animateCaptures(capturedStones) {
    if (!capturedStones || capturedStones.length === 0) return;

    isAnimating = true;
    ui.board.classList.add('board-locked');

    // 1. 去除重複座標 (避免同一顆棋子被計算兩次導致錯誤)
    const uniqueStones = [];
    const seen = new Set();
    capturedStones.forEach(pos => {
        const key = `${pos.x},${pos.y}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueStones.push(pos);
        }
    });

    // 2. 對每個被提的棋子套用 CSS 樣式
    let foundAny = false;
    uniqueStones.forEach(pos => {
        // 精確選取該座標的 DOM 元素
        const cell = document.querySelector(`.intersection[data-x="${pos.x}"][data-y="${pos.y}"]`);
        const stone = cell ? cell.querySelector('.stone') : null;
        
        if (stone) {
            stone.classList.add('captured');
            foundAny = true;
            // 技巧：讀取 offsetWidth 強迫瀏覽器立刻渲染 (Force Reflow)，確保動畫觸發
            void stone.offsetWidth; 
        }
    });

    // 3. 如果有找到任何棋子，才等待動畫時間
    if (foundAny) {
        // 等待 350ms (對應 CSS 的 0.35s)
        await new Promise(resolve => setTimeout(resolve, 350));
    }

    // 4. 動畫結束後，從 DOM 移除 (視覺上移除)
    // 注意：實際數據更新會在函數返回後由 attemptMove 處理
    uniqueStones.forEach(pos => {
        const cell = document.querySelector(`.intersection[data-x="${pos.x}"][data-y="${pos.y}"]`);
        const stone = cell ? cell.querySelector('.stone') : null;
        if (stone) stone.remove();
    });

    ui.board.classList.remove('board-locked');
    isAnimating = false;
}

// --- 核心邏輯 ---

function handleHumanClick(x, y) {
    if (!gameActive || isAnimating) return;
    if (ui.mode.value === 'pve' && currentPlayer === WHITE) return;

    attemptMove(x, y);
}

// 改為 async 以支援動畫等待
async function attemptMove(x, y) {
    if (board[y][x] !== EMPTY) return;

    const nextBoard = JSON.parse(JSON.stringify(board));
    nextBoard[y][x] = currentPlayer;

    // 1. 檢查提子
    const opponent = currentPlayer === BLACK ? WHITE : BLACK;
    let capturedStones = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (nextBoard[ny][nx] === opponent) {
                const group = getGroup(nextBoard, nx, ny);
                if (group.liberties === 0) {
                    capturedStones.push(...group.stones);
                }
            }
        }
    });

    // 2. 檢查自殺
    const myGroup = getGroup(nextBoard, x, y);
    // 如果沒有提子，且自己氣為0 -> 自殺
    if (myGroup.liberties === 0 && capturedStones.length === 0) {
        ui.message.textContent = "禁著點：自殺手！";
        ui.message.style.color = "red";
        setTimeout(() => ui.message.style.color = "#f1c40f", 1000);
        return;
    }

    // 3. 檢查打劫
    // 先暫時移除被提的子來計算 hash
    capturedStones.forEach(pos => nextBoard[pos.y][pos.x] = EMPTY);
    const currentBoardHash = JSON.stringify(nextBoard);
    if (currentBoardHash === previousBoardState) {
        ui.message.textContent = "禁著點：打劫 (Ko)！";
        return;
    }

    // --- 確認落子有效 ---
    
    // 如果有提子，先播放動畫
    if (capturedStones.length > 0) {
        // 在邏輯更新前，先在畫面上標記 (為了動畫)
        // 注意：此時 board 變數還沒更新，UI 還是舊的
        await animateCaptures(capturedStones);
    }

    // 更新邏輯狀態
    previousBoardState = JSON.stringify(board);
    board = nextBoard; // nextBoard 已經移除了死子
    prisoners[opponent] += capturedStones.length;
    lastMove = { x, y };
    passCount = 0;

    // 換手
    currentPlayer = opponent;
    updateUI(); // 這裡會重繪棋子並觸發 Atari 檢查
    
    const colorName = currentPlayer === BLACK ? "黑方" : "白方";
    ui.message.textContent = `輪到 ${colorName}`;

    // 如果是 PvE，呼叫電腦
    if (ui.mode.value === 'pve' && gameActive && currentPlayer === WHITE) {
        setTimeout(aiTurn, 600);
    }
}

function handlePass() {
    if (!gameActive || isAnimating) return;
    if (ui.mode.value === 'pve' && currentPlayer === WHITE) return;

    passTurn();
    if (gameActive && ui.mode.value === 'pve' && currentPlayer === WHITE) {
        setTimeout(aiTurn, 800);
    }
}

function passTurn() {
    passCount++;
    ui.message.textContent = `${currentPlayer === BLACK ? "黑方" : "白方"} 虛手`;
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateUI(); // 更新 Atari 顯示 (雖然Pass不會改變氣，但可以切換視角)
    
    if (passCount >= 2) {
        endGame();
    }
}

// --- 輔助算法 ---

function getGroup(boardState, startX, startY) {
    const color = boardState[startY][startX];
    const group = [];
    const liberties = new Set();
    const visited = new Set();
    const stack = [{x: startX, y: startY}];

    while (stack.length > 0) {
        const {x, y} = stack.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);
        group.push({x, y});

        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (boardState[ny][nx] === EMPTY) {
                    liberties.add(`${nx},${ny}`);
                } else if (boardState[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
                    stack.push({x: nx, y: ny});
                }
            }
        });
    }
    return { stones: group, liberties: liberties.size };
}

// --- AI (保持不變，但在呼叫落子時會自動觸發動畫) ---
function aiTurn() {
    if (!gameActive) return;
    const difficulty = ui.difficulty.value;
    let move = null;

    if (difficulty === 'easy') move = getRandomMove();
    else if (difficulty === 'medium') move = getMediumMove();
    else move = getHardMove();

    if (move) attemptMove(move.x, move.y);
    else passTurn();
}

// 簡易 AI 函數 (為了節省篇幅，沿用之前的邏輯，此處省略詳細實作，請保留原本的 getRandomMove, getMediumMove, getHardMove 等函數)
// 請將您之前 script.js 中從 "getAllValidMoves" 到 "simCapture" 的所有 AI 相關函數貼在這裡
// ... (AI Functions here) ...

// 在這裡我補上 AI 函數以確保代碼完整性
function getAllValidMoves() {
    const moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY) {
                // 簡單檢查自殺
                const nextBoard = JSON.parse(JSON.stringify(board));
                nextBoard[y][x] = currentPlayer;
                const myGroup = getGroup(nextBoard, x, y);
                if (myGroup.liberties > 0 || checkCapturePossible(nextBoard, x, y)) {
                    moves.push({x, y});
                }
            }
        }
    }
    return moves;
}

function checkCapturePossible(boardState, x, y) {
    const opponent = currentPlayer === BLACK ? WHITE : BLACK;
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let d of directions) {
        const nx = x + d[0], ny = y + d[1];
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (boardState[ny][nx] === opponent) {
                if (getGroup(boardState, nx, ny).liberties === 0) return true;
            }
        }
    }
    return false;
}

function getRandomMove() {
    const moves = getAllValidMoves();
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
}

function getMediumMove() {
    const moves = getAllValidMoves();
    if (!moves.length) return null;
    for (let m of moves) if (simCapture(m.x, m.y) > 0) return m;
    const centerMoves = moves.filter(m => m.x >= 3 && m.x <= 5 && m.y >= 3 && m.y <= 5);
    if (centerMoves.length) return centerMoves[Math.floor(Math.random() * centerMoves.length)];
    return moves[Math.floor(Math.random() * moves.length)];
}

function getHardMove() {
    const moves = getAllValidMoves();
    if (!moves.length) return null;
    let bestMove = null;
    let maxScore = -Infinity;
    moves.forEach(m => {
        let score = evaluateMove(m.x, m.y);
        score += Math.random() * 0.5;
        if (score > maxScore) { maxScore = score; bestMove = m; }
    });
    return bestMove;
}

function evaluateMove(x, y) {
    let score = 0;
    const nextBoard = JSON.parse(JSON.stringify(board));
    nextBoard[y][x] = currentPlayer;
    const captured = simCapture(x, y);
    score += captured * 12; // 提高提子權重
    const distToCenter = Math.abs(x - 4) + Math.abs(y - 4);
    score += (8 - distToCenter);
    const group = getGroup(nextBoard, x, y);
    if (group.liberties === 1) score -= 20;
    if (group.liberties === 2) score -= 2;
    if (group.liberties >= 3) score += 3;
    return score;
}

function simCapture(x, y) {
    let caps = 0;
    const nextBoard = JSON.parse(JSON.stringify(board));
    nextBoard[y][x] = currentPlayer;
    const opponent = currentPlayer === BLACK ? WHITE : BLACK;
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (nextBoard[ny][nx] === opponent && getGroup(nextBoard, nx, ny).liberties === 0) {
                caps++;
            }
        }
    });
    return caps;
}

// --- 遊戲結束與地盤顯示 ---

function endGame() {
    gameActive = false;
    const result = calculateScoreAndTerritory();
    
    // 視覺化地盤
    visualizeTerritory(result.territoryMap);

    let msg = `遊戲結束！\n黑方: ${result.black} (盤面+死子) \n白方: ${result.white} (盤面+死子+貼目5.5)`;
    msg += result.black > result.white ? "\n\n黑方獲勝！" : "\n\n白方獲勝！";
    
    ui.message.innerText = msg;
    alert(msg);
}

// 視覺化地盤 (在棋盤上畫點)
function visualizeTerritory(map) {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const owner = map[y][x];
            if (owner !== EMPTY && board[y][x] === EMPTY) {
                const cell = document.querySelector(`.intersection[data-x="${x}"][data-y="${y}"]`);
                // 避免重複添加
                if(!cell.querySelector('.territory-mark')) {
                    const mark = document.createElement('div');
                    mark.classList.add('territory-mark');
                    mark.classList.add(owner === BLACK ? 'territory-black' : 'territory-white');
                    cell.appendChild(mark);
                }
            }
        }
    }
}

function calculateScoreAndTerritory() {
    let blackScore = 0;
    let whiteScore = 0;
    const territoryMap = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));

    // 1. 計算盤面子數
    for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
            if (board[y][x] === BLACK) blackScore++;
            else if (board[y][x] === WHITE) whiteScore++;
        }
    }

    // 2. 計算圍空
    let visited = new Set();
    for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY && !visited.has(`${x},${y}`)) {
                const territory = getTerritoryOwner(x, y, visited);
                if (territory.owner) {
                    // 記錄地盤歸屬以便顯示
                    territory.points.forEach(p => territoryMap[p.y][p.x] = territory.owner);
                    
                    if (territory.owner === BLACK) blackScore += territory.count;
                    else if (territory.owner === WHITE) whiteScore += territory.count;
                }
            }
        }
    }

    // 3. 貼目
    whiteScore += 5.5;

    return { black: blackScore, white: whiteScore, territoryMap };
}

function getTerritoryOwner(startX, startY, visitedGlobal) {
    let count = 0;
    let adjacentColors = new Set();
    let stack = [{x: startX, y: startY}];
    let visitedLocal = new Set();
    let points = [];

    while(stack.length > 0) {
        const {x, y} = stack.pop();
        const key = `${x},${y}`;
        if (visitedLocal.has(key)) continue;
        visitedLocal.add(key);
        visitedGlobal.add(key);
        points.push({x, y});
        count++;

        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                const val = board[ny][nx];
                if (val === EMPTY && !visitedLocal.has(`${nx},${ny}`)) {
                    stack.push({x: nx, y: ny});
                } else if (val !== EMPTY) {
                    adjacentColors.add(val);
                }
            }
        });
    }

    if (adjacentColors.size === 1) {
        return { count, owner: [...adjacentColors][0], points };
    }
    return { count: 0, owner: null, points: [] };
}

init();