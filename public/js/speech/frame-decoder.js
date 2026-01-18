/**
 * Speech Frame Decoder (ES Module)
 */

import {
    ENERGY_TABLE,
    PITCH_TABLE,
    K_TABLES,
    K_BITS
} from '../core/coefficients.js';

export const FrameType = {
    VOICED: 'voiced',
    UNVOICED: 'unvoiced',
    REPEAT: 'repeat',
    SILENCE: 'silence',
    STOP: 'stop'
};

export function decodeFrames(data) {
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

        const energyIndex = readBits(4);

        if (energyIndex === 15) {
            frame.type = FrameType.STOP;
            frame.energyIndex = 15;
            frame.energy = 0;
            frames.push(frame);
            break;
        }

        if (energyIndex === 0) {
            frame.type = FrameType.SILENCE;
            frame.energyIndex = 0;
            frame.energy = 0;
            frames.push(frame);
            continue;
        }

        frame.energyIndex = energyIndex;
        frame.energy = ENERGY_TABLE[energyIndex];

        const repeat = readBits(1);
        frame.repeat = repeat === 1;

        const pitchIndex = readBits(6);
        frame.pitchIndex = pitchIndex;
        frame.pitch = PITCH_TABLE[pitchIndex];

        if (frame.repeat) {
            frame.type = FrameType.REPEAT;
            frames.push(frame);
            continue;
        }

        frame.kIndices = [];
        frame.k = [];

        for (let i = 0; i < 4; i++) {
            const kIndex = readBits(K_BITS[i]);
            frame.kIndices.push(kIndex);
            frame.k.push(K_TABLES[i][kIndex]);
        }

        if (pitchIndex === 0) {
            frame.type = FrameType.UNVOICED;
            for (let i = 4; i < 10; i++) {
                frame.kIndices.push(0);
                frame.k.push(0);
            }
        } else {
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

export function encodeFrames(frames) {
    const bits = [];

    function writeBits(value, numBits) {
        for (let i = 0; i < numBits; i++) {
            bits.push((value >> i) & 1);
        }
    }

    for (const frame of frames) {
        if (frame.type === FrameType.STOP) {
            writeBits(15, 4);
            continue;
        }

        if (frame.type === FrameType.SILENCE) {
            writeBits(0, 4);
            continue;
        }

        writeBits(frame.energyIndex, 4);
        writeBits(frame.repeat ? 1 : 0, 1);
        writeBits(frame.pitchIndex, 6);

        if (!frame.repeat) {
            const numK = frame.type === FrameType.UNVOICED ? 4 : 10;
            for (let i = 0; i < numK; i++) {
                writeBits(frame.kIndices[i], K_BITS[i]);
            }
        }
    }

    const lastFrame = frames[frames.length - 1];
    if (!lastFrame || lastFrame.type !== FrameType.STOP) {
        writeBits(15, 4);
    }

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
