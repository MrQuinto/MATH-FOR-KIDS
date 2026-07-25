/* =========================================================
   MATH FOR KIDS — GAME LOGIC
   Modes: Timer (countdown, answer as many as possible)
          Life (3 lives, wrong answer costs a life)
   Sounds are synthesized with the Web Audio API — no mp3
   files needed, so nothing to load or break.
   ========================================================= */

// ---- Config ----
const MIN_NUMBER = 1;
const MAX_NUMBER = 50;
const TIMER_DURATION = 30; // seconds
const STARTING_LIVES = 3;

// ---- DOM references ----
const modeSelect = document.getElementById('modeSelect');
const timerModeBtn = document.getElementById('timerModeBtn');
const lifeModeBtn = document.getElementById('lifeModeBtn');

const scoreboard = document.getElementById('scoreboard');
const scoreValueEl = document.getElementById('scoreValue');
const streakValueEl = document.getElementById('streakValue');
const bestStreakValueEl = document.getElementById('bestStreakValue');
const timeValueEl = document.getElementById('timeValue');
const livesValueEl = document.getElementById('livesValue');
const timerBox = document.getElementById('timerBox');
const livesBox = document.getElementById('livesBox');

const categoryButtons = document.getElementById('categoryButtons');
const addBtn = document.getElementById('addBtn');
const subBtn = document.getElementById('subBtn');

const gameBox = document.getElementById('gameBox');
const firstEl = document.getElementById('First');
const mathEl = document.getElementById('Math');
const secondEl = document.getElementById('Second');
const answerInput = document.getElementById('Anser');
const submitBtn = document.getElementById('submitBtn');
const feedbackEl = document.getElementById('feedback');

const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverSummary = document.getElementById('gameOverSummary');
const playAgainBtn = document.getElementById('playAgainBtn');

// ---- Game state ----
let currentMode = null;       // 'timer' or 'life'
let operation = '+';          // '+' or '-'
let correctAnswer = 0;
let score = 0;
let streak = 0;
let bestStreak = 0;
let lives = STARTING_LIVES;
let timeLeft = TIMER_DURATION;
let timerInterval = null;
let gameActive = false;


/* ---------------------------------------------------------
   SOUND EFFECTS + VIDEO OVERLAY (real files this time)
--------------------------------------------------------- */
const winSoundEl = document.getElementById('winSound');
const loseSoundEl = document.getElementById('loseSound');

const resultOverlay = document.getElementById('resultOverlay');
const resultVideo = document.getElementById('resultVideo');

const WIN_VIDEO_SRC = 'Crumb Cat vibes to Sad Cat Dance.mp4';
const LOSE_VIDEO_SRC = 'Sad cat crying meme Green Screen.mp4';
const OVERLAY_DURATION = 2500; // how long the popup stays on screen, in ms

/* ---------------------------------------------------------
   VOLUME CONTROL
--------------------------------------------------------- */
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');

let currentVolume = 0.7;   // 0.0 to 1.0
let isMuted = false;
let volumeBeforeMute = currentVolume;

function applyVolume(){
    const effectiveVolume = isMuted ? 0 : currentVolume;
    winSoundEl.volume = effectiveVolume;
    loseSoundEl.volume = effectiveVolume;
    resultVideo.volume = effectiveVolume;
}

function updateMuteIcon(){
    if(isMuted || currentVolume === 0){
        muteBtn.textContent = '🔇';
    } else if(currentVolume < 0.5){
        muteBtn.textContent = '🔉';
    } else {
        muteBtn.textContent = '🔊';
    }
}

volumeSlider.addEventListener('input', () => {
    currentVolume = volumeSlider.value / 100;
    if(currentVolume > 0) isMuted = false; // dragging the slider up un-mutes automatically
    applyVolume();
    updateMuteIcon();
});

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if(isMuted){
        volumeBeforeMute = currentVolume;
    }
    applyVolume();
    updateMuteIcon();
});

// set the starting volume on page load
applyVolume();
updateMuteIcon();

function playWinSound(){
    winSoundEl.currentTime = 0;
    winSoundEl.play().catch(() => {}); // ignore autoplay-block errors
}

function playLoseSound(){
    loseSoundEl.currentTime = 0;
    loseSoundEl.play().catch(() => {});
}

function playGameOverSound(){
    // reuse the lose sound for the final game-over moment
    loseSoundEl.currentTime = 0;
    loseSoundEl.play().catch(() => {});
}

/**
 * Shows a short video popup (win or lose clip) over the whole page,
 * then automatically hides it after OVERLAY_DURATION.
 * @param {'win'|'lose'} type
 */
function showResultVideo(type){
    resultVideo.src = type === 'win' ? WIN_VIDEO_SRC : LOSE_VIDEO_SRC;
    resultOverlay.classList.remove('hidden');
    resultVideo.currentTime = 0;
    resultVideo.play().catch(() => {});

    setTimeout(() => {
        resultVideo.pause();
        resultOverlay.classList.add('hidden');
    }, OVERLAY_DURATION);
}


