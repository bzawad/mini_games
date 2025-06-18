// Game state variables
let gameMode = 'solo'; // 'solo', 'local', 'online'
let difficulty = 'normal'; // 'easy', 'normal', 'hard'
let currentPlayer = 1;
let scores = { player1: 0, player2: 0, computer: 0 };
let flippedCards = [];
let matchedCards = [];
let gameBoard = [];
let isGameActive = false;
let isComputerTurn = false;

// Cat meme images
const catImages = [
    'banana_cat.png',
    'chad_cat.png',
    'coughing_cat.png',
    'cursed_cat.png',
    'grumpy_cat.png',
    'maxwell_cat.png',
    'popping_cat_closed.png',
    'popping_cat_open.png',
    'sneeze_cat.png',
    'vader_cat.png',
    'weird_cat.png'
];

// Computer AI memory system
let computerMemory = {
    seen: new Map(), // cardIndex -> imageIndex
    difficulty: 'normal',
    forgetChance: 0.1 // chance to forget a card
};

// Initialize the game
document.addEventListener('DOMContentLoaded', function () {
    showStartScreen();
});

// Screen navigation functions
function showStartScreen() {
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('difficultyScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    resetGame();
}

function showDifficultyScreen() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('difficultyScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
}

function showGameScreen() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('difficultyScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
}

// Game mode selection functions
function startSoloGame() {
    gameMode = 'solo';
    showDifficultyScreen();
}

function startLocalGame() {
    gameMode = 'local';
    startGame('local', 'normal');
}



// Main game initialization
function startGame(mode, diff) {
    gameMode = mode;
    difficulty = diff;

    // Set up computer difficulty
    if (mode === 'solo') {
        setupComputerDifficulty(diff);
    }

    showGameScreen();
    initializeGame();
}

function setupComputerDifficulty(diff) {
    computerMemory.difficulty = diff;

    switch (diff) {
        case 'easy':
            computerMemory.forgetChance = 0.4; // Forgets 40% of seen cards
            break;
        case 'normal':
            computerMemory.forgetChance = 0.2; // Forgets 20% of seen cards
            break;
        case 'hard':
            computerMemory.forgetChance = 0.05; // Forgets 5% of seen cards
            break;
    }
}

function initializeGame() {
    // Reset game state
    currentPlayer = 1;
    scores = { player1: 0, player2: 0, computer: 0 };
    flippedCards = [];
    matchedCards = [];
    isGameActive = true;
    isComputerTurn = false;
    computerMemory.seen.clear();

    // Update UI
    updateUI();
    createGameBoard();
}

function updateUI() {
    // Update score display
    document.querySelector('.player1 .score').textContent = scores.player1;
    document.querySelector('.player2 .score').textContent = scores.player2;
    document.querySelector('.computer-score .score').textContent = scores.computer;

    // Show/hide player scores based on game mode
    const player2Score = document.querySelector('.player2');
    const computerScore = document.querySelector('.computer-score');

    if (gameMode === 'solo') {
        player2Score.classList.add('hidden');
        computerScore.classList.remove('hidden');
    } else {
        player2Score.classList.remove('hidden');
        computerScore.classList.add('hidden');
    }

    // Update turn indicator
    updateTurnIndicator();
}

function updateTurnIndicator() {
    const turnIndicator = document.getElementById('turnIndicator');

    if (gameMode === 'solo') {
        if (isComputerTurn) {
            turnIndicator.textContent = '🤖 Computer\'s Turn';
            turnIndicator.style.color = '#32cd32';
        } else {
            turnIndicator.textContent = '😺 Your Turn!';
            turnIndicator.style.color = '#ff1493';
        }
    } else {
        if (currentPlayer === 1) {
            turnIndicator.textContent = '😺 Player 1\'s Turn';
            turnIndicator.style.color = '#ff1493';
        } else {
            turnIndicator.textContent = '😸 Player 2\'s Turn';
            turnIndicator.style.color = '#00bfff';
        }
    }
}

function createGameBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';

    // Randomly select 8 different cat images from our collection for variety
    const shuffledImages = [...catImages];
    shuffleArray(shuffledImages);
    const selectedImages = shuffledImages.slice(0, 8);

    // Create pairs of cards (each image appears exactly twice for 16 cards total)
    const cardImages = [...selectedImages, ...selectedImages];

    // Shuffle the card positions
    shuffleArray(cardImages);

    // Verify we have exactly 16 cards for a 4x4 grid
    console.log(`Creating ${cardImages.length} cards for 4x4 grid`);

    // Create card elements
    cardImages.forEach((image, index) => {
        const card = createCard(image, index);
        gameBoard.appendChild(card);
    });
}

