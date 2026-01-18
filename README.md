# TI-Speak

TI-99/4A TMS5220 Speech Synthesizer Simulator - Experience the iconic robotic voice of the 1980s!

![TI-Speak Screenshot](https://img.shields.io/badge/Status-Online-green?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square) ![Chip](https://img.shields.io/badge/Chip-TMS5220-orange?style=flat-square)

## 🌐 [Live Demo](https://wacomalt.github.io/TI-Speak)

## About

This is a **chip-level accurate emulator** of the Texas Instruments TMS5220 speech synthesizer chip used in the TI-99/4A Speech Synthesizer module (1979-1983). It faithfully recreates the distinctive robotic voice using **Linear Predictive Coding (LPC)** synthesis.

The simulator runs entirely in your browser using client-side JavaScript, with NO backend server required.

## Features

- 🎤 **Authentic TMS5220 Emulation** - Exact coefficient tables from MAME emulator
- 🔊 **8 kHz Sample Rate** - Matching original hardware specifications
- 🎯 **40 Hz Frame Rate** - With 8-step interpolation per frame
- 📝 **Text-to-Speech** - Type English text to hear it spoken
- 🔤 **Phoneme Notation** - Direct control with `/HH EH L OW/` syntax
- 💾 **WAV Download** - Save generated speech as audio files
- 🖥️ **Retro UI** - Faithful TI-99/4A aesthetic with CRT effects
- 🚀 **Static Site** - Runs offline or on any static host

## Installation / Development

To run the project locally:

```bash
# Clone the repository
git clone https://github.com/WACOMalt/TI-Speak.git
cd TI-Speak

# Install dependencies needed for local dev server
npm install

# Start the local static server
npx serve public
```

Then open **http://localhost:3000** in your browser.

## Usage

### Web Interface

1. Type text in the input box
2. Click **SPEAK** to hear the robotic TI-99/4A voice
3. Click **DOWNLOAD WAV** to save the audio

### Phoneme Notation

For precise control, use direct phoneme sequences:
```
/HH EH L OW W ER L D/
```

## Technical Details

### Architecture

The project was originally designed with a Node.js backend but has been migrated to a fully static client-side architecture.
- **core/**: Contains the TMS5220 emulator and coefficients (ES Modules)
- **speech/**: Text-to-phoneme conversion and frame decoding
- **public/**: The web interface and entry point

### LPC Synthesis Parameters

The TMS5220 uses 12 parameters per frame:
- **Energy** (4 bits) - Volume level
- **Pitch** (6 bits) - Fundamental frequency  
- **K1-K10** (3-5 bits each) - Reflection coefficients for vocal tract modeling

## References

- [Thierry Nouspikel's TI-99/4A Tech Pages](https://www.unige.ch/medecine/nouspikel/ti99/speech.htm) - Comprehensive TMS5220 documentation
- [MAME TMS5220 Emulator](https://github.com/mamedev/mame/blob/master/src/devices/sound/tms5220.cpp) - Reference implementation
- Texas Instruments TMS5220 Data Manual

## License

MIT License - Feel free to use, modify, and distribute.

## Acknowledgments

- Coefficient tables derived from MAME project (BSD-3-Clause)
- Technical documentation by Thierry Nouspikel
- Original TMS5220 chip designed by Texas Instruments

---

*Not affiliated with Texas Instruments. This is a fan project celebrating retro computing history.*
