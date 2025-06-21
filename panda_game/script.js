// Game Constants
const GAME_CONFIG = {
    PANDAS: [
        { name: 'pepa', image: 'images/pandas/pepa.png' },
        { name: 'fudge', image: 'images/pandas/fudge.png' },
        { name: 'mr coco', image: 'images/pandas/mr_coco.png' },
        { name: 'lil lilly', image: 'images/pandas/lil_lilly.png' },
        { name: 'lil willy', image: 'images/pandas/lil_willy.png' },
        { name: 'joey', image: 'images/pandas/joey.png' },
        { name: 'jake', image: 'images/pandas/jake.jpg' },
        { name: 'momma and baby bobby', image: 'images/pandas/momma_and_baby_bobby.png' },
        { name: 'mr muchalot', image: 'images/pandas/mr_muchalot.jpg' },
        { name: 'sky', image: 'images/pandas/sky.jpg' }
    ],
    INITIAL_BAMBOO: 10,
    BAMBOO_REGEN_RATE: 2000, // milliseconds
    BAMBOO_REGEN_AMOUNT: 1,
    MAX_BAMBOO: 20,
    PANDA_NEED_INTERVAL: 5000, // initial need generation interval
    PANDA_PATIENCE_TIME: 15000, // time before panda gets sad
    PANDA_ANGRY_TIME: 25000, // time before panda gets angry
    PANDA_LEAVE_TIME: 35000, // time before panda leaves
    MAX_PANDAS_LOST: 3,
    DIFFICULTY_INCREASE_INTERVAL: 20000, // increase difficulty every 20 seconds  
    DIFFICULTY_MULTIPLIER: 0.75 // multiply intervals by this each difficulty increase (more aggressive)
};

// Game State
let gameState = {
    currentScreen: 'start',
    gameActive: false,
    gamePaused: false,
    score: 0,
    bambooCount: GAME_CONFIG.INITIAL_BAMBOO,
    pandasLost: 0,
    gameTime: 0,
    currentMode: 'feed',
    pandas: [],
    highScore: parseInt(localStorage.getItem('pandaPlaytimeHighScore')) || 0,
    difficultyLevel: 1,
    lastDifficultyIncrease: 0
};

// Game Timers
let gameTimers = {
    gameTimer: null,
    bambooRegenTimer: null,
    difficultyTimer: null
};

// DOM Elements
const elements = {
    screens: {
        start: document.getElementById('startScreen'),
        instructions: document.getElementById('instructionsScreen'),
        game: document.getElementById('gameScreen'),
        gameOver: document.getElementById('gameOverScreen'),
        pause: document.getElementById('pauseScreen')
    },
    buttons: {
        startGame: document.getElementById('startGameBtn'),
        instructions: document.getElementById('instructionsBtn'),
        backToStart: document.getElementById('backToStartBtn'),
        pause: document.getElementById('pauseBtn'),
        resume: document.getElementById('resumeBtn'),
        quitToMenu: document.getElementById('quitToMenuBtn'),
        playAgain: document.getElementById('playAgainBtn'),
        backToMenu: document.getElementById('backToMenuBtn'),
        feedMode: document.getElementById('feedModeBtn'),
        playMode: document.getElementById('playModeBtn')
    },
    game: {
        pandaGrid: document.getElementById('pandaGrid'),
        bambooCount: document.getElementById('bambooCount'),
        currentScore: document.getElementById('currentScore'),
        pandasLost: document.getElementById('pandasLost'),
        gameTime: document.getElementById('gameTime'),
        difficultyLevel: document.getElementById('difficultyLevel')
    },
    display: {
        highScore: document.getElementById('displayHighScore'),
        finalScore: document.getElementById('finalScore'),
        finalTime: document.getElementById('finalTime'),
        newHighScore: document.getElementById('newHighScore')
    },
    audio: {
        backgroundMusic: document.getElementById('backgroundMusic')
    }
};

// Panda Class
class Panda {
    constructor(data, slotIndex) {
        this.name = data.name;
        this.image = data.image;
        this.slotIndex = slotIndex;
        this.needType = null; // 'hungry' or 'play'
        this.needStartTime = null;
        this.feeling = 'happy'; // 'happy', 'sad', 'angry'
        this.element = null;
        this.needTimer = null;
        this.feelingTimer = null;
        this.leaveTimer = null;

        this.createElement();
        this.scheduleNextNeed();
    }

