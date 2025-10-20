/* =============================
   Shape Tap Deluxe – All-in-One
   Features:
   - Multiple shapes spawn & roam
   - Tap to morph shape + color
   - Particle explosion animation
   - Score, best score, 60s timer
   - Combo bonus on quick chains
   - Sound effects (WebAudio)
   - Mobile touch friendly
================================ */

// Register Service Worker for PWA (only works when served via HTTP/HTTPS)
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl  = document.getElementById('time');
const bestEl  = document.getElementById('best');
const startBtn= document.getElementById('startBtn');
const pauseBtn= document.getElementById('pauseBtn');
const resetBtn= document.getElementById('resetBtn');
const statsBtn= document.getElementById('statsBtn');
const shopBtn = document.getElementById('shopBtn');
const comboDisplayEl = document.getElementById('comboDisplay');
const levelEl = document.getElementById('level');
const volumeSlider = document.getElementById('volume');
const volumeVal = document.getElementById('volumeVal');
const difficultySelect = document.getElementById('difficulty');
const floatingComboEl = document.getElementById('floatingCombo');
const gameOverModal = document.getElementById('gameOverModal');
const statsModal = document.getElementById('statsModal');
const shopModal = document.getElementById('shopModal');
const campaignModal = document.getElementById('campaignModal');
const achievementToast = document.getElementById('achievementToast');
const coinsDisplayEl = document.getElementById('coinsDisplay');

const SHAPES = ['circle','square','triangle','pentagon','star'];
const COLOR_THEMES = {
  default: ['#ff006e','#f72585','#b5179e','#7209b7','#560bad','#480ca8','#3a0ca3','#3f37c9','#4361ee','#4895ef','#4cc9f0','#06d6a0','#ffd166','#f77f00','#ef476f'],
  oceanTheme: ['#006994','#007ea7','#00a8cc','#00d4ff','#66e0ff','#1292c2','#0a7fad','#095c80','#0d4a6b','#0c3653'],
  fireTheme: ['#ff0000','#ff3300','#ff6600','#ff9900','#ffcc00','#ff0033','#ff0066','#cc0000','#990000','#ff6633']
};
const TAU = Math.PI*2;

function getColors(){
  return COLOR_THEMES[state.customization.theme] || COLOR_THEMES.default;
}

let rng = (min,max)=> Math.random()*(max-min)+min;
let choose = arr => arr[(Math.random()*arr.length)|0];

// WebAudio simple synth with volume control
let audioCtx;
let masterVolume = 0.5;

// Audio files
const audioFiles = {
  gameStart: new Audio('assets/game-start.mp3'),
  gameOver: new Audio('assets/winner-game-sound.mp3')
};

// Set volume for audio files
function updateAudioVolume() {
  audioFiles.gameStart.volume = masterVolume;
  audioFiles.gameOver.volume = masterVolume;
}
updateAudioVolume();

// Play audio file
function playAudio(audioName) {
  try {
    const audio = audioFiles[audioName];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  } catch(e) { /* ignore */ }
}

function ping(f=440, t=0.08, type='sine', gain=0.08){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    g.gain.value = 0;
    const adjustedGain = gain * masterVolume;
    g.gain.linearRampToValueAtTime(adjustedGain, now+0.005);
    g.gain.exponentialRampToValueAtTime(0.00001, now+t);
    o.connect(g).connect(audioCtx.destination);
    o.start(now);
    o.stop(now+t+0.02);
  }catch(e){ /* ignore if user blocks audio */ }
}
function chord(){
  ping(660, .07, 'triangle', .07);
  setTimeout(()=>ping(990,.07,'triangle',.05), 25);
}
function victorySound(){
  playAudio('gameOver');
}

// Difficulty settings
const DIFFICULTY = {
  easy: { time: 90, shapeCount: [4,6], speed: [15,35], spawnRate: 0.015 },
  medium: { time: 60, shapeCount: [6,8], speed: [30,70], spawnRate: 0.02 },
  hard: { time: 45, shapeCount: [8,12], speed: [40,90], spawnRate: 0.025 },
  insane: { time: 30, shapeCount: [10,15], speed: [60,120], spawnRate: 0.03 }
};

// Game modes
const GAME_MODES = {
  classic: { hasTimer: true, spawnPowerups: true },
  endless: { hasTimer: false, spawnPowerups: true },
  zen: { hasTimer: false, spawnPowerups: false, slow: true },
  speed: { hasTimer: true, timeLimit: 30, fast: true, spawnPowerups: true },
  campaign: { hasTimer: true, spawnPowerups: true, isLevel: true },
  daily: { hasTimer: true, spawnPowerups: true, isDaily: true }
};

// Campaign levels (50 levels)
const CAMPAIGN_LEVELS = [];
for(let i = 1; i <= 50; i++){
  const level = {
    number: i,
    objective: null,
    targetScore: 100 + (i * 50),
    timeLimit: 60 - Math.floor(i / 10) * 5,
    shapeTypes: SHAPES.slice(0, Math.min(2 + Math.floor(i/5), 5)),
    hasObstacles: i >= 10,
    hasPortals: i >= 20,
    hasGravity: i >= 30,
    hasBoss: i % 10 === 0
  };

  // Set objectives
  if(i % 10 === 0) level.objective = `Boss: Score ${level.targetScore} in ${level.timeLimit}s!`;
  else if(i % 5 === 0) level.objective = `Challenge: Get a ${Math.min(10 + i/5, 20)}x combo!`;
  else level.objective = `Score ${level.targetScore} points`;

  CAMPAIGN_LEVELS.push(level);
}

