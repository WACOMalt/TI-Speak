/**
 * TMS5220 Speech Synthesizer Emulator
 * 
 * This is a chip-level accurate emulator of the TMS5220 speech synthesizer
 * used in the TI-99/4A Speech Synthesizer module.
 * 
 * The TMS5220 uses Linear Predictive Coding (LPC) to synthesize speech from
 * compressed parameter data. It can operate in two modes:
 * - Speak: Read speech data from external ROM
 * - Speak External: Receive speech data from CPU via FIFO buffer
 */

const {
    ENERGY_TABLE,
    PITCH_TABLE,
    K_TABLES,
    K_BITS,
    CHIRP_TABLE_SIGNED,
    INTERP_COEFF,
    SAMPLE_RATE,
    SAMPLES_PER_FRAME,
    INTERP_PERIODS,
    SAMPLES_PER_INTERP
} = require('./coefficients');
const LPCLattice = require('./lpc-lattice');

class TMS5220 {
    constructor() {
        // LPC lattice filter
        this.lattice = new LPCLattice();

        // Current decoded parameters (targets from current frame)
        this.targetEnergy = 0;
        this.targetPitch = 0;
        this.targetK = new Array(10).fill(0);

        // Previous frame parameters (for interpolation)
        this.currentEnergy = 0;
        this.currentPitch = 0;
        this.currentK = new Array(10).fill(0);

        // Interpolation state
        this.interpCount = 0;      // Current interpolation period (0-7)
        this.sampleCount = 0;      // Samples within current interp period

        // Excitation state
        this.pitchCount = 0;       // Current position in pitch period
        this.chirpIndex = 0;       // Current position in chirp table
        this.noiseRegister = 0x1FFFF; // 17-bit LFSR for noise generation

        // Status flags
        this.speaking = false;
        this.talkStatus = false;   // TS bit
        this.bufferLow = true;     // BL bit
        this.bufferEmpty = true;   // BE bit

        // FIFO buffer for Speak External mode (16 bytes = 128 bits)
        this.fifo = [];
        this.fifoBitPos = 0;       // Current bit position in FIFO

        // Frame buffer for current frame data
        this.frameData = null;
        this.frameBitPos = 0;

        // Random number generator for unvoiced sounds
        this.rand = Math.random;
    }

    /**
     * Reset the synthesizer to initial state
     */
    reset() {
        this.lattice.reset();
        this.targetEnergy = 0;
        this.targetPitch = 0;
        this.targetK.fill(0);
        this.currentEnergy = 0;
        this.currentPitch = 0;
        this.currentK.fill(0);
        this.interpCount = 0;
        this.sampleCount = 0;
        this.pitchCount = 0;
        this.chirpIndex = 0;
        this.noiseRegister = 0x1FFFF;
        this.speaking = false;
        this.talkStatus = false;
        this.bufferLow = true;
        this.bufferEmpty = true;
        this.fifo = [];
        this.fifoBitPos = 0;
        this.frameData = null;
        this.frameBitPos = 0;
    }

    /**
     * Load speech data for synthesis (Speak External mode)
     * @param {Uint8Array|number[]} data - Raw LPC-encoded speech data
     */
    loadSpeechData(data) {
        this.frameData = Array.from(data);
        this.frameBitPos = 0;
        this.speaking = true;
        this.talkStatus = true;

        // Read first frame
        this.readNextFrame();
    }

    /**
     * Read bits from the frame data buffer
     * @param {number} numBits - Number of bits to read
     * @returns {number} - The value read
     */
    readBits(numBits) {
        if (!this.frameData || this.frameBitPos >= this.frameData.length * 8) {
            return 0;
        }

        let value = 0;
        for (let i = 0; i < numBits; i++) {
            const byteIndex = Math.floor(this.frameBitPos / 8);
            const bitIndex = this.frameBitPos % 8;

            if (byteIndex < this.frameData.length) {
                // TMS5220 reads bits LSB first within each byte
                const bit = (this.frameData[byteIndex] >> bitIndex) & 1;
                value |= (bit << i);
            }
            this.frameBitPos++;
        }

        return value;
    }

