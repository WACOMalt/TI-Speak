/**
 * TMS5220 Speech Synthesizer Emulator (ES Module)
 */

import {
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
} from './coefficients.js';

import LPCLattice from './lpc-lattice.js';

export default class TMS5220 {
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

        // Check for stop code
        if (energyIndex === 15) {
            this.speaking = false;
            this.talkStatus = false;
            this.targetEnergy = 0;
            return false;
        }

        // Check for silence
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

        // Voiced vs Unvoiced
        this.targetK[0] = K_TABLES[0][this.readBits(K_BITS[0])];
        this.targetK[1] = K_TABLES[1][this.readBits(K_BITS[1])];
        this.targetK[2] = K_TABLES[2][this.readBits(K_BITS[2])];
        this.targetK[3] = K_TABLES[3][this.readBits(K_BITS[3])];

        if (pitchIndex === 0) {
            for (let i = 4; i < 10; i++) {
                this.targetK[i] = 0;
            }
        } else {
            for (let i = 4; i < 10; i++) {
                this.targetK[i] = K_TABLES[i][this.readBits(K_BITS[i])];
            }
        }

        this.interpCount = 0;
        this.sampleCount = 0;

        return true;
    }

    /**
     * Generate noise for unvoiced sounds using LFSR
     * @returns {number} - Noise sample (-1 or 1)
     */
    generateNoise() {
        const bit = ((this.noiseRegister >> 0) ^ (this.noiseRegister >> 3)) & 1;
        this.noiseRegister = (this.noiseRegister >> 1) | (bit << 16);
        return (this.noiseRegister & 1) ? 1 : -1;
    }

    /**
     * Generate excitation signal
     * @param {number} pitch - Current pitch value (0 = unvoiced)
     * @returns {number} - Excitation sample
     */
    generateExcitation(pitch) {
        if (pitch === 0) {
            return this.generateNoise() * 64;
        } else {
            let excitation = 0;
            if (this.pitchCount < CHIRP_TABLE_SIGNED.length) {
                excitation = CHIRP_TABLE_SIGNED[this.pitchCount];
            }
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
        const shift = INTERP_COEFF[period];
        if (shift === 0) return target;
        const diff = target - current;
        return current + (diff >> shift);
    }

    /**
     * Generate one audio sample
     * @returns {number} - Audio sample
     */
    generateSample() {
        if (!this.speaking) {
            return 0;
        }

        const energy = this.interpolate(this.currentEnergy, this.targetEnergy, this.interpCount);
        const pitch = Math.round(this.interpolate(this.currentPitch, this.targetPitch, this.interpCount));

        const k = new Array(10);
        for (let i = 0; i < 10; i++) {
            k[i] = this.interpolate(this.currentK[i], this.targetK[i], this.interpCount);
        }

        const excitation = this.generateExcitation(pitch);
        let sample = this.lattice.processTMS5220(excitation, energy, k);

        sample = Math.round(sample * 4);
        sample = Math.max(-32768, Math.min(32767, sample));

        this.sampleCount++;

        if (this.sampleCount >= SAMPLES_PER_INTERP) {
            this.sampleCount = 0;
            this.interpCount++;

            if (this.interpCount >= INTERP_PERIODS) {
                this.interpCount = 0;
                if (!this.readNextFrame()) {
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
     * @param {Object[]} frames - Array of frame objects
     * @returns {Int16Array} - Array of 16-bit audio samples
     */
    synthesizeFromFrames(frames) {
        this.reset();
        this.speaking = true;
        this.talkStatus = true;

        const samples = [];

        for (const frame of frames) {
            this.currentEnergy = this.targetEnergy;
            this.currentPitch = this.targetPitch;
            for (let i = 0; i < 10; i++) {
                this.currentK[i] = this.targetK[i];
            }

            this.targetEnergy = frame.energy !== undefined ? frame.energy : 0;
            this.targetPitch = frame.pitch !== undefined ? frame.pitch : 0;

            if (frame.k) {
                for (let i = 0; i < 10; i++) {
                    this.targetK[i] = frame.k[i] !== undefined ? frame.k[i] : 0;
                }
            }

            for (let interp = 0; interp < INTERP_PERIODS; interp++) {
                this.interpCount = interp;
                for (let s = 0; s < SAMPLES_PER_INTERP; s++) {
                    samples.push(this.generateSample());
                }
            }
        }

        // Final silence
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