    createElement() {
        const slot = document.createElement('div');
        slot.className = 'panda-slot';
        slot.dataset.slotIndex = this.slotIndex;

        slot.innerHTML = `
            <img src="${this.image}" alt="${this.name}" class="panda-image">
            <div class="panda-name">${this.name}</div>
            <div class="thought-bubble" style="display: none;">
                <img src="" alt="" class="need-icon">
            </div>
            <img src="" alt="" class="feeling-icon" style="display: none;">
        `;

        slot.addEventListener('click', () => this.handleClick());
        this.element = slot;

        // Show happy feeling initially
        this.updateFeelingIcon();
    }

    scheduleNextNeed() {
        if (!gameState.gameActive || gameState.gamePaused) return;

        const baseInterval = GAME_CONFIG.PANDA_NEED_INTERVAL;
        const adjustedInterval = baseInterval * Math.pow(GAME_CONFIG.DIFFICULTY_MULTIPLIER, gameState.difficultyLevel - 1);
        // Add more randomness and stagger pandas better - between 50% and 150% of the base interval
        const randomDelay = adjustedInterval * (0.5 + Math.random());

        this.needTimer = setTimeout(() => {
            this.generateNeed();
        }, randomDelay);
    }

    generateNeed() {
        if (!gameState.gameActive || gameState.gamePaused || this.needType) return;

        this.needType = Math.random() < 0.5 ? 'hungry' : 'play';
        this.needStartTime = Date.now();
        this.feeling = 'happy';

        this.showNeed();
        this.scheduleFeeling();
        this.element.classList.add('needy');
    }

    showNeed() {
        const thoughtBubble = this.element.querySelector('.thought-bubble');
        const needIcon = thoughtBubble.querySelector('.need-icon');

        const iconSrc = this.needType === 'hungry'
            ? 'images/panda_needs_icons/panda_is_hungry_icon.png'
            : 'images/panda_needs_icons/panda_wants_to_play_icon.png';

        needIcon.src = iconSrc;
        thoughtBubble.style.display = 'flex';
    }

    hideNeed() {
        const thoughtBubble = this.element.querySelector('.thought-bubble');
        thoughtBubble.style.display = 'none';
        this.element.classList.remove('needy');
    }

    scheduleFeeling() {
        // Schedule sad feeling
        this.feelingTimer = setTimeout(() => {
            if (this.needType && gameState.gameActive && !gameState.gamePaused) {
                this.feeling = 'sad';
                this.updateFeelingIcon();

                // Schedule angry feeling
                this.feelingTimer = setTimeout(() => {
                    if (this.needType && gameState.gameActive && !gameState.gamePaused) {
                        this.feeling = 'angry';
                        this.updateFeelingIcon();
                        this.element.classList.add('angry');

                        // Schedule leaving
                        this.leaveTimer = setTimeout(() => {
                            if (this.needType && gameState.gameActive && !gameState.gamePaused) {
                                this.leave();
                            }
                        }, GAME_CONFIG.PANDA_LEAVE_TIME - GAME_CONFIG.PANDA_ANGRY_TIME);
                    }
                }, GAME_CONFIG.PANDA_ANGRY_TIME - GAME_CONFIG.PANDA_PATIENCE_TIME);
            }
        }, GAME_CONFIG.PANDA_PATIENCE_TIME);
    }

    updateFeelingIcon() {
        const feelingIcon = this.element.querySelector('.feeling-icon');

        if (this.feeling === 'happy') {
            feelingIcon.style.display = 'none';
        } else {
            const iconSrc = `images/panda_feelings_icons/panda_is_${this.feeling}_icon.png`;
            feelingIcon.src = iconSrc;
            feelingIcon.style.display = 'block';
        }
    }

    handleClick() {
        if (!this.needType || gameState.gamePaused || !gameState.gameActive) return;

        const canFeed = gameState.currentMode === 'feed' && this.needType === 'hungry' && gameState.bambooCount > 0;
        const canPlay = gameState.currentMode === 'play' && this.needType === 'play';

        if (canFeed) {
            this.feed();
        } else if (canPlay) {
            this.play();
        }
    }