    /**
     * Read and decode the next speech frame
     * @returns {boolean} - true if frame was read successfully, false if stop code
     */
    readNextFrame() {
        // Store previous parameters as current (for interpolation start point)
        this.currentEnergy = this.targetEnergy;
        this.currentPitch = this.targetPitch;
        for (let i = 0; i < 10; i++) {
            this.currentK[i] = this.targetK[i];
        }

        // Read energy (4 bits)
        const energyIndex = this.readBits(4);

        // Check for stop code (energy = 15)
        if (energyIndex === 15) {
            this.speaking = false;
            this.talkStatus = false;
            this.targetEnergy = 0;
            return false;
        }

        // Check for silence frame (energy = 0)
        if (energyIndex === 0) {
            this.targetEnergy = 0;
            this.targetPitch = 0;
            for (let i = 0; i < 10; i++) {
                this.targetK[i] = 0;
            }
            this.interpCount = 0;
            this.sampleCount = 0;
            return true;
        }

        // Decode energy from table
        this.targetEnergy = ENERGY_TABLE[energyIndex];

        // Read repeat flag (1 bit)
        const repeatFlag = this.readBits(1);

        // Read pitch (6 bits)
        const pitchIndex = this.readBits(6);
        this.targetPitch = PITCH_TABLE[pitchIndex];

        // If repeat flag is set, keep previous K parameters
        if (repeatFlag) {
            // K parameters stay the same as previous frame
            this.interpCount = 0;
            this.sampleCount = 0;
            return true;
        }

        // Voiced frame (pitch > 0): read all K1-K10
        // Unvoiced frame (pitch = 0): only read K1-K4

        // Read K1 (5 bits)
        this.targetK[0] = K_TABLES[0][this.readBits(K_BITS[0])];

        // Read K2 (5 bits)
        this.targetK[1] = K_TABLES[1][this.readBits(K_BITS[1])];

        // Read K3 (4 bits)
        this.targetK[2] = K_TABLES[2][this.readBits(K_BITS[2])];

        // Read K4 (4 bits)
        this.targetK[3] = K_TABLES[3][this.readBits(K_BITS[3])];

        // For unvoiced frames (pitch = 0), K5-K10 are set to 0
        if (pitchIndex === 0) {
            for (let i = 4; i < 10; i++) {
                this.targetK[i] = 0;
            }
        } else {
            // Voiced frame: read K5-K10
            for (let i = 4; i < 10; i++) {
                this.targetK[i] = K_TABLES[i][this.readBits(K_BITS[i])];
            }
        }

        // Reset interpolation counters
        this.interpCount = 0;
        this.sampleCount = 0;

        return true;
    }

    /**
     * Generate noise for unvoiced sounds using LFSR
     * @returns {number} - Noise sample (-1 or 1)
     */
    generateNoise() {
        // 17-bit LFSR with taps at bits 0 and 3
        const bit = ((this.noiseRegister >> 0) ^ (this.noiseRegister >> 3)) & 1;
        this.noiseRegister = (this.noiseRegister >> 1) | (bit << 16);
        return (this.noiseRegister & 1) ? 1 : -1;
    }

    /**
     * Generate excitation signal (voiced or unvoiced)
     * @param {number} pitch - Current pitch value (0 = unvoiced)
     * @returns {number} - Excitation sample
     */
    generateExcitation(pitch) {
        if (pitch === 0) {
            // Unvoiced: use noise
            return this.generateNoise() * 64; // Scale noise
        } else {
            // Voiced: use chirp waveform at pitch frequency
            let excitation = 0;

            if (this.pitchCount < CHIRP_TABLE_SIGNED.length) {
                excitation = CHIRP_TABLE_SIGNED[this.pitchCount];
            }

            // Advance pitch counter
            this.pitchCount++;
            if (this.pitchCount >= pitch) {
                this.pitchCount = 0;
            }

            return excitation;
        }
    }

    /**
     * Interpolate between current and target parameters
     * @param {number} current - Current parameter value
     * @param {number} target - Target parameter value
     * @param {number} period - Current interpolation period (0-7)
     * @returns {number} - Interpolated value
     */
    interpolate(current, target, period) {
        // TMS5220 interpolation uses bit shifting
        // The interpolation coefficient tells us how many bits to shift
        const shift = INTERP_COEFF[period];

        if (shift === 0) {
            // No interpolation, use target directly
            return target;
        }

        // Calculate difference and apply shift
        const diff = target - current;
        return current + (diff >> shift);
    }