// Procedural generation - Seeded random for daily challenges
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// Daily challenge generation
function getDailySeed(){
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function generateDailyChallenge(){
  const seed = getDailySeed();
  const rng = new SeededRandom(seed);

  return {
    targetScore: Math.floor(rng.range(500, 1500)),
    timeLimit: Math.floor(rng.range(45, 90)),
    shapeCount: [Math.floor(rng.range(5, 8)), Math.floor(rng.range(8, 15))],
    speed: [rng.range(30, 50), rng.range(60, 100)],
    hasObstacles: rng.next() > 0.5,
    hasPortals: rng.next() > 0.7,
    hasGravity: rng.next() > 0.8,
    specialShapeChance: rng.range(0.1, 0.3),
    seed: seed
  };
}

const state = {
  running:false,
  paused:false,
  score:0,
  best: Number(localStorage.getItem('shape_tap_best')||0),
  timeLeft:60,
  lastTapTime:0,
  combo:0,
  maxCombo:0,
  shapes:[],
  particles:[],
  powerups:[],
  trails:[],
  lastFrame:0,
  difficulty: 'medium',
  gameMode: 'classic',
  totalTaps: 0,
  missedTaps: 0,
  screenShake: 0,
  activePowerups: {},
  // Progression
  xp: Number(localStorage.getItem('player_xp')||0),
  level: Number(localStorage.getItem('player_level')||1),
  coins: Number(localStorage.getItem('player_coins')||0),
  // Stats
  stats: JSON.parse(localStorage.getItem('game_stats') || '{"totalGames":0,"totalShapesTapped":0,"bestCombo":0,"totalScore":0}'),
  // Customization
  customization: JSON.parse(localStorage.getItem('customization') || '{"theme":"default","particleStyle":"default","owned":{"themes":["default"],"particles":["default"]}}'),
  // Campaign
  campaign: JSON.parse(localStorage.getItem('campaign_progress') || '{"currentLevel":1,"levelStars":{},"unlockedLevels":[1]}'),
  currentCampaignLevel: null,
  // Physics
  obstacles: [],
  portals: [],
  gravityZones: [],
  // Daily challenge
  dailyChallenge: null,
  dailyChallengeCompleted: false
};
bestEl.textContent = state.best;
levelEl.textContent = state.level;
coinsDisplayEl.textContent = state.coins;

// Initialize daily challenge completion check (must be after getDailySeed is defined)
state.dailyChallengeCompleted = localStorage.getItem('daily_completed') === getDailySeed().toString();

function resetGame(){
  const diff = DIFFICULTY[state.difficulty];
  const mode = GAME_MODES[state.gameMode];

  state.score=0;
  state.timeLeft= mode.timeLimit || diff.time;
  state.combo=0;
  state.maxCombo=0;
  state.totalTaps=0;
  state.missedTaps=0;
  state.shapes = [];
  state.particles = [];
  state.powerups = [];
  state.trails = [];
  state.activePowerups = {};
  state.obstacles = [];
  state.portals = [];
  state.gravityZones = [];

  // Campaign level setup
  if(state.gameMode === 'campaign' && state.currentCampaignLevel){
    const level = CAMPAIGN_LEVELS[state.currentCampaignLevel - 1];
    state.timeLeft = level.timeLimit;

    // Add obstacles for level 10+
    if(level.hasObstacles){
      for(let i=0; i<3; i++){
        state.obstacles.push({
          x: rng(100, canvas.width-100),
          y: rng(100, canvas.height-100),
          width: rng(60, 120),
          height: 20,
          rotation: rng(0, TAU)
        });
      }
    }

    // Add portals for level 20+
    if(level.hasPortals){
      const p1 = {x: rng(80, canvas.width/2), y: rng(80, canvas.height-80), radius: 35, linked: 1};
      const p2 = {x: rng(canvas.width/2, canvas.width-80), y: rng(80, canvas.height-80), radius: 35, linked: 0};
      state.portals = [p1, p2];
    }

    // Add gravity zones for level 30+
    if(level.hasGravity){
      state.gravityZones.push({
        x: canvas.width/2,
        y: canvas.height/2,
        radius: 100,
        strength: 0.05
      });
    }
  }

  // Daily challenge setup
  if(state.gameMode === 'daily' && state.dailyChallenge){
    const daily = state.dailyChallenge;
    state.timeLeft = daily.timeLimit;

    if(daily.hasObstacles){
      for(let i=0; i<2; i++){
        state.obstacles.push({
          x: rng(100, canvas.width-100),
          y: rng(100, canvas.height-100),
          width: rng(60, 100),
          height: 20,
          rotation: rng(0, TAU)
        });
      }
    }

    if(daily.hasPortals){
      const p1 = {x: rng(80, canvas.width/2), y: rng(80, canvas.height-80), radius: 35, linked: 1};
      const p2 = {x: rng(canvas.width/2, canvas.width-80), y: rng(80, canvas.height-80), radius: 35, linked: 0};
      state.portals = [p1, p2];
    }

    if(daily.hasGravity){
      state.gravityZones.push({
        x: canvas.width/2,
        y: canvas.height/2,
        radius: 100,
        strength: 0.05
      });
    }
  }

  // spawn initial shapes
  const initCount = diff.shapeCount[0];
  for(let i=0;i<initCount;i++) spawnShape(true);

  scoreEl.textContent = '0';
  timeEl.textContent = mode.hasTimer ? String(state.timeLeft) : '∞';
  comboDisplayEl.textContent = '0';
  draw(); // clear frame
}
function startGame(){
  if(!state.running){
    resetGame();
    state.running=true;
    state.paused=false;
    state.lastFrame=performance.now();
    requestAnimationFrame(loop);
    playAudio('gameStart');
  }else{
    // unpause if paused
    state.paused=false;
  }
}
function pauseGame(){
  state.paused = !state.paused;
  if(!state.paused){
    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
    ping(440,.05,'square',.05);
  } else {
    ping(220,.05,'sine',.04);
  }
}
function endGame(){
  state.running=false;
  state.paused=false;

  // Campaign level completion
  if(state.gameMode === 'campaign' && state.currentCampaignLevel){
    const level = CAMPAIGN_LEVELS[state.currentCampaignLevel - 1];
    const passed = state.score >= level.targetScore;

    if(passed){
      // Calculate stars (1-3 based on performance)
      let stars = 1;
      if(state.score >= level.targetScore * 1.5) stars = 2;
      if(state.score >= level.targetScore * 2) stars = 3;

      state.campaign.levelStars[state.currentCampaignLevel] = Math.max(
        state.campaign.levelStars[state.currentCampaignLevel] || 0,
        stars
      );

      // Unlock next level
      if(!state.campaign.unlockedLevels.includes(state.currentCampaignLevel + 1)){
        state.campaign.unlockedLevels.push(state.currentCampaignLevel + 1);
      }

      state.campaign.currentLevel = Math.max(state.campaign.currentLevel, state.currentCampaignLevel + 1);
      localStorage.setItem('campaign_progress', JSON.stringify(state.campaign));

      showAchievement('Level Complete!', `Earned ${stars} star${stars>1?'s':''}!`);
      victorySound();
    } else {
      showAchievement('Level Failed', `Need ${level.targetScore} points to pass`);
    }
  }

  // Daily challenge completion
  if(state.gameMode === 'daily' && state.dailyChallenge){
    const passed = state.score >= state.dailyChallenge.targetScore;

    if(passed){
      state.dailyChallengeCompleted = true;
      localStorage.setItem('daily_completed', getDailySeed().toString());

      // Bonus rewards for daily challenge
      const bonusCoins = 100;
      const bonusXP = 200;
      state.coins += bonusCoins;
      state.xp += bonusXP;
      localStorage.setItem('player_coins', String(state.coins));
      localStorage.setItem('player_xp', String(state.xp));

      showAchievement('Daily Challenge Complete!', `+${bonusCoins} coins, +${bonusXP} XP!`);
      victorySound();
    } else {
      showAchievement('Challenge Failed', `Need ${state.dailyChallenge.targetScore} points to complete`);
    }
  }

  // Update stats
  state.stats.totalGames++;
  state.stats.totalShapesTapped += state.totalTaps;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, state.maxCombo);
  state.stats.totalScore += state.score;
  localStorage.setItem('game_stats', JSON.stringify(state.stats));

  // Add XP and coins
  const earnedXP = Math.floor(state.score / 10);
  const earnedCoins = Math.floor(state.score / 20);
  state.xp += earnedXP;
  state.coins += earnedCoins;
  localStorage.setItem('player_coins', String(state.coins));
  coinsDisplayEl.textContent = state.coins;
  checkLevelUp();

  // Update best score
  let newRecord = false;
  if(state.score>state.best){
    state.best = state.score;
    localStorage.setItem('shape_tap_best', String(state.best));
    bestEl.textContent = state.best;
    newRecord = true;
    victorySound();
    showAchievement('New Record!', `${state.score} points - Amazing!`);
  } else {
    ping(220,.08,'sawtooth',.06);
    setTimeout(()=>ping(180,.12,'sawtooth',.06), 90);
  }

  // Show game over modal
  showGameOverModal();
}

