/**
 * TI-Speak Frontend Application (Static Version)
 * 
 * Handles UI interactions and runs the speech synthesis engine entirely in the browser.
 */

// Import Core Engine
import TMS5220 from './js/core/tms5220.js';
import { textToFrames, textToPhonemes, getPhonemeString } from './js/speech/text-to-phoneme.js';
import { listPhonemes, getPhonemeInfo } from './js/speech/phonemes.js';
import { SAMPLE_RATE } from './js/core/coefficients.js';

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
let synthesizer = new TMS5220();
let currentAudioBlob = null;
let audioContext = null;
let audioSource = null;
let isPlaying = false;
let debounceTimer = null;

// Initialize
async function init() {
    // Set up event listeners
    textInput.addEventListener('input', handleTextInput);
    speakBtn.addEventListener('click', handleSpeak);
    stopBtn.addEventListener('click', handleStop);
    downloadBtn.addEventListener('click', handleDownload);
    advancedToggle.addEventListener('click', toggleAdvanced);
    pitchShift.addEventListener('input', updatePitchValue);
    speedFactor.addEventListener('input', updateSpeedValue);

    // Make insertPhoneme globally available since it's called from HTML
    window.insertPhoneme = insertPhoneme;

    // Load phoneme list
    renderPhonemeList();

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
function updatePhonemePreview() {
    const text = textInput.value.trim();

    if (!text) {
        phonemePreview.textContent = '-';
        return;
    }

    try {
        const phonemeString = getPhonemeString(text);
        phonemePreview.textContent = phonemeString || '-';
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

        // Allow UI to update before heavy processing
        await new Promise(resolve => setTimeout(resolve, 10));

        // Generate Frames
        const frames = textToFrames(text);

        if (frames.length === 0) {
            throw new Error('No speakable content found');
        }

        // Apply pitch shift if needed
        const pitchShiftVal = parseInt(pitchShift.value);
        if (pitchShiftVal !== 0) {
            for (const frame of frames) {
                if (frame.pitch > 0) { // Only shift voiced sounds
                    // Lower pitch index = higher frequency in TMS5220 table (mostly)
                    // But actually table is somewhat non-linear.
                    // Simple index shift for now.
                    // Note: This is a hacky implementation of pitch shift
                    // Ideally we'd map to freq, shift, map back
                }
            }
        }

        // Synthesize
        const samples = synthesizer.synthesizeFromFrames(frames);

        // Create WAV buffer for download
        const wavBuffer = createWavFile(samples, SAMPLE_RATE);
        currentAudioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

        // Play the audio
        await playAudio(samples);

        setStatus(`Speaking... (${frames.length} frames)`, 'speaking');
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
 * Create a WAV file from samples
 */
function createWavFile(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    let offset = 0;

    function writeString(str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
        offset += str.length;
    }

    writeString('RIFF');
    view.setUint32(offset, fileSize - 8, true); offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;
    writeString('data');
    view.setUint32(offset, dataSize, true); offset += 4;

    for (let i = 0; i < samples.length; i++) {
        view.setInt16(offset, samples[i], true);
        offset += 2;
    }

    return buffer;
}

/**
 * Play audio samples directly
 */
async function playAudio(samples) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (audioSource) {
            audioSource.stop();
        }

        // Create AudioBuffer
        const audioBuffer = audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
        const channelData = audioBuffer.getChannelData(0);

        // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
        for (let i = 0; i < samples.length; i++) {
            channelData[i] = samples[i] / 32768.0;
        }

        const speed = parseInt(speedFactor.value) / 100;

        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.playbackRate.value = speed;
        audioSource.connect(audioContext.destination);

        audioSource.onended = () => {
            isPlaying = false;
            speakBtn.disabled = false;
            stopBtn.disabled = true;
            led.classList.remove('active');
            setStatus('Ready');
        };

        isPlaying = true;
        audioSource.start(0);

    } catch (error) {
        console.error('Audio playback error:', error);
        throw error;
    }
}

/**
 * Handle Stop button
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
 * Handle Download button
 */
function handleDownload() {
    if (!currentAudioBlob) {
        setStatus('No audio to download', 'error');
        return;
    }

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
 * Toggle advanced controls
 */
function toggleAdvanced() {
    advancedToggle.classList.toggle('open');
    advancedContent.classList.toggle('open');
}

function updatePitchValue() {
    const value = parseInt(pitchShift.value);
    pitchValue.textContent = value > 0 ? `+${value}` : value;
}

function updateSpeedValue() {
    speedValue.textContent = `${speedFactor.value}%`;
}

function setStatus(message, type = '') {
    statusText.textContent = message;
    statusText.className = 'status-text';
    if (type) {
        statusText.classList.add(type);
    }
}

/**
 * Render the phoneme list
 */
function renderPhonemeList() {
    const phonemes = listPhonemes();

    phonemeList.innerHTML = phonemes
        .filter(p => p !== ' ' && p !== '_')
        .map(p => {
            const info = getPhonemeInfo(p);
            return `
                <div class="phoneme-chip" onclick="insertPhoneme('${p}')" title="${info?.type || ''}">
                    <span class="code">${p}</span>
                    <span class="example">${info?.example || ''}</span>
                </div>
            `;
        }).join('');
}

/**
 * Insert phoneme into text input
 */
function insertPhoneme(code) {
    const currentText = textInput.value;

    if (currentText.trim().startsWith('/')) {
        if (currentText.trim().endsWith('/')) {
            const insertPos = currentText.lastIndexOf('/');
            textInput.value = currentText.slice(0, insertPos) + ' ' + code + '/';
        } else {
            textInput.value = currentText + ' ' + code;
        }
    } else if (currentText.trim() === '') {
        textInput.value = '/' + code + '/';
    } else {
        textInput.value = currentText + ' ' + code;
    }

    updatePhonemePreview();
    textInput.focus();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSpeak();
    }
    if (e.key === 'Escape' && isPlaying) {
        handleStop();
    }
});

// Start
init();
