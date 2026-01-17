/**
 * TI-Speak Web Server
 * 
 * Express.js server providing a web interface for the TMS5220 speech synthesizer.
 * Runs on port 7199 (leetspeak for TI99).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const TMS5220 = require('./core/tms5220');
const { textToFrames, textToPhonemes, getPhonemeString } = require('./speech/text-to-phoneme');
const { listPhonemes, getPhonemeInfo, getPhonemeFrames } = require('./speech/phonemes');
const { SAMPLE_RATE } = require('./core/coefficients');

const app = express();
const PORT = process.env.PORT || 7199;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Create shared synthesizer instance
const synthesizer = new TMS5220();

/**
 * Create a WAV file buffer from audio samples
 * @param {Int16Array} samples - 16-bit audio samples
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {Buffer} - WAV file buffer
 */
function createWavBuffer(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(fileSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;           // Chunk size
    buffer.writeUInt16LE(1, offset); offset += 2;            // Audio format (1 = PCM)
    buffer.writeUInt16LE(numChannels, offset); offset += 2;  // Channels
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;   // Sample rate
    buffer.writeUInt32LE(byteRate, offset); offset += 4;     // Byte rate
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;   // Block align
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;// Bits per sample

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Audio data
    for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], offset);
        offset += 2;
    }

    return buffer;
}

// API Routes

/**
 * GET /api/phonemes
 * List all available phonemes
 */
app.get('/api/phonemes', (req, res) => {
    const phonemes = listPhonemes();
    const result = phonemes.map(p => ({
        code: p,
        ...getPhonemeInfo(p)
    }));
    res.json(result);
});

/**
 * POST /api/speak
 * Convert text to speech and return WAV audio
 * 
 * Body: { text: string }
 * Returns: WAV audio file
 */
app.post('/api/speak', (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Convert text to phonemes
        const phonemes = textToPhonemes(text);

        if (phonemes.length === 0) {
            return res.status(400).json({ error: 'No speakable content found' });
        }

        // Convert phonemes to LPC frames
        const frames = textToFrames(text);

        if (frames.length === 0) {
            return res.status(400).json({ error: 'Unable to generate speech frames' });
        }

        // Synthesize audio
        const samples = synthesizer.synthesizeFromFrames(frames);

        // Create WAV buffer
        const wavBuffer = createWavBuffer(samples, SAMPLE_RATE);

        // Send response
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': wavBuffer.length,
            'Content-Disposition': 'attachment; filename="ti-speak.wav"',
            'X-Phonemes': getPhonemeString(text),
            'X-Frame-Count': frames.length.toString(),
            'X-Sample-Count': samples.length.toString()
        });

        res.send(wavBuffer);
    } catch (error) {
        console.error('Speech synthesis error:', error);
        res.status(500).json({ error: 'Speech synthesis failed', message: error.message });
    }
});

/**
 * POST /api/phonemes/speak
 * Synthesize speech from phoneme array
 * 
 * Body: { phonemes: string[] }
 * Returns: WAV audio file
 */
app.post('/api/phonemes/speak', (req, res) => {
    try {
        const { phonemes } = req.body;

        if (!phonemes || !Array.isArray(phonemes)) {
            return res.status(400).json({ error: 'Phonemes array is required' });
        }

        // Convert phonemes to frames
        const frames = [];
        for (const phoneme of phonemes) {
            const phonemeFrames = getPhonemeFrames(phoneme);
            if (phonemeFrames) {
                frames.push(...phonemeFrames);
            }
        }

        if (frames.length === 0) {
            return res.status(400).json({ error: 'No valid phonemes found' });
        }

        // Synthesize audio
        const samples = synthesizer.synthesizeFromFrames(frames);

        // Create WAV buffer
        const wavBuffer = createWavBuffer(samples, SAMPLE_RATE);

        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': wavBuffer.length,
            'Content-Disposition': 'attachment; filename="ti-speak.wav"'
        });

        res.send(wavBuffer);
    } catch (error) {
        console.error('Phoneme synthesis error:', error);
        res.status(500).json({ error: 'Phoneme synthesis failed', message: error.message });
    }
});

/**
 * POST /api/synthesize
 * Direct LPC frame synthesis
 * 
 * Body: { frames: Array<{ energy, pitch, k }>}
 * Returns: WAV audio file
 */
app.post('/api/synthesize', (req, res) => {
    try {
        const { frames } = req.body;

        if (!frames || !Array.isArray(frames)) {
            return res.status(400).json({ error: 'Frames array is required' });
        }

        // Validate frame format
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            if (typeof frame.energy !== 'number' || typeof frame.pitch !== 'number') {
                return res.status(400).json({
                    error: `Invalid frame at index ${i}`,
                    message: 'Each frame must have energy and pitch properties'
                });
            }
        }

        // Synthesize audio
        const samples = synthesizer.synthesizeFromFrames(frames);

        // Create WAV buffer
        const wavBuffer = createWavBuffer(samples, SAMPLE_RATE);

        res.set({
            'Content-Type': 'audio/wav',
            'Content-Length': wavBuffer.length,
            'Content-Disposition': 'attachment; filename="ti-speak.wav"'
        });

        res.send(wavBuffer);
    } catch (error) {
        console.error('Direct synthesis error:', error);
        res.status(500).json({ error: 'Direct synthesis failed', message: error.message });
    }
});

/**
 * POST /api/parse
 * Parse text to phonemes without synthesizing
 * 
 * Body: { text: string }
 * Returns: { phonemes: string[], phonemeString: string }
 */
app.post('/api/parse', (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        const phonemes = textToPhonemes(text);
        const phonemeString = phonemes.join(' ');

        res.json({
            phonemes,
            phonemeString,
            count: phonemes.length
        });
    } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ error: 'Parse failed', message: error.message });
    }
});

/**
 * GET /api/info
 * Get synthesizer information
 */
app.get('/api/info', (req, res) => {
    res.json({
        name: 'TI-Speak',
        description: 'TI-99/4A TMS5220 Speech Synthesizer Simulator',
        chip: 'TMS5220',
        sampleRate: SAMPLE_RATE,
        frameRate: 40,
        frameDuration: 25,
        interpolationSteps: 8,
        phonemeCount: listPhonemes().length,
        version: '1.0.0'
    });
});

/**
 * GET /
 * Serve the web interface
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ████████╗██╗      ███████╗██████╗ ███████╗ █████╗ ██╗  ██╗  ║
║   ╚══██╔══╝██║      ██╔════╝██╔══██╗██╔════╝██╔══██╗██║ ██╔╝  ║
║      ██║   ██║█████╗███████╗██████╔╝█████╗  ███████║█████╔╝   ║
║      ██║   ██║╚════╝╚════██║██╔═══╝ ██╔══╝  ██╔══██║██╔═██╗   ║
║      ██║   ██║      ███████║██║     ███████╗██║  ██║██║  ██╗  ║
║      ╚═╝   ╚═╝      ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝  ║
║                                                               ║
║   TI-99/4A TMS5220 Speech Synthesizer Simulator               ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
});

module.exports = app;
