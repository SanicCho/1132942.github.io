// 遊戲主變數
let board = Array(9).fill(null); // 棋盤狀態
let current = 'X'; // 當前玩家（玩家為X）
let active = true; // 控制遊戲是否進行中

// 初始化棋盤
function init() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    board = Array(9).fill(null);
    active = true;
    current = 'X';
    document.getElementById('status').innerText = '玩家 (X) 先手';
    
    // 建立9個格子
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.onclick = () => playerMove(i);
        boardEl.appendChild(cell);
    }
}

// 玩家下棋
function playerMove(i) {
    if (!active || board[i]) return;
    board[i] = 'X';
    updateBoard();
    
    if (checkWin('X')) {
        endGame('玩家 (X) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }
    
    current = 'O';
    document.getElementById('status').innerText = '電腦思考中...';
    setTimeout(computerMove, 500); // 縮短一點思考時間讓體驗更流暢
}

// --- 主要修改區域：電腦 AI 邏輯升級 ---
function computerMove() {
    let move = null;

    // 1. 進攻：嘗試自己獲勝 (優先級最高)
    move = findWinningMove('O');

    // 2. 防守：嘗試阻止玩家獲勝 (優先級次之)
    if (move === null) {
        move = findWinningMove('X');
    }

    // 3. 進階智慧：策略性選位 (新增功能)
    if (move === null) {
        move = getStrategicMove();
    }

    // 4. 最後手段：隨機選擇空格 (若上述都不可行)
    if (move === null) {
        move = getRandomMove();
    }

    // 執行下棋
    board[move] = 'O';
    updateBoard();

    if (checkWin('O')) {
        endGame('電腦 (O) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }
    
    current = 'X';
    document.getElementById('status').innerText = '輪到玩家 (X)';
}

// 修正後的：找到可立即獲勝/阻擋的位置
function findWinningMove(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8], // 橫向
        [0,3,6],[1,4,7],[2,5,8], // 縱向
        [0,4,8],[2,4,6]          // 斜向
    ];
    
    for (let [a,b,c] of wins) {
        const line = [board[a], board[b], board[c]];
        // 檢查是否該連線有兩個是 'player' 且剩下一個是 null
        if (line.filter(v => v === player).length === 2 && line.includes(null)) {
            return [a,b,c][line.indexOf(null)];
        }
    }
    // 注意：原本的 return null 寫在迴圈裡是錯誤的，必須移到迴圈外
    return null;
}

// 新增功能：進階策略選位
function getStrategicMove() {
    // 策略 A: 搶佔中心 (位置 4)
    if (board[4] === null) return 4;

    // 策略 B: 搶佔角落 (位置 0, 2, 6, 8)
    const corners = [0, 2, 6, 8];
    // 過濾出空的角落
    const availableCorners = corners.filter(i => board[i] === null);
    if (availableCorners.length > 0) {
        // 隨機選一個空角落，增加變化性
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    return null; // 若中心和角落都滿了，回傳 null 進入隨機邏輯
}

// 隨機選擇空格
function getRandomMove() {
    const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
    if (empty.length > 0) {
        return empty[Math.floor(Math.random() * empty.length)];
    }
    return null;
}

// --- 以下維持原樣 ---

// 更新畫面
function updateBoard() {
    const cells = document.getElementsByClassName('cell');
    for (let i = 0; i < 9; i++) {
        cells[i].innerText = board[i] || '';
        // 根據棋子給予不同顏色樣式 (可選)
        cells[i].style.color = board[i] === 'X' ? '#2196F3' : (board[i] === 'O' ? '#f44336' : '#000');
    }
}

// 判斷勝利
function checkWin(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    return wins.some(([a,b,c]) => board[a] === player && board[b] === player && board[c] === player);
}

// 判斷是否平手
function isFull() {
    return board.every(cell => cell !== null);
}

// 結束遊戲
function endGame(message) {
    document.getElementById('status').innerText = message;
    active = false;
}

// 重開一局
function resetGame() {
    init();
}

// 更新畫面 (配合 CSS class 做視覺優化)
function updateBoard() {
    const cells = document.getElementsByClassName('cell');
    for (let i = 0; i < 9; i++) {
        const cell = cells[i];
        const val = board[i];
        
        // 清除舊狀態
        cell.innerText = val || '';
        cell.classList.remove('x', 'o', 'taken', 'win');
        
        // 加入新狀態
        if (val) {
            cell.classList.add(val.toLowerCase()); // 加入 .x 或 .o
            cell.classList.add('taken'); // 標記已被佔用
        }
    }
}

// 判斷勝利 (新增 UX：高亮顯示獲勝的那條線)
function checkWin(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    
    // 找出符合的連線
    const winningLine = wins.find(([a,b,c]) => 
        board[a] === player && board[b] === player && board[c] === player
    );

    if (winningLine) {
        highlightWin(winningLine); // 呼叫高亮函式
        return true;
    }
    return false;
}

// 新增功能：高亮獲勝格子
function highlightWin(indices) {
    const cells = document.getElementsByClassName('cell');
    indices.forEach(index => {
        cells[index].classList.add('win');
    });
}
// 初始化
init();