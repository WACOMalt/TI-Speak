/**
 * LPC Lattice Filter
 * 
 * Implements the 10-stage lattice filter used in the TMS5220 speech synthesizer.
 * The lattice filter takes an excitation signal (voiced or unvoiced) and shapes
 * it using reflection coefficients (K1-K10) to model the human vocal tract.
 */

class LPCLattice {
    constructor() {
        // Internal state: delay line for the lattice stages
        // We need 11 delay elements (input + 10 stages)
        this.delay = new Array(11).fill(0);
    }

    /**
     * Reset the lattice filter state
     */
    reset() {
        this.delay.fill(0);
    }

    /**
     * Process one sample through the lattice filter
     * 
     * @param {number} excitation - Input excitation signal (from signal generator)
     * @param {number} energy - Current energy level (0-127 scaled)
     * @param {number[]} k - Array of 10 reflection coefficients (K1-K10), scaled -512 to 512
     * @returns {number} - Output sample
     */
    process(excitation, energy, k) {
        // The lattice filter implements the following structure:
        // 
        //  excitation ──┬──[+]──┬──[+]──┬── ... ──┬──[+]── output
        //               │       │       │         │
        //               │  k1   │  k2   │         │  k10
        //               │       │       │         │
        //              [z⁻¹]   [z⁻¹]   [z⁻¹]     [z⁻¹]
        //               │       │       │         │
        //               └──[×]──┴──[×]──┴── ... ──┴──[×]──
        //
        // The reflection coefficients are divided by 512 to normalize to -1..1 range

        // Scale excitation by energy
        // Energy is already decoded from the table, scale it appropriately
        let u = excitation * energy;

        // Forward path through the lattice (from k10 to k1)
        // We process backwards because the lattice filter topology
        // requires us to update delays from the end

        // First, compute the new delay values from the bottom up
        let newDelay = new Array(11);
        newDelay[10] = this.delay[9]; // Last delay is just shifted

        // Process each stage from k10 down to k1
        for (let i = 9; i >= 0; i--) {
            // Reflection coefficient normalized to -1..1
            const ki = k[i] / 512.0;

            // Lattice equations:
            // y[i] = y[i+1] + k[i] * x[i]
            // x[i-1] = x[i] + k[i] * y[i]

            // Where y is the backward path and x is the forward path
            // For TMS5220, the structure is slightly different - it uses
            // a reversed order processing
        }

        // TMS5220-specific lattice implementation
        // Based on MAME's implementation
        let y = 0;

        // Process stages from k10 down to k1
        for (let i = 9; i >= 0; i--) {
            const ki = k[i] / 512.0;

            // Calculate output of this stage
            const stageOut = u - ki * this.delay[i];

            // Update delay for next sample
            this.delay[i + 1] = this.delay[i] + ki * stageOut;

            // Pass to next stage
            u = stageOut;
        }

        // Store input in first delay
        this.delay[0] = u;

        // Output is the final stage result
        y = u;

        // Clip output to 14-bit signed range (TMS5220 internal precision)
        // Then reduce to 8-bit for audio output
        y = Math.max(-8192, Math.min(8191, Math.round(y)));

        return y;
    }

    /**
     * Simpler, more accurate TMS5220 lattice implementation
     * Based on actual chip behavior from MAME
     * 
     * @param {number} excitation - Input excitation signal
     * @param {number} energy - Energy level
     * @param {number[]} k - Array of 10 K coefficients (raw table values, -512 to 512)
     * @returns {number} - Output sample (14-bit range)
     */
    processTMS5220(excitation, energy, k) {
        // TMS5220 uses a specific lattice structure with 10 stages
        // Energy is applied to the excitation at the input

        // Scale excitation by energy (energy table values are 0-114)
        let y = excitation * energy;

        // 10-stage lattice filter, processing from K10 to K1
        // This matches the actual chip architecture
        for (let i = 9; i >= 0; i--) {
            // Get reflection coefficient and scale to -1..1 range
            // K values are stored as -512 to +512 (scaled by 512)
            const ki = k[i] / 512.0;

            // Forward path
            const temp = y - ki * this.delay[i];

            // Feedback path (update delay)
            this.delay[i] = this.delay[i] + ki * temp;

            // Move to next stage
            y = temp;
        }

        // Shift delay line for next sample
        for (let i = 9; i >= 1; i--) {
            this.delay[i] = this.delay[i - 1];
        }
        this.delay[0] = y;

        // Clamp to 14-bit signed range
        return Math.max(-8192, Math.min(8191, Math.round(y)));
    }
}

module.exports = LPCLattice;
