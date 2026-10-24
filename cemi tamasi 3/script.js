const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');
const mobileControls = document.getElementById('mobile-controls');
const dialogBox = document.getElementById('dialogBox');
const dialogText = document.getElementById('dialogText');
const closeDialogBtn = document.getElementById('closeDialogBtn');
const scoreText = document.getElementById('scoreText');
const locationText = document.getElementById('locationText');
const finalScoreText = document.getElementById('finalScoreText');
const abilityFill = document.getElementById('abilityFill');
const charAbilityText = document.getElementById('charAbilityText');
const btnJump = document.getElementById('btnJump');
const btnAbility = document.getElementById('btnAbility');
const btnEnter = document.getElementById('btnEnter');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let gameRunning = false;
let score = 0;
let gameSpeed = 5;
let speedIncrement = 0.001;
let gravity = 0.6;
let frameCount = 0;

let selectedCharKey = 'ioane';
let selectedDiff = 'medium';

const characters = {
  ioane: { name: 'იოანე', color: '#ef4444', ability: 'ორმაგი ნახტომი', maxJumps: 2 },
  andria: { name: 'ანდრია', color: '#3b82f6', ability: 'ფარი', maxJumps: 1 },
  ilia: { name: 'ილია', color: '#10b981', ability: 'სპრინტი', maxJumps: 1 },
  gabriel: { name: 'გაბრიელი', color: '#f59e0b', ability: 'ნელა ანდრია', maxJumps: 1 }
};

const biomes = [
  { name: 'მწვანე ველები', skyDay: '#87CEEB', skyNight: '#0f172a', ground: '#22c55e', dirt: '#78350f' },
  { name: 'ქალაქის სანსეტი', skyDay: '#f97316', skyNight: '#1e1b4b', ground: '#475569', dirt: '#1e293b' },
  { name: 'ნეონის კიბერპანკი', skyDay: '#d946ef', skyNight: '#020617', ground: '#06b6d4', dirt: '#0f172a' },
  { name: 'ოქროს უდაბნო', skyDay: '#fde047', skyNight: '#312e81', ground: '#eab308', dirt: '#854d0e' },
  { name: 'ძველი ნანგრევები', skyDay: '#a8a29e', skyNight: '#1c1917', ground: '#78716c', dirt: '#292524' }
];

let currentBiomeIndex = 0;
let isNight = false;

// NPC Clues Sequence
const npcClues = [
  "🧍‍♂️ კაცი: „გამარჯობა! პირველი მინიშნება: წინ დიდი საიდუმლო გელოდება. გაჰყევი გზას!“",
  "🧍‍♂️ კაცი: „მეორე მინიშნება: ყოველ დაღამებაზე სამყარო იცვლება. ყურადღებით იყავი!“",
  "🧍‍♂️ კაცი: „მესამე მინიშნება: სუპერ უნარები გამოიყენე მაშინ, როცა დაბრკოლება ძალიან ახლოსაა!“",
  "🧍‍♂️ კაცი: „მეოთხე მინიშნება: შენ უკვე თითქმის მიაღწიე მიზანს. განაგრძე სვლა!“"
];
let currentClueIndex = 0;

const player = {
  x: 60,
  y: 0,
  width: 45,
  height: 55,
  vy: 0,
  jumpForce: -13,
  isGrounded: false,
  isClimbing: false,
  jumpsLeft: 1,
  shieldActive: false,
  sprintActive: false,
  slowMoActive: false,
  abilityCooldown: 0,
  maxCooldown: 300,
  abilityTimer: 0
};

let obstacles = [];
let ladders = [];
let houses = [];
let npcs = [];
let clouds = [];

let activeHouseNear = null;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'jump') {
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'ability') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {}
}

// UI Selection Handlers
['ioane', 'andria', 'ilia', 'gabriel'].forEach(key => {
  const card = document.getElementById(`card-${key}`);
  if (card) {
    card.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectedCharKey = key;
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  }
});

['easy', 'medium', 'hard'].forEach(diff => {
  const btn = document.getElementById(`diff-${diff}`);
  if (btn) {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectedDiff = diff;
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  }
});

