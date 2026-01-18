/**
 * Text to Phoneme Converter (ES Module)
 */

import { getPhonemeFrames } from './phonemes.js';

// Common words and their phoneme mappings
const DICTIONARY = {
    'HELLO': ['HH', 'EH', 'L', 'OW'],
    'WORLD': ['W', 'ER', 'L', 'D'],
    'TI': ['T', 'IY'],
    'TEXAS': ['T', 'EH', 'K', 'S', 'AH', 'S'],
    'INSTRUMENTS': ['IH', 'N', 'S', 'T', 'R', 'AH', 'M', 'AH', 'N', 'T', 'S'],
    'COMPUTER': ['K', 'AH', 'M', 'P', 'Y', 'UW', 'T', 'ER'],
    'SPEAK': ['S', 'P', 'IY', 'K'],
    'SYNTHESIZER': ['S', 'IH', 'N', 'TH', 'AH', 'S', 'AY', 'Z', 'ER'],
    'THE': ['DH', 'AH'],
    'OF': ['AH', 'V'],
    'AND': ['AE', 'N', 'D'],
    'A': ['AH'],
    'TO': ['T', 'UW'],
    'IN': ['IH', 'N'],
    'IS': ['IH', 'Z'],
    'YOU': ['Y', 'UW'],
    'THAT': ['DH', 'AE', 'T'],
    'IT': ['IH', 'T'],
    'HE': ['HH', 'IY'],
    'WAS': ['W', 'AA', 'Z'],
    'FOR': ['F', 'AO', 'R'],
    'ON': ['AA', 'N'],
    'ARE': ['AA', 'R'],
    'AS': ['AE', 'Z'],
    'WITH': ['W', 'IH', 'DH'],
    'HIS': ['HH', 'IH', 'Z'],
    'THEY': ['DH', 'EY'],
    'I': ['AY'],
    'AT': ['AE', 'T'],
    'BE': ['B', 'IY'],
    'THIS': ['DH', 'IH', 'S'],
    'HAVE': ['HH', 'AE', 'V'],
    'FROM': ['F', 'R', 'AH', 'M'],
    'OR': ['AO', 'R'],
    'ONE': ['W', 'AH', 'N'],
    'HAD': ['HH', 'AE', 'D'],
    'BY': ['B', 'AY'],
    'WORD': ['W', 'ER', 'D'],
    'BUT': ['B', 'AH', 'T'],
    'NOT': ['N', 'AA', 'T'],
    'WHAT': ['W', 'AH', 'T'],
    'ALL': ['AO', 'L'],
    'WERE': ['W', 'ER'],
    'WE': ['W', 'IY'],
    'WHEN': ['W', 'EH', 'N'],
    'YOUR': ['Y', 'AO', 'R'],
    'CAN': ['K', 'AE', 'N'],
    'SAID': ['S', 'EH', 'D'],
    'THERE': ['DH', 'EH', 'R'],
    'USE': ['Y', 'UW', 'Z'],
    'AN': ['AE', 'N'],
    'EACH': ['IY', 'CH'],
    'WHICH': ['W', 'IH', 'CH'],
    'SHE': ['SH', 'IY'],
    'DO': ['D', 'UW'],
    'HOW': ['HH', 'AW'],
    'THEIR': ['DH', 'EH', 'R'],
    'IF': ['IH', 'F'],
    'WILL': ['W', 'IH', 'L'],
    'UP': ['AH', 'P'],
    'OTHER': ['AH', 'DH', 'ER'],
    'ABOUT': ['AH', 'B', 'AW', 'T'],
    'OUT': ['AW', 'T'],
    'MANY': ['M', 'EH', 'N', 'IY'],
    'THEN': ['DH', 'EH', 'N'],
    'THEM': ['DH', 'EH', 'M'],
    'THESE': ['DH', 'IY', 'Z'],
    'SO': ['S', 'OW'],
    'SOME': ['S', 'AH', 'M'],
    'HER': ['HH', 'ER'],
    'WOULD': ['W', 'UH', 'D'],
    'MAKE': ['M', 'EY', 'K'],
    'LIKE': ['L', 'AY', 'K'],
    'HIM': ['HH', 'IH', 'M'],
    'INTO': ['IH', 'N', 'T', 'UW'],
    'TIME': ['T', 'AY', 'M'],
    'HAS': ['HH', 'AE', 'Z'],
    'LOOK': ['L', 'UH', 'K'],
    'TWO': ['T', 'UW'],
    'MORE': ['M', 'AO', 'R'],
    'WRITE': ['R', 'AY', 'T'],
    'GO': ['G', 'OW'],
    'SEE': ['S', 'IY'],
    'NUMBER': ['N', 'AH', 'M', 'B', 'ER'],
    'NO': ['N', 'OW'],
    'WAY': ['W', 'EY'],
    'COULD': ['K', 'UH', 'D'],
    'PEOPLE': ['P', 'IY', 'P', 'AH', 'L'],
    'MY': ['M', 'AY'],
    'THAN': ['DH', 'AE', 'N'],
    'FIRST': ['F', 'ER', 'S', 'T'],
    'WATER': ['W', 'AO', 'T', 'ER'],
    'BEEN': ['B', 'IH', 'N'],
    'CALL': ['K', 'AO', 'L'],
    'WHO': ['HH', 'UW'],
    'OIL': ['OY', 'L'],
    'ITS': ['IH', 'T', 'S'],
    'NOW': ['N', 'AW'],
    'FIND': ['F', 'AY', 'N', 'D'],
    'LONG': ['L', 'AO', 'NG'],
    'DOWN': ['D', 'AW', 'N'],
    'DAY': ['D', 'EY'],
    'DID': ['D', 'IH', 'D'],
    'GET': ['G', 'EH', 'T'],
    'COME': ['K', 'AH', 'M'],
    'MADE': ['M', 'EY', 'D'],
    'MAY': ['M', 'EY'],
    'PART': ['P', 'AA', 'R', 'T'],
};

