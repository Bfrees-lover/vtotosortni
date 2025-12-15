// Текущее состояние игры
let gameState = {
    board: [],
    selectedCell: null,
    score: 0,
    opponentScore: 0,
    playerHealth: 100,
    opponentHealth: 100,
    timer: 45,
    timerInterval: null,
    gameActive: false,
    currentPlayer: null
};

// Типы камней
const GEM_TYPES = ['gem-red', 'gem-blue', 'gem-green', 'gem-yellow', 'gem-purple', 'gem-orange'];
const BOARD_SIZE = 8;

// DOM Elements
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-btn');
const gameBoard = document.getElementById('game-board');
const playerScoreEl = document.getElementById('player-score');
const opponentScoreEl = document.getElementById('opponent-score');
const playerHealthEl = document.getElementById('player-health');
const opponentHealthEl = document.getElementById('opponent-health');
const timerEl = document.getElementById('timer');

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeGame();
    loadProfileData();
    loadLeaderboard();
});

// Навигация между страницами
function initializeNavigation() {
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс со всех кнопок и страниц
            navButtons.forEach(btn => btn.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            
            // Добавляем активный класс к нажатой кнопке
            button.classList.add('active');
            
            // Показываем соответствующую страницу
            const pageId = button.id.replace('-btn', '-page');
            document.getElementById(pageId).classList.add('active');
        });
    });
    
    // Кнопка "Начать играть" на главной странице
    document.getElementById('play-now-btn').addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById('game-btn').classList.add('active');
        
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById('game-page').classList.add('active');
    });
}

// Инициализация игрового поля
function initializeGame() {
    createBoard();
    
    // Обработчики кнопок игры
    document.getElementById('start-game-btn').addEventListener('click', startNewGame);
    document.getElementById('vs-bot-btn').addEventListener('click', () => startNewGame('bot'));
    document.getElementById('vs-player-btn').addEventListener('click', () => startNewGame('player'));
}

// Создание игрового поля
function createBoard() {
    gameBoard.innerHTML = '';
    gameState.board = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        gameState.board[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const gemType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
            gameState.board[row][col] = gemType;
            
            const cell = document.createElement('div');
            cell.className = `cell ${gemType}`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener('click', handleCellClick);
            
            gameBoard.appendChild(cell);
        }
    }
}

// Обработка клика по ячейке
function handleCellClick(event) {
    if (!gameState.gameActive) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (!gameState.selectedCell) {
        // Первый клик - выбираем ячейку
        gameState.selectedCell = { row, col };
        event.target.classList.add('selected');
    } else {
        // Второй клик - пытаемся поменять местами
        const prevRow = gameState.selectedCell.row;
        const prevCol = gameState.selectedCell.col;
        
        // Снимаем выделение
        document.querySelector(`.cell[data-row="${prevRow}"][data-col="${prevCol}"]`).classList.remove('selected');
        
        // Проверяем, являются ли клетки соседними
        const isAdjacent = 
            (Math.abs(row - prevRow) === 1 && col === prevCol) || 
            (Math.abs(col - prevCol) === 1 && row === prevRow);
        
        if (isAdjacent) {
            // Меняем местами
            swapGems(prevRow, prevCol, row, col);
            
            // Проверяем, есть ли совпадения после обмена
            const matches = findMatches();
            if (matches.length > 0) {
                // Совпадения есть - засчитываем очки
                gameState.score += matches.length * 10;
                playerScoreEl.textContent = gameState.score;
                
                // Убираем совпадения и заполняем новыми камнями
                removeMatchesAndRefill(matches);
            } else {
                // Совпадений нет - меняем обратно
                swapGems(prevRow, prevCol, row, col);
            }
        }
        
        gameState.selectedCell = null;
    }
}

// Поменять местами два камня
function swapGems(row1, col1, row2, col2) {
    const temp = gameState.board[row1][col1];
    gameState.board[row1][col1] = gameState.board[row2][col2];
    gameState.board[row2][col2] = temp;
    
    // Обновляем отображение
    updateBoardDisplay();
}

// Обновить отображение доски
function updateBoardDisplay() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const gemType = gameState.board[row][col];
        
        // Убираем все классы типов камней
        GEM_TYPES.forEach(type => cell.classList.remove(type));
        // Добавляем новый класс
        cell.classList.add(gemType);
    });
}