function createCard(image, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    card.dataset.image = image;

    card.innerHTML = `
        <div class="card-face card-back">🐱</div>
        <div class="card-face card-front">
            <img src="images/${image}" alt="Cat Meme">
        </div>
    `;

    card.addEventListener('click', () => handleCardClick(card));

    return card;
}

function handleCardClick(card) {
    if (!isGameActive || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
    }

    if (gameMode === 'solo' && isComputerTurn) {
        return; // Player can't click during computer's turn
    }

    if (flippedCards.length >= 2) {
        return; // Can't flip more than 2 cards
    }

    flipCard(card);
    flippedCards.push(card);

    // Remember card for computer AI
    if (gameMode === 'solo') {
        rememberCardForComputer(card);
    }

    if (flippedCards.length === 2) {
        setTimeout(() => checkForMatch(), 1000);
    }
}

function flipCard(card) {
    card.classList.add('flipped');
}

function rememberCardForComputer(card) {
    const index = parseInt(card.dataset.index);
    const image = card.dataset.image;

    // Computer sees the card and might remember it based on difficulty
    if (Math.random() > computerMemory.forgetChance) {
        computerMemory.seen.set(index, image);
    }
}

function checkForMatch() {
    if (flippedCards.length !== 2) return;

    const [card1, card2] = flippedCards;
    const image1 = card1.dataset.image;
    const image2 = card2.dataset.image;

    if (image1 === image2) {
        // Match found!
        handleMatch(card1, card2);
    } else {
        // No match
        handleNoMatch(card1, card2);
    }

    flippedCards = [];
}

function handleMatch(card1, card2) {
    // Mark cards as matched
    card1.classList.add('matched');
    card2.classList.add('matched');

    // Add player color
    const playerClass = gameMode === 'solo' ?
        (isComputerTurn ? 'computer' : 'player1') :
        `player${currentPlayer}`;

    card1.classList.add(playerClass);
    card2.classList.add(playerClass);

    matchedCards.push(card1, card2);

    // Update score
    if (gameMode === 'solo') {
        if (isComputerTurn) {
            scores.computer++;
        } else {
            scores.player1++;
        }
    } else {
        scores[`player${currentPlayer}`]++;
    }

    updateUI();

    // Check if game is over
    if (matchedCards.length === 16) {
        setTimeout(() => endGame(), 500);
        return;
    }

    // Player gets another turn if they made a match
    if (gameMode === 'solo' && !isComputerTurn) {
        // Player continues
    } else if (gameMode === 'solo' && isComputerTurn) {
        // Computer continues, schedule next move
        setTimeout(() => computerMove(), 1500);
    }
    // In multiplayer, current player continues
}

function handleNoMatch(card1, card2) {
    // Flip cards back over
    setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');

        // Switch turns
        if (gameMode === 'solo') {
            isComputerTurn = !isComputerTurn;
            updateTurnIndicator();

            if (isComputerTurn) {
                setTimeout(() => computerMove(), 1000);
            }
        } else {
            currentPlayer = currentPlayer === 1 ? 2 : 1;
            updateTurnIndicator();
        }
    }, 1000);
}

