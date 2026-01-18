/**
 * Phoneme Library (ES Module)
 */

import { ENERGY_TABLE, PITCH_TABLE, K_TABLES } from '../core/coefficients.js';

function createFrame(energyIdx, pitchIdx, kIndices, duration = 1) {
    const frames = [];
    for (let i = 0; i < duration; i++) {
        frames.push({
            energy: ENERGY_TABLE[energyIdx],
            pitch: PITCH_TABLE[pitchIdx],
            k: kIndices.map((idx, i) => K_TABLES[i][idx])
        });
    }
    return frames;
}

export const PHONEMES = {
    // Silence and pauses
    '_': createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4),      // Short pause
    ' ': createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 2),      // Space
    '.': createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 6),      // Period pause
    ',': createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4),      // Comma pause

    // Vowels (voiced, use pitch)
    'AA': [  // "father"
        ...createFrame(10, 30, [20, 18, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 32, [21, 19, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'AE': [  // "cat"
        ...createFrame(10, 28, [18, 20, 9, 7, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 30, [19, 21, 9, 7, 8, 8, 8, 4, 4, 4], 3),
    ],
    'AH': [  // "cut"
        ...createFrame(10, 28, [16, 16, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 30, [17, 17, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'AO': [  // "dog"
        ...createFrame(10, 26, [14, 14, 10, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 28, [15, 15, 10, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'AW': [  // "cow"
        ...createFrame(10, 28, [18, 16, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 30, [16, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 32, [14, 22, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'AY': [  // "my"
        ...createFrame(10, 28, [18, 16, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 30, [22, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 32, [26, 24, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'EH': [  // "bed"
        ...createFrame(10, 30, [22, 20, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 32, [23, 21, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'ER': [  // "bird" (r-colored vowel)
        ...createFrame(10, 28, [18, 14, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 30, [16, 12, 10, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 32, [14, 10, 12, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'EY': [  // "say"
        ...createFrame(10, 28, [22, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 30, [24, 22, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 32, [26, 24, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'IH': [  // "bit"
        ...createFrame(10, 32, [24, 22, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 34, [25, 23, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'IY': [  // "beat"
        ...createFrame(10, 32, [26, 24, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 34, [27, 25, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'OW': [  // "boat"
        ...createFrame(10, 26, [14, 16, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 28, [12, 18, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 30, [10, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'OY': [  // "boy"
        ...createFrame(10, 26, [12, 16, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(11, 28, [16, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 30, [24, 24, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'UH': [  // "book"
        ...createFrame(10, 26, [12, 18, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 28, [13, 19, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'UW': [  // "boot"
        ...createFrame(10, 24, [10, 20, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(11, 26, [11, 21, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],

    // Consonants - Stops
    'B': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(6, 28, [8, 16, 8, 8, 8, 8, 8, 4, 4, 4], 1),
        ...createFrame(8, 30, [12, 18, 8, 8, 8, 8, 8, 4, 4, 4], 1),
    ],
    'D': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(6, 28, [18, 14, 8, 8, 8, 8, 8, 4, 4, 4], 1),
        ...createFrame(8, 30, [20, 16, 8, 8, 8, 8, 8, 4, 4, 4], 1),
    ],
    'G': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(6, 26, [12, 20, 8, 8, 8, 8, 8, 4, 4, 4], 1),
        ...createFrame(8, 28, [14, 22, 8, 8, 8, 8, 8, 4, 4, 4], 1),
    ],
    'K': [
        ...createFrame(6, 0, [12, 8, 10, 6, 0, 0, 0, 0, 0, 0], 2),
        ...createFrame(4, 0, [14, 10, 8, 6, 0, 0, 0, 0, 0, 0], 1),
    ],
    'P': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 2),
        ...createFrame(6, 0, [8, 8, 8, 6, 0, 0, 0, 0, 0, 0], 1),
    ],
    'T': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(6, 0, [20, 10, 8, 6, 0, 0, 0, 0, 0, 0], 2),
    ],

    // Consonants - Fricatives
    'CH': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(7, 0, [24, 16, 12, 8, 0, 0, 0, 0, 0, 0], 2),
        ...createFrame(8, 0, [26, 18, 10, 8, 0, 0, 0, 0, 0, 0], 2),
    ],
    'DH': [
        ...createFrame(6, 28, [20, 14, 10, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(7, 30, [22, 16, 10, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'F': [
        ...createFrame(6, 0, [26, 8, 8, 6, 0, 0, 0, 0, 0, 0], 3),
        ...createFrame(5, 0, [28, 10, 8, 6, 0, 0, 0, 0, 0, 0], 2),
    ],
    'HH': [
        ...createFrame(5, 0, [16, 16, 8, 8, 0, 0, 0, 0, 0, 0], 2),
        ...createFrame(4, 0, [18, 18, 8, 8, 0, 0, 0, 0, 0, 0], 2),
    ],
    'JH': [
        ...createFrame(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1),
        ...createFrame(6, 28, [22, 18, 12, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(7, 30, [24, 20, 10, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'S': [
        ...createFrame(7, 0, [28, 12, 12, 8, 0, 0, 0, 0, 0, 0], 3),
        ...createFrame(6, 0, [30, 14, 10, 8, 0, 0, 0, 0, 0, 0], 2),
    ],
    'SH': [
        ...createFrame(7, 0, [26, 20, 12, 10, 0, 0, 0, 0, 0, 0], 3),
        ...createFrame(6, 0, [28, 22, 10, 10, 0, 0, 0, 0, 0, 0], 2),
    ],
    'TH': [
        ...createFrame(5, 0, [24, 10, 8, 6, 0, 0, 0, 0, 0, 0], 3),
        ...createFrame(4, 0, [26, 12, 8, 6, 0, 0, 0, 0, 0, 0], 2),
    ],
    'V': [
        ...createFrame(6, 28, [26, 10, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(7, 30, [28, 12, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'Z': [
        ...createFrame(7, 28, [28, 14, 10, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(6, 30, [30, 16, 10, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'ZH': [
        ...createFrame(7, 28, [26, 22, 10, 10, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(6, 30, [28, 24, 10, 10, 8, 8, 8, 4, 4, 4], 2),
    ],

    // Consonants - Nasals
    'M': [
        ...createFrame(9, 28, [6, 16, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(10, 30, [8, 18, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'N': [
        ...createFrame(9, 28, [18, 16, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(10, 30, [20, 18, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],
    'NG': [
        ...createFrame(9, 26, [12, 20, 8, 8, 8, 8, 8, 4, 4, 4], 3),
        ...createFrame(10, 28, [14, 22, 8, 8, 8, 8, 8, 4, 4, 4], 3),
    ],

    // Consonants - Liquids and Glides
    'L': [
        ...createFrame(9, 28, [14, 12, 10, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 30, [16, 14, 10, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'R': [
        ...createFrame(9, 28, [12, 10, 12, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(10, 30, [14, 12, 12, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'W': [
        ...createFrame(8, 26, [10, 18, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(9, 28, [14, 20, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
    'Y': [
        ...createFrame(8, 30, [24, 22, 8, 8, 8, 8, 8, 4, 4, 4], 2),
        ...createFrame(9, 32, [26, 24, 8, 8, 8, 8, 8, 4, 4, 4], 2),
    ],
};

export const PHONEME_ALIASES = {
    'AX': 'AH',
    'IX': 'IH',
    'UX': 'UH',
    'DX': 'D',
    'NX': 'N',
    'Q': '_',
    'WH': 'W',
};

export function getPhonemeFrames(phoneme) {
    const upper = phoneme.toUpperCase();
    if (PHONEMES[upper]) return PHONEMES[upper];
    if (PHONEME_ALIASES[upper] && PHONEMES[PHONEME_ALIASES[upper]]) {
        return PHONEMES[PHONEME_ALIASES[upper]];
    }
    return null;
}

export function listPhonemes() {
    return Object.keys(PHONEMES);
}

export function getPhonemeInfo(phoneme) {
    const descriptions = {
        'AA': { example: 'father', type: 'vowel' },
        'AE': { example: 'cat', type: 'vowel' },
        'AH': { example: 'cut', type: 'vowel' },
        'AO': { example: 'dog', type: 'vowel' },
        'AW': { example: 'cow', type: 'diphthong' },
        'AY': { example: 'my', type: 'diphthong' },
        'EH': { example: 'bed', type: 'vowel' },
        'ER': { example: 'bird', type: 'r-colored vowel' },
        'EY': { example: 'say', type: 'diphthong' },
        'IH': { example: 'bit', type: 'vowel' },
        'IY': { example: 'beat', type: 'vowel' },
        'OW': { example: 'boat', type: 'diphthong' },
        'OY': { example: 'boy', type: 'diphthong' },
        'UH': { example: 'book', type: 'vowel' },
        'UW': { example: 'boot', type: 'vowel' },
        'B': { example: 'boy', type: 'stop' },
        'CH': { example: 'church', type: 'affricate' },
        'D': { example: 'dog', type: 'stop' },
        'DH': { example: 'this', type: 'fricative' },
        'F': { example: 'fat', type: 'fricative' },
        'G': { example: 'go', type: 'stop' },
        'HH': { example: 'hat', type: 'fricative' },
        'JH': { example: 'judge', type: 'affricate' },
        'K': { example: 'cat', type: 'stop' },
        'L': { example: 'let', type: 'liquid' },
        'M': { example: 'man', type: 'nasal' },
        'N': { example: 'nan', type: 'nasal' },
        'NG': { example: 'sing', type: 'nasal' },
        'P': { example: 'pot', type: 'stop' },
        'R': { example: 'rat', type: 'liquid' },
        'S': { example: 'sat', type: 'fricative' },
        'SH': { example: 'she', type: 'fricative' },
        'T': { example: 'top', type: 'stop' },
        'TH': { example: 'think', type: 'fricative' },
        'V': { example: 'very', type: 'fricative' },
        'W': { example: 'wet', type: 'glide' },
        'Y': { example: 'yes', type: 'glide' },
        'Z': { example: 'zoo', type: 'fricative' },
        'ZH': { example: 'measure', type: 'fricative' },
        '_': { example: '(pause)', type: 'silence' },
        ' ': { example: '(space)', type: 'silence' },
        '.': { example: '(period)', type: 'silence' },
        ',': { example: '(comma)', type: 'silence' },
    };
    return descriptions[phoneme.toUpperCase()] || null;
}