    /**
     * Generate one audio sample
     * @returns {number} - Audio sample (16-bit range, -32768 to 32767)
     */
    generateSample() {
        if (!this.speaking) {
            return 0;
        }

        // Calculate interpolated parameters
        const energy = this.interpolate(this.currentEnergy, this.targetEnergy, this.interpCount);
        const pitch = Math.round(this.interpolate(this.currentPitch, this.targetPitch, this.interpCount));

        const k = new Array(10);
        for (let i = 0; i < 10; i++) {
            k[i] = this.interpolate(this.currentK[i], this.targetK[i], this.interpCount);
        }

        // Generate excitation signal
        const excitation = this.generateExcitation(pitch);

        // Process through lattice filter
        let sample = this.lattice.processTMS5220(excitation, energy, k);

        // Scale to 16-bit output
        sample = Math.round(sample * 4); // Scale 14-bit to 16-bit range
        sample = Math.max(-32768, Math.min(32767, sample));

        // Advance sample counter
        this.sampleCount++;

        // Check if we need to move to next interpolation period
        if (this.sampleCount >= SAMPLES_PER_INTERP) {
            this.sampleCount = 0;
            this.interpCount++;

            // At the first interpolation period of each frame, read new frame
            if (this.interpCount >= INTERP_PERIODS) {
                this.interpCount = 0;

                // Read next frame
                if (!this.readNextFrame()) {
                    // Stop code encountered
                    return 0;
                }
            }
        }

        return sample;
    }

    /**
     * Generate audio samples for the entire speech data
     * @param {Uint8Array|number[]} data - LPC-encoded speech data
     * @returns {Int16Array} - Array of 16-bit audio samples
     */
    synthesize(data) {
        this.reset();
        this.loadSpeechData(data);

        const samples = [];
        let maxSamples = SAMPLE_RATE * 30; // Max 30 seconds

        while (this.speaking && maxSamples > 0) {
            samples.push(this.generateSample());
            maxSamples--;
        }

        // Add a short fade-out to prevent clicks
        const fadeLength = Math.min(100, samples.length);
        for (let i = 0; i < fadeLength; i++) {
            const fadeMultiplier = (fadeLength - i) / fadeLength;
            samples[samples.length - fadeLength + i] = Math.round(
                samples[samples.length - fadeLength + i] * fadeMultiplier
            );
        }

        return new Int16Array(samples);
    }

    /**
     * Synthesize speech from LPC frame parameters directly
     * @param {Object[]} frames - Array of frame objects with energy, pitch, k parameters
     * @returns {Int16Array} - Array of 16-bit audio samples
     */
    synthesizeFromFrames(frames) {
        this.reset();
        this.speaking = true;
        this.talkStatus = true;

        const samples = [];

        for (const frame of frames) {
            // Set target parameters from frame
            this.currentEnergy = this.targetEnergy;
            this.currentPitch = this.targetPitch;
            for (let i = 0; i < 10; i++) {
                this.currentK[i] = this.targetK[i];
            }

            // Set new targets
            this.targetEnergy = frame.energy !== undefined ? frame.energy : 0;
            this.targetPitch = frame.pitch !== undefined ? frame.pitch : 0;

            if (frame.k) {
                for (let i = 0; i < 10; i++) {
                    this.targetK[i] = frame.k[i] !== undefined ? frame.k[i] : 0;
                }
            }

            // Generate samples for this frame
            for (let interp = 0; interp < INTERP_PERIODS; interp++) {
                this.interpCount = interp;
                for (let s = 0; s < SAMPLES_PER_INTERP; s++) {
                    samples.push(this.generateSample());
                }
            }
        }

        // Add final silence frame
        this.currentEnergy = this.targetEnergy;
        this.targetEnergy = 0;
        for (let interp = 0; interp < INTERP_PERIODS; interp++) {
            this.interpCount = interp;
            for (let s = 0; s < SAMPLES_PER_INTERP; s++) {
                samples.push(this.generateSample());
            }
        }

        this.speaking = false;
        return new Int16Array(samples);
    }
}

module.exports = TMS5220;
