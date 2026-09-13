// Audio setup
// Place your audio file 'blinded-lights-snippet.mp3' inside your project folder
// Direct working link to the song snippet online
const introAudio = new Audio('https://files.catbox.moe/nq6hdt.mp3');
introAudio.loop = true;

let playbackSpeed = 1.0;
let isStarted = false;

// DOM Elements
const introModal = document.getElementById('intro-modal');
const startScreen = document.getElementById('start-screen');
const trapScreen = document.getElementById('trap-screen');
const buttonContainer = document.getElementById('button-container');
const mainPlayer = document.getElementById('main-player');

// 1. Trigger audio on initial user interaction (Browser compliance)
startScreen.addEventListener('click', () => {
    if (!isStarted) {
        isStarted = true;
        introAudio.play();
        startScreen.classList.add('hidden');
        trapScreen.classList.remove('hidden');
        spawnTrapButtons();
    }
});

// 2. Spawn multiple fake buttons and 1 real close button
function spawnTrapButtons() {
    buttonContainer.innerHTML = ''; // Clear existing buttons
    const totalFakeButtons = 6;

    // Generate Fake Buttons
    for (let i = 0; i < totalFakeButtons; i++) {
        const fakeBtn = document.createElement('button');
        fakeBtn.innerText = 'X';
        fakeBtn.classList.add('close-btn');
        positionRandomly(fakeBtn);

        // Wrong button click action
        fakeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onWrongButtonClick();
        });

        buttonContainer.appendChild(fakeBtn);
    }

    // Generate Real Close Button
    const realBtn = document.createElement('button');
    realBtn.innerText = 'X';
    realBtn.classList.add('close-btn');
    positionRandomly(realBtn);

    // Correct button click action
    realBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCorrectButtonClick();
    });

    buttonContainer.appendChild(realBtn);
}

// 3. Action when wrong button is clicked (Speed up & restart)
function onWrongButtonClick() {
    introAudio.currentTime = 0; // Restart snippet
    playbackSpeed += 0.25;      // Increase speed by 25%
    introAudio.playbackRate = playbackSpeed;
    introAudio.play();

    // Re-randomize positions of all buttons to scramble them
    const allButtons = buttonContainer.querySelectorAll('.close-btn');
    allButtons.forEach(button => positionRandomly(button));
}

// 4. Action when real close button is clicked
function onCorrectButtonClick() {
    introAudio.pause();          // Stop music
    introAudio.currentTime = 0;   // Reset track
    introModal.classList.add('hidden'); // Hide popup overlay
    mainPlayer.classList.remove('hidden'); // Show song selection page
}

// Helper: Position a button randomly within the container box
function positionRandomly(button) {
    const containerWidth = buttonContainer.clientWidth - 50;
    const containerHeight = buttonContainer.clientHeight - 50;

    const randomX = Math.floor(Math.random() * containerWidth);
    const randomY = Math.floor(Math.random() * containerHeight);

    button.style.left = `${randomX}px`;
    button.style.top = `${randomY}px`;
}