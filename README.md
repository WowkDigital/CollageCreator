# CollageCreator Pro 2.0 🖼️⚡

> High-Performance 2D Bin Packing Photo Collage Generator with 100% Gapless Optimization Engine.

![CollageCreator Pro](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Performance](https://img.shields.io/badge/Performance-Gapless%202D%20Packing-orange.svg)

---

## 🌟 Features

- **⚡ Fast 2D Bin Packing Engine**: Uses preallocated flat `Uint8Array` grid buffers for high-speed, zero-allocation layout computation.
- **🎯 100% Gapless Optimization**: Hill-climbing simulated search with local minimum escape kicks (`stagnantCount` re-heating) that closes all holes in grid layouts.
- **⏱️ Early Exit & Deadline Caps**: Capped at 10,000 iterations or a strict 2-second time deadline per render pass to guarantee zero UI lag.
- **📸 Multi-Format Image Converter**: In-browser client-side image converter supporting RAW (ARW), JPEG, PNG, and WebP formats.
- **🌍 Full English Interface & Codebase**: Clean, modular vanilla JS architecture without heavy external frameworks.

---

## 📁 Project Structure

```text
CollageCreator/
├── css/                   # Vanilla CSS Design System & UI Styles
│   ├── main.css           # Core app layout, glassmorphism & controls
│   └── converter.css      # Image converter interface styling
├── js/                    # Core Client Runtime Modules
│   ├── arw-processor.js   # Client-side RAW ARW decoder worker
│   ├── bin-packing.js     # 2D Bin Packing Solver & Simulated Search Engine
│   ├── collage.js         # Canvas rendering engine & image layout exporter
│   ├── config.js          # App settings & default parameters
│   ├── converter.js       # Converter UI controller & batch manager
│   ├── main.js            # Main application controller & event routing
│   ├── ui.js              # UI updates, toasts, modal dialogs & previews
│   └── utils.js           # Helper utilities & aspect ratio calculators
├── tests/                 # Automated Performance Benchmark Suite
│   ├── benchmark.js       # Standalone CLI JPEG metadata probe & batch benchmark
│   ├── run_large_benchmark.js # Large-scale synthetic test suite (50 - 150 photos)
│   ├── test_annealing.js  # 20-trial local minimum escape consistency test
│   ├── test_iterations.js # Iteration cap comparison (1k vs 10k vs 100k)
│   └── test_mod_gapless.js# Module width breakdown test (Mod 15 - Mod 20)
├── index.html             # Main 2D Bin Packing Collage Creator UI
├── converter.html         # Batch Image Converter Page
├── package.json           # Node.js configuration & test scripts
└── LICENSE                # MIT License
```

---

## 🚀 Running Locally

### Option 1: Using Python HTTP Server (Recommended)
```bash
npm start
```
Then open `http://localhost:8085` in your browser.

### Option 2: Using Node.js / Any Local Static Server
```bash
npx serve ./
```

---

## 🧪 Automated Benchmarks & Testing

Run the included automated benchmark suite to verify layout search speed and gapless optimization:

### 1. Default Directory Benchmark (50, 30, 10 Images)
```bash
npm test
```

### 2. Large-Scale Synthetic Benchmark (50 to 150 Images with Gaussian Distribution)
```bash
npm run test:large
```

### 3. Local Minimum Escape Consistency Test (20 Trials)
```bash
npm run test:annealing
```

### 4. Grid Module Breakdown Test (Mod 15 - Mod 20)
```bash
npm run test:mods
```

---

## 📊 Benchmark Results Summary

| Photo Count ($N$) | Avg Optimization Time | Gapless Success Rate | Dominant Grid Width |
|---|---|---|---|
| **10 photos** | ~45.9 ms | **100% (Gapless)** | 6 modules |
| **30 photos** | ~145.2 ms | **100% (Gapless)** | 12 modules |
| **50 photos** | ~306.5 ms | **100% (Gapless)** | 17-18 modules |
| **100 photos** | ~810.8 ms | **100% (Gapless)** | 19-20 modules |
| **150 photos** | ~2533.4 ms | **100% (Gapless)** | 20 modules |

---

## 📄 License

This project is licensed under the **MIT License**.