function checkLevelUp(){
  const xpNeeded = state.level * 100;
  if(state.xp >= xpNeeded){
    state.xp -= xpNeeded;
    state.level++;
    localStorage.setItem('player_level', String(state.level));
    localStorage.setItem('player_xp', String(state.xp));
    levelEl.textContent = state.level;
    showAchievement('Level Up!', `You reached level ${state.level}!`);
    victorySound();
  } else {
    localStorage.setItem('player_xp', String(state.xp));
  }
}

function showAchievement(title, desc){
  const titleEl = document.getElementById('achievementTitle');
  const descEl = document.getElementById('achievementDesc');
  titleEl.textContent = title;
  descEl.textContent = desc;
  achievementToast.classList.add('show');
  setTimeout(()=> achievementToast.classList.remove('show'), 3000);
}

function showGameOverModal(){
  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('finalTaps').textContent = state.totalTaps;
  document.getElementById('finalCombo').textContent = state.maxCombo;
  const accuracy = state.totalTaps > 0 ? Math.round((state.totalTaps / (state.totalTaps + state.missedTaps)) * 100) : 0;
  document.getElementById('finalAccuracy').textContent = accuracy + '%';
  gameOverModal.classList.add('show');
}

function spawnShape(first=false){
  const diff = DIFFICULTY[state.difficulty];
  const mode = GAME_MODES[state.gameMode];

  const margin = 60;
  const size = rng(48, 86);
  const x = rng(margin, canvas.width-margin);
  const y = rng(margin, canvas.height-margin);

  let speedMult = 1;
  if(mode.slow) speedMult = 0.5;
  if(mode.fast) speedMult = 1.5;

  const speed = first ? rng(diff.speed[0]*0.5, diff.speed[1]*0.5) : rng(diff.speed[0], diff.speed[1]);
  const dir = Math.random()*TAU;
  const vx = Math.cos(dir) * (speed/60) * speedMult;
  const vy = Math.sin(dir) * (speed/60) * speedMult;

  // Special shapes (10% chance)
  let special = null;
  if(Math.random() < 0.1 && state.level >= 2){
    special = choose(['golden', 'bomb', 'rainbow']);
  }

  const shape = {
    x,y,size,
    type: choose(SHAPES),
    color: choose(getColors()),
    vx, vy, rot:rng(0,TAU), vrot:rng(-0.03,0.03),
    special,
    glowPhase: 0
  };
  state.shapes.push(shape);
}

// Power-up system
function spawnPowerup(){
  const margin = 80;
  const powerupTypes = ['freeze', 'slow', 'double', 'time'];
  state.powerups.push({
    x: rng(margin, canvas.width-margin),
    y: rng(margin, canvas.height-margin),
    type: choose(powerupTypes),
    size: 30,
    life: 10000,
    pulse: 0
  });
}

function activatePowerup(type){
  switch(type){
    case 'freeze':
      state.activePowerups.freeze = 5000;
      showAchievement('Time Freeze!', 'Timer paused for 5s');
      ping(880, .1, 'sine', .1);
      break;
    case 'slow':
      state.activePowerups.slow = 8000;
      showAchievement('Slow Motion!', 'Shapes slowed for 8s');
      ping(660, .1, 'triangle', .1);
      break;
    case 'double':
      state.activePowerups.double = 10000;
      showAchievement('Double Points!', '2x score for 10s');
      ping(1046, .1, 'square', .1);
      break;
    case 'time':
      state.timeLeft += 10;
      showAchievement('Bonus Time!', '+10 seconds');
      victorySound();
      break;
  }
}