// Найти совпадения на доске
function findMatches() {
    const matches = [];
    
    // Проверяем горизонтальные линии
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE - 2; col++) {
            const gemType = gameState.board[row][col];
            if (
                gemType === gameState.board[row][col + 1] &&
                gemType === gameState.board[row][col + 2]
            ) {
                // Нашли тройное совпадение, проверим на более длинные
                let matchLength = 3;
                while (col + matchLength < BOARD_SIZE && gameState.board[row][col + matchLength] === gemType) {
                    matchLength++;
                }
                
                // Добавляем все камни в совпадении
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row, col: col + i });
                }
                
                col += matchLength - 1; // Пропустить уже проверенные камни
            }
        }
    }
    
    // Проверяем вертикальные линии
    for (let col = 0; col < BOARD_SIZE; col++) {
        for (let row = 0; row < BOARD_SIZE - 2; row++) {
            const gemType = gameState.board[row][col];
            if (
                gemType === gameState.board[row + 1][col] &&
                gemType === gameState.board[row + 2][col]
            ) {
                // Нашли тройное совпадение, проверим на более длинные
                let matchLength = 3;
                while (row + matchLength < BOARD_SIZE && gameState.board[row + matchLength][col] === gemType) {
                    matchLength++;
                }
                
                // Добавляем все камни в совпадении
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row: row + i, col });
                }
                
                row += matchLength - 1; // Пропустить уже проверенные камни
            }
        }
    }
    
    // Убираем дубликаты
    const uniqueMatches = [];
    const seen = {};
    
    matches.forEach(match => {
        const key = `${match.row},${match.col}`;
        if (!seen[key]) {
            seen[key] = true;
            uniqueMatches.push(match);
        }
    });
    
    return uniqueMatches;
}

// Убрать совпадения и заполнить новыми камнями
function removeMatchesAndRefill(matches) {
    // Убираем совпадающие камни
    matches.forEach(match => {
        gameState.board[match.row][match.col] = null;
    });
    
    // Смещаем оставшиеся камни вниз
    for (let col = 0; col < BOARD_SIZE; col++) {
        let writeIndex = BOARD_SIZE - 1;
        
        // Проходим снизу вверх
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (gameState.board[row][col] !== null) {
                gameState.board[writeIndex][col] = gameState.board[row][col];
                
                if (writeIndex !== row) {
                    gameState.board[row][col] = null;
                }
                
                writeIndex--;
            }
        }
        
        // Заполняем пустые места новыми камнями сверху
        for (let row = writeIndex; row >= 0; row--) {
            gameState.board[row][col] = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
        }
    }
    
    // Обновляем доску
    updateBoardDisplay();
    
    // Проверяем новые совпадения рекурсивно
    setTimeout(() => {
        const newMatches = findMatches();
        if (newMatches.length > 0) {
            gameState.score += newMatches.length * 10;
            playerScoreEl.textContent = gameState.score;
            removeMatchesAndRefill(newMatches);
        }
    }, 300); // Небольшая задержка для анимации
}

// Запуск новой игры
function startNewGame(opponentType = 'bot') {
    // Сброс состояния игры
    gameState.score = 0;
    gameState.opponentScore = 0;
    gameState.playerHealth = 100;
    gameState.opponentHealth = 100;
    gameState.timer = 45;
    gameState.gameActive = true;
    gameState.selectedCell = null;
    
    // Обновляем UI
    playerScoreEl.textContent = gameState.score;
    opponentScoreEl.textContent = gameState.opponentScore;
    playerHealthEl.textContent = gameState.playerHealth;
    opponentHealthEl.textContent = gameState.opponentHealth;
    timerEl.textContent = gameState.timer;
    
    // Создаем новое поле
    createBoard();
    
    // Запускаем таймер
    startTimer();
    
    // Если игра против бота, запускаем логику бота
    if (opponentType === 'bot') {
        document.getElementById('opponent-name').textContent = 'Бот';
        simulateBotOpponent();
    } else {
        document.getElementById('opponent-name').textContent = 'Игрок';
    }
}

// Запуск таймера
function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        gameState.timer--;
        timerEl.textContent = gameState.timer;
        
        if (gameState.timer <= 0) {
            clearInterval(gameState.timerInterval);
            endGame();
        }
    }, 1000);
}

// Симуляция действий бота
function simulateBotOpponent() {
    if (!gameState.gameActive) return;
    
    // Бот "делает ход" каждые 2-4 секунды
    const botMoveInterval = setInterval(() => {
        if (!gameState.gameActive) {
            clearInterval(botMoveInterval);
            return;
        }
        
        // Бот получает случайное количество очков в каждом "ходе"
        const botPoints = Math.floor(Math.random() * 20) + 5; // 5-24 очков
        gameState.opponentScore += botPoints;
        opponentScoreEl.textContent = gameState.opponentScore;
        
        // С вероятностью 30% бот "попадает" по игроку
        if (Math.random() < 0.3) {
            const damage = Math.floor(Math.random() * 10) + 5; // 5-14 урона
            gameState.playerHealth -= damage;
            playerHealthEl.textContent = Math.max(0, gameState.playerHealth);
            
            if (gameState.playerHealth <= 0) {
                gameState.playerHealth = 0;
                clearInterval(botMoveInterval);
                setTimeout(endGame, 500);
            }
        }
    }, 2000 + Math.random() * 2000); // 2-4 секунды между "ходами"
}