// Basic letter-to-phoneme rules 
const RULES = [
    { pattern: /^PH/, phoneme: 'F' },
    { pattern: /^TH/, phoneme: 'TH' }, // Simplified (could be TH or DH)
    { pattern: /^CH/, phoneme: 'CH' },
    { pattern: /^SH/, phoneme: 'SH' },
    { pattern: /^WH/, phoneme: 'W' },
    { pattern: /^NG/, phoneme: 'NG' },
    { pattern: /^CK/, phoneme: 'K' },
    { pattern: /^OO/, phoneme: 'UW' },
    { pattern: /^EE/, phoneme: 'IY' },
    { pattern: /^EA/, phoneme: 'IY' },
    { pattern: /^AI/, phoneme: 'EY' },
    { pattern: /^AY/, phoneme: 'EY' },
    { pattern: /^EI/, phoneme: 'EY' },
    { pattern: /^IE/, phoneme: 'IY' },
    { pattern: /^OA/, phoneme: 'OW' },
    { pattern: /^OU/, phoneme: 'AW' },
    { pattern: /^OW/, phoneme: 'AW' }, // or OW
    { pattern: /^OY/, phoneme: 'OY' },
    { pattern: /^OI/, phoneme: 'OY' },
    { pattern: /^AU/, phoneme: 'AO' },
    { pattern: /^AW/, phoneme: 'AO' },

    // Single letters (simplified)
    { pattern: /^A/, phoneme: 'AE' },
    { pattern: /^B/, phoneme: 'B' },
    { pattern: /^C/, phoneme: 'K' },
    { pattern: /^D/, phoneme: 'D' },
    { pattern: /^E/, phoneme: 'EH' },
    { pattern: /^F/, phoneme: 'F' },
    { pattern: /^G/, phoneme: 'G' },
    { pattern: /^H/, phoneme: 'HH' },
    { pattern: /^I/, phoneme: 'IH' },
    { pattern: /^J/, phoneme: 'JH' },
    { pattern: /^K/, phoneme: 'K' },
    { pattern: /^L/, phoneme: 'L' },
    { pattern: /^M/, phoneme: 'M' },
    { pattern: /^N/, phoneme: 'N' },
    { pattern: /^O/, phoneme: 'AA' },
    { pattern: /^P/, phoneme: 'P' },
    { pattern: /^Q/, phoneme: 'K' },
    { pattern: /^R/, phoneme: 'R' },
    { pattern: /^S/, phoneme: 'S' },
    { pattern: /^T/, phoneme: 'T' },
    { pattern: /^U/, phoneme: 'AH' },
    { pattern: /^V/, phoneme: 'V' },
    { pattern: /^W/, phoneme: 'W' },
    { pattern: /^X/, phoneme: 'K' }, // Need S next
    { pattern: /^Y/, phoneme: 'Y' },
    { pattern: /^Z/, phoneme: 'Z' },
];