function morph(shape){
  // next shape & color
  const colors = getColors();
  const typeIndex = (SHAPES.indexOf(shape.type)+1)%SHAPES.length;
  const colorIndex = (colors.indexOf(shape.color)+1) % colors.length;
  shape.type = SHAPES[typeIndex];
  shape.color = colors[colorIndex];
  shape.size = Math.max(42, Math.min(96, shape.size + rng(-12,12)));
  shape.vx += rng(-0.3,0.3);
  shape.vy += rng(-0.3,0.3);
}

function addScore(base=10, isSpecial=false){
  const now = performance.now();
  if(now - state.lastTapTime < 600){ // combo window
    state.combo++;
  } else {
    state.combo=0;
  }
  state.lastTapTime = now;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  // Apply multipliers
  const bonus = Math.min(5, state.combo);
  let mult = 1;
  if(state.activePowerups.double) mult *= 2;
  if(isSpecial) mult *= 3;

  const add = Math.floor((base + bonus*2) * mult);
  state.score += add;
  scoreEl.textContent = state.score;
  comboDisplayEl.textContent = state.combo;

  // Show combo display
  if(state.combo >= 3){
    floatingComboEl.textContent = `${state.combo}x COMBO!`;
    floatingComboEl.classList.add('show');
    setTimeout(()=> floatingComboEl.classList.remove('show'), 800);
  }

  // Screen shake on high combo
  if(state.combo >= 5){
    state.screenShake = 10;
  }

  floater(`+${add}${isSpecial?' ⭐':''}${bonus>=2?` x${state.combo}`:''}`);

  // Check achievements
  if(state.combo === 10){
    showAchievement('Combo Master!', '10 hit combo achieved!');
  }
  if(state.score >= 1000 && !state.achievement1000){
    state.achievement1000 = true;
    showAchievement('High Scorer!', 'Reached 1000 points!');
  }
}

function banner(text, ms=1200){
  floatTexts.push({text, x:canvas.width/2, y:80, vy:-0.3, life:ms, big:true});
}
function floater(text, atX, atY, ms=800){
  floatTexts.push({
    text, x: atX ?? canvas.width/2, y: atY ?? 120,
    vy: -0.35, life: ms, big:false
  });
}
const floatTexts = [];

function makeExplosion(x,y, baseColor){
  const n = 22;
  const particleStyle = state.customization.particleStyle;

  for(let i=0;i<n;i++){
    const ang = (i/n)*TAU + rng(-0.2,0.2);
    const spd = rng(1.5,4.2);
    state.particles.push({
      x,y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
      life: rng(450,800),
      size: rng(2,4),
      color: baseColor,
      grav: .035,
      spin: rng(-0.2,0.2),
      rot: rng(0,TAU),
      style: particleStyle
    });
  }
}

