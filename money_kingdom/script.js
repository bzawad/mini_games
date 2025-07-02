// Game State
let gameState = {
    currentPhase: 1,
    inventory: [],
    itemsFound: 0,
    flowerCount: 0,
    bunnyCount: 0,
    tshirtCount: 0,
    moneyGuyClicks: 0,
    gameArea: null,
    isPaused: false,
    jumpscareTriggered: false
};

// Item definitions
const items = {
    pinkFlower: { name: 'Pink Flower', image: 'images/pink_flower.png', required: 1 },
    greenBunny: { name: 'Green Bunny', image: 'images/green_bunny.png', required: 3 },
    tshirt: { name: 'T-Shirt', image: 'images/t-shirt.png', required: 1 }
};

// Phase configurations
const phases = {
    1: {
        background: 'phase-1',
        moneyGuyImage: 'images/money_king_normal.png',
        moneyGuyMessage: "Hello! Nothing here!",
        items: [
            { type: 'pinkFlower', x: 20, y: 30, size: 80 },
            { type: 'greenBunny', x: 70, y: 20, size: 70 },
            { type: 'greenBunny', x: 15, y: 70, size: 70 },
            { type: 'greenBunny', x: 75, y: 75, size: 70 },
            { type: 'tshirt', x: 45, y: 50, size: 90 }
        ],
        moneyGuy: { x: 50, y: 40, size: 100 }
    },
    2: {
        background: 'phase-2',
        moneyGuyImage: 'images/money_king_normal.png',
        moneyGuyMessage: "Hehe… what did I say last time? There's nothing here!",
        items: [
            { type: 'pinkFlower', x: 25, y: 25, size: 80 },
            { type: 'greenBunny', x: 75, y: 15, size: 70 },
            { type: 'greenBunny', x: 20, y: 75, size: 70 },
            { type: 'greenBunny', x: 70, y: 80, size: 70 },
            { type: 'tshirt', x: 50, y: 45, size: 90 }
        ],
        moneyGuy: { x: 45, y: 35, size: 100 }
    },
    3: {
        background: 'phase-3',
        moneyGuyImage: 'images/money_king_normal.png',
        moneyGuyMessage: "You shouldn't have clicked me...",
        items: [
            { type: 'pinkFlower', x: 30, y: 20, size: 80 },
            { type: 'greenBunny', x: 80, y: 25, size: 70 },
            { type: 'greenBunny', x: 25, y: 80, size: 70 },
            { type: 'greenBunny', x: 65, y: 70, size: 70 },
            { type: 'tshirt', x: 55, y: 40, size: 90 }
        ],
        moneyGuy: { x: 40, y: 30, size: 100 }
    }
};

// Audio elements
let backgroundMusic, scareSound;

// Initialize game
document.addEventListener('DOMContentLoaded', function () {
    backgroundMusic = document.getElementById('backgroundMusic');
    scareSound = document.getElementById('scareSound');
    initializeGame();
    setupEventListeners();
});

function initializeGame() {
    gameState.gameArea = document.getElementById('gameArea');
    updateStats();
    updateInventory();
}

function setupEventListeners() {
    // Start screen buttons
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('instructionsBtn').addEventListener('click', showInstructions);

    // Instructions screen
    document.getElementById('backToStartBtn').addEventListener('click', showStartScreen);

    // Game screen
    document.getElementById('pauseBtn').addEventListener('click', togglePause);

    // Pause screen
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('quitToMenuBtn').addEventListener('click', quitToMenu);

    // Add continue button event
    document.getElementById('continuePhaseBtn').addEventListener('click', function () {
        if (!this.disabled) startNextPhase();
    });
}

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    document.getElementById(screenId).classList.add('active');
}

function showStartScreen() {
    showScreen('startScreen');
    // Stop all music and scare sound
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    if (scareSound) {
        scareSound.pause();
        scareSound.currentTime = 0;
    }
}

function showInstructions() {
    showScreen('instructionsScreen');
}

function startGame() {
    showScreen('gameScreen');
    loadPhase(1);
    // Play background music
    if (backgroundMusic) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
        backgroundMusic.loop = true;
    }
    // Stop scare sound if it was playing
    if (scareSound) {
        scareSound.pause();
        scareSound.currentTime = 0;
    }
}