export function isPhonemeNotation(text) {
    return text.trim().startsWith('/') && text.trim().endsWith('/');
}

export function parsePhonemeNotation(text) {
    const content = text.trim().slice(1, -1);
    return content.trim().split(/\s+/);
}

function convertWordToPhonemes(word) {
    const normalizeWord = word.toUpperCase().replace(/[^A-Z]/g, '');

    if (DICTIONARY[normalizeWord]) {
        return [...DICTIONARY[normalizeWord]];
    }

    // Fallback: Rule-based conversion
    const phonemes = [];
    let remaining = normalizeWord;

    while (remaining.length > 0) {
        let matchFound = false;

        // Try to match multi-letter rules first
        for (const rule of RULES) {
            if (rule.pattern.test(remaining)) {
                phonemes.push(rule.phoneme);
                // Special handling for X -> K S
                if (remaining.startsWith('X')) {
                    phonemes.push('S');
                }

                // Consum matched characters
                // Heuristic: remove 1 char for single letters, 2 for most patterns
                // Ideally rules should specify consumption length
                if (rule.pattern.source.includes('^..')) {
                    remaining = remaining.substring(2);
                } else {
                    remaining = remaining.substring(1);
                }
                matchFound = true;
                break;
            }
        }

        if (!matchFound) {
            // Skip unknown character
            remaining = remaining.substring(1);
        }
    }

    return phonemes;
}

export function textToPhonemes(text) {
    if (isPhonemeNotation(text)) {
        return parsePhonemeNotation(text);
    }

    const words = text.toUpperCase().trim().split(/([ \t\r\n,.!?:;]+)/);
    const phonemeSequence = [];

    for (const token of words) {
        if (!token) continue;

        // Punctuation/Spaces
        if (/^[ \t]+$/.test(token)) {
            phonemeSequence.push(' ');
        } else if (/^[.|!|?]+$/.test(token)) {
            phonemeSequence.push('.');
        } else if (/^[,|;|:]+$/.test(token)) {
            phonemeSequence.push(',');
        } else if (/[A-Z]/.test(token)) {
            // Word
            const ph = convertWordToPhonemes(token);
            phonemeSequence.push(...ph);
        }
    }

    // Ensure we start/end with silence if not present
    if (phonemeSequence.length > 0 && phonemeSequence[0] !== ' ' && phonemeSequence[0] !== '.') {
        phonemeSequence.unshift('_');
    }
    if (phonemeSequence.length > 0 && phonemeSequence[phonemeSequence.length - 1] !== ' ' && phonemeSequence[phonemeSequence.length - 1] !== '.') {
        phonemeSequence.push('_');
    }

    return phonemeSequence.filter(p => p !== null && p !== undefined);
}

export function getPhonemeString(text) {
    return textToPhonemes(text).join(' ');
}

export function textToFrames(text) {
    const phonemes = textToPhonemes(text);
    const frames = [];

    for (const phoneme of phonemes) {
        const phonemeFrames = getPhonemeFrames(phoneme);
        if (phonemeFrames) {
            frames.push(...phonemeFrames);
        }
    }

    return frames;
}
