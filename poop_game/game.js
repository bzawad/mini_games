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
        this.gameLoopRunning = false;
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

        // Store old position for collision detection
        const oldX = this.x;
        const oldY = this.y;

        // Update position
        super.update();

        // Platform collision detection
        this.onGround = false;
        for (let platform of game.platforms) {
            if (this.collidesWith(platform)) {
                // Vertical collision (landing on platform)
                if (oldY + this.height <= platform.y && this.dy > 0) {
                    this.y = platform.y - this.height;
                    this.dy = 0;
                    this.onGround = true;
                }
                // Horizontal collision (hitting platform side)
                else if (oldX + this.width <= platform.x && this.dx > 0) {
                    this.x = platform.x - this.width;
                    this.dx = 0;
                }
                else if (oldX >= platform.x + platform.width && this.dx < 0) {
                    this.x = platform.x + platform.width;
                    this.dx = 0;
                }
                // Bottom collision (hitting platform from below)
                else if (oldY >= platform.y + platform.height && this.dy < 0) {
                    this.y = platform.y + platform.height;
                    this.dy = 0;
                }
            }
        }

        // Ground collision
        if (this.y + this.height > 500) {
            this.y = 500 - this.height;
            this.dy = 0;
            this.onGround = true;
        }

        // Keep player in level bounds (for scrolling levels)
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > game.levelWidth) this.x = game.levelWidth - this.width;

        // Update camera to follow player (only for scrolling levels)
        if (game.level === 1) {
            // Only level 1 is a scrolling level
            game.camera.targetX = this.x - game.canvas.width / 2;
            game.camera.targetY = 0; // Keep camera at same height
        } else {
            // For boss levels and other levels, keep camera stationary
            game.camera.targetX = 0;
            game.camera.targetY = 0;
        }

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
            // Don't take damage during tutorial
            if (game.level === 0) {
                console.log('Player hit during tutorial - no damage taken');
                this.invulnerable = 60; // Brief invulnerability for visual feedback
                return;
            }

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
        this.isOnPlatform = false;
        this.currentPlatform = null;
    }

    update(game) {
        // Store old position for collision detection
        const oldX = this.x;
        const oldY = this.y;

        if (this.chasePlayer && game.player && !this.isOnPlatform) {
            // Only chase player when NOT on a platform (to avoid falling off)
            const dx = game.player.x - this.x;
            if (Math.abs(dx) > 5) {
                this.dx = dx > 0 ? this.speed : -this.speed;
            } else {
                this.dx = 0;
            }
        } else {
            // Platform patrol behavior or ground wandering
            const desiredDx = this.direction * this.speed;
            if (this.isOnPlatform && this.wouldFallOffPlatform(game, desiredDx)) {
                this.direction *= -1; // Turn around at platform edge
            }
            this.dx = this.direction * this.speed; // Always keep moving
        }

        // Gravity
        this.dy += 0.5;

        // Update position
        super.update();

        // Platform collision detection
        this.onGround = false;
        this.isOnPlatform = false;
        this.currentPlatform = null;

        for (let platform of game.platforms) {
            if (this.collidesWith(platform)) {
                // Vertical collision (landing on platform)
                if (oldY + this.height <= platform.y && this.dy > 0) {
                    this.y = platform.y - this.height;
                    this.dy = 0;
                    this.onGround = true;
                    this.isOnPlatform = true;
                    this.currentPlatform = platform;
                }
                // Horizontal collision (hitting platform side)
                else if (oldX + this.width <= platform.x && this.dx > 0) {
                    this.x = platform.x - this.width;
                    this.direction *= -1;
                    this.dx = this.direction * this.speed;
                }
                else if (oldX >= platform.x + platform.width && this.dx < 0) {
                    this.x = platform.x + platform.width;
                    this.direction *= -1;
                    this.dx = this.direction * this.speed;
                }
                // Bottom collision (hitting platform from below)
                else if (oldY >= platform.y + platform.height && this.dy < 0) {
                    this.y = platform.y + platform.height;
                    this.dy = 0;
                }
            }
        }

        // Ground collision
        if (this.y + this.height > 500) {
            this.y = 500 - this.height;
            this.dy = 0;
            this.onGround = true;
        }

        // Boundary bouncing (adjust for level width)
        if (this.x <= 0 || this.x + this.width >= game.levelWidth) {
            this.direction *= -1;
        }

        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
    }

    wouldFallOffPlatform(game, desiredDx) {
        if (!this.isOnPlatform || !this.currentPlatform) return false;

        const futureX = this.x + desiredDx;
        const platform = this.currentPlatform;

        // Check if monster would step off the platform (with small buffer for safety)
        const buffer = 2;
        return (futureX < platform.x + buffer || futureX + this.width > platform.x + platform.width - buffer);
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
        this.hoverOffset = 0;
        this.specialAttackCounter = 0;
    }

    update(game) {
        super.update(game);

        // Gentle hovering movement
        this.hoverOffset += 0.1;
        this.y += Math.sin(this.hoverOffset) * 0.5;

        // Slight horizontal movement towards player
        if (game.player) {
            const playerDistance = game.player.x - this.x;
            if (Math.abs(playerDistance) > 50) {
                this.x += playerDistance > 0 ? 0.5 : -0.5;
            }
        }

        // Keep boss in bounds
        if (this.x < 400) this.x = 400;
        if (this.x > 800) this.x = 800;
        if (this.y < 100) this.y = 100;
        if (this.y > 300) this.y = 300;

        if (this.attackCooldown <= 0) {
            this.specialAttackCounter++;

            // Every 3rd attack, do a special poop rain attack
            if (this.specialAttackCounter >= 3) {
                this.poopRainAttack(game);
                this.specialAttackCounter = 0;
                this.attackCooldown = 240; // 4 seconds for special attack
            } else {
                this.spawnPoopEmoji(game);
                this.attackCooldown = 120; // 2 seconds for regular attack
            }
        }
        this.attackCooldown--;
    }

    spawnPoopEmoji(game) {
        // Spawn multiple poop emojis for more challenge
        const numEmojis = 3;
        for (let i = 0; i < numEmojis; i++) {
            const emoji = new PoopEmoji(
                this.x + (i - 1) * 40, // Spread them out horizontally
                this.y + this.height,
                game.player // Pass player reference for targeting
            );
            game.projectiles.push(emoji);
        }
        console.log('Poo Fairy Boss spawned', numEmojis, 'poop emojis!');
    }

    poopRainAttack(game) {
        // Special attack: Rain poop emojis from across the top of the screen
        const numEmojis = 8;
        for (let i = 0; i < numEmojis; i++) {
            const emoji = new PoopEmoji(
                100 + i * 125, // Spread across the screen width
                50, // Start from top
                game.player // Pass player reference for targeting
            );
            // Make rain emojis fall faster
            emoji.dy += 2;
            game.projectiles.push(emoji);
        }
        console.log('Poo Fairy Boss unleashed POOP RAIN attack!');
    }
}