// Завершение игры
function endGame() {
    gameState.gameActive = false;
    clearInterval(gameState.timerInterval);
    
    // Определяем победителя
    let winner = '';
    if (gameState.timer <= 0) {
        // По таймеру побеждает тот, у кого больше здоровья
        if (gameState.playerHealth > gameState.opponentHealth) {
            winner = 'player';
        } else if (gameState.opponentHealth > gameState.playerHealth) {
            winner = 'opponent';
        } else {
            // При равном здоровье побеждает тот, у кого больше очков
            winner = gameState.score > gameState.opponentScore ? 'player' : 'opponent';
        }
    } else {
        // Обычная игра - побеждает тот, у кого больше очков
        winner = gameState.score > gameState.opponentScore ? 'player' : 'opponent';
    }
    
    // Отправляем результат на сервер
    sendMatchResult(winner);
    
    alert(`Игра окончена! Победитель: ${winner === 'player' ? 'Вы' : 'Противник'}`);
}

// Отправка результата матча на сервер
function sendMatchResult(winner) {
    const matchData = {
        player_id: localStorage.getItem('playerId') || 'guest',
        opponent_type: document.getElementById('opponent-name').textContent === 'Бот' ? 'bot' : 'player',
        player_score: gameState.score,
        opponent_score: gameState.opponentScore,
        player_health: gameState.playerHealth,
        opponent_health: gameState.opponentHealth,
        duration: 45 - gameState.timer
    };
    
    // Отправляем на наш backend
    fetch('http://localhost:8000/matches/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Match result sent:', data);
        
        // Если игрок победил, показываем награду
        if (data.winner_id === matchData.player_id && data.reward_item) {
            alert(`Вы получили награду: ${data.reward_item.name} (${data.reward_item.quality})!`);
        }
    })
    .catch(error => {
        console.error('Error sending match result:', error);
    });
}

// Загрузка данных профиля
function loadProfileData() {
    // Заглушка для загрузки данных профиля
    // В реальности это бы запрашивалось с сервера
    document.getElementById('char-name').textContent = localStorage.getItem('playerName') || 'Гость';
    document.getElementById('char-level').textContent = '1';
    document.getElementById('char-rating').textContent = '1000';
    document.getElementById('char-wins').textContent = '0';
    document.getElementById('char-losses').textContent = '0';
    
    // Загружаем инвентарь
    loadInventory();
}

// Загрузка инвентаря
function loadInventory() {
    // Заглушка для загрузки инвентаря
    // В реальности это бы запрашивалось с сервера
    const inventoryContainer = document.getElementById('inventory-items');
    inventoryContainer.innerHTML = '';
    
    // Добавляем несколько примеров предметов
    const sampleItems = [
        { id: 1, name: 'Обычный меч', quality: 'common', type: 'weapon', health_bonus: 0, attack_bonus: 5, defense_bonus: 0 },
        { id: 2, name: 'Редкий доспех', quality: 'rare', type: 'armor', health_bonus: 15, attack_bonus: 0, defense_bonus: 3 }
    ];
    
    sampleItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = `item-card item-${item.quality}`;
        itemCard.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-type">${item.type}</div>
            <div class="item-stats">
                HP: ${item.health_bonus} | ATK: ${item.attack_bonus} | DEF: ${item.defense_bonus}
            </div>
        `;
        inventoryContainer.appendChild(itemCard);
    });
}

// Загрузка таблицы лидеров
function loadLeaderboard() {
    // Заглушка для загрузки таблицы лидеров
    // В реальности это бы запрашивалось с сервера
    const leaderboardBody = document.getElementById('leaderboard-body');
    leaderboardBody.innerHTML = '';
    
    // Добавляем несколько примеров игроков
    const samplePlayers = [
        { rank: 1, name: 'Игрок1', rating: 1500, wins: 25, losses: 5 },
        { rank: 2, name: 'Игрок2', rating: 1450, wins: 22, losses: 8 },
        { rank: 3, name: 'Игрок3', rating: 1400, wins: 20, losses: 10 },
        { rank: 4, name: 'Игрок4', rating: 1350, wins: 18, losses: 12 },
        { rank: 5, name: 'Игрок5', rating: 1300, wins: 15, losses: 15 }
    ];
    
    samplePlayers.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.rank}</td>
            <td>${player.name}</td>
            <td>${player.rating}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}