function drawShape(s){
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);

  const r = s.size/2;

  // Special effects
  if(s.special === 'golden'){
    // Golden glow
    const goldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    goldGradient.addColorStop(0, '#fff9c4');
    goldGradient.addColorStop(0.5, '#ffd700');
    goldGradient.addColorStop(1, '#f9a825');
    ctx.fillStyle = goldGradient;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
  } else if(s.special === 'rainbow'){
    const hue = (s.glowPhase * 60) % 360;
    const rainbowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    rainbowGradient.addColorStop(0, `hsl(${hue}, 100%, 70%)`);
    rainbowGradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 100%, 60%)`);
    ctx.fillStyle = rainbowGradient;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 25;
  } else if(s.special === 'bomb'){
    // Red pulsing bomb
    const bombGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    bombGradient.addColorStop(0, '#ff6b6b');
    bombGradient.addColorStop(0.5, '#ff3333');
    bombGradient.addColorStop(1, '#cc0000');
    ctx.fillStyle = bombGradient;
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 20;
  } else {
    // Normal shapes with gradient
    const gradient = ctx.createRadialGradient(-r/3, -r/3, 0, 0, 0, r);
    const baseColor = s.color;
    gradient.addColorStop(0, lightenColor(baseColor, 40));
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, darkenColor(baseColor, 20));
    ctx.fillStyle = gradient;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 8;
  }

  // Draw outer glow for special shapes
  if(s.special){
    ctx.globalAlpha = 0.4 + Math.sin(s.glowPhase) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Main shape with stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;

  switch(s.type){
    case 'circle':
      ctx.beginPath();
      ctx.arc(0,0,r,0,TAU);
      ctx.fill();
      ctx.stroke();
      break;
    case 'square':
      ctx.fillRect(-r,-r, s.size, s.size);
      ctx.strokeRect(-r,-r, s.size, s.size);
      break;
    case 'triangle':
      poly(3, r);
      ctx.fill();
      ctx.stroke();
      break;
    case 'pentagon':
      poly(5, r);
      ctx.fill();
      ctx.stroke();
      break;
    case 'star':
      star(5, r, r*0.46);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.restore();
}

// Helper functions for color manipulation
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function drawPowerup(p){
  ctx.save();
  ctx.translate(p.x, p.y);

  // Pulsing effect
  const scale = 1 + Math.sin(p.pulse) * 0.15;
  ctx.scale(scale, scale);

  // Icons/colors for different powerups
  const colors = {
    freeze: '#89f7fe',
    slow: '#b5179e',
    double: '#ffd166',
    time: '#06d6a0'
  };

  ctx.fillStyle = colors[p.type] || '#fff';
  ctx.shadowColor = colors[p.type];
  ctx.shadowBlur = 15;

  // Draw orb
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, p.size/2, 0, TAU);
  ctx.fill();

  // Draw icon
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0d0f14';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icons = {freeze:'❄', slow:'🐌', double:'✨', time:'⏰'};
  ctx.fillText(icons[p.type] || '?', 0, 0);

  ctx.restore();
}

function poly(n, radius){
  ctx.beginPath();
  for(let i=0;i<n;i++){
    const a = (i/n)*TAU - Math.PI/2;
    const x = Math.cos(a)*radius;
    const y = Math.sin(a)*radius;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.closePath(); ctx.fill();
}
function star(points, outer, inner){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const a = (i/(points*2))*TAU - Math.PI/2;
    const rad = i%2===0 ? outer : inner;
    const x = Math.cos(a)*rad;
    const y = Math.sin(a)*rad;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.closePath(); ctx.fill();
}

// hit-tests per shape
function pointInShape(px,py,s){
  const dx = px - s.x, dy = py - s.y;
  const r = s.size/2;

  // transform point by inverse rotation
  const cos = Math.cos(-s.rot), sin = Math.sin(-s.rot);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  switch(s.type){
    case 'circle':
      return (dx*dx + dy*dy) <= (r*r);
    case 'square':
      return Math.abs(rx) <= r && Math.abs(ry) <= r;
    case 'triangle':
      return pointInRegularPoly(rx,ry,3,r);
    case 'pentagon':
      return pointInRegularPoly(rx,ry,5,r);
    case 'star':
      return pointInStar(rx,ry,5,r,r*0.46);
  }
  return false;
}
function pointInRegularPoly(x,y,n,radius){
  // Ray-cast using polygon points
  const pts=[];
  for(let i=0;i<n;i++){
    const a=(i/n)*TAU - Math.PI/2;
    pts.push([Math.cos(a)*radius, Math.sin(a)*radius]);
  }
  return pointInPolygon([x,y], pts);
}
function pointInStar(x,y,points,outer,inner){
  const pts=[];
  for(let i=0;i<points*2;i++){
    const a=(i/(points*2))*TAU - Math.PI/2;
    const rad = i%2===0?outer:inner;
    pts.push([Math.cos(a)*rad, Math.sin(a)*rad]);
  }
  return pointInPolygon([x,y], pts);
}
function pointInPolygon(p, vs){
  // ray-casting
  let x=p[0], y=p[1], inside=false;
  for(let i=0,j=vs.length-1;i<vs.length;j=i++){
    const xi=vs[i][0], yi=vs[i][1];
    const xj=vs[j][0], yj=vs[j][1];
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Obstacle collision detection
function checkObstacleCollision(shape, obstacle){
  // Simple AABB check for now
  const dx = Math.abs(shape.x - obstacle.x);
  const dy = Math.abs(shape.y - obstacle.y);
  return dx < (shape.size/2 + obstacle.width/2) && dy < (shape.size/2 + obstacle.height/2);
}

// Floating text
function drawFloaters(dt){
  for(let i=floatTexts.length-1;i>=0;i--){
    const f = floatTexts[i];
    f.life -= dt;
    f.y += f.vy * dt * 0.06;
    const alpha = Math.max(0, Math.min(1, f.life/1000));
    ctx.globalAlpha = Math.pow(alpha, 0.9);
    ctx.font = f.big ? '900 28px Inter, system-ui' : '800 18px Inter, system-ui';
    ctx.textAlign='center'; ctx.fillStyle='#e5edff';
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1.0;
    if(f.life<=0) floatTexts.splice(i,1);
  }
}

function loop(ts){
  if(!state.running || state.paused) return;
  const dt = ts - state.lastFrame;
  state.lastFrame = ts;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt){
  const diff = DIFFICULTY[state.difficulty];
  const mode = GAME_MODES[state.gameMode];

  // Update powerups
  for(let key in state.activePowerups){
    state.activePowerups[key] -= dt;
    if(state.activePowerups[key] <= 0) delete state.activePowerups[key];
  }

  // timer (unless frozen)
  if(mode.hasTimer && !state.activePowerups.freeze){
    state.timeLeft -= dt/1000;
    if(state.timeLeft<=0){
      timeEl.textContent = '0';
      endGame();
      return;
    } else {
      timeEl.textContent = Math.ceil(state.timeLeft);
    }
  }

  // Screen shake decay
  if(state.screenShake > 0) state.screenShake *= 0.9;

  // Slow motion effect
  let speedMult = 1;
  if(state.activePowerups.slow) speedMult = 0.4;

  // move shapes
  for(const s of state.shapes){
    // Apply gravity zones
    for(const gz of state.gravityZones){
      const dx = gz.x - s.x;
      const dy = gz.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < gz.radius){
        s.vx += (dx / dist) * gz.strength * dt * 0.01;
        s.vy += (dy / dist) * gz.strength * dt * 0.01;
      }
    }

    s.x += s.vx * dt * speedMult;
    s.y += s.vy * dt * speedMult;
    s.rot += s.vrot * dt/16;
    s.glowPhase += dt * 0.003;

    // Check portal teleportation
    for(let i=0; i<state.portals.length; i++){
      const portal = state.portals[i];
      const dx = s.x - portal.x;
      const dy = s.y - portal.y;
      if(dx*dx + dy*dy < portal.radius * portal.radius){
        const otherPortal = state.portals[portal.linked];
        s.x = otherPortal.x;
        s.y = otherPortal.y;
        ping(1046, .05, 'sine', .06);
        break;
      }
    }

    // Check obstacle collisions
    for(const obs of state.obstacles){
      if(checkObstacleCollision(s, obs)){
        // Simple bounce off obstacle
        s.vx *= -0.8;
        s.vy *= -0.8;
      }
    }

    // bounce off edges
    const r = s.size/2;
    if(s.x < r){ s.x=r; s.vx = Math.abs(s.vx); }
    if(s.x > canvas.width-r){ s.x=canvas.width-r; s.vx = -Math.abs(s.vx); }
    if(s.y < r){ s.y=r; s.vy = Math.abs(s.vy); }
    if(s.y > canvas.height-r){ s.y=canvas.height-r; s.vy = -Math.abs(s.vy); }
  }

  // Shape-to-shape collisions
  for(let i=0; i<state.shapes.length; i++){
    for(let j=i+1; j<state.shapes.length; j++){
      const s1 = state.shapes[i];
      const s2 = state.shapes[j];
      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = (s1.size + s2.size) / 2;

      if(dist < minDist && dist > 0){
        // Collision! Push apart and exchange velocity
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        s1.x -= nx * overlap * 0.5;
        s1.y -= ny * overlap * 0.5;
        s2.x += nx * overlap * 0.5;
        s2.y += ny * overlap * 0.5;

        // Calculate collision angle and apply impulse
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // Rotate velocities
        const v1x = s1.vx * cos + s1.vy * sin;
        const v1y = s1.vy * cos - s1.vx * sin;
        const v2x = s2.vx * cos + s2.vy * sin;
        const v2y = s2.vy * cos - s2.vx * sin;

        // Swap x velocities (collision response)
        const temp = v1x;
        const finalV1x = v2x * 0.95;
        const finalV2x = temp * 0.95;

        // Rotate back
        s1.vx = finalV1x * cos - v1y * sin;
        s1.vy = v1y * cos + finalV1x * sin;
        s2.vx = finalV2x * cos - v2y * sin;
        s2.vy = v2y * cos + finalV2x * sin;

        // Add slight rotation on collision
        s1.vrot += rng(-0.02, 0.02);
        s2.vrot += rng(-0.02, 0.02);

        // Visual feedback - small particle burst at collision point
        if(Math.random() < 0.3){
          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;
          for(let k=0; k<3; k++){
            const ang = Math.random() * TAU;
            const spd = rng(0.5, 1.5);
            state.particles.push({
              x: midX, y: midY,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 200,
              size: 2,
              color: '#fff',
              grav: 0,
              spin: 0,
              rot: 0,
              style: 'default'
            });
          }
        }
      }
    }
  }

  // Update powerups
  for(let i=state.powerups.length-1; i>=0; i--){
    const p = state.powerups[i];
    p.life -= dt;
    p.pulse += dt * 0.005;
    if(p.life <= 0) state.powerups.splice(i, 1);
  }

  // particles
  for(let i=state.particles.length-1;i>=0;i--){
    const p = state.particles[i];
    const t = dt;
    p.vy += p.grav * (t*0.06);
    p.x += p.vx * (t*0.06);
    p.y += p.vy * (t*0.06);
    p.rot += p.spin * (t*0.06);
    p.life -= t;
    if(p.life<=0) state.particles.splice(i,1);
  }

  // maintain target shape count
  const [minShapes, maxShapes] = diff.shapeCount;
  if(state.shapes.length < maxShapes && Math.random() < diff.spawnRate) spawnShape();

  // Spawn powerups
  if(mode.spawnPowerups && state.powerups.length < 2 && Math.random() < 0.005){
    spawnPowerup();
  }
}

function draw(){
  ctx.save();

  // Apply screen shake
  if(state.screenShake > 1){
    ctx.translate(
      Math.random() * state.screenShake - state.screenShake/2,
      Math.random() * state.screenShake - state.screenShake/2
    );
  }

  // bg clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // subtle grid
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#7aa2ff';
  ctx.lineWidth = 1;
  const step = 40;
  ctx.beginPath();
  for(let x=0;x<canvas.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
  for(let y=0;y<canvas.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // particles
  for(const p of state.particles){
    ctx.save();
    ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life/800));
    ctx.fillStyle = p.color;

    // Draw based on particle style
    if(p.style === 'starParticle'){
      // Draw star
      ctx.beginPath();
      for(let i=0; i<5; i++){
        const angle = (i / 5) * TAU - Math.PI/2;
        const r = i % 2 === 0 ? p.size : p.size/2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if(i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if(p.style === 'heartParticle'){
      // Draw heart
      ctx.beginPath();
      ctx.moveTo(0, -p.size/4);
      ctx.bezierCurveTo(-p.size/2, -p.size, -p.size, -p.size/4, 0, p.size/2);
      ctx.bezierCurveTo(p.size, -p.size/4, p.size/2, -p.size, 0, -p.size/4);
      ctx.fill();
    } else {
      // Default square
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
    }

    ctx.restore();
  }

  // obstacles
  for(const obs of state.obstacles){
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.rotation);
    ctx.fillStyle = '#3a3f52';
    ctx.strokeStyle = '#5a6070';
    ctx.lineWidth = 3;
    ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
    ctx.strokeRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
    ctx.restore();
  }

  // portals
  for(const portal of state.portals){
    ctx.save();
    ctx.translate(portal.x, portal.y);

    // Outer glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portal.radius);
    gradient.addColorStop(0, 'rgba(137,247,254,0.4)');
    gradient.addColorStop(0.7, 'rgba(137,247,254,0.2)');
    gradient.addColorStop(1, 'rgba(137,247,254,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius + 10, 0, TAU);
    ctx.fill();

    // Portal ring
    ctx.strokeStyle = '#89f7fe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius, 0, TAU);
    ctx.stroke();

    // Inner swirl
    ctx.strokeStyle = '#66a6ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    const t = performance.now() * 0.002;
    for(let i=0; i<3; i++){
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * (0.3 + i*0.2), t + i, t + i + TAU/3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // gravity zones
  for(const gz of state.gravityZones){
    ctx.save();
    ctx.translate(gz.x, gz.y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, gz.radius);
    gradient.addColorStop(0, 'rgba(182,23,158,0.3)');
    gradient.addColorStop(0.7, 'rgba(182,23,158,0.1)');
    gradient.addColorStop(1, 'rgba(182,23,158,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, gz.radius, 0, TAU);
    ctx.fill();

    // Pulsing rings
    ctx.strokeStyle = '#b5179e';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, gz.radius * 0.7, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // powerups
  for(const p of state.powerups) drawPowerup(p);

  // shapes
  for(const s of state.shapes) drawShape(s);

  // UI overlay
  drawFloaters(16);

  // Active powerup indicators
  let powerupY = 10;
  for(let key in state.activePowerups){
    const timeLeft = Math.ceil(state.activePowerups[key] / 1000);
    ctx.font='700 14px system-ui';
    ctx.fillStyle='#89f7fe';
    ctx.textAlign='right';
    const labels = {freeze:'❄ Frozen', slow:'🐌 Slow-Mo', double:'✨ Double'};
    ctx.fillText(`${labels[key] || key}: ${timeLeft}s`, canvas.width - 10, powerupY);
    powerupY += 20;
  }
  ctx.textAlign='left';

  // top glass panel
  ctx.save();
  const gH=56;
  const grd = ctx.createLinearGradient(0,0,0,gH);
  grd.addColorStop(0,'rgba(255,255,255,0.06)');
  grd.addColorStop(1,'rgba(255,255,255,0.0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,canvas.width,gH);
  ctx.restore();

  // text HUD
  ctx.font='800 18px Inter,system-ui';
  ctx.fillStyle='#d9e6ff';
  ctx.fillText(`Score: ${state.score}`, 16, 28);
  const mode = GAME_MODES[state.gameMode];
  if(mode.hasTimer){
    ctx.fillText(`Time: ${Math.ceil(Math.max(0,state.timeLeft))}s`, canvas.width-120, 28);
  }

  ctx.restore();
}

function canvasPos(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.touches? e.touches[0].clientX : e.clientX);
  const clientY = (e.touches? e.touches[0].clientY : e.clientY);

  // Scale from display size to canvas size
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function handleTap(e){
  if(!state.running) return;
  const {x,y} = canvasPos(e);

  // Check powerups first
  for(let i=state.powerups.length-1; i>=0; i--){
    const p = state.powerups[i];
    const dx = x - p.x, dy = y - p.y;
    if(dx*dx + dy*dy <= (p.size/2)*(p.size/2)){
      activatePowerup(p.type);
      makeExplosion(p.x, p.y, '#89f7fe');
      state.powerups.splice(i, 1);
      e.preventDefault();
      return;
    }
  }

  // check shapes from top-most (end) to bottom for natural feel
  for(let i=state.shapes.length-1;i>=0;i--){
    const s = state.shapes[i];
    if(pointInShape(x,y,s)){
      state.totalTaps++;

      // Special shape handling
      if(s.special === 'golden'){
        makeExplosion(s.x,s.y,'#ffd700');
        addScore(30, true);
        ping(880, .08, 'sine', .1);
        vibrate(30);
        state.shapes.splice(i, 1);
        spawnShape(); // Replace
      } else if(s.special === 'bomb'){
        // Explode nearby shapes
        const blastRadius = 120;
        makeExplosion(s.x, s.y, '#ff3333');
        for(let j=state.shapes.length-1; j>=0; j--){
          const other = state.shapes[j];
          const dx = other.x - s.x;
          const dy = other.y - s.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if(dist < blastRadius){
            makeExplosion(other.x, other.y, other.color);
            state.shapes.splice(j, 1);
            if(j < i) i--; // Adjust index
          }
        }
        addScore(50, true);
        ping(220, .15, 'sawtooth', .15);
        vibrate(100);
        for(let k=0; k<3; k++) spawnShape(); // Spawn replacements
      } else if(s.special === 'rainbow'){
        makeExplosion(s.x,s.y,s.color);
        addScore(20, true);
        morph(s);
        ping(784, .06, 'triangle', .08);
        vibrate(20);
      } else {
        // Normal shape - check for critical hit (15% chance)
        const isCritical = Math.random() < 0.15;
        makeExplosion(s.x,s.y,s.color);
        morph(s);
        if(isCritical){
          addScore(25, true);
          floater('💥 CRITICAL!', s.x, s.y, 1000);
          ping(880, .08, 'square', .1);
          state.screenShake = 8;
          vibrate(25);
        } else {
          addScore(10);
          ping(520 + state.combo*30, .06, 'sine', .06);
          if(state.combo >= 5) vibrate(15);
        }
      }

      e.preventDefault();
      return;
    }
  }

  // Missed tap
  state.missedTaps++;
}

canvas.addEventListener('click', handleTap);
canvas.addEventListener('touchstart', handleTap, {passive:false});

// Prevent context menu and text selection on canvas
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('selectstart', (e) => e.preventDefault());
canvas.addEventListener('touchend', (e) => e.preventDefault());
canvas.addEventListener('touchmove', (e) => e.preventDefault());

// Prevent long-press on entire document
document.addEventListener('contextmenu', (e) => {
  if (state.running) e.preventDefault();
});
document.addEventListener('selectstart', (e) => {
  if (state.running) e.preventDefault();
});

// Controls
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', ()=> {
  if(!state.running) return;
  pauseGame();
  pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
});
resetBtn.addEventListener('click', ()=>{
  resetGame();
  if(!state.running){ draw(); }
  ping(300,.05,'square',.05);
});

// Volume control
volumeSlider.addEventListener('input', (e)=>{
  const vol = e.target.value;
  masterVolume = vol / 100;
  volumeVal.textContent = vol + '%';
  localStorage.setItem('volume', vol);
  updateAudioVolume();
});
// Load saved volume
const savedVol = localStorage.getItem('volume');
if(savedVol){
  volumeSlider.value = savedVol;
  masterVolume = savedVol / 100;
  volumeVal.textContent = savedVol + '%';
  updateAudioVolume();
}

// Difficulty selector
difficultySelect.addEventListener('change', (e)=>{
  state.difficulty = e.target.value;
  if(!state.running) resetGame();
});

// Game mode selector
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.gameMode = btn.dataset.mode;

    // Show campaign modal if campaign mode selected
    if(state.gameMode === 'campaign'){
      showCampaignModal();
    } else {
      if(!state.running) resetGame();
    }
  });
});

// Campaign modal
function showCampaignModal(){
  const levelGrid = document.getElementById('levelGrid');
  levelGrid.innerHTML = '';

  for(let i = 1; i <= 50; i++){
    const level = CAMPAIGN_LEVELS[i-1];
    const isUnlocked = state.campaign.unlockedLevels.includes(i);
    const stars = state.campaign.levelStars[i] || 0;

    const levelBox = document.createElement('div');
    levelBox.className = 'level-box' + (!isUnlocked ? ' locked' : '') + (stars > 0 ? ' completed' : '');

    const levelNum = document.createElement('div');
    levelNum.className = 'level-num';
    levelNum.textContent = i;

    const levelStars = document.createElement('div');
    levelStars.className = 'level-stars';
    levelStars.textContent = '⭐'.repeat(stars);

    levelBox.appendChild(levelNum);
    levelBox.appendChild(levelStars);

    if(isUnlocked){
      levelBox.addEventListener('click', ()=> {
        state.currentCampaignLevel = i;
        campaignModal.classList.remove('show');
        banner(level.objective, 3000);
        if(!state.running) {
          resetGame();
          startGame();
        }
      });
    }

    levelGrid.appendChild(levelBox);
  }

  campaignModal.classList.add('show');
}

document.getElementById('closeCampaignBtn').addEventListener('click', ()=>{
  campaignModal.classList.remove('show');
});

// Daily challenge button
document.getElementById('dailyChallengeBtn').addEventListener('click', ()=>{
  if(state.dailyChallengeCompleted){
    showAchievement('Already Completed', 'Come back tomorrow for a new challenge!');
    return;
  }

  state.gameMode = 'daily';
  state.dailyChallenge = generateDailyChallenge();

  banner(`Daily Challenge: Score ${state.dailyChallenge.targetScore} points!`, 3000);

  if(!state.running){
    resetGame();
    startGame();
  }
});

// Stats button
statsBtn.addEventListener('click', ()=>{
  updateStatsModal();
  statsModal.classList.add('show');
});

// Shop button
shopBtn.addEventListener('click', ()=>{
  document.getElementById('shopCoins').textContent = state.coins;
  shopModal.classList.add('show');
});
document.getElementById('closeShopBtn').addEventListener('click', ()=>{
  shopModal.classList.remove('show');
});

// Shop purchase handlers
document.getElementById('buyTheme1').addEventListener('click', ()=> buyItem('theme', 'ocean', 50));
document.getElementById('buyTheme2').addEventListener('click', ()=> buyItem('theme', 'fire', 50));
document.getElementById('buyParticle1').addEventListener('click', ()=> buyItem('particle', 'star', 30));
document.getElementById('buyParticle2').addEventListener('click', ()=> buyItem('particle', 'heart', 30));

function buyItem(type, name, cost){
  const itemKey = type === 'theme' ? 'themes' : 'particles';
  const fullName = type === 'theme' ? `${name}Theme` : `${name}Particle`;

  if(state.customization.owned[itemKey].includes(fullName)){
    showAchievement('Already Owned', 'You already have this item!');
    return;
  }

  if(state.coins < cost){
    showAchievement('Not Enough Coins', `Need ${cost} coins, have ${state.coins}`);
    return;
  }

  state.coins -= cost;
  state.customization.owned[itemKey].push(fullName);
  if(type === 'theme') state.customization.theme = fullName;
  else state.customization.particleStyle = fullName;

  localStorage.setItem('player_coins', String(state.coins));
  localStorage.setItem('customization', JSON.stringify(state.customization));
  coinsDisplayEl.textContent = state.coins;
  document.getElementById('shopCoins').textContent = state.coins;

  showAchievement('Purchase Successful!', `Unlocked ${name} ${type}!`);
  victorySound();
}

// Modal controls
document.getElementById('playAgainBtn').addEventListener('click', ()=>{
  gameOverModal.classList.remove('show');
  startGame();
});
document.getElementById('closeModalBtn').addEventListener('click', ()=>{
  gameOverModal.classList.remove('show');
});
document.getElementById('shareBtn').addEventListener('click', shareScore);
document.getElementById('closeStatsBtn').addEventListener('click', ()=>{
  statsModal.classList.remove('show');
});

// Share score functionality
function shareScore(){
  const text = `🎮 I scored ${state.score} points in Shape Tap Deluxe!\n` +
               `🔥 Best combo: ${state.maxCombo}x\n` +
               `🎯 Accuracy: ${Math.round((state.totalTaps / (state.totalTaps + state.missedTaps)) * 100)}%\n` +
               `Can you beat my score?`;

  if(navigator.share){
    navigator.share({
      title: 'Shape Tap Deluxe Score',
      text: text
    }).catch(()=>{});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(()=>{
      showAchievement('Copied!', 'Score copied to clipboard');
    }).catch(()=>{
      alert(text);
    });
  }
}

// Keyboard controls
document.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault();
    if(!state.running) startGame();
    else pauseGame();
  } else if(e.code === 'KeyR'){
    resetGame();
    if(!state.running){ draw(); }
  }
});

// Stats modal updater
function updateStatsModal(){
  document.getElementById('totalGames').textContent = state.stats.totalGames;
  document.getElementById('totalShapesTapped').textContent = state.stats.totalShapesTapped;
  document.getElementById('bestComboEver').textContent = state.stats.bestCombo;
  const avgScore = state.stats.totalGames > 0 ? Math.round(state.stats.totalScore / state.stats.totalGames) : 0;
  document.getElementById('avgScore').textContent = avgScore;
  document.getElementById('totalXP').textContent = state.xp;
  document.getElementById('currentLevel').textContent = state.level;

  // XP progress
  const xpNeeded = state.level * 100;
  const xpProgress = (state.xp / xpNeeded) * 100;
  document.getElementById('xpProgress').style.width = xpProgress + '%';
  document.getElementById('xpText').textContent = `${state.xp} / ${xpNeeded} XP to level ${state.level + 1}`;
}

// Mobile haptic feedback (if available)
function vibrate(ms){
  if(navigator.vibrate) navigator.vibrate(ms);
}

// Initial draw
draw();
banner('Tap ▶ Start', 2200);