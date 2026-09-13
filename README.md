<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# [Project Name] 🎯


## Basic Details
### Team Name: Adheena


### Team Members
- Team Lead: Adheena Anna Thomas - Cochin University of Science and Technology, School of Engineering
- Member 2: Ayisha Hiba K.F. - Cochin University of Science and Technology, School of Engineering


### Project Description
Our project is basically a temu version of Spotify where you're gonna wanna listen to music but we're not gonna let you! Well, we'll let you listen, but it won't be what you're expecting :D

### The Problem (that doesn't exist)
Ever went on spotify and wanted to reverse the songs? Listen to the lyrics without any distractions? Prove your worth before you could even enter? Worry not!

### The Solution (that nobody asked for)
So we're making a website!
It's a song playing website which, when you open it, it rickrolls you until you find the close button. There will be multiple close buttons and the song restarts and speeds up everytime you click the wrong button. Now when you click the close button finally, it takes you to the song selections itself. When you press a song it gives you three options like enjoy the tune, enjoy the lyrics, and enjoy the song. Enjoy the tune plays the song in reverse, enjoy the lyrics makes it sound as though the lyrics are being said instead of sung, and enjoy the song plays the song for about 10 seconds then goes to the next song. you can't skip and you can't do anything until the next song is done.

## Technical Details
### Technologies/Components Used
For Software:
- Languages used: JavaScript, HTML, CSS
- Frameworks used: None (Vanilla JavaScript DOM manipulation)
- Libraries used: YouTube Iframe API ([https://www.youtube.com/iframe_api](https://www.youtube.com/iframe_api)), Web Audio API, Web Speech Synthesis API (window.speechSynthesis)
- Tools used: Git, GitHub, HTML5/CSS3 runtime environment

For Hardware:
- [List main components]
- [List specifications]
- [List tools required]

### Implementation
For Software:
# Installation
Clone the repository from GitHub
git clone https://github.com/annaadheena1/musicchaos.git

Navigate into the project repository
cd musicchaos

# Run
open index.html in live server

### Project Documentation
For Software:

# Screenshots (Add at least 3)




# Diagrams
https://docs.google.com/document/d/1jY9neqKKfLQWCsjTjstJI5v5g0lzJw0Gpo2tUWWWBrU/edit?usp=sharing
Workflow Explanation
1. Entry & Trap Screen Phase
Initial Entrance: The user visits the app and is greeted by a pop-up modal overlay (#intro-modal). The song selection controls behind the modal are hidden using CSS (.hidden).

First User Interaction: Clicking the #start-screen triggers an audio loop (introAudio.play()) and transitions the display to the #trap-screen.

The Trap Setup (spawnTrapButtons):

The app dynamically renders 6 fake close (X) buttons alongside 1 real close (X) button in randomized absolute positions inside #button-container.

Incorrect Click Penalty (onWrongButtonClick):

Clicking a fake button speeds up the background audio by 0.25x and reshuffles all buttons to new random coordinates.

Successful Exit (onCorrectButtonClick):

Clicking the correct button stops the background audio reset, hides the modal overlay, and unhides #main-player.

2. Playback Preparation & Cleanup
YouTube iFrame API Initialization: Asynchronously loads the YouTube iFrame API script to embed an off-screen YouTube player container (#youtube-player) hidden offscreen (top: -9999px).

State Reset (stopAllPlayback): Before switching songs or modes, any active Web Audio buffers, Speech Synthesis instances, YouTube streams, or timers are completely canceled.

3. Mode Execution Options
Mode 1: "Enjoy the Tune" (Reversed Web Audio)
Mechanism: Uses Web Audio API (AudioContext).

Process:

Downloads the song’s raw MP3 file using fetch().

Decodes it into raw audio buffer samples (decodeAudioData).

Reverses the channel data array iteratively (outputData[i] = inputData[length - 1 - i]).

Plays back the reversed PCM buffer through a gain node, allowing volume adjustments, seeking, and pause/resume capabilities.

Mode 2: "Enjoy the Lyrics" (Web Speech Synthesis)
Mechanism: Uses browser-native Speech Synthesis (window.speechSynthesis).

Process:

Extracts the string stored in the card's data-lyrics attribute.

Strips punctuation to create continuous speech output.

Configures a SpeechSynthesisUtterance object with modified pitch (2.0) and speed rate (1.4).

Calculates estimated speech duration to handle seek bar tracking and audio visualization.

Mode 3: "Enjoy the Song" (Unskippable YouTube Switch)
Mechanism: Uses embedded YouTube iFrame Player API.

Process:

0 to 10 Seconds: Plays the user's selected song through YouTube's hidden player (ytPlayer.loadVideoById). Controls remain accessible.

The Switch (at 10s): A setTimeout callback triggers after 10 seconds:

Automatically switches YouTube playback to the next track in the playlist.

Activates an overlay lock screen (#lockout-screen) that covers the viewport with z-index: 2000 and cursor: not-allowed.

Completion: An event listener (YT.PlayerState.ENDED) detects when the secondary track finishes, removing the lockout screen and restoring normal UI state.

For Hardware:

# Schematic & Circuit
![Circuit](Add your circuit diagram here)
*Add caption explaining connections*

![Schematic](Add your schematic diagram here)
*Add caption explaining the schematic*

# Build Photos
![Components](Add photo of your components here)
*List out all components shown*

![Build](Add photos of build process here)
*Explain the build steps*

![Final](Add photo of final product here)
*Explain the final build*

### Project Demo
# Video
[Add your demo video link here]
*Explain what the video demonstrates*

# Additional Demos
[Add any extra demo materials/links]

## Team Contributions
- Adheena Anna Thomas: 
    Enjoy song tab
    pop up page
    Song selection section

- Ayisha Hiba K.F:
    Enjoy tune tab
    Beautification
    Enjoy lyrics tab

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)



