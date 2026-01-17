/**
 * Text to Phoneme Converter
 * 
 * Converts English text to phoneme sequences for TMS5220 speech synthesis.
 * Uses a simple rule-based approach similar to early speech synthesizers.
 * 
 * Supports two input modes:
 * 1. Plain English text (automatic conversion)
 * 2. Direct phoneme notation with slashes: /HH EH L OW/
 */

const { getPhonemeFrames, listPhonemes } = require('./phonemes');

// Letter-to-phoneme rules (simplified)
// Format: { pattern: phonemes }
// Patterns are processed in order, longer patterns first

const LETTER_RULES = {
    // Silent letters and special cases
    'GH': '',           // "night" - silent
    'KN': 'N',          // "know"
    'WR': 'R',          // "write"
    'MB': 'M',          // "lamb" (at end)

    // Vowel combinations
    'OO': 'UW',         // "boot"
    'EE': 'IY',         // "see"
    'EA': 'IY',         // "eat"
    'AI': 'EY',         // "rain"
    'AY': 'EY',         // "say"
    'OA': 'OW',         // "boat"
    'OW': 'OW',         // "low"
    'OU': 'AW',         // "out"
    'AU': 'AO',         // "cause"
    'EI': 'EY',         // "weigh"
    'IE': 'IY',         // "field"
    'OI': 'OY',         // "oil"
    'OY': 'OY',         // "boy"
    'UE': 'UW',         // "blue"
    'UI': 'UW',         // "fruit"

    // Consonant combinations
    'CH': 'CH',
    'SH': 'SH',
    'TH': 'TH',         // Simplified - could be TH or DH
    'PH': 'F',
    'WH': 'W',
    'CK': 'K',
    'NG': 'NG',
    'NK': 'NG K',
    'QU': 'K W',
    'TCH': 'CH',
    'DG': 'JH',         // "edge"

    // Single letters (basic rules, context-dependent cases simplified)
    'A': 'AE',          // Default "a" as in "cat"
    'B': 'B',
    'C': 'K',           // Default to K (soft C handled separately)
    'D': 'D',
    'E': 'EH',          // Default "e" as in "bed"
    'F': 'F',
    'G': 'G',           // Default to hard G
    'H': 'HH',
    'I': 'IH',          // Default "i" as in "bit"
    'J': 'JH',
    'K': 'K',
    'L': 'L',
    'M': 'M',
    'N': 'N',
    'O': 'AA',          // Default "o" as in "hot"
    'P': 'P',
    'Q': 'K',
    'R': 'R',
    'S': 'S',
    'T': 'T',
    'U': 'AH',          // Default "u" as in "cut"
    'V': 'V',
    'W': 'W',
    'X': 'K S',
    'Y': 'Y',           // Consonant Y
    'Z': 'Z',
};

// Common word pronunciations (exceptions to rules)
const WORD_DICTIONARY = {
    'THE': 'DH AH',
    'A': 'AH',
    'AN': 'AE N',
    'AND': 'AE N D',
    'IS': 'IH Z',
    'ARE': 'AA R',
    'WAS': 'W AA Z',
    'WERE': 'W ER',
    'BE': 'B IY',
    'BEEN': 'B IH N',
    'HAVE': 'HH AE V',
    'HAS': 'HH AE Z',
    'HAD': 'HH AE D',
    'DO': 'D UW',
    'DOES': 'D AH Z',
    'DID': 'D IH D',
    'WILL': 'W IH L',
    'WOULD': 'W UH D',
    'COULD': 'K UH D',
    'SHOULD': 'SH UH D',
    'CAN': 'K AE N',
    'CANNOT': 'K AE N AA T',
    "CAN'T": 'K AE N T',
    'MAY': 'M EY',
    'MIGHT': 'M AY T',
    'MUST': 'M AH S T',
    'SHALL': 'SH AE L',

    'I': 'AY',
    'ME': 'M IY',
    'MY': 'M AY',
    'WE': 'W IY',
    'YOU': 'Y UW',
    'YOUR': 'Y AO R',
    'HE': 'HH IY',
    'SHE': 'SH IY',
    'IT': 'IH T',
    'THEY': 'DH EY',
    'THEM': 'DH EH M',
    'THIS': 'DH IH S',
    'THAT': 'DH AE T',
    'THESE': 'DH IY Z',
    'THOSE': 'DH OW Z',
    'WHAT': 'W AH T',
    'WHICH': 'W IH CH',
    'WHO': 'HH UW',
    'WHEN': 'W EH N',
    'WHERE': 'W EH R',
    'WHY': 'W AY',
    'HOW': 'HH AW',

    'HELLO': 'HH EH L OW',
    'HI': 'HH AY',
    'YES': 'Y EH S',
    'NO': 'N OW',
    'OK': 'OW K EY',
    'OKAY': 'OW K EY',
    'PLEASE': 'P L IY Z',
    'THANK': 'TH AE NG K',
    'THANKS': 'TH AE NG K S',
    'SORRY': 'S AA R IY',
    'GOODBYE': 'G UH D B AY',
    'BYE': 'B AY',

    'ONE': 'W AH N',
    'TWO': 'T UW',
    'THREE': 'TH R IY',
    'FOUR': 'F AO R',
    'FIVE': 'F AY V',
    'SIX': 'S IH K S',
    'SEVEN': 'S EH V AH N',
    'EIGHT': 'EY T',
    'NINE': 'N AY N',
    'TEN': 'T EH N',
    'ZERO': 'Z IH R OW',

    'TEXAS': 'T EH K S AH S',
    'INSTRUMENTS': 'IH N S T R AH M EH N T S',
    'COMPUTER': 'K AH M P Y UW T ER',
    'SPEECH': 'S P IY CH',
    'SYNTHESIZER': 'S IH N TH AH S AY Z ER',
    'SPEAK': 'S P IY K',
    'SPELL': 'S P EH L',
};