class PoopTShirtBoss extends Boss {
    constructor(x, y) {
        super(x, y, 'images/monster_sprites/poop_t-shirt_boss.png', 20);
        this.name = 'Poop T-Shirt Boss';
        this.facing = -1; // -1 for left, 1 for right
        this.moveTimer = 0;
        this.moveCooldown = 0;
    }

    update(game) {
        super.update(game);

        // Boss movement and turning logic
        if (game.player) {
            // Determine which direction the player is in
            const playerDirection = game.player.x > this.x ? 1 : -1;

            // Turn to face the player
            this.facing = playerDirection;

            // Move slightly toward the player occasionally
            this.moveTimer++;
            if (this.moveTimer > 60 && this.moveCooldown <= 0) { // Every second
                const distanceToPlayer = Math.abs(game.player.x - this.x);

                // Only move if player is far away (more than 200 pixels)
                if (distanceToPlayer > 200) {
                    this.x += this.facing * 1.5; // Slow movement toward player
                    this.moveCooldown = 120; // 2 second cooldown between moves
                }
                this.moveTimer = 0;
            }

            if (this.moveCooldown > 0) {
                this.moveCooldown--;
            }
        }

        // Keep boss in bounds
        if (this.x < 100) this.x = 100;
        if (this.x > 1000) this.x = 1000;

        if (this.attackCooldown <= 0) {
            this.shootTShirt(game);
            this.attackCooldown = 90; // 1.5 seconds (faster than before)
        }
        this.attackCooldown--;
    }

