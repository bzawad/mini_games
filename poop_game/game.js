// Sound Effects System
class SoundEffects {
    constructor() {
        this.audioContext = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSound(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playLaserShoot() {
        // Laser shooting sound - quick high-pitched zap
        this.playSound(800, 0.1, 'sawtooth', 0.2);
        setTimeout(() => {
            this.playSound(600, 0.05, 'sawtooth', 0.15);
        }, 50);
    }

    playHit() {
        // Hit sound - impact with slight echo
        this.playSound(300, 0.15, 'square', 0.3);
        setTimeout(() => {
            this.playSound(200, 0.1, 'triangle', 0.2);
        }, 80);
    }

    playPlayerDamage() {
        // Player damage sound - descending tone
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    playBossHit() {
        // Boss hit sound - deeper, more powerful
        this.playSound(150, 0.2, 'sawtooth', 0.4);
        setTimeout(() => {
            this.playSound(120, 0.15, 'square', 0.3);
        }, 100);
    }
}

// Game State
class GameState {
    constructor() {
        this.currentScreen = 'title';
        this.level = 1;
        this.lives = 3;
        this.score = 0;
        this.gameRunning = false;
        this.keys = {};
        this.mouse = { x: 0, y: 0, clicked: false };
        this.soundEffects = new SoundEffects();
    }
}

// Game Objects
class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.dx = 0;
        this.dy = 0;
        this.onGround = false;
        this.health = 1;
        this.maxHealth = 1;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw(ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWith(other) {
        return this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y;
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 50, 60);
        this.speed = 5;
        this.jumpPower = 15;
        this.ducking = false;
        this.originalHeight = this.height;
        this.shootCooldown = 0;
        this.invulnerable = 0;
        this.facing = 1; // 1 for right, -1 for left
        this.image = new Image();
        this.image.src = 'images/player_sprite.png';
    }

    update(game) {
        // Horizontal movement
        this.dx = 0;
        if (game.keys['ArrowLeft'] || game.keys['a'] || game.keys['A']) {
            this.dx = -this.speed;
            this.facing = -1; // Face left
        }
        if (game.keys['ArrowRight'] || game.keys['d'] || game.keys['D']) {
            this.dx = this.speed;
            this.facing = 1; // Face right
        }

        // Jumping
        if ((game.keys['ArrowUp'] || game.keys['w'] || game.keys['W']) && this.onGround) {
            this.dy = -this.jumpPower;
            this.onGround = false;
        }

        // Ducking
        if (game.keys['ArrowDown'] || game.keys['s'] || game.keys['S']) {
            if (!this.ducking) {
                this.ducking = true;
                this.height = this.originalHeight * 0.6;
                this.y += this.originalHeight * 0.4;
            }
        } else {
            if (this.ducking) {
                this.ducking = false;
                this.y -= this.originalHeight * 0.4;
                this.height = this.originalHeight;
            }
        }

        // Gravity
        this.dy += 0.8;

        // Ground collision
        if (this.y + this.height > 500) {
            this.y = 500 - this.height;
            this.dy = 0;
            this.onGround = true;
        }

        // Keep player in bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 1200) this.x = 1200 - this.width;

        // Update position
        super.update();

        // Update cooldowns
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;

        // Shooting
        if ((game.keys[' '] || game.mouse.clicked) && this.shootCooldown === 0) {
            this.shoot(gameInstance);
            this.shootCooldown = 15;
        }
    }

    shoot(game) {
        const startX = this.facing > 0 ? this.x + this.width : this.x;
        const laser = new Laser(startX, this.y + this.height / 2, this.facing);
        game.lasers.push(laser);

        // Play shooting sound
        game.soundEffects.playLaserShoot();
    }

    takeDamage(game) {
        if (this.invulnerable === 0) {
            game.lives--;
            this.invulnerable = 120; // 2 seconds of invulnerability

            // Play player damage sound
            game.soundEffects.playPlayerDamage();

            if (game.lives <= 0) {
                game.gameOver();
            }
        }
    }

    draw(ctx) {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 5) % 2) {
            return; // Flashing effect when invulnerable
        }

        if (this.image.complete && this.image.naturalWidth > 0) {
            // Flip sprite based on facing direction
            if (this.facing < 0) {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(this.image, -this.x - this.width, this.y, this.width, this.height);
                ctx.restore();
            } else {
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
        } else {
            // Fallback player graphics
            ctx.fillStyle = '#0066CC';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Add details to make it look like a character with a gun
            ctx.fillStyle = '#004499';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);

            // Gun (position based on facing direction)
            ctx.fillStyle = '#555555';
            if (this.facing > 0) {
                ctx.fillRect(this.x + this.width, this.y + this.height / 2 - 2, 15, 4);
            } else {
                ctx.fillRect(this.x - 15, this.y + this.height / 2 - 2, 15, 4);
            }

            // Face
            ctx.fillStyle = '#FFE4B5';
            ctx.fillRect(this.x + 10, this.y + 10, 20, 20);

            // Eyes (adjust based on facing direction)
            ctx.fillStyle = '#000000';
            if (this.facing > 0) {
                ctx.fillRect(this.x + 15, this.y + 15, 3, 3);
                ctx.fillRect(this.x + 22, this.y + 15, 3, 3);
            } else {
                ctx.fillRect(this.x + 15, this.y + 15, 3, 3);
                ctx.fillRect(this.x + 22, this.y + 15, 3, 3);
            }
        }
    }
}

