/**
 * Speech Frame Decoder
 * 
 * Utilities for decoding and encoding TMS5220 speech frames.
 */

const {
    ENERGY_TABLE,
    PITCH_TABLE,
    K_TABLES,
    K_BITS
} = require('../core/coefficients');

/**
 * Frame types in TMS5220 speech data
 */
const FrameType = {
    VOICED: 'voiced',       // Full frame with all parameters
    UNVOICED: 'unvoiced',   // Pitch=0, only K1-K4
    REPEAT: 'repeat',       // Repeat previous K parameters
    SILENCE: 'silence',     // Energy=0
    STOP: 'stop'            // Energy=15, end of speech
};

/**
 * Decode frames from raw LPC bitstream
 * @param {Uint8Array|number[]} data - Raw LPC data bytes
 * @returns {Object[]} - Array of decoded frame objects
 */
function decodeFrames(data) {
    const frames = [];
    let bitPos = 0;
    const bits = Array.from(data);

    function readBits(numBits) {
        let value = 0;
        for (let i = 0; i < numBits; i++) {
            const byteIndex = Math.floor(bitPos / 8);
            const bitIndex = bitPos % 8;

            if (byteIndex < bits.length) {
                const bit = (bits[byteIndex] >> bitIndex) & 1;
                value |= (bit << i);
            }
            bitPos++;
        }
        return value;
    }

    while (bitPos < bits.length * 8) {
        const frame = {};

        // Read energy (4 bits)
        const energyIndex = readBits(4);

        // Check for stop code
        if (energyIndex === 15) {
            frame.type = FrameType.STOP;
            frame.energyIndex = 15;
            frame.energy = 0;
            frames.push(frame);
            break;
        }

        // Check for silence
        if (energyIndex === 0) {
            frame.type = FrameType.SILENCE;
            frame.energyIndex = 0;
            frame.energy = 0;
            frames.push(frame);
            continue;
        }

        frame.energyIndex = energyIndex;
        frame.energy = ENERGY_TABLE[energyIndex];

        // Read repeat flag (1 bit)
        const repeat = readBits(1);
        frame.repeat = repeat === 1;

        // Read pitch (6 bits)
        const pitchIndex = readBits(6);
        frame.pitchIndex = pitchIndex;
        frame.pitch = PITCH_TABLE[pitchIndex];

        if (frame.repeat) {
            frame.type = FrameType.REPEAT;
            frames.push(frame);
            continue;
        }

        // Read K parameters
        frame.kIndices = [];
        frame.k = [];

        // Always read K1-K4
        for (let i = 0; i < 4; i++) {
            const kIndex = readBits(K_BITS[i]);
            frame.kIndices.push(kIndex);
            frame.k.push(K_TABLES[i][kIndex]);
        }

        if (pitchIndex === 0) {
            // Unvoiced: K5-K10 are zero
            frame.type = FrameType.UNVOICED;
            for (let i = 4; i < 10; i++) {
                frame.kIndices.push(0);
                frame.k.push(0);
            }
        } else {
            // Voiced: read K5-K10
            frame.type = FrameType.VOICED;
            for (let i = 4; i < 10; i++) {
                const kIndex = readBits(K_BITS[i]);
                frame.kIndices.push(kIndex);
                frame.k.push(K_TABLES[i][kIndex]);
            }
        }

        frames.push(frame);
    }

    return frames;
}

/**
 * Encode frames to raw LPC bitstream
 * @param {Object[]} frames - Array of frame objects
 * @returns {Uint8Array} - Encoded LPC data bytes
 */
function encodeFrames(frames) {
    const bits = [];

    function writeBits(value, numBits) {
        for (let i = 0; i < numBits; i++) {
            bits.push((value >> i) & 1);
        }
    }

    for (const frame of frames) {
        if (frame.type === FrameType.STOP) {
            writeBits(15, 4); // Energy = 15
            continue;
        }

        if (frame.type === FrameType.SILENCE) {
            writeBits(0, 4); // Energy = 0
            continue;
        }

        // Write energy index
        writeBits(frame.energyIndex, 4);

        // Write repeat flag
        writeBits(frame.repeat ? 1 : 0, 1);

        // Write pitch index
        writeBits(frame.pitchIndex, 6);

        if (!frame.repeat) {
            // Write K parameters
            const numK = frame.type === FrameType.UNVOICED ? 4 : 10;
            for (let i = 0; i < numK; i++) {
                writeBits(frame.kIndices[i], K_BITS[i]);
            }
        }
    }

    // Always end with stop code if not already present
    const lastFrame = frames[frames.length - 1];
    if (!lastFrame || lastFrame.type !== FrameType.STOP) {
        writeBits(15, 4);
    }

    // Convert bits to bytes
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8 && i + j < bits.length; j++) {
            byte |= (bits[i + j] << j);
        }
        bytes.push(byte);
    }

    return new Uint8Array(bytes);
}

/**
 * Find the closest energy index for a given energy value
 * @param {number} energy - Target energy value
 * @returns {number} - Closest energy index (0-14)
 */
function findClosestEnergyIndex(energy) {
    let closestIndex = 0;
    let closestDiff = Math.abs(ENERGY_TABLE[0] - energy);

    for (let i = 1; i < 15; i++) { // Skip index 15 (stop code)
        const diff = Math.abs(ENERGY_TABLE[i] - energy);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
        }
    }

    return closestIndex;
}

/**
 * Find the closest pitch index for a given pitch value
 * @param {number} pitch - Target pitch value
 * @returns {number} - Closest pitch index (0-63)
 */
function findClosestPitchIndex(pitch) {
    if (pitch === 0) return 0;

    let closestIndex = 1;
    let closestDiff = Math.abs(PITCH_TABLE[1] - pitch);

    for (let i = 2; i < 64; i++) {
        const diff = Math.abs(PITCH_TABLE[i] - pitch);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
        }
    }

    return closestIndex;
}

/**
 * Find the closest K index for a given K value
 * @param {number} kValue - Target K value
 * @param {number} kIndex - Which K parameter (0-9 for K1-K10)
 * @returns {number} - Closest K index
 */
function findClosestKIndex(kValue, kIndex) {
    const table = K_TABLES[kIndex];
    let closestIndex = 0;
    let closestDiff = Math.abs(table[0] - kValue);

    for (let i = 1; i < table.length; i++) {
        const diff = Math.abs(table[i] - kValue);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
        }
    }

    return closestIndex;
}

module.exports = {
    FrameType,
    decodeFrames,
    encodeFrames,
    findClosestEnergyIndex,
    findClosestPitchIndex,
    findClosestKIndex
};