    shootTShirt(game) {
        // Shoot toward the player's direction
        const direction = this.facing;
        const tshirt = new TShirtProjectile(
            this.x + (direction > 0 ? this.width : 0), // Start from appropriate side of boss
            this.y + this.height / 2,
            direction,
            game.player // Pass player reference for targeting
        );
        game.projectiles.push(tshirt);
        console.log('T-Shirt Boss fired t-shirt', direction > 0 ? 'right' : 'left');
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

class TutorialHelper extends GameObject {
    constructor(x, y) {
        super(x, y, 80, 80);
        this.image = new Image();
        this.image.src = 'images/monster_sprites/unidentified_poop_helper_boss.png';
        this.friendly = true;
        this.name = 'Helpful Guide';
        this.tutorialTimer = 0;
    }

    update(game) {
        // Tutorial helper doesn't move or attack
        // Just stands there looking friendly

        // After the first dialogue, wait a bit then trigger second dialogue
        if (game.tutorialStep === 1 && game.level === 0) {
            this.tutorialTimer++;
            // After 3 seconds (180 frames at 60fps), trigger second dialogue
            if (this.tutorialTimer > 180) {
                console.log('Tutorial timer triggered - showing second dialogue');
                game.triggerSecondTutorialDialogue();
                this.tutorialTimer = 0; // Reset timer
            }
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback friendly helper graphics
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // Helper details
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(this.x + 8, this.y + 8, this.width - 16, this.height - 16);

            // Friendly eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + 20, this.y + 20, 8, 8);
            ctx.fillRect(this.x + this.width - 28, this.y + 20, 8, 8);

            // Smile
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + 25, this.y + 45, this.width - 50, 3);

            // Helper indicator
            ctx.fillStyle = '#FFD700';
            ctx.font = '16px Arial';
            ctx.fillText('?', this.x + this.width / 2 - 5, this.y - 10);
        }

        // Show instruction text during tutorial step 1
        if (this.tutorialTimer > 0 && this.tutorialTimer < 180) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Try moving around with WASD or Arrow Keys!', this.x + this.width / 2, this.y - 40);
            ctx.fillText('Press Spacebar to shoot!', this.x + this.width / 2, this.y - 15);
            ctx.textAlign = 'left'; // Reset text alignment
        }
    }

    spawnTutorialMonsters(game) {
        // Spawn just 2 easy monsters for tutorial
        const tutorialSprites = [
            'images/monster_sprites/evil_poop.png',
            'images/monster_sprites/cyclops_poop.png'
        ];

        console.log('Spawning tutorial monsters...');

        for (let i = 0; i < 2; i++) {
            const sprite = tutorialSprites[i % tutorialSprites.length];
            const monster = new Monster(
                500 + i * 200,  // Spread them out more
                350,             // Position them on the ground
                sprite
            );
            // Make tutorial monsters much easier
            monster.health = 1;
            monster.maxHealth = 1;
            monster.speed = 0.3; // Very slow movement
            monster.chasePlayer = false; // Don't chase aggressively
            game.monsters.push(monster);
            console.log(`Tutorial monster ${i + 1} created at:`, monster.x, monster.y);
        }
        console.log('Tutorial monsters spawned:', game.monsters.length);
        console.log('All monsters:', game.monsters);

        // Mark that tutorial monsters have been spawned
        game.tutorialMonstersSpawned = true;
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
        return this.x > -50 && this.x < 5000; // Extended bounds for scrolling levels
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
    constructor(x, y, player = null) {
        super(x, y, 30, 30);
        this.speed = 3;

        if (player) {
            // Aim towards the player's position
            const deltaX = player.x - x;
            const deltaY = player.y - y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Normalize and apply speed
            this.dx = (deltaX / distance) * this.speed * 0.7; // Slightly slower horizontal
            this.dy = Math.max(1, (deltaY / distance) * this.speed); // Ensure downward movement
        } else {
            // Fallback to random movement
            this.dx = (Math.random() - 0.5) * 4;
            this.dy = Math.random() * 2 + 1;
        }

        this.bounces = 0;
        this.maxBounces = 2;
    }

    update() {
        super.update();
        this.dy += 0.3; // Gravity

        // Bounce off ground
        if (this.y + this.height > 500 && this.dy > 0 && this.bounces < this.maxBounces) {
            this.y = 500 - this.height;
            this.dy = -this.dy * 0.6; // Bounce with energy loss
            this.dx *= 0.8; // Reduce horizontal speed
            this.bounces++;
        }

        return this.y < 650; // Return false if out of bounds (below ground level)
    }

    draw(ctx) {
        ctx.font = '30px Arial';
        ctx.fillText('💩', this.x, this.y + this.height);

        // Add a slight glow effect for the poop emojis
        ctx.shadowColor = '#8B4513';
        ctx.shadowBlur = 5;
        ctx.fillText('💩', this.x, this.y + this.height);
        ctx.shadowBlur = 0;
    }
}

class TShirtProjectile extends GameObject {
    constructor(x, y, direction = -1, player = null) {
        super(x, y, 25, 25);
        this.speed = 4;

        if (player && direction) {
            // Aim towards the player's position with some prediction
            const deltaX = player.x - x;
            const deltaY = player.y - y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 0) {
                // Normalize and apply speed, with player prediction
                const predictedPlayerX = player.x + player.dx * 10; // Predict where player will be
                const adjustedDeltaX = predictedPlayerX - x;
                const adjustedDistance = Math.sqrt(adjustedDeltaX * adjustedDeltaX + deltaY * deltaY);

                this.dx = (adjustedDeltaX / adjustedDistance) * this.speed;
                this.dy = (deltaY / adjustedDistance) * this.speed * 0.5; // Slower vertical
            } else {
                // Fallback to direction-based movement
                this.dx = direction * this.speed;
                this.dy = 0;
            }
        } else {
            // Simple directional movement (backward compatibility)
            this.dx = direction * this.speed;
            this.dy = 0;
        }