class Monster extends GameObject {
    constructor(x, y, spriteUrl) {
        super(x, y, 40, 40);
        this.speed = 1 + Math.random() * 2;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.image = new Image();
        this.image.src = spriteUrl;
        this.chasePlayer = true;
        this.points = 100;
        this.health = 2;
        this.maxHealth = 2;
        this.hitFlash = 0; // For visual feedback when hit
    }

    update(game) {
        if (this.chasePlayer && game.player) {
            // Simple AI to chase player
            const dx = game.player.x - this.x;
            if (Math.abs(dx) > 5) {
                this.dx = dx > 0 ? this.speed : -this.speed;
            } else {
                this.dx = 0;
            }
        } else {
            this.dx = this.direction * this.speed;
        }

        // Gravity
        this.dy += 0.5;

        // Ground collision
        if (this.y + this.height > 500) {
            this.y = 500 - this.height;
            this.dy = 0;
        }

        // Boundary bouncing
        if (this.x <= 0 || this.x + this.width >= 1200) {
            this.direction *= -1;
        }

        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }

        super.update();
    }

    takeDamage(game) {
        this.health--;
        this.hitFlash = 10; // Flash for 10 frames when hit

        // Play hit sound
        game.soundEffects.playHit();

        if (this.health <= 0) {
            game.score += this.points;
            return true; // Monster defeated
        }
        return false; // Monster still alive
    }

    draw(ctx) {
        // Flash white when hit
        if (this.hitFlash > 0 && this.hitFlash % 4 < 2) {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
        }

        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback monster graphics
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Add monster details
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);

            // Eyes
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x + 8, this.y + 8, 4, 4);
            ctx.fillRect(this.x + this.width - 12, this.y + 8, 4, 4);

            // Mouth
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + 10, this.y + 20, this.width - 20, 3);
        }

        // Health indicator
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 4;
            const barX = this.x;
            const barY = this.y - 8;

            ctx.fillStyle = 'red';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = 'green';
            const healthWidth = (this.health / this.maxHealth) * barWidth;
            ctx.fillRect(barX, barY, healthWidth, barHeight);
        }
    }
}

class Boss extends Monster {
    constructor(x, y, spriteUrl, maxHealth) {
        super(x, y, spriteUrl);
        this.width = 80;
        this.height = 80;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.attackCooldown = 0;
        this.points = 1000;
        this.speed = 0.5;
    }