function loadPhase(phaseNumber) {
    gameState.currentPhase = phaseNumber;
    // Reset inventory and counts for new phase
    gameState.inventory = [];
    gameState.itemsFound = 0;
    gameState.flowerCount = 0;
    gameState.bunnyCount = 0;
    gameState.tshirtCount = 0;
    gameState.jumpscareTriggered = false;
    updateInventory();
    const phase = phases[phaseNumber];

    // Update game area background
    gameState.gameArea.className = `game-area ${phase.background}`;

    // Clear existing objects
    gameState.gameArea.innerHTML = '';

    // Add items
    phase.items.forEach(item => {
        createGameObject(item);
    });

    // Add money guy
    createMoneyGuy(phase.moneyGuy, phase.moneyGuyImage);

    // Update stats
    updateStats();
}

function createGameObject(itemConfig) {
    const item = items[itemConfig.type];
    const element = document.createElement('div');
    element.className = 'game-object';
    element.style.left = itemConfig.x + '%';
    element.style.top = itemConfig.y + '%';
    element.style.width = itemConfig.size + 'px';
    element.style.height = itemConfig.size + 'px';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    element.appendChild(img);

    element.addEventListener('click', () => collectItem(itemConfig.type, element));

    gameState.gameArea.appendChild(element);
}

function createMoneyGuy(config, imageSrc) {
    const element = document.createElement('div');
    element.className = 'money-guy';
    element.style.left = config.x + '%';
    element.style.top = config.y + '%';
    element.style.width = config.size + 'px';
    element.style.height = config.size + 'px';

    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Money Guy';
    element.appendChild(img);

    element.addEventListener('click', () => clickMoneyGuy());

    gameState.gameArea.appendChild(element);
}

function collectItem(itemType, element) {
    if (element.classList.contains('collected')) return;
    // Prevent collecting after jumpscare
    if (gameState.jumpscareTriggered) return;

    const item = items[itemType];
    const currentCount = gameState.inventory.filter(i => i.type === itemType).length;

    if (currentCount < item.required) {
        // Add to inventory
        gameState.inventory.push({ type: itemType, name: item.name, image: item.image });

        // Mark as collected
        element.classList.add('collected');

        // Update counts
        gameState.itemsFound++;
        if (itemType === 'pinkFlower') gameState.flowerCount++;
        if (itemType === 'greenBunny') gameState.bunnyCount++;
        if (itemType === 'tshirt') gameState.tshirtCount++;

        // Update UI
        updateStats();
        updateInventory();

        // Phase 3: jumpscare after collecting 4th item
        if (
            gameState.currentPhase === 3 &&
            gameState.itemsFound === 4 &&
            !gameState.jumpscareTriggered
        ) {
            gameState.jumpscareTriggered = true;
            setTimeout(() => showJumpscare(), 400); // slight delay for effect
            return;
        }

        // If last item in phase 1 or 2, trigger money animation
        if (
            (gameState.currentPhase === 1 || gameState.currentPhase === 2) &&
            isPhaseComplete()
        ) {
            if (gameState.currentPhase === 1) {
                animateMoneyBills(['images/100_dollar_bill_normal.png']);
            } else if (gameState.currentPhase === 2) {
                animateMoneyBills(['images/50_dollar_bill_normal.png']);
            }
            // Delay phase transition to let money fall
            setTimeout(() => {
                showPhaseTransition();
            }, 1200);
            return;
        }

        // Check if phase is complete (for phases 1 and 2 only)
        if (isPhaseComplete() && gameState.currentPhase < 3) {
            setTimeout(() => {
                showPhaseTransition();
            }, 1000);
        }
    }
}

function clickMoneyGuy() {
    gameState.moneyGuyClicks++;
    const phase = phases[gameState.currentPhase];

    if (gameState.currentPhase === 3 && gameState.moneyGuyClicks >= 3) {
        // Final jumpscare
        showJumpscare();
    } else {
        // Show message
        showMoneyGuyMessage(phase.moneyGuyMessage);
    }
}

function showMoneyGuyMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.background = 'rgba(0, 0, 0, 0.9)';
    messageDiv.style.color = '#ffd700';
    messageDiv.style.padding = '20px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.border = '2px solid #ffd700';
    messageDiv.style.fontSize = '1.2rem';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '1000';
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function showJumpscare() {
    showScreen('jumpscareScreen');
    // Stop background music and play scare sound
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    if (scareSound) {
        scareSound.currentTime = 0;
        scareSound.play();
    }
    // Add screen shake effect
    document.body.style.animation = 'shake 0.5s ease-in-out';
    // Animate scary money faces
    animateMoneyBills(['images/money_king_scary.png', 'images/100_dollar_bill_scary.png', 'images/50_dollar_bill_scary.png'], 20);
    // Stay on jumpscare for 5 seconds, then return to title
    setTimeout(() => {
        document.body.style.animation = '';
        showStartScreen();
    }, 5000);
}

