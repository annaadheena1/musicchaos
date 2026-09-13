// Intro Trap Audio Setup (Plays 'Never Gonna Give You Up' during the trap screen)
const introAudio = new Audio('https://files.catbox.moe/qg0lrl.mp3'); 
introAudio.loop = true;

let playbackSpeed = 1.0;
let isStarted = false;

// Audio State Management
let audioCtx = null;
let currentBufferSource = null;
let reversedAudioBuffer = null;
let activeMode = null; // 'reverse', 'lyrics', or 'song'

// Tracking state for custom reverse player
let startTime = 0;
let pausedAt = 0;
let isPlayingReverse = false;
let animFrameId = null;
let gainNode = null;

// Speech Synthesis State (Enjoy the Lyrics Player)
let currentSpeechUtterance = null;
let speechText = "";
let isSpeechPlaying = false;
let isSpeechPaused = false;
let speechTimerId = null;
let speechElapsed = 0;
let speechEstimatedDuration = 0;

// DOM Elements
const introModal = document.getElementById('intro-modal');
const startScreen = document.getElementById('start-screen');
const trapScreen = document.getElementById('trap-screen');
const buttonContainer = document.getElementById('button-container');
const mainPlayer = document.getElementById('main-player');
const songList = document.getElementById('song-list');
const statusMsg = document.getElementById('status-message');
const lockoutScreen = document.getElementById('lockout-screen');

// Player Rectangle Elements
const tunePlayerBox = document.getElementById('tune-player-box');
const playerStatusTitle = document.getElementById('player-status-title');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekBar = document.getElementById('seek-bar');
const timeDisplay = document.getElementById('time-display');
const volumeBar = document.getElementById('volume-bar');
const backBtn = document.getElementById('back-btn');

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
// PLAYBACK CLEANUP & NAVIGATION
// -------------------------------------------------------------

function stopAllPlayback() {
    // Stop Speech
    window.speechSynthesis.cancel();
    clearInterval(speechTimerId);
    isSpeechPlaying = false;
    isSpeechPaused = false;

    // Stop Reverse Audio
    pauseReverseAudio();

    // Reset controls UI
    tunePlayerBox.classList.add('hidden');
    statusMsg.innerText = "";
    activeMode = null;
}

// Back to Song Selection Button Handler
backBtn.addEventListener('click', () => {
    stopAllPlayback();
    songList.classList.remove('hidden');
});

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// -------------------------------------------------------------
// MODE 1: ENJOY THE TUNE (Reversed Audio)
// -------------------------------------------------------------

document.querySelectorAll('.reverse-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        stopAllPlayback();
        activeMode = 'reverse';
        
        const songCard = e.target.closest('.song-card');
        const songUrl = songCard.getAttribute('data-src');

        statusMsg.innerText = "Just a moment, let us queue that up for you";
        playerStatusTitle.innerText = "🌀 Reversed Audio Player";

        try {
            await prepareReverseAudio(songUrl);
            tunePlayerBox.classList.remove('hidden');
            startReverseAudio(0);
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

    updateReverseProgressBar();
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

function updateReverseProgressBar() {
    if (!isPlayingReverse || activeMode !== 'reverse') return;

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
    animFrameId = requestAnimationFrame(updateReverseProgressBar);
}

// -------------------------------------------------------------
// MODE 2: ENJOY THE LYRICS (Cheerful Text-To-Speech Player Controls)
// -------------------------------------------------------------

document.querySelectorAll('.lyrics-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        stopAllPlayback();
        activeMode = 'lyrics';

        const songCard = e.target.closest('.song-card');
        speechText = songCard.getAttribute('data-lyrics');

        playerStatusTitle.innerText = "🗣️ Lyrics Speech Player";
        statusMsg.innerText = "🗣️ Speaking lyrics...";
        
        tunePlayerBox.classList.remove('hidden');
        startSpeechFromText(speechText);
    });
});

