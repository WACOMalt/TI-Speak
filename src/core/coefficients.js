/**
 * TMS5220 Coefficient Lookup Tables
 * 
 * These tables are extracted from the MAME emulator source code and represent
 * the exact values programmed into the TMS5220 chip's internal ROM.
 * 
 * Based on: MAME tms5110r.hxx (BSD-3-Clause license)
 * Original copyright: Frank Palazzolo, Couriersud, Jonathan Gevaryahu
 */

// Energy table (4 bits, 16 values)
// Index 15 (0xF) is the stop code
const ENERGY_TABLE = [
    0, 1, 2, 3, 4, 6, 8, 11,
    16, 23, 33, 47, 63, 85, 114, 0  // Last 0 is stop code
];

// Pitch table for TMS5220 (6 bits, 64 values)
// Index 0 indicates unvoiced (noise excitation)
const PITCH_TABLE = [
    0, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29,
    30, 31, 32, 33, 34, 35, 36, 37,
    38, 39, 40, 41, 42, 44, 46, 48,
    50, 52, 53, 56, 58, 60, 62, 65,
    68, 70, 72, 76, 78, 80, 84, 86,
    91, 94, 98, 101, 105, 109, 114, 118,
    122, 127, 132, 137, 142, 148, 153, 159
];

// LPC Coefficient Tables (TI_5110_5220_LPC)
// These are the reflection coefficients stored as 10-bit signed values
// scaled by 512 (so divide by 512.0 to get actual coefficient values -1.0 to 1.0)

// K1 table (5 bits, 32 values)
const K1_TABLE = [
    -501, -498, -497, -495, -493, -491, -488, -482,
    -478, -474, -469, -464, -459, -452, -445, -437,
    -412, -380, -339, -288, -227, -158, -81, -1,
    80, 157, 226, 287, 337, 379, 411, 436
];

// K2 table (5 bits, 32 values)
const K2_TABLE = [
    -328, -303, -274, -244, -211, -175, -138, -99,
    -59, -18, 24, 64, 105, 143, 180, 215,
    248, 278, 306, 331, 354, 374, 392, 408,
    422, 435, 445, 455, 463, 470, 476, 506
];

// K3 table (4 bits, 16 values)
const K3_TABLE = [
    -441, -387, -333, -279, -225, -171, -117, -63,
    -9, 45, 98, 152, 206, 260, 314, 368
];

// K4 table (4 bits, 16 values)
const K4_TABLE = [
    -328, -273, -217, -161, -106, -50, 5, 61,
    116, 172, 228, 283, 339, 394, 450, 506
];

// K5 table (4 bits, 16 values)
const K5_TABLE = [
    -328, -282, -235, -189, -142, -96, -50, -3,
    43, 90, 136, 182, 229, 275, 322, 368
];

// K6 table (4 bits, 16 values)
const K6_TABLE = [
    -256, -212, -168, -123, -79, -35, 10, 54,
    98, 143, 187, 232, 276, 320, 365, 409
];

// K7 table (4 bits, 16 values)
const K7_TABLE = [
    -308, -260, -212, -164, -117, -69, -21, 27,
    75, 122, 170, 218, 266, 314, 361, 409
];

// K8 table (3 bits, 8 values)
const K8_TABLE = [
    -256, -161, -66, 29, 124, 219, 314, 409
];

// K9 table (3 bits, 8 values)
const K9_TABLE = [
    -256, -176, -96, -15, 65, 146, 226, 307
];

// K10 table (3 bits, 8 values)
const K10_TABLE = [
    -205, -132, -59, 14, 87, 160, 234, 307
];

// All K tables combined for easy indexing
const K_TABLES = [
    K1_TABLE, K2_TABLE, K3_TABLE, K4_TABLE, K5_TABLE,
    K6_TABLE, K7_TABLE, K8_TABLE, K9_TABLE, K10_TABLE
];

// Bit widths for each K parameter
const K_BITS = [5, 5, 4, 4, 4, 4, 4, 3, 3, 3];

// Chirp table (excitation waveform for voiced sounds)
// This is the TI_LATER_CHIRP table used by TMS5220
const CHIRP_TABLE = [
    0x00, 0x03, 0x0f, 0x28, 0x4c, 0x6c, 0x71, 0x50,
    0x25, 0x26, 0x4c, 0x44, 0x1a, 0x32, 0x3b, 0x13,
    0x37, 0x1a, 0x25, 0x1f, 0x1d, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
];

// Convert chirp to signed values (-128 to 127)
const CHIRP_TABLE_SIGNED = CHIRP_TABLE.map(v => v > 127 ? v - 256 : v);

// Interpolation coefficients (shift values)
// These determine how quickly parameters interpolate between frames
// 8 interpolation periods per frame, values are right-shift amounts
const INTERP_COEFF = [0, 3, 3, 3, 2, 2, 1, 1];

// Sample rate (8 kHz)
const SAMPLE_RATE = 8000;

// Samples per frame (200 samples = 25ms at 8kHz)
const SAMPLES_PER_FRAME = 200;

// Interpolation periods per frame
const INTERP_PERIODS = 8;

// Samples per interpolation period
const SAMPLES_PER_INTERP = SAMPLES_PER_FRAME / INTERP_PERIODS; // 25

module.exports = {
    ENERGY_TABLE,
    PITCH_TABLE,
    K1_TABLE, K2_TABLE, K3_TABLE, K4_TABLE, K5_TABLE,
    K6_TABLE, K7_TABLE, K8_TABLE, K9_TABLE, K10_TABLE,
    K_TABLES,
    K_BITS,
    CHIRP_TABLE,
    CHIRP_TABLE_SIGNED,
    INTERP_COEFF,
    SAMPLE_RATE,
    SAMPLES_PER_FRAME,
    INTERP_PERIODS,
    SAMPLES_PER_INTERP
};