    takeDamage(game) {
        this.health--;

        // Play boss hit sound (deeper than regular monster hit)
        game.soundEffects.playBossHit();

        if (this.health <= 0) {
            game.score += this.points;
            return true; // Boss defeated
        }
        return false;
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback boss graphics
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Boss details
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.x + 8, this.y + 8, this.width - 16, this.height - 16);

            // Eyes
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x + 15, this.y + 15, 8, 8);
            ctx.fillRect(this.x + this.width - 23, this.y + 15, 8, 8);

            // Crown or special marking
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(this.x + 10, this.y - 5, this.width - 20, 10);
        }

        // Health bar
        const barWidth = 100;
        const barHeight = 8;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - 15;

        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = 'green';
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillRect(barX, barY, healthWidth, barHeight);

        ctx.strokeStyle = 'white';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

class PooFairyBoss extends Boss {
    constructor(x, y) {
        super(x, y, 'images/monster_sprites/poo_fairy_boss.png', 10);
        this.name = 'Poo Fairy Boss';
    }

    update(game) {
        super.update(game);

        if (this.attackCooldown <= 0) {
            this.spawnPoopEmoji(game);
            this.attackCooldown = 180; // 3 seconds
        }
        this.attackCooldown--;
    }

    spawnPoopEmoji(game) {
        const emoji = new PoopEmoji(this.x, this.y + this.height);
        game.projectiles.push(emoji);
    }
}

class PoopTShirtBoss extends Boss {
    constructor(x, y) {
        super(x, y, 'images/monster_sprites/poop_t-shirt_boss.png', 20);
        this.name = 'Poop T-Shirt Boss';
    }

    update(game) {
        super.update(game);

        if (this.attackCooldown <= 0) {
            this.shootTShirt(game);
            this.attackCooldown = 120; // 2 seconds
        }
        this.attackCooldown--;
    }

    shootTShirt(game) {
        const tshirt = new TShirtProjectile(this.x, this.y + this.height / 2);
        game.projectiles.push(tshirt);
    }
}

class UnidentifiedHelperBoss extends Boss {
    constructor(x, y) {
        super(x, y, 'images/monster_sprites/unidentified_poop_helper_boss.png', 30);
        this.name = 'Unidentified Poop Helper Boss';
        this.revealed = false;
    }

    update(game) {
        super.update(game);

        if (this.attackCooldown <= 0) {
            this.spawnMinion(game);
            this.attackCooldown = 240; // 4 seconds
        }
        this.attackCooldown--;
    }

    spawnMinion(game) {
        const minionSprites = [
            'images/monster_sprites/evil_poop.png',
            'images/monster_sprites/hot_poop.png',
            'images/monster_sprites/radioactive_poop.png',
            'images/monster_sprites/robopoop.png'
        ];

        const sprite = minionSprites[Math.floor(Math.random() * minionSprites.length)];
        const minion = new Monster(this.x + (Math.random() - 0.5) * 200, this.y, sprite);
        game.monsters.push(minion);
    }
}

class Laser extends GameObject {
    constructor(x, y, direction) {
        super(x, y, 20, 4);
        this.speed = 10;
        this.dx = this.speed * direction;
    }

    update() {
        super.update();
        return this.x > 0 && this.x < 1200; // Return false if out of bounds
    }