    feed() {
        if (gameState.bambooCount <= 0) return;

        gameState.bambooCount--;
        gameState.score++;
        this.satisfyNeed();
        updateUI();
        playFeedSound();
    }

    play() {
        gameState.score++;
        this.satisfyNeed();
        updateUI();
        playPlaySound();
    }

    satisfyNeed() {
        this.needType = null;
        this.needStartTime = null;
        this.feeling = 'happy';

        this.hideNeed();
        this.updateFeelingIcon();
        this.clearTimers();
        this.element.classList.remove('angry');

        // Schedule next need
        this.scheduleNextNeed();
    }

    leave() {
        gameState.pandasLost++;
        updateUI();

        // Remove this panda and create a new one
        this.destroy();
        const newPandaData = getRandomPanda();
        const newPanda = new Panda(newPandaData, this.slotIndex);
        gameState.pandas[this.slotIndex] = newPanda;

        const gridSlots = elements.game.pandaGrid.children;
        gridSlots[this.slotIndex].replaceWith(newPanda.element);

        if (gameState.pandasLost >= GAME_CONFIG.MAX_PANDAS_LOST) {
            endGame();
        }
    }

    clearTimers() {
        if (this.needTimer) clearTimeout(this.needTimer);
        if (this.feelingTimer) clearTimeout(this.feelingTimer);
        if (this.leaveTimer) clearTimeout(this.leaveTimer);
    }

