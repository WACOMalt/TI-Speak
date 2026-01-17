/**
 * TI-Speak Frontend Application
 * 
 * Handles UI interactions and communication with the backend API.
 */

// DOM Elements
const textInput = document.getElementById('textInput');
const phonemePreview = document.getElementById('phonemePreview');
const speakBtn = document.getElementById('speakBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');
const advancedToggle = document.getElementById('advancedToggle');
const advancedContent = document.getElementById('advancedContent');
const phonemeList = document.getElementById('phonemeList');
const pitchShift = document.getElementById('pitchShift');
const pitchValue = document.getElementById('pitchValue');
const speedFactor = document.getElementById('speedFactor');
const speedValue = document.getElementById('speedValue');
const led = document.querySelector('.led');

// State
let currentAudioBlob = null;
let audioContext = null;
let audioSource = null;
let isPlaying = false;
let debounceTimer = null;

// API base URL
const API_BASE = '';

/**
 * Initialize the application
 */
async function init() {
    // Set up event listeners
    textInput.addEventListener('input', handleTextInput);
    speakBtn.addEventListener('click', handleSpeak);
    stopBtn.addEventListener('click', handleStop);
    downloadBtn.addEventListener('click', handleDownload);
    advancedToggle.addEventListener('click', toggleAdvanced);
    pitchShift.addEventListener('input', updatePitchValue);
    speedFactor.addEventListener('input', updateSpeedValue);

    // Load phoneme list
    await loadPhonemeList();

    // Initial phoneme preview
    updatePhonemePreview();

    // Update status
    setStatus('Ready - Type text and click SPEAK');
}

/**
 * Handle text input changes (debounced)
 */
function handleTextInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePhonemePreview, 300);
}

/**
 * Update the phoneme preview
 */
async function updatePhonemePreview() {
    const text = textInput.value.trim();

    if (!text) {
        phonemePreview.textContent = '-';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const data = await response.json();
            phonemePreview.textContent = data.phonemeString || '-';
        } else {
            phonemePreview.textContent = 'Error parsing';
        }
    } catch (error) {
        console.error('Parse error:', error);
        phonemePreview.textContent = 'Error';
    }
}

/**
 * Handle the Speak button click
 */
async function handleSpeak() {
    const text = textInput.value.trim();

    if (!text) {
        setStatus('Please enter some text', 'error');
        return;
    }

    try {
        setStatus('Synthesizing speech...', 'speaking');
        speakBtn.disabled = true;
        led.classList.add('active');

        const response = await fetch(`${API_BASE}/api/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Synthesis failed');
        }

        // Get the audio blob
        currentAudioBlob = await response.blob();

        // Get metadata from headers
        const phonemes = response.headers.get('X-Phonemes') || '';
        const frameCount = response.headers.get('X-Frame-Count') || '0';
        const sampleCount = response.headers.get('X-Sample-Count') || '0';

        // Play the audio
        await playAudio(currentAudioBlob);

        setStatus(`Speaking... (${frameCount} frames)`, 'speaking');
        stopBtn.disabled = false;
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('Speak error:', error);
        setStatus(`Error: ${error.message}`, 'error');
        speakBtn.disabled = false;
        led.classList.remove('active');
    }
}

/**
 * Play audio from a blob
 */
async function playAudio(blob) {
    try {
        // Create audio context if needed
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Stop any currently playing audio
        if (audioSource) {
            audioSource.stop();
        }

        // Decode the audio
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Apply speed adjustment
        const speed = parseInt(speedFactor.value) / 100;

        // Create and configure source
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.playbackRate.value = speed;
        audioSource.connect(audioContext.destination);

        // Set up ended callback
        audioSource.onended = () => {
            isPlaying = false;
            speakBtn.disabled = false;
            stopBtn.disabled = true;
            led.classList.remove('active');
            setStatus('Ready');
        };

        // Play
        isPlaying = true;
        audioSource.start(0);

    } catch (error) {
        console.error('Audio playback error:', error);
        throw error;
    }
}

/**
 * Handle the Stop button click
 */
function handleStop() {
    if (audioSource && isPlaying) {
        audioSource.stop();
        isPlaying = false;
    }

    speakBtn.disabled = false;
    stopBtn.disabled = true;
    led.classList.remove('active');
    setStatus('Stopped');
}

/**
 * Handle the Download button click
 */
function handleDownload() {
    if (!currentAudioBlob) {
        setStatus('No audio to download', 'error');
        return;
    }

    // Create download link
    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ti-speak-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('Downloaded!');
}

/**
 * Toggle advanced controls visibility
 */
function toggleAdvanced() {
    advancedToggle.classList.toggle('open');
    advancedContent.classList.toggle('open');
}

/**
 * Update pitch value display
 */
function updatePitchValue() {
    const value = parseInt(pitchShift.value);
    pitchValue.textContent = value > 0 ? `+${value}` : value;
}

/**
 * Update speed value display
 */
function updateSpeedValue() {
    speedValue.textContent = `${speedFactor.value}%`;
}

/**
 * Set the status text
 */
function setStatus(message, type = '') {
    statusText.textContent = message;
    statusText.className = 'status-text';
    if (type) {
        statusText.classList.add(type);
    }
}

/**
 * Load and display the phoneme list
 */
async function loadPhonemeList() {
    try {
        const response = await fetch(`${API_BASE}/api/phonemes`);
        if (!response.ok) throw new Error('Failed to load phonemes');

        const phonemes = await response.json();

        phonemeList.innerHTML = phonemes
            .filter(p => p.code !== ' ' && p.code !== '_')
            .map(p => `
                <div class="phoneme-chip" onclick="insertPhoneme('${p.code}')" title="${p.type || ''}">
                    <span class="code">${p.code}</span>
                    <span class="example">${p.example || ''}</span>
                </div>
            `).join('');

    } catch (error) {
        console.error('Failed to load phoneme list:', error);
        phonemeList.innerHTML = '<p style="color: var(--text-secondary)">Failed to load phonemes</p>';
    }
}

/**
 * Insert a phoneme into the text input
 */
function insertPhoneme(code) {
    const currentText = textInput.value;

    // If text starts with /, add to phoneme notation
    if (currentText.trim().startsWith('/')) {
        // Insert before closing /
        if (currentText.trim().endsWith('/')) {
            const insertPos = currentText.lastIndexOf('/');
            textInput.value = currentText.slice(0, insertPos) + ' ' + code + '/';
        } else {
            textInput.value = currentText + ' ' + code;
        }
    } else if (currentText.trim() === '') {
        // Start new phoneme notation
        textInput.value = '/' + code + '/';
    } else {
        // Add phoneme at the end with space
        textInput.value = currentText + ' ' + code;
    }

    updatePhonemePreview();
    textInput.focus();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter to speak
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSpeak();
    }

    // Escape to stop
    if (e.key === 'Escape' && isPlaying) {
        handleStop();
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