    draw(ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Laser glow effect
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class PoopEmoji extends GameObject {
    constructor(x, y) {
        super(x, y, 30, 30);
        this.speed = 3;
        this.dx = (Math.random() - 0.5) * 4;
        this.dy = Math.random() * 2 + 1;
    }

    update() {
        super.update();
        this.dy += 0.3; // Gravity
        return this.y < 600; // Return false if out of bounds
    }

    draw(ctx) {
        ctx.font = '30px Arial';
        ctx.fillText('💩', this.x, this.y + this.height);
    }
}

class TShirtProjectile extends GameObject {
    constructor(x, y) {
        super(x, y, 25, 25);
        this.speed = 4;
        this.dx = -this.speed;
    }

    update() {
        super.update();
        return this.x > -50; // Return false if out of bounds
    }

    draw(ctx) {
        ctx.font = '25px Arial';
        ctx.fillText('👕', this.x, this.y + this.height);
    }
}

// Main Game Class
class Game extends GameState {
    constructor() {
        super();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = null;
        this.monsters = [];
        this.bosses = [];
        this.lasers = [];
        this.projectiles = [];
        this.platforms = [];
        this.currentBoss = null;
        this.levelColors = [
            '#87CEEB', // Sky blue
            '#FFB6C1', // Light pink
            '#98FB98'  // Pale green
        ];

        // Background music
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicPlaying = false;

        console.log('Game constructor called');
        this.setupEventListeners();

        // Ensure we start on title screen
        this.gameRunning = false;
        this.currentScreen = 'titleScreen';
        this.showScreen('titleScreen');
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();

                // Handle spacebar for menu navigation
                if (this.currentScreen === 'titleScreen') {
                    console.log('Spacebar pressed - starting game');
                    this.startGame();
                } else if (this.currentScreen === 'bossDialogue') {
                    console.log('Spacebar pressed - continuing to boss');
                    this.continueToBoss();
                } else if (this.currentScreen === 'gameOverScreen') {
                    console.log('Spacebar pressed - restarting game');
                    this.startGame();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse events
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.clicked = true;
            setTimeout(() => this.mouse.clicked = false, 100);
        });

        // UI button events
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('rulesBtn').addEventListener('click', () => this.showScreen('rulesScreen'));
        document.getElementById('backBtn').addEventListener('click', () => this.showScreen('titleScreen'));
        document.getElementById('continueBtn').addEventListener('click', () => this.continueToBoss());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('titleBtn').addEventListener('click', () => this.backToTitle());
        document.getElementById('backToTitleBtn').addEventListener('click', () => this.backToTitle());
    }

    showScreen(screenId) {
        console.log('Showing screen:', screenId);

        // Remove active class from all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            console.log('Removed active from:', screen.id);
        });

        // Add active class to target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Added active to:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }

        this.currentScreen = screenId;

        // Manage game loop based on screen
        if (screenId === 'gameScreen') {
            // Starting/resuming game - make sure game loop runs
            if (!this.gameRunning && (this.player || this.bosses.length > 0)) {
                console.log('Resuming game loop for screen transition to gameScreen');
                this.gameRunning = true;
                this.gameLoop();
            }
        } else {
            // Not on game screen - stop game loop
            this.gameRunning = false;
        }

