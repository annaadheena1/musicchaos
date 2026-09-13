// Intro Trap Audio Setup
const introAudio = new Audio('https://files.catbox.moe/qg0lrl.mp3'); 
introAudio.loop = true;

let playbackSpeed = 1.0;
let isStarted = false;

// Audio State Management
let audioCtx = null;
let currentBufferSource = null;
let reversedAudioBuffer = null;
let activeMode = null; // 'reverse', 'lyrics', or 'song'
let songChainTimeouts = [];    // Timers for switching

// YouTube Player Initialization
let ytPlayer = null;
let isYtReady = false;

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'playsinline': 1
        },
        events: {
            'onReady': () => { 
                isYtReady = true; 
            },
            'onError': (e) => {
                console.error("YouTube Player Error Code:", e.data);
                statusMsg.innerText = "❌ YouTube Video failed to play or embed is restricted.";
            }
        }
    });
}

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
const lockoutTextDisplay = document.getElementById('lockout-text-display');

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
        introAudio.play().catch(e => console.log("Intro audio autoplay blocked", e));
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
    introAudio.play().catch(e => console.log(e));

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
    // Stop YouTube Player
    if (ytPlayer && isYtReady && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
    }

    // Clear timers
    songChainTimeouts.forEach(t => clearTimeout(t));
    songChainTimeouts = [];

    // Stop Speech
    window.speechSynthesis.cancel();
    clearInterval(speechTimerId);
    isSpeechPlaying = false;
    isSpeechPaused = false;

    // Stop Reverse Audio
    pauseReverseAudio();

    // Reset UI
    tunePlayerBox.classList.add('hidden');
    lockoutScreen.classList.add('hidden');
    statusMsg.innerText = "";
    activeMode = null;
}

// Back to Song Selection Handler
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
// MODE 1: ENJOY THE TUNE (Reversed Audio via MP3)
// -------------------------------------------------------------

document.querySelectorAll('.reverse-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        stopAllPlayback();
        activeMode = 'reverse';
        
        const songCard = e.target.closest('.song-card');
        const songUrl = songCard.getAttribute('data-src');

        statusMsg.innerText = "Just a moment, let us queue that up for you";
        playerStatusTitle.innerText = `🌀 Reversed Player: ${songCard.getAttribute('data-title')}`;

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
// MODE 2: ENJOY THE LYRICS (Speech Synthesis Player)
// -------------------------------------------------------------

document.querySelectorAll('.lyrics-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        stopAllPlayback();
        activeMode = 'lyrics';

        const songCard = e.target.closest('.song-card');
        speechText = songCard.getAttribute('data-lyrics');

        playerStatusTitle.innerText = `🗣️ Speech Player: ${songCard.getAttribute('data-title')}`;
        statusMsg.innerText = "🗣️ Speaking lyrics...";
        
        tunePlayerBox.classList.remove('hidden');
        startSpeechFromText(speechText);
    });
});

function startSpeechFromText(textToSpeak, startCharIndex = 0) {
    window.speechSynthesis.cancel();
    clearInterval(speechTimerId);

    const cheerfulLyrics = textToSpeak.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const textChunk = cheerfulLyrics.slice(startCharIndex);
    currentSpeechUtterance = new SpeechSynthesisUtterance(textChunk);
    
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
    } else if (activeMode === 'song') {
        if (ytPlayer && isYtReady) {
            const state = ytPlayer.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                ytPlayer.pauseVideo();
                playPauseBtn.innerText = "▶ Play";
            } else {
                ytPlayer.playVideo();
                playPauseBtn.innerText = "⏸ Pause";
            }
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

    if (ytPlayer && isYtReady && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(vol * 100);
    }
    
    if (window.speechSynthesis.speaking) {
        const remainingElapsed = speechElapsed;
        const seekRatio = remainingElapsed / speechEstimatedDuration;
        const charIndex = Math.floor(speechText.length * seekRatio);
        startSpeechFromText(speechText, charIndex);
    }
});

// -------------------------------------------------------------
// MODE 3: ENJOY THE SONG (10s Initial playback -> Lockout on 2nd song via YouTube)
// -------------------------------------------------------------

document.querySelectorAll('.song-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        if (!isYtReady) {
            statusMsg.innerText = "⏳ YouTube player is initializing, please try again in a moment...";
            return;
        }

        stopAllPlayback();
        activeMode = 'song';

        const songCards = Array.from(document.querySelectorAll('.song-card'));
        const currentCard = e.target.closest('.song-card');
        const currentIndex = parseInt(currentCard.getAttribute('data-index'));
        const nextIndex = (currentIndex + 1) % songCards.length;

        const firstTitle = currentCard.getAttribute('data-title');
        const firstYtId = currentCard.getAttribute('data-ytid');

        const nextCard = songCards[nextIndex];
        const nextTitle = nextCard.getAttribute('data-title');
        const nextYtId = nextCard.getAttribute('data-ytid');

        // 1. Show normal player box for the 10-second window
        tunePlayerBox.classList.remove('hidden');
        lockoutScreen.classList.add('hidden');
        
        playerStatusTitle.innerText = `🎵 Playing: ${firstTitle}`;
        statusMsg.innerText = ""; // Text below music bar cleared
        playPauseBtn.innerText = "⏸ Pause";

        // Play First Selected Song on YouTube
        ytPlayer.setVolume(parseFloat(volumeBar.value) * 100);
        ytPlayer.loadVideoById({ videoId: firstYtId });
        ytPlayer.playVideo();

        // 2. Schedule switch after 10 seconds (10000ms)
        const switchTimer = setTimeout(() => {
            tunePlayerBox.classList.add('hidden');
            lockoutScreen.classList.remove('hidden');
            lockoutTextDisplay.innerText = "Enjoy the song! Without skipping!";
            statusMsg.innerText = ""; // Text below music bar cleared during switch

            // Load and play the NEXT YouTube track fully
            ytPlayer.loadVideoById({ videoId: nextYtId });
            ytPlayer.playVideo();

            // Unlock screen when second YouTube video completes
            const onEndStateChange = (event) => {
                if (event.data === YT.PlayerState.ENDED) {
                    lockoutScreen.classList.add('hidden');
                    statusMsg.innerText = "";
                    ytPlayer.removeEventListener('onStateChange', onEndStateChange);
                }
            };
            ytPlayer.addEventListener('onStateChange', onEndStateChange);

        }, 10000); // 10 seconds

        songChainTimeouts.push(switchTimer);
    });
});