    destroy() {
        this.clearTimers();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    pause() {
        this.clearTimers();
    }

    resume() {
        if (this.needType) {
            const elapsed = Date.now() - this.needStartTime;
            const remainingPatience = GAME_CONFIG.PANDA_PATIENCE_TIME - elapsed;
            const remainingAngry = GAME_CONFIG.PANDA_ANGRY_TIME - elapsed;
            const remainingLeave = GAME_CONFIG.PANDA_LEAVE_TIME - elapsed;

            if (remainingLeave <= 0) {
                this.leave();
                return;
            }

            if (remainingAngry <= 0 && this.feeling !== 'angry') {
                this.feeling = 'angry';
                this.updateFeelingIcon();
                this.element.classList.add('angry');
                this.leaveTimer = setTimeout(() => this.leave(), remainingLeave);
            } else if (remainingPatience <= 0 && this.feeling === 'happy') {
                this.feeling = 'sad';
                this.updateFeelingIcon();
                this.feelingTimer = setTimeout(() => {
                    this.feeling = 'angry';
                    this.updateFeelingIcon();
                    this.element.classList.add('angry');
                    this.leaveTimer = setTimeout(() => this.leave(), GAME_CONFIG.PANDA_LEAVE_TIME - GAME_CONFIG.PANDA_ANGRY_TIME);
                }, remainingAngry - remainingPatience);
            } else if (this.feeling === 'happy') {
                this.scheduleFeeling();
            }
        } else {
            this.scheduleNextNeed();
        }
    }
}

// Utility Functions
function getRandomPanda() {
    return GAME_CONFIG.PANDAS[Math.floor(Math.random() * GAME_CONFIG.PANDAS.length)];
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Screen Management Functions
function showScreen(screenName) {
    Object.values(elements.screens).forEach(screen => {
        screen.classList.remove('active');
    });
    elements.screens[screenName].classList.add('active');
    gameState.currentScreen = screenName;

    // Update high score display when showing start screen
    if (screenName === 'start') {
        // Reload high score from localStorage in case it was updated
        gameState.highScore = parseInt(localStorage.getItem('pandaPlaytimeHighScore')) || 0;
        elements.display.highScore.textContent = gameState.highScore;
    }
}

// Game Functions
function initializeGame() {
    // Stop any existing music
    stopBackgroundMusic();

    // Reset game state
    gameState.gameActive = false;
    gameState.gamePaused = false;
    gameState.score = 0;
    gameState.bambooCount = GAME_CONFIG.INITIAL_BAMBOO;
    gameState.pandasLost = 0;
    gameState.gameTime = 0;
    gameState.currentMode = 'feed';
    gameState.difficultyLevel = 1;
    gameState.lastDifficultyIncrease = 0;

    // Clear existing pandas
    gameState.pandas.forEach(panda => panda && panda.destroy());
    gameState.pandas = [];

    // Clear timers
    Object.values(gameTimers).forEach(timer => {
        if (timer) clearInterval(timer);
    });

    // Create panda grid
    createPandaGrid();

    // Set initial mode
    setGameMode('feed');

    // Start game
    gameState.gameActive = true;
    startGameTimers();
    startBackgroundMusic();
    updateUI();
}

function createPandaGrid() {
    elements.game.pandaGrid.innerHTML = '';

    // Randomly select 9 pandas
    const shuffledPandas = shuffleArray(GAME_CONFIG.PANDAS);
    const selectedPandas = shuffledPandas.slice(0, 9);

    selectedPandas.forEach((pandaData, index) => {
        const panda = new Panda(pandaData, index);
        gameState.pandas[index] = panda;
        elements.game.pandaGrid.appendChild(panda.element);

        // Clear the initial timer and set a staggered start for each panda
        if (panda.needTimer) {
            clearTimeout(panda.needTimer);
        }

        // Stagger initial needs - spread them over the first 10 seconds
        const initialDelay = Math.random() * 10000;
        panda.needTimer = setTimeout(() => {
            panda.generateNeed();
        }, initialDelay);
    });
}

function startGameTimers() {
    // Game timer
    gameTimers.gameTimer = setInterval(() => {
        if (!gameState.gamePaused && gameState.gameActive) {
            gameState.gameTime++;
            updateUI();
        }
    }, 1000);

    // Bamboo regeneration timer
    gameTimers.bambooRegenTimer = setInterval(() => {
        if (!gameState.gamePaused && gameState.gameActive) {
            if (gameState.bambooCount < GAME_CONFIG.MAX_BAMBOO) {
                gameState.bambooCount = Math.min(
                    gameState.bambooCount + GAME_CONFIG.BAMBOO_REGEN_AMOUNT,
                    GAME_CONFIG.MAX_BAMBOO
                );
                updateUI();
            }
        }
    }, GAME_CONFIG.BAMBOO_REGEN_RATE);

    // Difficulty increase timer
    gameTimers.difficultyTimer = setInterval(() => {
        if (!gameState.gamePaused && gameState.gameActive) {
            gameState.difficultyLevel++;
            gameState.lastDifficultyIncrease = gameState.gameTime;

            // Visual feedback for difficulty increase
            if (elements.game.difficultyLevel) {
                elements.game.difficultyLevel.style.color = '#ff0000';
                elements.game.difficultyLevel.style.transform = 'scale(1.5)';
                setTimeout(() => {
                    if (elements.game.difficultyLevel) {
                        elements.game.difficultyLevel.style.color = '';
                        elements.game.difficultyLevel.style.transform = '';
                    }
                }, 1000);
            }

            // Play a sound effect for difficulty increase
            playSound(800, 0.1, 'sawtooth', 0.1);

            updateUI();
        }
    }, GAME_CONFIG.DIFFICULTY_INCREASE_INTERVAL);
}

function pauseGame() {
    gameState.gamePaused = true;
    gameState.pandas.forEach(panda => panda && panda.pause());
    showScreen('pause');
}

function resumeGame() {
    gameState.gamePaused = false;
    gameState.pandas.forEach(panda => panda && panda.resume());
    showScreen('game');
}

function endGame() {
    gameState.gameActive = false;
    gameState.gamePaused = false;

    // Stop background music
    stopBackgroundMusic();

    // Clear timers
    Object.values(gameTimers).forEach(timer => {
        if (timer) clearInterval(timer);
    });

    // Clear panda timers
    gameState.pandas.forEach(panda => panda && panda.clearTimers());

    // Check for high score
    const isNewHighScore = gameState.score > gameState.highScore;
    if (isNewHighScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('pandaPlaytimeHighScore', gameState.highScore.toString());
        elements.display.newHighScore.classList.remove('hidden');
    } else {
        elements.display.newHighScore.classList.add('hidden');
    }

    // Update final stats
    elements.display.finalScore.textContent = gameState.score;
    elements.display.finalTime.textContent = gameState.gameTime;

    showScreen('gameOver');
}

function setGameMode(mode) {
    if (gameState.currentMode !== mode) {
        playModeChangeSound();
    }

    gameState.currentMode = mode;

    // Update button states
    elements.buttons.feedMode.classList.toggle('active', mode === 'feed');
    elements.buttons.playMode.classList.toggle('active', mode === 'play');

    // Update body class for cursor
    document.body.className = `${mode}-mode`;
}

function updateUI() {
    elements.game.bambooCount.textContent = gameState.bambooCount;
    elements.game.currentScore.textContent = gameState.score;
    elements.game.pandasLost.textContent = gameState.pandasLost;
    elements.game.gameTime.textContent = gameState.gameTime;
    elements.game.difficultyLevel.textContent = gameState.difficultyLevel;
    elements.display.highScore.textContent = gameState.highScore;
}

// Event Listeners
function setupEventListeners() {
    // Navigation buttons
    elements.buttons.startGame.addEventListener('click', () => {
        initializeGame();
        showScreen('game');
    });

    elements.buttons.instructions.addEventListener('click', () => {
        showScreen('instructions');
    });

    elements.buttons.backToStart.addEventListener('click', () => {
        showScreen('start');
    });

    // Game control buttons
    elements.buttons.pause.addEventListener('click', pauseGame);
    elements.buttons.resume.addEventListener('click', resumeGame);
    elements.buttons.quitToMenu.addEventListener('click', () => {
        stopBackgroundMusic();
        endGame();
        showScreen('start');
    });

    // Game over buttons
    elements.buttons.playAgain.addEventListener('click', () => {
        initializeGame();
        showScreen('game');
    });

    elements.buttons.backToMenu.addEventListener('click', () => {
        showScreen('start');
    });

    // Mode selection buttons
    elements.buttons.feedMode.addEventListener('click', () => {
        setGameMode('feed');
    });

    elements.buttons.playMode.addEventListener('click', () => {
        setGameMode('play');
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameState.gameActive) return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                if (gameState.gamePaused) {
                    resumeGame();
                } else {
                    // Toggle between feed and play modes
                    const newMode = gameState.currentMode === 'feed' ? 'play' : 'feed';
                    setGameMode(newMode);
                }
                break;
            case '1':
                setGameMode('feed');
                break;
            case '2':
                setGameMode('play');
                break;
            case 'Escape':
                if (gameState.currentScreen === 'pause') {
                    resumeGame();
                } else if (gameState.gameActive) {
                    pauseGame();
                }
                break;
        }
    });
}