function handleJumpOrClimb() {
  if (!gameRunning) return;

  // Check if near ladder to climb
  let nearLadder = false;
  ladders.forEach(l => {
    if (Math.abs(player.x - l.x) < 35) {
      nearLadder = true;
      player.vy = -6; // climb up ladder
      player.isClimbing = true;
    }
  });

  if (!nearLadder) {
    if (player.isGrounded) {
      player.vy = player.jumpForce;
      player.isGrounded = false;
      player.jumpsLeft = characters[selectedCharKey].maxJumps - 1;
      playSound('jump');
    } else if (selectedCharKey === 'ioane' && player.jumpsLeft > 0) {
      player.vy = player.jumpForce * 0.9;
      player.jumpsLeft--;
      playSound('jump');
    }
  }
}

function handleEnterHouse() {
  if (!activeHouseNear || !gameRunning) return;

  // Enter house effect & NPC dialog
  const clue = npcClues[currentClueIndex % npcClues.length];
  currentClueIndex++;
  dialogText.innerText = clue;
  dialogBox.classList.remove('hidden');

  // Spawn NPC near house when exiting
  npcs.push({
    x: activeHouseNear.x + 70,
    y: canvas.height - 130
  });

  playSound('ability');
}

if (closeDialogBtn) {
  closeDialogBtn.addEventListener('click', () => {
    dialogBox.classList.add('hidden');
  });
}

function handleAbility() {
  if (!gameRunning) return;
  if (player.abilityCooldown <= 0) {
    player.abilityCooldown = player.maxCooldown;
    playSound('ability');

    if (selectedCharKey === 'andria') {
      player.shieldActive = true;
      player.abilityTimer = 180;
    } else if (selectedCharKey === 'ilia') {
      player.sprintActive = true;
      player.abilityTimer = 150;
    } else if (selectedCharKey === 'gabriel') {
      player.slowMoActive = true;
      player.abilityTimer = 200;
    }
  }
}

function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  mobileControls.classList.remove('hidden');
  dialogBox.classList.add('hidden');

  const char = characters[selectedCharKey];
  charAbilityText.innerText = `${char.ability}`;

  if (selectedDiff === 'easy') {
    gameSpeed = 4.5;
    speedIncrement = 0.0006;
  } else if (selectedDiff === 'medium') {
    gameSpeed = 6.5;
    speedIncrement = 0.0012;
  } else if (selectedDiff === 'hard') {
    gameSpeed = 8.5;
    speedIncrement = 0.002;
  }

  score = 0;
  frameCount = 0;
  currentBiomeIndex = 0;
  isNight = false;
  currentClueIndex = 0;
  obstacles = [];
  ladders = [];
  houses = [];
  npcs = [];
  clouds = [];

  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.3) + 10,
      speed: Math.random() * 0.5 + 0.3,
      size: Math.random() * 20 + 20
    });
  }

  const groundY = canvas.height - 90;
  player.y = groundY - player.height;
  player.vy = 0;
  player.isGrounded = true;
  player.abilityCooldown = 0;
  player.shieldActive = false;
  player.sprintActive = false;
  player.slowMoActive = false;

  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

if (startBtn) startBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); startGame(); });
if (restartBtn) restartBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); startGame(); });

if (btnJump) btnJump.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); handleJumpOrClimb(); });
if (btnAbility) btnAbility.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); handleAbility(); });
if (btnEnter) btnEnter.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); handleEnterHouse(); });

window.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') handleJumpOrClimb();
  if (e.code === 'ShiftLeft' || e.code === 'KeyE') handleAbility();
  if (e.code === 'KeyF') handleEnterHouse();
});