function startSpeechFromText(textToSpeak, startCharIndex = 0) {
    window.speechSynthesis.cancel();
    clearInterval(speechTimerId);

    // Strip sentence-ending punctuation so speech tone never drops
    const cheerfulLyrics = textToSpeak.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");

    const textChunk = cheerfulLyrics.slice(startCharIndex);
    currentSpeechUtterance = new SpeechSynthesisUtterance(textChunk);
    
    // Hyper-cheerful settings
    currentSpeechUtterance.pitch = 2.0; 
    currentSpeechUtterance.rate = 1.4;   
    currentSpeechUtterance.volume = parseFloat(volumeBar.value);

    const voices = window.speechSynthesis.getVoices();
    const cheerfulVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Google') || v.name.includes('Samantha'))) || voices[0];
    if (cheerfulVoice) {
        currentSpeechUtterance.voice = cheerfulVoice;
    }

    const totalWords = speechText.split(' ').length;
    speechEstimatedDuration = (totalWords / 3.5); 
    seekBar.max = speechEstimatedDuration;

    currentSpeechUtterance.onstart = () => {
        isSpeechPlaying = true;
        isSpeechPaused = false;
        playPauseBtn.innerText = "⏸ Pause";
        
        speechTimerId = setInterval(() => {
            if (isSpeechPlaying && !isSpeechPaused) {
                speechElapsed += 0.2;
                if (speechElapsed > speechEstimatedDuration) {
                    speechElapsed = speechEstimatedDuration;
                }
                seekBar.value = speechElapsed;
                timeDisplay.innerText = `${formatTime(speechElapsed)} / ${formatTime(speechEstimatedDuration)}`;
            }
        }, 200);
    };

    currentSpeechUtterance.onend = () => {
        clearInterval(speechTimerId);
        isSpeechPlaying = false;
        isSpeechPaused = false;
        playPauseBtn.innerText = "▶ Play";
        seekBar.value = speechEstimatedDuration;
        timeDisplay.innerText = `${formatTime(speechEstimatedDuration)} / ${formatTime(speechEstimatedDuration)}`;
    };

    if (startCharIndex === 0) {
        speechElapsed = 0;
    }

    window.speechSynthesis.speak(currentSpeechUtterance);
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        isSpeechPaused = true;
        playPauseBtn.innerText = "▶ Play";
    }
}

function resumeSpeech() {
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        isSpeechPaused = false;
        playPauseBtn.innerText = "⏸ Pause";
    } else if (!window.speechSynthesis.speaking) {
        startSpeechFromText(speechText, 0);
    }
}

// -------------------------------------------------------------
// SHARED CONTROLS (PLAY/PAUSE, SEEK, VOLUME)
// -------------------------------------------------------------

playPauseBtn.addEventListener('click', () => {
    if (activeMode === 'reverse') {
        if (isPlayingReverse) {
            pauseReverseAudio();
        } else {
            startReverseAudio(pausedAt);
        }
    } else if (activeMode === 'lyrics') {
        if (isSpeechPaused) {
            resumeSpeech();
        } else if (isSpeechPlaying) {
            pauseSpeech();
        } else {
            startSpeechFromText(speechText, 0);
        }
    }
});

seekBar.addEventListener('input', () => {
    const seekTo = parseFloat(seekBar.value);

    if (activeMode === 'reverse') {
        startReverseAudio(seekTo);
    } else if (activeMode === 'lyrics') {
        speechElapsed = seekTo;
        const seekRatio = seekTo / speechEstimatedDuration;
        const charIndex = Math.floor(speechText.length * seekRatio);
        startSpeechFromText(speechText, charIndex);
    }
});

volumeBar.addEventListener('input', () => {
    const vol = parseFloat(volumeBar.value);

    if (gainNode) {
        gainNode.gain.value = vol;
    }
    
    if (window.speechSynthesis.speaking) {
        const remainingElapsed = speechElapsed;
        const seekRatio = remainingElapsed / speechEstimatedDuration;
        const charIndex = Math.floor(speechText.length * seekRatio);
        startSpeechFromText(speechText, charIndex);
    }
});

// -------------------------------------------------------------
// MODE 3: ENJOY THE SONG (10-Second Lockout)
// -------------------------------------------------------------

document.querySelectorAll('.song-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        stopAllPlayback();
        activeMode = 'song';

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