function isPhaseComplete() {
    return gameState.flowerCount >= items.pinkFlower.required &&
        gameState.bunnyCount >= items.greenBunny.required &&
        gameState.tshirtCount >= items.tshirt.required;
}

function showPhaseTransition() {
    const transitionScreen = document.getElementById('phaseTransitionScreen');
    const title = document.getElementById('transitionTitle');
    const message = document.getElementById('transitionMessage');
    const progressBar = document.getElementById('transitionBar');
    const continueBtn = document.getElementById('continuePhaseBtn');

    continueBtn.disabled = true;
    continueBtn.style.opacity = 0.5;

    if (gameState.currentPhase === 1) {
        title.textContent = 'Phase 1 Complete!';
        message.textContent = 'The ground begins to shake...';
    } else if (gameState.currentPhase === 2) {
        title.textContent = 'Phase 2 Complete!';
        message.textContent = 'Everything is getting darker...';
    }

    showScreen('phaseTransitionScreen');

    // Animate progress bar
    let progress = 0;
    progressBar.style.width = '0%';
    const interval = setInterval(() => {
        progress += 2;
        progressBar.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            continueBtn.disabled = false;
            continueBtn.style.opacity = 1;
        }
    }, 50);
}

function startNextPhase() {
    if (gameState.currentPhase < 3) {
        loadPhase(gameState.currentPhase + 1);
        showScreen('gameScreen');
    } else {
        showStartScreen();
    }
}

function updateStats() {
    document.getElementById('currentPhase').textContent = gameState.currentPhase;
    document.getElementById('itemsFound').textContent = gameState.itemsFound;
    document.getElementById('flowerCount').textContent = gameState.flowerCount;
    document.getElementById('bunnyCount').textContent = gameState.bunnyCount;
    document.getElementById('tshirtCount').textContent = gameState.tshirtCount;
}

function updateInventory() {
    const inventoryContainer = document.getElementById('inventoryItems');
    inventoryContainer.innerHTML = '';

    gameState.inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';

        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        itemElement.appendChild(img);

        inventoryContainer.appendChild(itemElement);
    });
}

function togglePause() {
    if (gameState.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    gameState.isPaused = true;
    showScreen('pauseScreen');
}

function resumeGame() {
    gameState.isPaused = false;
    showScreen('gameScreen');
}

function quitToMenu() {
    gameState.isPaused = false;
    showStartScreen();
}

// Helper: Animate money bills or faces flying/exploding across the screen
function animateMoneyBills(imageList, count = 12) {
    for (let i = 0; i < count; i++) {
        const img = document.createElement('img');
        img.src = imageList[Math.floor(Math.random() * imageList.length)];
        img.className = 'flying-money';
        img.style.position = 'fixed';
        img.style.left = Math.random() * 80 + 10 + 'vw';
        img.style.top = '-10vh';
        img.style.width = '120px';
        img.style.height = 'auto';
        img.style.zIndex = 2000;
        img.style.pointerEvents = 'none';
        document.body.appendChild(img);
        // Animate falling and spinning
        const duration = 1200 + Math.random() * 800;
        const rotate = Math.random() * 720 - 360;
        img.animate([
            { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
            { transform: `translateY(90vh) rotate(${rotate}deg)`, opacity: 0.7 }
        ], {
            duration: duration,
            easing: 'ease-in',
            fill: 'forwards'
        });
        setTimeout(() => img.remove(), duration + 200);
    }
}

// Add CSS for flying-money if not present
if (!document.querySelector('#flying-money-style')) {
    const style = document.createElement('style');
    style.id = 'flying-money-style';
    style.textContent = `
        .flying-money {
            pointer-events: none;
            position: fixed;
            will-change: transform, opacity;
            filter: drop-shadow(0 0 8px #ffd700);
            transition: opacity 0.3s;
            width: 120px !important;
            height: auto !important;
        }
    `;
    document.head.appendChild(style);
}

// Add shake animation to CSS if not already present
if (!document.querySelector('#shake-animation')) {
    const style = document.createElement('style');
    style.id = 'shake-animation';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
    `;
    document.head.appendChild(style);
} 