// Sound Functions - Create a single reusable audio context
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
            return null;
        }
    }
    return audioContext;
}

function playSound(frequency, duration, type = 'sine', volume = 0.1) {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        // Resume context if it's suspended (required by some browsers)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);

    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

function playFeedSound() {
    playSound(523, 0.3, 'sine', 0.15); // C note - longer and louder
}

function playPlaySound() {
    playSound(659, 0.3, 'triangle', 0.15); // E note - longer and louder
}

function playModeChangeSound() {
    playSound(440, 0.2, 'square', 0.1); // A note
}

// Background Music Functions
function startBackgroundMusic() {
    if (elements.audio.backgroundMusic) {
        elements.audio.backgroundMusic.volume = 0.5; // Half volume
        elements.audio.backgroundMusic.currentTime = 0; // Start from beginning

        // Try to play, handling browser autoplay policies
        const playPromise = elements.audio.backgroundMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Autoplay prevented:', error);
                // Music will start when user interacts with the page
            });
        }
    }
}

function stopBackgroundMusic() {
    if (elements.audio.backgroundMusic) {
        elements.audio.backgroundMusic.pause();
        elements.audio.backgroundMusic.currentTime = 0;
    }
}

// Initialize the game
function init() {
    setupEventListeners();
    updateUI();
    showScreen('start');

    // Set up music to start on first user interaction if needed
    let musicStarted = false;
    function startMusicOnInteraction() {
        if (!musicStarted && gameState.gameActive && elements.audio.backgroundMusic) {
            const playPromise = elements.audio.backgroundMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    musicStarted = true;
                    document.removeEventListener('click', startMusicOnInteraction);
                    document.removeEventListener('keydown', startMusicOnInteraction);
                }).catch(() => {
                    // Still couldn't play
                });
            }
        }
    }

    document.addEventListener('click', startMusicOnInteraction);
    document.addEventListener('keydown', startMusicOnInteraction);
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', init); 