// Computer AI logic
function computerMove() {
    if (!isGameActive || !isComputerTurn) return;

    const availableCards = Array.from(document.querySelectorAll('.card:not(.matched):not(.flipped)'));

    if (availableCards.length === 0) return;

    // Try to find a match from memory
    const matchFromMemory = findMatchFromMemory(availableCards);

    if (matchFromMemory.length === 2) {
        // Computer knows a match!
        setTimeout(() => {
            flipCard(matchFromMemory[0]);
            flippedCards.push(matchFromMemory[0]);

            setTimeout(() => {
                flipCard(matchFromMemory[1]);
                flippedCards.push(matchFromMemory[1]);

                setTimeout(() => checkForMatch(), 1000);
            }, 800);
        }, 500);
    } else {
        // Pick random cards
        const shuffledCards = [...availableCards];
        shuffleArray(shuffledCards);

        setTimeout(() => {
            const card1 = shuffledCards[0];
            flipCard(card1);
            flippedCards.push(card1);
            rememberCardForComputer(card1);

            setTimeout(() => {
                const remainingCards = shuffledCards.filter(c => c !== card1 && !c.classList.contains('flipped'));
                if (remainingCards.length > 0) {
                    const card2 = remainingCards[0];
                    flipCard(card2);
                    flippedCards.push(card2);
                    rememberCardForComputer(card2);

                    setTimeout(() => checkForMatch(), 1000);
                }
            }, 800);
        }, 500);
    }
}

function findMatchFromMemory(availableCards) {
    const knownCards = [];

    for (const card of availableCards) {
        const index = parseInt(card.dataset.index);
        if (computerMemory.seen.has(index)) {
            knownCards.push({
                card: card,
                image: computerMemory.seen.get(index)
            });
        }
    }

    // Look for matching pairs
    for (let i = 0; i < knownCards.length; i++) {
        for (let j = i + 1; j < knownCards.length; j++) {
            if (knownCards[i].image === knownCards[j].image) {
                return [knownCards[i].card, knownCards[j].card];
            }
        }
    }

    return [];
}

function endGame() {
    isGameActive = false;

    let winner = '';
    let message = '';

    if (gameMode === 'solo') {
        if (scores.player1 > scores.computer) {
            winner = '🎉 You Win!';
            message = `You: ${scores.player1} | Computer: ${scores.computer}`;
        } else if (scores.computer > scores.player1) {
            winner = '🤖 Computer Wins!';
            message = `You: ${scores.player1} | Computer: ${scores.computer}`;
        } else {
            winner = '🤝 It\'s a Tie!';
            message = `Both: ${scores.player1} matches`;
        }
    } else {
        if (scores.player1 > scores.player2) {
            winner = '🎉 Player 1 Wins!';
            message = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;
        } else if (scores.player2 > scores.player1) {
            winner = '🎉 Player 2 Wins!';
            message = `Player 1: ${scores.player1} | Player 2: ${scores.player2}`;
        } else {
            winner = '🤝 It\'s a Tie!';
            message = `Both players: ${scores.player1} matches`;
        }
    }

    document.getElementById('gameOverTitle').textContent = winner;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverModal').classList.remove('hidden');
}

function resetGame() {
    document.getElementById('gameOverModal').classList.add('hidden');

    if (document.getElementById('gameScreen').classList.contains('hidden')) {
        return; // Don't reset if not in game
    }

    initializeGame();
}

// Utility functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Add some fun sound effects (using Web Audio API for simple beeps)
function playSound(frequency, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Silently fail if audio context is not available
    }
}

// Add sound effects to card flips and matches
document.addEventListener('click', function (e) {
    if (e.target.closest('.card')) {
        playSound(800, 0.1); // Flip sound
    }

    if (e.target.closest('.pink-button')) {
        playSound(600, 0.15); // Button sound
    }
});

// Monitor for matches to play success sound
let lastMatchCount = 0;
setInterval(() => {
    if (matchedCards.length > lastMatchCount) {
        playSound(1000, 0.3); // Match sound
        lastMatchCount = matchedCards.length;
    }
}, 100); 