# TI-Speak

TI-99/4A TMS5220 Speech Synthesizer Simulator - Experience the iconic robotic voice of the 1980s!

![TI-Speak Screenshot](https://img.shields.io/badge/Port-7199-orange?style=flat-square) ![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## About

This is a **chip-level accurate emulator** of the Texas Instruments TMS5220 speech synthesizer chip used in the TI-99/4A Speech Synthesizer module (1979-1983). It faithfully recreates the distinctive robotic voice using **Linear Predictive Coding (LPC)** synthesis.

## Features

- 🎤 **Authentic TMS5220 Emulation** - Exact coefficient tables from MAME emulator
- 🔊 **8 kHz Sample Rate** - Matching original hardware specifications
- 🎯 **40 Hz Frame Rate** - With 8-step interpolation per frame
- 📝 **Text-to-Speech** - Type English text to hear it spoken
- 🔤 **Phoneme Notation** - Direct control with `/HH EH L OW/` syntax
- 💾 **WAV Download** - Save generated speech as audio files
- 🖥️ **Retro UI** - Faithful TI-99/4A aesthetic with CRT effects

## Installation

```bash
# Clone the repository
git clone https://github.com/WACOMalt/TI-Speak.git
cd TI-Speak

# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:7199** in your browser (7199 = leetspeak for TI99!)

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

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/speak` | POST | Text-to-speech, returns WAV |
| `/api/phonemes/speak` | POST | Phoneme array to speech |
| `/api/synthesize` | POST | Direct LPC frame synthesis |
| `/api/parse` | POST | Text to phoneme conversion |
| `/api/phonemes` | GET | List all phonemes |
| `/api/info` | GET | Synthesizer info |

### Example API Call

```bash
curl -X POST http://localhost:7199/api/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}' \
  --output speech.wav
```

## Technical Details

### LPC Synthesis Parameters

The TMS5220 uses 12 parameters per frame:
- **Energy** (4 bits) - Volume level
- **Pitch** (6 bits) - Fundamental frequency  
- **K1-K10** (3-5 bits each) - Reflection coefficients for vocal tract modeling

### Project Structure

```
TI-Speak/
├── package.json
├── src/
│   ├── server.js              # Express web server
│   ├── core/
│   │   ├── coefficients.js    # LPC lookup tables
│   │   ├── tms5220.js         # Main chip emulator
│   │   └── lpc-lattice.js     # Lattice filter
│   └── speech/
│       ├── frame-decoder.js   # Frame parsing
│       ├── phonemes.js        # Allophone library
│       └── text-to-phoneme.js # Text conversion
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

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