        this.bounces = 0;
        this.maxBounces = 1;
    }

    update() {
        super.update();

        // Add slight gravity effect
        this.dy += 0.2;

        // Bounce off ground once
        if (this.y + this.height > 500 && this.dy > 0 && this.bounces < this.maxBounces) {
            this.y = 500 - this.height;
            this.dy = -this.dy * 0.4; // Small bounce
            this.dx *= 0.8; // Reduce horizontal speed
            this.bounces++;
        }

        return this.x > -50 && this.x < 1250 && this.y < 650; // Return false if out of bounds
    }

    draw(ctx) {
        ctx.font = '25px Arial';
        ctx.fillText('👕', this.x, this.y + this.height);

        // Add slight glow effect
        ctx.shadowColor = '#FF69B4';
        ctx.shadowBlur = 3;
        ctx.fillText('👕', this.x, this.y + this.height);
        ctx.shadowBlur = 0;
    }
}

// Platform class for jumping obstacles
class Platform extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.type = 'platform';
    }

    draw(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Add some visual detail
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x, this.y, this.width, 5);
    }
}

// Door class for level exit
class Door extends GameObject {
    constructor(x, y) {
        super(x, y, 40, 80);
        this.type = 'door';
        this.reached = false;
    }

    draw(ctx) {
        // Draw door frame
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw door
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);