/* ---------------------------------------------------------
   QUESTION GENERATION
--------------------------------------------------------- */
function randomBetween(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(){
    let a = randomBetween(MIN_NUMBER, MAX_NUMBER);
    let b = randomBetween(MIN_NUMBER, MAX_NUMBER);

    // For subtraction, make sure the answer never goes negative
    // (keeps it kid-friendly — no negative numbers)
    if(operation === '-' && b > a){
        [a, b] = [b, a]; // swap so a is always >= b
    }

    firstEl.textContent = a;
    secondEl.textContent = b;
    mathEl.textContent = operation;

    correctAnswer = operation === '+' ? a + b : a - b;

    answerInput.value = '';
    answerInput.focus();
}


/* ---------------------------------------------------------
   OPERATION SELECT (+ / -)
--------------------------------------------------------- */
function setOperation(op){
    operation = op;
    addBtn.classList.toggle('active', op === '+');
    subBtn.classList.toggle('active', op === '-');
    if(gameActive) generateQuestion();
}

addBtn.addEventListener('click', () => setOperation('+'));
subBtn.addEventListener('click', () => setOperation('-'));


/* ---------------------------------------------------------
   SCOREBOARD UPDATES
--------------------------------------------------------- */
function updateScoreboard(){
    scoreValueEl.textContent = score;
    streakValueEl.textContent = streak;
    bestStreakValueEl.textContent = bestStreak;
    timeValueEl.textContent = timeLeft;
    livesValueEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(STARTING_LIVES - lives);
}


/* ---------------------------------------------------------
   ANSWER CHECKING
--------------------------------------------------------- */
function checkAnswer(){
    if(!gameActive) return;

    const userAnswer = parseInt(answerInput.value, 10);

    if(isNaN(userAnswer)){
        feedbackEl.textContent = 'Type a number first!';
        feedbackEl.className = 'feedback wrong';
        return;
    }

    if(userAnswer === correctAnswer){
        // ---- correct answer ----
        score += 10;
        streak += 1;
        if(streak > bestStreak) bestStreak = streak;

        feedbackEl.textContent = 'Correct! 🎉';
        feedbackEl.className = 'feedback correct';
        playWinSound();
        showResultVideo('win');

        updateScoreboard();
        generateQuestion();
    } else {
        // ---- wrong answer ----
        streak = 0; // win streak resets on a loss
        feedbackEl.textContent = `Not quite — it was ${correctAnswer}`;
        feedbackEl.className = 'feedback wrong';
        playLoseSound();
        showResultVideo('lose');

        if(currentMode === 'life'){
            lives -= 1;
            if(lives <= 0){
                updateScoreboard();
                endGame();
                return;
            }
        }

        updateScoreboard();
        generateQuestion();
    }
}

submitBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkAnswer();
});


/* ---------------------------------------------------------
   TIMER (Timer Mode only)
--------------------------------------------------------- */
function startTimer(){
    timerInterval = setInterval(() => {
        timeLeft -= 1;
        timeValueEl.textContent = timeLeft;

        if(timeLeft <= 0){
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

function stopTimer(){
    clearInterval(timerInterval);
}


/* ---------------------------------------------------------
   GAME START / END
--------------------------------------------------------- */
function startGame(mode){
    currentMode = mode;

    // reset all state for a fresh game
    score = 0;
    streak = 0;
    lives = STARTING_LIVES;
    timeLeft = TIMER_DURATION;
    operation = '+';
    gameActive = true;

    // show the right scoreboard pieces for this mode
    timerBox.classList.toggle('hidden', mode !== 'timer');
    livesBox.classList.toggle('hidden', mode !== 'life');

    // swap screens
    modeSelect.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    scoreboard.classList.remove('hidden');
    categoryButtons.classList.remove('hidden');
    gameBox.classList.remove('hidden');

    setOperation('+');
    updateScoreboard();
    generateQuestion();

    if(mode === 'timer'){
        startTimer();
    }
}

function endGame(){
    gameActive = false;
    stopTimer();
    playGameOverSound();

    gameBox.classList.add('hidden');
    categoryButtons.classList.add('hidden');
    scoreboard.classList.add('hidden');

    gameOverTitle.textContent = 'Game Over!';
    gameOverSummary.textContent =
        `Final Score: ${score}  |  Best Streak: ${bestStreak}`;

    gameOverScreen.classList.remove('hidden');
}

function returnToModeSelect(){
    gameOverScreen.classList.add('hidden');
    modeSelect.classList.remove('hidden');
}

timerModeBtn.addEventListener('click', () => startGame('timer'));
lifeModeBtn.addEventListener('click', () => startGame('life'));
playAgainBtn.addEventListener('click', returnToModeSelect);