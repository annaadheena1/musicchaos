// Intro Trap Audio Setup
const introAudio = new Audio('https://files.catbox.moe/qg0lrl.mp3'); 
introAudio.loop = true;

let playbackSpeed = 1.0;
let isStarted = false;

// Audio Context State for Reversed Player
let audioCtx = null;
let currentBufferSource = null;
let reversedAudioBuffer = null;

// Tracking state for custom reverse player
let startTime = 0;
let pausedAt = 0;
let isPlayingReverse = false;
let animFrameId = null;
let gainNode = null;

// DOM Elements
const introModal = document.getElementById('intro-modal');
const startScreen = document.getElementById('start-screen');
const trapScreen = document.getElementById('trap-screen');
const buttonContainer = document.getElementById('button-container');
const mainPlayer = document.getElementById('main-player');
const statusMsg = document.getElementById('status-message');
const lockoutScreen = document.getElementById('lockout-screen');

// Tune Player Elements
const tunePlayerBox = document.getElementById('tune-player-box');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekBar = document.getElementById('seek-bar');
const timeDisplay = document.getElementById('time-display');
const volumeBar = document.getElementById('volume-bar');

// 1. Initial Interaction Trigger
startScreen.addEventListener('click', () => {
    if (!isStarted) {
        isStarted = true;
        introAudio.play();
        startScreen.classList.add('hidden');
        trapScreen.classList.remove('hidden');
        spawnTrapButtons();
    }
});

// 2. Spawn Trap Buttons
function spawnTrapButtons() {
    buttonContainer.innerHTML = '';
    const totalFakeButtons = 6;

    for (let i = 0; i < totalFakeButtons; i++) {
        const fakeBtn = document.createElement('button');
        fakeBtn.innerText = 'X';
        fakeBtn.classList.add('close-btn');
        positionRandomly(fakeBtn);

        fakeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onWrongButtonClick();
        });

        buttonContainer.appendChild(fakeBtn);
    }

    const realBtn = document.createElement('button');
    realBtn.innerText = 'X';
    realBtn.classList.add('close-btn');
    positionRandomly(realBtn);

    realBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCorrectButtonClick();
    });

    buttonContainer.appendChild(realBtn);
}

function onWrongButtonClick() {
    introAudio.currentTime = 0;
    playbackSpeed += 0.25;
    introAudio.playbackRate = playbackSpeed;
    introAudio.play();

    const allButtons = buttonContainer.querySelectorAll('.close-btn');
    allButtons.forEach(button => positionRandomly(button));
}

function onCorrectButtonClick() {
    introAudio.pause();
    introAudio.currentTime = 0;
    introModal.classList.add('hidden');
    mainPlayer.classList.remove('hidden');
}

function positionRandomly(button) {
    const containerWidth = buttonContainer.clientWidth - 50;
    const containerHeight = buttonContainer.clientHeight - 50;

    const randomX = Math.floor(Math.random() * containerWidth);
    const randomY = Math.floor(Math.random() * containerHeight);

    button.style.left = `${randomX}px`;
    button.style.top = `${randomY}px`;
}

// -------------------------------------------------------------
// PLAYBACK MODES LOGIC
// -------------------------------------------------------------

function stopAllPlayback() {
    window.speechSynthesis.cancel();
    pauseReverseAudio();
    tunePlayerBox.classList.add('hidden');
}

// MODE 1: ENJOY THE TUNE (Reversed Audio with Custom Controls Box)
// MODE 1: ENJOY THE TUNE (Reversed Audio with Custom Controls Box)
document.querySelectorAll('.reverse-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        stopAllPlayback();
        const songCard = e.target.closest('.song-card');
        const songUrl = songCard.getAttribute('data-src');

        // Updated loading message
        statusMsg.innerText = "Just a moment, let us queue that up for you :))";

        try {
            await prepareReverseAudio(songUrl);
            tunePlayerBox.classList.remove('hidden'); // Reveal custom controls rectangle
            startReverseAudio(0); // Start from beginning
            
            // Updated playing message
            statusMsg.innerText = "Enjoy the tune in reverse!";
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "❌ Failed to load audio file.";
        }
    });
});

async function prepareReverseAudio(url) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Create reversed buffer copy
    reversedAudioBuffer = audioCtx.createBuffer(
        decodedBuffer.numberOfChannels,
        decodedBuffer.length,
        decodedBuffer.sampleRate
    );

    for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
        const inputData = decodedBuffer.getChannelData(channel);
        const outputData = reversedAudioBuffer.getChannelData(channel);
        for (let i = 0; i < decodedBuffer.length; i++) {
            outputData[i] = inputData[decodedBuffer.length - 1 - i];
        }
    }

    // Set max seek range
    seekBar.max = reversedAudioBuffer.duration;
}

function startReverseAudio(offset) {
    if (!reversedAudioBuffer) return;

    if (currentBufferSource) {
        try { currentBufferSource.stop(); } catch(e){}
    }

    currentBufferSource = audioCtx.createBufferSource();
    currentBufferSource.buffer = reversedAudioBuffer;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeBar.value;

    currentBufferSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    startTime = audioCtx.currentTime - offset;
    pausedAt = offset;

    currentBufferSource.start(0, offset);
    isPlayingReverse = true;
    playPauseBtn.innerText = "⏸ Pause";

    updateProgressBar();
}

function pauseReverseAudio() {
    if (currentBufferSource && isPlayingReverse) {
        currentBufferSource.stop();
        pausedAt = audioCtx.currentTime - startTime;
        isPlayingReverse = false;
        playPauseBtn.innerText = "▶ Play";
        cancelAnimationFrame(animFrameId);
    }
}

function updateProgressBar() {
    if (!isPlayingReverse) return;

    const currentTime = audioCtx.currentTime - startTime;
    if (currentTime >= reversedAudioBuffer.duration) {
        isPlayingReverse = false;
        playPauseBtn.innerText = "▶ Play";
        seekBar.value = 0;
        pausedAt = 0;
        return;
    }

    seekBar.value = currentTime;
    timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(reversedAudioBuffer.duration)}`;
    animFrameId = requestAnimationFrame(updateProgressBar);
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Control Event Listeners
playPauseBtn.addEventListener('click', () => {
    if (isPlayingReverse) {
        pauseReverseAudio();
    } else {
        startReverseAudio(pausedAt);
    }
});

seekBar.addEventListener('input', () => {
    const seekTo = parseFloat(seekBar.value);
    startReverseAudio(seekTo);
});

volumeBar.addEventListener('input', () => {
    if (gainNode) {
        gainNode.gain.value = volumeBar.value;
    }
});

// MODE 2: ENJOY THE LYRICS
document.querySelectorAll('.lyrics-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        stopAllPlayback();
        const songCard = e.target.closest('.song-card');
        const lyrics = songCard.getAttribute('data-lyrics');

        statusMsg.innerText = "🗣️ Speaking lyrics...";
        const speech = new SpeechSynthesisUtterance(lyrics);
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
    });
});

// MODE 3: ENJOY THE SONG (10-Second Lockout)
document.querySelectorAll('.song-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        stopAllPlayback();
        const songCard = e.target.closest('.song-card');
        const songUrl = songCard.getAttribute('data-src');

        const activeAudio = new Audio(songUrl);
        activeAudio.play();

        lockoutScreen.classList.remove('hidden');
        statusMsg.innerText = "⏱️ Playing song for 10 seconds (Locked)...";

        setTimeout(() => {
            activeAudio.pause();
            lockoutScreen.classList.add('hidden');
            statusMsg.innerText = "🎉 10 Seconds finished!";
        }, 10000);
    });
});