        // Draw door handle
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x + this.width - 15, this.y + this.height / 2 - 3, 8, 6);

        // Add "EXIT" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', this.x + this.width / 2, this.y - 5);
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

        // Camera system for scrolling levels
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
        };

        // Level configuration
        this.levelWidth = 1200; // Default level width (screen width)
        this.levelHeight = 600; // Default level height (screen height)
        this.door = null; // Exit door for scrolling levels

        // Dynamic spawning system
        this.spawnZones = [];
        this.spawnedMonsters = new Set();

        // Background music
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicPlaying = false;

        // Tutorial state
        this.tutorialStep = 0;
        this.tutorialHelper = null;
        this.tutorialMonstersSpawned = false;

        console.log('Game constructor called');
        this.setupEventListeners();

        // Ensure we start on title screen
        this.gameRunning = false;
        this.currentScreen = 'titleScreen';
        this.showScreen('titleScreen');
    }

    showTutorialDialogue() {
        let dialogueText;

        console.log('showTutorialDialogue called - Current step:', this.tutorialStep);

        if (this.tutorialStep === 0) {
            dialogueText = "Hello there! I'm here to help you clean up this poop-infested planet. Let me teach you the basics. Use WASD or Arrow Keys to move around, and Spacebar to shoot your laser!";
            this.tutorialStep = 1;
            console.log('Set to tutorial step 1');
        } else if (this.tutorialStep === 1) {
            dialogueText = "Great! Now I'll release some practice monsters for you to defeat. Remember: move with WASD/Arrows, jump with W/↑, duck with S/↓, and shoot with Spacebar. Good luck!";
            this.tutorialStep = 2;
            console.log('Set to tutorial step 2');
        }

        document.getElementById('bossImage').src = 'images/monster_sprites/unidentified_poop_helper_boss.png';
        document.getElementById('dialogueText').textContent = dialogueText;
        this.showScreen('bossDialogue');
    }

    triggerSecondTutorialDialogue() {
        console.log('Triggering second tutorial dialogue');
        if (this.tutorialStep === 1 && this.level === 0) {
            const dialogueText = "Great! Now I'll release some practice monsters for you to defeat. Remember: move with WASD/Arrows, jump with W/↑, duck with S/↓, and shoot with Spacebar. Good luck!";
            this.tutorialStep = 2;
            console.log('Set to tutorial step 2');

            document.getElementById('bossImage').src = 'images/monster_sprites/unidentified_poop_helper_boss.png';
            document.getElementById('dialogueText').textContent = dialogueText;
            this.showScreen('bossDialogue');
        }
    }

    handleContinue() {
        console.log('handleContinue called - Level:', this.level, 'Tutorial step:', this.tutorialStep);

        if (this.level === 0) {
            // Tutorial level
            if (this.tutorialStep === 1) {
                // First dialogue done, start tutorial gameplay
                console.log('Starting tutorial gameplay...');
                this.initLevel();
                this.showScreen('gameScreen');
                this.gameRunning = true;
                if (!this.gameLoopRunning) {
                    this.gameLoopRunning = true;
                    this.gameLoop();
                }
            } else if (this.tutorialStep === 2) {
                // Second dialogue done, spawn tutorial monsters
                console.log('Spawning tutorial monsters...');
                if (this.tutorialHelper) {
                    this.tutorialHelper.spawnTutorialMonsters(this);
                    this.tutorialMonstersSpawned = true;
                } else {
                    console.error('No tutorial helper found!');
                }
                this.showScreen('gameScreen');
                this.gameRunning = true; // Make sure game loop is running
                if (!this.gameLoopRunning) {
                    this.gameLoopRunning = true;
                    this.gameLoop();
                }
            }
        } else if (this.level === 1 && this.tutorialStep > 0) {
            // Just finished tutorial, starting level 1
            console.log('Tutorial completed, starting level 1');
            this.tutorialStep = 0; // Reset tutorial
            this.tutorialHelper = null; // Remove helper
            this.initLevel();
            this.showScreen('gameScreen');
            this.gameRunning = true;
            if (!this.gameLoopRunning) {
                this.gameLoopRunning = true;
                this.gameLoop();
            }
        } else {
            // Regular boss battles
            this.continueToBoss();
        }
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();

                // Handle spacebar for menu navigation (but NOT for dialogs)
                if (this.currentScreen === 'titleScreen') {
                    console.log('Spacebar pressed - starting game');
                    this.startGame();
                } else if (this.currentScreen === 'gameOverScreen') {
                    console.log('Spacebar pressed - restarting game');
                    this.startGame();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();

                // Handle Enter key for dialog navigation
                if (this.currentScreen === 'bossDialogue') {
                    console.log('Enter pressed - continuing');
                    this.handleContinue();
                } else if (this.currentScreen === 'titleScreen') {
                    console.log('Enter pressed - starting game');
                    this.startGame();
                } else if (this.currentScreen === 'gameOverScreen') {
                    console.log('Enter pressed - restarting game');
                    this.startGame();
                } else if (this.currentScreen === 'victoryScreen') {
                    console.log('Enter pressed - restarting from victory');
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
        document.getElementById('continueBtn').addEventListener('click', () => this.handleContinue());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('titleBtn').addEventListener('click', () => this.backToTitle());
        document.getElementById('backToTitleBtn').addEventListener('click', () => this.backToTitle());

        // Victory screen button events
        document.getElementById('victoryRestartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('victoryTitleBtn').addEventListener('click', () => this.backToTitle());
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
                if (!this.gameLoopRunning) {
                    this.gameLoopRunning = true;
                    this.gameLoop();
                }
            }
        } else {
            // Not on game screen - stop game loop
            this.gameRunning = false;
            this.gameLoopRunning = false;
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
        this.level = 0; // Start with tutorial level
        this.gameRunning = true;

        console.log('Starting game...');
        this.startMusic();
        this.showTutorialDialogue();
    }

    initLevel() {
        console.log('Initializing level', this.level);

        // Clear all level elements
        this.monsters = [];
        this.bosses = [];
        this.lasers = [];
        this.projectiles = [];
        this.platforms = [];
        this.door = null;
        this.currentBoss = null;

        // Reset camera completely
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.targetX = 0;
        this.camera.targetY = 0;

        // Reset tutorial flag
        if (this.level === 0) {
            this.tutorialMonstersSpawned = false;
        }

        if (this.level === 0) {
            // Tutorial level - create helper character but don't spawn monsters yet
            this.player = new Player(100, 400);
            this.tutorialHelper = new TutorialHelper(900, 300);
            this.levelWidth = 1200; // Standard level width for tutorial
            console.log('Tutorial helper created');
        } else if (this.level === 1) {
            // Level 1 - Side-scrolling platform level
            this.player = new Player(100, 400); // Start at beginning
            this.levelWidth = 1200 * 4; // 4 times screen width

            // Create platforms with progressive difficulty (reachable heights)
            this.platforms = [
                // Starting platforms - easily reachable
                new Platform(400, 420, 100, 20),  // 80px jump
                new Platform(600, 380, 100, 20),  // 120px jump
                new Platform(750, 420, 80, 20),   // Step back down
                new Platform(900, 360, 100, 20),  // 140px jump (max reachable)

                // Middle section - stepping stone progression
                new Platform(1100, 400, 80, 20),  // Step down
                new Platform(1250, 350, 100, 20), // Step up
                new Platform(1400, 300, 80, 20),  // Higher step
                new Platform(1550, 350, 100, 20), // Step down for safety
                new Platform(1700, 280, 100, 20), // High platform

                // Bowl-inspired floating section with steps
                new Platform(1900, 380, 100, 20), // Low entry
                new Platform(2050, 320, 80, 20),  // Mid step
                new Platform(2200, 260, 120, 20), // High center
                new Platform(2350, 320, 80, 20),  // Mid step down
                new Platform(2500, 380, 100, 20), // Low exit

                // Final pyramid-inspired section with stepping stones
                new Platform(2700, 400, 100, 20), // Base step
                new Platform(2850, 350, 100, 20), // Second step
                new Platform(3000, 300, 100, 20), // Third step
                new Platform(3150, 250, 100, 20), // Fourth step (highest)
                new Platform(3300, 300, 100, 20), // Step down

                // Final approach to door
                new Platform(3500, 380, 150, 20)
            ];

            // Create door at the end
            this.door = new Door(3700, 420);

            // Initialize dynamic spawning system for level 1
            this.initDynamicSpawning();

            console.log('Level 1 side-scrolling level created with', this.platforms.length, 'platforms and dynamic spawning');
        } else {
            // Boss levels (2, 3, 4) and other levels - NO SCROLLING, NO PLATFORMS
            this.player = new Player(100, 400); // Always start at beginning position
            this.levelWidth = 1200; // Standard level width

            // NO platforms for boss levels
            // NO door for boss levels

            const monsterSprites = [
                'images/monster_sprites/evil_poop.png',
                'images/monster_sprites/cyclops_poop.png',
                'images/monster_sprites/hot_poop.png',
                'images/monster_sprites/radioactive_poop.png',
                'images/monster_sprites/robopoop.png',
                'images/monster_sprites/melting_poop.png'
            ];

            // Only spawn regular monsters for non-boss levels (level 5+)
            if (this.level > 4) {
                for (let i = 0; i < 3 + this.level; i++) {
                    const sprite = monsterSprites[Math.floor(Math.random() * monsterSprites.length)];
                    const monster = new Monster(
                        200 + Math.random() * 800,
                        300 + Math.random() * 100,
                        sprite
                    );
                    this.monsters.push(monster);
                }
            }

            console.log('Boss/Standard level initialized - Level width:', this.levelWidth, 'Platforms:', this.platforms.length);
        }

        console.log('Player created at:', this.player.x, this.player.y);
        console.log('Monsters created:', this.monsters.length);
        console.log('Camera reset to:', this.camera.x, this.camera.y);

        this.updateUI();
    }

    initDynamicSpawning() {
        // Initialize dynamic spawning system for level 1
        const monsterSprites = [
            'images/monster_sprites/evil_poop.png',
            'images/monster_sprites/cyclops_poop.png',
            'images/monster_sprites/hot_poop.png',
            'images/monster_sprites/radioactive_poop.png',
            'images/monster_sprites/robopoop.png',
            'images/monster_sprites/melting_poop.png'
        ];

        // Define spawn zones for each quarter of the map
        const quarterWidth = this.levelWidth / 4;

        this.spawnZones = [
            // Quarter 1 (0-1200): Ground spawns, first spawn in middle
            {
                start: quarterWidth * 0.5, // Middle of first quarter
                end: quarterWidth,
                type: 'ground',
                spawns: [
                    { x: quarterWidth * 0.5, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: quarterWidth * 0.8, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }
                ]
            },
            // Quarter 2 (1200-2400): Platform spawns on stepping stones
            {
                start: quarterWidth,
                end: quarterWidth * 2,
                type: 'platform',
                spawns: [
                    { x: 1250, y: 310, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 1250,350
                    { x: 1400, y: 260, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 1400,300
                    { x: 1700, y: 240, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 1700,280
                    { x: 2050, y: 280, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 2050,320
                    { x: 2200, y: 220, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }  // On platform at 2200,260
                ]
            },
            // Quarter 3 (2400-3600): Ground spawns (increased density)
            {
                start: quarterWidth * 2,
                end: quarterWidth * 3,
                type: 'ground',
                spawns: [
                    { x: 2450, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 2650, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 2850, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 3050, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 3250, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 3450, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }
                ]
            },
            // Quarter 4 (3600-4800): Pyramid steps and ground mix
            {
                start: quarterWidth * 3,
                end: quarterWidth * 4,
                type: 'mixed',
                spawns: [
                    // Platform monsters on pyramid steps
                    { x: 2850, y: 310, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 2850,350
                    { x: 3000, y: 260, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 3000,300
                    { x: 3150, y: 210, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 3150,250 (highest)
                    { x: 3500, y: 340, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }, // On platform at 3500,380

                    // Ground monsters (can move freely under platforms)
                    { x: 3650, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 3800, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 3950, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 4100, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 4300, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] },
                    { x: 4500, y: 400, sprite: monsterSprites[Math.floor(Math.random() * monsterSprites.length)] }
                ]
            }
        ];

        // Track which spawns have been triggered
        this.spawnedMonsters = new Set();

        console.log('Dynamic spawning initialized with', this.spawnZones.length, 'zones');
    }

    checkDynamicSpawning() {
        if (this.level !== 1 || !this.player) return;

        // Calculate spawn trigger distance (when spawn point becomes visible)
        const spawnDistance = this.canvas.width + 100; // Spawn when just off-screen
        const playerX = this.player.x;

        this.spawnZones.forEach((zone, zoneIndex) => {
            zone.spawns.forEach((spawn, spawnIndex) => {
                const spawnKey = `${zoneIndex}-${spawnIndex}`;

                // Check if this spawn hasn't been triggered yet and player is close enough
                if (!this.spawnedMonsters.has(spawnKey) &&
                    Math.abs(playerX - spawn.x) < spawnDistance) {

                    // Spawn the monster
                    const monster = new Monster(spawn.x, spawn.y, spawn.sprite);
                    this.monsters.push(monster);
                    this.spawnedMonsters.add(spawnKey);

                    console.log(`Spawned monster in zone ${zoneIndex + 1} (${zone.type}) at`, spawn.x, spawn.y);
                }
            });
        });
    }

    updateUI() {
        document.getElementById('livesCount').textContent = this.lives;
        document.getElementById('levelCount').textContent = this.level;
        document.getElementById('scoreCount').textContent = this.score;
    }

    gameLoop() {
        if (!this.gameRunning) {
            console.log('Game loop stopped - gameRunning is false');
            this.gameLoopRunning = false;
            return;
        }

        this.update();
        this.draw();

        if (this.gameLoopRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    update() {
        if (this.currentScreen !== 'gameScreen' || !this.gameRunning) return;

        // Update camera with smooth following (only for scrolling levels)
        if (this.level === 1) {
            this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
            this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;

            // Keep camera within level bounds
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.levelWidth - this.canvas.width));
        } else {
            // For boss levels and other levels, keep camera at origin
            this.camera.x = 0;
            this.camera.y = 0;
        }

        // Update player
        if (this.player) {
            this.player.update(this);
        }

        // Check dynamic spawning for level 1
        if (this.level === 1) {
            this.checkDynamicSpawning();
        }

        // Check door collision for level 1
        if (this.level === 1 && this.door && this.player && this.player.collidesWith(this.door)) {
            console.log('Player reached the door! Level complete!');
            this.levelComplete();
            return;
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

        // Update tutorial helper
        if (this.level === 0 && this.tutorialHelper) {
            this.tutorialHelper.update(this);
        }

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

        // Check level completion (different logic for level 1)
        if (this.level === 1) {
            // Level 1 is completed by reaching the door (already handled above)
            // No need to kill all monsters
        } else if (this.monsters.length === 0 && this.bosses.length === 0 && !this.currentBoss) {
            // Special handling for tutorial level
            if (this.level === 0) {
                // Only complete tutorial if we've spawned monsters and defeated them
                if (this.tutorialStep === 2 && this.tutorialMonstersSpawned) {
                    console.log('Tutorial complete! All tutorial monsters defeated.');
                    this.levelComplete();
                }
                // Otherwise, don't complete the level yet
                return;
            }
            console.log('Level complete! Monsters:', this.monsters.length, 'Bosses:', this.bosses.length, 'Current boss:', this.currentBoss);
            this.levelComplete();
        }
    }

    draw() {
        if (this.currentScreen !== 'gameScreen' || !this.gameRunning) return;

        // Save the current transformation matrix
        this.ctx.save();

        // Apply camera transformation
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Clear canvas with level-appropriate background
        let bgColor;
        if (this.level === 0) {
            // Tutorial level - special green background
            bgColor = '#87CEEB'; // Sky blue for tutorial
        } else {
            bgColor = this.levelColors[(this.level - 1) % this.levelColors.length];
        }
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);

        // Draw ground (extend across the entire level width)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, 500, this.levelWidth, 100);

        // Draw platforms
        this.platforms.forEach(platform => {
            platform.draw(this.ctx);
        });

        // Draw door if it exists
        if (this.door) {
            this.door.draw(this.ctx);
        }

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

        // Draw tutorial helper if in tutorial
        if (this.level === 0 && this.tutorialHelper) {
            this.tutorialHelper.draw(this.ctx);
        }

        this.lasers.forEach(laser => laser.draw(this.ctx));
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        // Restore the transformation matrix
        this.ctx.restore();

        // Draw UI elements (not affected by camera)
        if (this.level === 1 && this.player) {
            // Draw progress indicator for level 1 only
            const progressWidth = 200;
            const progressHeight = 10;
            const progressX = 10;
            const progressY = 10;

            // Background
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(progressX, progressY, progressWidth, progressHeight);

            // Progress bar
            const progress = Math.min(this.player.x / (this.levelWidth - this.canvas.width), 1);
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);

            // Text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Progress to Exit', progressX, progressY + progressHeight + 15);
        }
    }

    levelComplete() {
        this.level++;

        if (this.level === 1) {
            // Just finished tutorial, show success message and continue to level 1
            document.getElementById('bossImage').src = 'images/monster_sprites/unidentified_poop_helper_boss.png';
            document.getElementById('dialogueText').textContent = "Excellent work! You've mastered the basics. Now the real adventure begins. Good luck out there!";
            this.showScreen('bossDialogue');
        } else if (this.level <= 4) {
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

        // Store the boss temporarily
        const boss = this.currentBoss;
        this.currentBoss = null;

        // Initialize the level properly (this will reset player position, clear platforms, etc.)
        this.initLevel();

        // Now set up the boss battle
        this.bosses = [boss];

        console.log('Boss battle initialized - Player at:', this.player ? this.player.x + ',' + this.player.y : 'no player');
        console.log('Platforms cleared:', this.platforms.length);
        console.log('Camera reset to:', this.camera.x + ',' + this.camera.y);

        // Restart game loop
        this.gameRunning = true;
        this.showScreen('gameScreen');

        // Ensure game loop is running
        if (this.gameRunning && !this.gameLoopRunning) {
            console.log('Starting game loop for boss battle');
            this.gameLoopRunning = true;
            this.gameLoop();
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.gameLoopRunning = false;
        this.stopMusic();
        document.getElementById('gameOverTitle').textContent = 'GAME OVER';
        document.getElementById('gameOverMessage').textContent = 'The poop monsters have taken over!';
        document.getElementById('finalScoreValue').textContent = this.score;
        this.showScreen('gameOverScreen');
    }

    gameWin() {
        this.gameRunning = false;
        this.gameLoopRunning = false;
        this.stopMusic();

        // Show the special victory screen
        document.getElementById('victoryScoreValue').textContent = this.score;
        this.showScreen('victoryScreen');

        console.log('Victory! Player saved the world from the poop apocalypse!');
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
        this.gameLoopRunning = false;
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

        // Reset tutorial state
        this.tutorialStep = 0;
        this.tutorialHelper = null;
        this.tutorialMonstersSpawned = false;

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
    gameInstance.gameLoopRunning = false;
    gameInstance.showScreen('titleScreen');
    console.log('Game initialized, should be on title screen');

    // Debug: Add global function to force title screen
    window.showTitle = () => {
        console.log('Force showing title screen...');
        gameInstance.showScreen('titleScreen');
    };
}; 