        // Force hide canvas when not on game screen
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            if (screenId === 'gameScreen') {
                canvas.style.display = 'block';
            } else {
                canvas.style.display = 'none';
            }
        }
    }

    startGame() {
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.gameRunning = true;

        console.log('Starting game...');
        this.startMusic();
        this.initLevel();
        this.showScreen('gameScreen');
        this.gameLoop();
    }

    initLevel() {
        console.log('Initializing level', this.level);
        this.player = new Player(100, 400);
        this.monsters = [];
        this.bosses = [];
        this.lasers = [];
        this.projectiles = [];
        this.currentBoss = null;

        // Spawn monsters based on level
        const monsterSprites = [
            'images/monster_sprites/evil_poop.png',
            'images/monster_sprites/cyclops_poop.png',
            'images/monster_sprites/hot_poop.png',
            'images/monster_sprites/radioactive_poop.png',
            'images/monster_sprites/robopoop.png',
            'images/monster_sprites/melting_poop.png'
        ];

        for (let i = 0; i < 3 + this.level; i++) {
            const sprite = monsterSprites[Math.floor(Math.random() * monsterSprites.length)];
            const monster = new Monster(
                200 + Math.random() * 800,
                300 + Math.random() * 100,
                sprite
            );
            this.monsters.push(monster);
        }

        console.log('Player created at:', this.player.x, this.player.y);
        console.log('Monsters created:', this.monsters.length);

        this.updateUI();
    }

    updateUI() {
        document.getElementById('livesCount').textContent = this.lives;
        document.getElementById('levelCount').textContent = this.level;
        document.getElementById('scoreCount').textContent = this.score;
    }

    gameLoop() {
        if (!this.gameRunning) {
            console.log('Game loop stopped - gameRunning is false');
            return;
        }

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.currentScreen !== 'gameScreen' || !this.gameRunning) return;

        // Update player
        if (this.player) {
            this.player.update(this);
        }

        // Update monsters
        this.monsters = this.monsters.filter(monster => {
            monster.update(this);

            // Check collision with player
            if (this.player && monster.collidesWith(this.player)) {
                this.player.takeDamage(this);
            }

            return true;
        });

        // Update bosses
        this.bosses.forEach(boss => {
            boss.update(this);

            // Check collision with player
            if (this.player && boss.collidesWith(this.player)) {
                this.player.takeDamage(this);
            }
        });

        // Update lasers
        this.lasers = this.lasers.filter(laser => {
            const inBounds = laser.update();
            let laserHit = false;

            // Check collisions with monsters
            this.monsters = this.monsters.filter(monster => {
                if (laser.collidesWith(monster)) {
                    laserHit = true;
                    if (monster.takeDamage(this)) {
                        // Monster defeated
                        this.updateUI();
                        return false;
                    }
                    return true; // Monster still alive
                }
                return true;
            });

            // Check collisions with bosses
            if (!laserHit) {
                this.bosses = this.bosses.filter(boss => {
                    if (laser.collidesWith(boss)) {
                        laserHit = true;
                        if (boss.takeDamage(this)) {
                            // Boss defeated
                            return false;
                        }
                    }
                    return true;
                });
            }

            return inBounds && !laserHit;
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            const inBounds = projectile.update();

            // Check collision with player
            if (this.player && projectile.collidesWith(this.player)) {
                this.player.takeDamage(this);
                return false;
            }

            return inBounds;
        });

        // Check level completion
        if (this.monsters.length === 0 && this.bosses.length === 0 && !this.currentBoss) {
            console.log('Level complete! Monsters:', this.monsters.length, 'Bosses:', this.bosses.length, 'Current boss:', this.currentBoss);
            this.levelComplete();
        }
    }

    draw() {
        if (this.currentScreen !== 'gameScreen' || !this.gameRunning) return;

        // Clear canvas with level-appropriate background
        const bgColor = this.levelColors[(this.level - 1) % this.levelColors.length];
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, 500, this.canvas.width, 100);

        // Draw game objects
        if (this.player) {
            console.log('Drawing player at:', this.player.x, this.player.y);
            this.player.draw(this.ctx);
        } else {
            console.log('No player to draw');
        }

        console.log('Drawing monsters:', this.monsters.length);
        this.monsters.forEach((monster, index) => {
            console.log(`Monster ${index} at:`, monster.x, monster.y);
            monster.draw(this.ctx);
        });

        console.log('Drawing bosses:', this.bosses.length);
        this.bosses.forEach((boss, index) => {
            console.log(`Boss ${index} at:`, boss.x, boss.y, 'Health:', boss.health);
            boss.draw(this.ctx);
        });
        this.lasers.forEach(laser => laser.draw(this.ctx));
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));
    }

    levelComplete() {
        this.level++;

        if (this.level <= 4) {
            this.showBossDialogue();
        } else {
            this.gameWin();
        }
    }

    showBossDialogue() {
        let bossImage, dialogueText;

        console.log('Showing boss dialogue for level:', this.level);

        switch (this.level) {
            case 2:
                bossImage = 'images/monster_sprites/poo_fairy_boss.png';
                dialogueText = "I am the Poo Fairy Boss! I will rain down poop emojis upon you!";
                this.currentBoss = new PooFairyBoss(600, 300);
                console.log('Created Poo Fairy Boss:', this.currentBoss);
                break;
            case 3:
                bossImage = 'images/monster_sprites/poop_t-shirt_boss.png';
                dialogueText = "Prepare for my t-shirt cannon! You cannot escape my fashionable fury!";
                this.currentBoss = new PoopTShirtBoss(600, 300);
                console.log('Created Poop T-Shirt Boss:', this.currentBoss);
                break;
            case 4:
                bossImage = 'images/monster_sprites/unidentified_poop_helper_boss.png';
                dialogueText = "Foolish human! I was never here to help! I planned this poop apocalypse all along! Now face my army of minions!";
                this.currentBoss = new UnidentifiedHelperBoss(600, 300);
                console.log('Created Unidentified Helper Boss:', this.currentBoss);
                break;
            default:
                console.error('Invalid level for boss dialogue:', this.level);
                return;
        }

        if (this.currentBoss) {
            console.log('Boss health:', this.currentBoss.health, '/', this.currentBoss.maxHealth);
        }

        document.getElementById('bossImage').src = bossImage;
        document.getElementById('dialogueText').textContent = dialogueText;
        this.showScreen('bossDialogue');
    }

    continueToBoss() {
        console.log('Transitioning to boss battle with:', this.currentBoss);

        // Make sure we have a boss
        if (!this.currentBoss) {
            console.error('No current boss to transition to!');
            return;
        }

        // Set up boss battle
        this.bosses = [this.currentBoss];
        this.currentBoss = null;

        // Restart game loop
        this.gameRunning = true;
        this.showScreen('gameScreen');

        // Ensure game loop is running
        if (this.gameRunning) {
            console.log('Starting game loop for boss battle');
            this.gameLoop();
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.stopMusic();
        document.getElementById('gameOverTitle').textContent = 'GAME OVER';
        document.getElementById('gameOverMessage').textContent = 'The poop monsters have taken over!';
        document.getElementById('finalScoreValue').textContent = this.score;
        this.showScreen('gameOverScreen');
    }

    gameWin() {
        this.gameRunning = false;
        this.stopMusic();
        document.getElementById('gameOverTitle').textContent = 'VICTORY!';
        document.getElementById('gameOverMessage').textContent = 'You have cleaned up the poop planet!';
        document.getElementById('finalScoreValue').textContent = this.score;
        this.showScreen('gameOverScreen');
    }

    startMusic() {
        if (this.backgroundMusic && !this.musicPlaying) {
            try {
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.volume = 0.5; // Set volume to 50%
                const playPromise = this.backgroundMusic.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Background music started at 50% volume');
                        this.musicPlaying = true;
                    }).catch(error => {
                        console.log('Music autoplay prevented:', error);
                        // Some browsers prevent autoplay, user needs to interact first
                    });
                }
            } catch (error) {
                console.log('Error starting music:', error);
            }
        }
    }

    stopMusic() {
        if (this.backgroundMusic && this.musicPlaying) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.musicPlaying = false;
            console.log('Background music stopped');
        }
    }

    backToTitle() {
        console.log('Returning to title screen');
        this.gameRunning = false;
        this.stopMusic();

        // Reset game state
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.player = null;
        this.monsters = [];
        this.bosses = [];
        this.lasers = [];
        this.projectiles = [];
        this.currentBoss = null;

        this.showScreen('titleScreen');
    }
}

// Initialize game
let gameInstance;
window.onload = () => {
    console.log('Window loaded, creating game...');
    gameInstance = new Game();

    // Make sure we're on the title screen and game is not running
    gameInstance.gameRunning = false;
    gameInstance.showScreen('titleScreen');
    console.log('Game initialized, should be on title screen');

    // Debug: Add global function to force title screen
    window.showTitle = () => {
        console.log('Force showing title screen...');
        gameInstance.showScreen('titleScreen');
    };
}; 