/**
 * Check if text contains direct phoneme notation
 * @param {string} text - Input text
 * @returns {boolean} - True if contains phoneme notation
 */
function isPhonemeNotation(text) {
    return text.trim().startsWith('/') && text.trim().endsWith('/');
}

/**
 * Parse direct phoneme notation
 * @param {string} text - Text in format "/HH EH L OW/"
 * @returns {string[]} - Array of phoneme codes
 */
function parsePhonemeNotation(text) {
    // Remove slashes and split by spaces
    const inner = text.trim().slice(1, -1).trim();
    return inner.split(/\s+/).filter(p => p.length > 0);
}

/**
 * Convert a single word to phonemes using rules
 * @param {string} word - Word to convert
 * @returns {string[]} - Array of phoneme codes
 */
function wordToPhonemes(word) {
    const upper = word.toUpperCase();

    // Check dictionary first
    if (WORD_DICTIONARY[upper]) {
        return WORD_DICTIONARY[upper].split(' ');
    }

    // Apply letter rules
    const phonemes = [];
    let i = 0;

    while (i < upper.length) {
        let matched = false;

        // Try matching longer patterns first
        for (let len = 3; len >= 1; len--) {
            if (i + len <= upper.length) {
                const pattern = upper.substring(i, i + len);
                if (LETTER_RULES[pattern] !== undefined) {
                    const result = LETTER_RULES[pattern];
                    if (result) {
                        phonemes.push(...result.split(' ').filter(p => p));
                    }
                    i += len;
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            // Skip unknown characters
            i++;
        }
    }

    return phonemes;
}

/**
 * Convert text to phoneme sequence
 * @param {string} text - Input text (plain English or /phoneme notation/)
 * @returns {string[]} - Array of phoneme codes
 */
function textToPhonemes(text) {
    // Check for direct phoneme notation
    if (isPhonemeNotation(text)) {
        return parsePhonemeNotation(text);
    }

    const phonemes = [];

    // Split into words and punctuation
    const tokens = text.match(/[\w']+|[.,!?;:\s]/g) || [];

    for (const token of tokens) {
        if (/^\s+$/.test(token)) {
            // Whitespace - add short pause
            phonemes.push(' ');
        } else if (/^[.,!?;:]$/.test(token)) {
            // Punctuation - add appropriate pause
            if (token === '.' || token === '!' || token === '?') {
                phonemes.push('.');
            } else {
                phonemes.push(',');
            }
        } else {
            // Word - convert to phonemes
            const wordPhonemes = wordToPhonemes(token);
            phonemes.push(...wordPhonemes);
        }
    }

    return phonemes;
}

/**
 * Convert text to LPC frames for synthesis
 * @param {string} text - Input text
 * @returns {Object[]} - Array of LPC frame objects
 */
function textToFrames(text) {
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

/**
 * Get the phoneme sequence for display
 * @param {string} text - Input text
 * @returns {string} - Phoneme string (e.g., "HH EH L OW")
 */
function getPhonemeString(text) {
    return textToPhonemes(text).join(' ');
}

module.exports = {
    textToPhonemes,
    textToFrames,
    getPhonemeString,
    isPhonemeNotation,
    parsePhonemeNotation,
    wordToPhonemes,
    WORD_DICTIONARY,
    LETTER_RULES
};