function triggerGameOver() {
  gameRunning = false;
  playSound('hit');
  finalScoreText.innerText = `შენი ქულა: ${Math.floor(score)}`;
  hud.classList.add('hidden');
  mobileControls.classList.add('hidden');
  dialogBox.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  frameCount++;
  score += 0.1;
  scoreText.innerText = Math.floor(score);

  // Day/Night Cycle
  const cycleFrame = frameCount % 1800;
  const newNight = cycleFrame >= 900;
  if (newNight && !isNight) {
    currentBiomeIndex = (currentBiomeIndex + 1) % biomes.length;
  }
  isNight = newNight;
  locationText.innerText = biomes[currentBiomeIndex].name;

  let currentSpeed = gameSpeed;
  if (player.sprintActive) currentSpeed *= 1.8;
  if (player.slowMoActive) currentSpeed *= 0.4;

  gameSpeed += speedIncrement;

  if (player.abilityCooldown > 0) player.abilityCooldown--;
  abilityFill.style.width = `${((player.maxCooldown - player.abilityCooldown) / player.maxCooldown) * 100}%`;

  if (player.abilityTimer > 0) {
    player.abilityTimer--;
    if (player.abilityTimer <= 0) {
      player.shieldActive = false;
      player.sprintActive = false;
      player.slowMoActive = false;
    }
  }

  // Physics
  player.vy += gravity;
  player.y += player.vy;

  const groundY = canvas.height - 90;
  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.isGrounded = true;
    player.jumpsLeft = characters[selectedCharKey].maxJumps;
  }

  // Spawn Structures (Ladders + Houses)
  if (frameCount % 350 === 0) {
    const ladderX = canvas.width;
    ladders.push({ x: ladderX, y: groundY - 120, width: 25, height: 120 });
    houses.push({ x: ladderX + 25, y: groundY - 140, width: 90, height: 80 });
  }

  // Spawn Obstacles
  if (frameCount % Math.max(50, Math.floor(120 - gameSpeed * 4.5)) === 0) {
    const type = Math.random() > 0.3 ? 'ground' : 'flying';
    obstacles.push({
      x: canvas.width,
      y: type === 'ground' ? groundY - 45 : groundY - 120,
      width: type === 'ground' ? 30 : 35,
      height: type === 'ground' ? 45 : 30,
      type: type
    });
  }

  // Update Structures & Houses
  activeHouseNear = null;
  for (let i = houses.length - 1; i >= 0; i--) {
    const h = houses[i];
    h.x -= currentSpeed;
    if (Math.abs(player.x - h.x) < 50) {
      activeHouseNear = h;
    }
    if (h.x + h.width < 0) houses.splice(i, 1);
  }

  if (btnEnter) {
    if (activeHouseNear) {
      btnEnter.classList.remove('hidden');
    } else {
      btnEnter.classList.add('hidden');
    }
  }

  for (let i = ladders.length - 1; i >= 0; i--) {
    const l = ladders[i];
    l.x -= currentSpeed;
    if (l.x + l.width < 0) ladders.splice(i, 1);
  }

  for (let i = npcs.length - 1; i >= 0; i--) {
    const npc = npcs[i];
    npc.x -= currentSpeed;
    if (npc.x < -50) npcs.splice(i, 1);
  }

  // Obstacle Collision
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed;

    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      if (player.shieldActive) {
        obstacles.splice(i, 1);
        player.shieldActive = false;
        playSound('hit');
        continue;
      } else {
        triggerGameOver();
        return;
      }
    }

    if (obs.x + obs.width < 0) obstacles.splice(i, 1);
  }
}

function draw() {
  const currentBiome = biomes[currentBiomeIndex];
  ctx.fillStyle = isNight ? currentBiome.skyNight : currentBiome.skyDay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    ctx.fill();
  });

  const groundY = canvas.height - 90;

  // Draw Houses
  houses.forEach(h => {
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(h.x, h.y, h.width, h.height);
    // Roof
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(h.x - 10, h.y);
    ctx.lineTo(h.x + h.width / 2, h.y - 30);
    ctx.lineTo(h.x + h.width + 10, h.y);
    ctx.fill();
    // Door
    ctx.fillStyle = '#451a03';
    ctx.fillRect(h.x + 30, h.y + 40, 30, 40);
  });

  // Draw Ladders
  ladders.forEach(l => {
    ctx.fillStyle = '#d97706';
    ctx.fillRect(l.x, l.y, 4, l.height);
    ctx.fillRect(l.x + l.width, l.y, 4, l.height);
    for (let step = l.y; step < l.y + l.height; step += 15) {
      ctx.fillRect(l.x, step, l.width, 3);
    }
  });

  // Draw NPCs / Guys
  npcs.forEach(npc => {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(npc.x, npc.y, 25, 40);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(npc.x + 12, npc.y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ground
  ctx.fillStyle = currentBiome.ground;
  ctx.fillRect(0, groundY, canvas.width, 90);
  ctx.fillStyle = currentBiome.dirt;
  ctx.fillRect(0, groundY + 12, canvas.width, 78);

  // Obstacles
  obstacles.forEach(obs => {
    if (obs.type === 'ground') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height);
      ctx.lineTo(obs.x + obs.width / 2, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.fill();
    } else {
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  });

  // Player
  const char = characters[selectedCharKey];
  if (player.shieldActive) {
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fill();
  }

  ctx.fillStyle = char.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(char.name[0], player.x + 14, player.y + 36);
}