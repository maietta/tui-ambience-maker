# Omarchy Theme TUI

A terminal user interface application for generating Omarchy themes from images. Inspired by https://theme.no-signal.uk/

## Motivation & Context

This project started as a vibe-coding experiment to replicate the functionality of the [Omarchy Theme Generator](https://theme.no-signal.uk/) web app, but as a standalone TUI tool.

**However, there's a bigger picture here:**

I'm working on a larger project that builds upon Omarchy's beautiful, opinionated configuration approach, but with a heavy emphasis on **container and VM-based isolation** for all applications and services - similar to [Qubes OS](https://www.qubes-os.org/). Think of it as Omarchy's aesthetic meets Qubes' security model.

This theme generator utility will be a nice addition to that ecosystem, allowing users to easily create cohesive visual themes that work across isolated environments. Right now, this is a **proof of concept and work in progress** - expect things to break, change, or occasionally achieve sentience and judge your wallpaper choices.

Stay tuned for the bigger project... or don't. Either way, enjoy generating pretty colors!

## Features

- 🎨 Generate themes from any image
- 🖼️ Process multiple images at once
- 🎯 Multiple color strategies (Dominant, Vibrant, Muted, Pastel, Harmonic)
- 🌓 Dark and light mode support
- 🎭 Real-time TUI preview
- 📦 Export to Omarchy theme format (zip or direct install)
- 🔧 OKLCH perceptual color space
- 🎨 6 ANSI color slot mapping with bright variants
- 🪟 Desktop preview mockup
- 🖼️ ASCII image preview in file browser
- 🚀 Standalone binary - no dependencies needed!

## Quick Start (Binary)

Download the latest release for your platform:

| Platform | Stable | Nightly |
|----------|--------|---------|
| Linux x64 | [Download](https://github.com/maietta/tui-ambience-maker/releases/latest) | [Download](https://github.com/maietta/tui-ambience-maker/releases/tag/nightly) |
| Windows x64 | [Download](https://github.com/maietta/tui-ambience-maker/releases/latest) | [Download](https://github.com/maietta/tui-ambience-maker/releases/tag/nightly) |
| macOS ARM64 | [Download](https://github.com/maietta/tui-ambience-maker/releases/latest) | [Download](https://github.com/maietta/tui-ambience-maker/releases/tag/nightly) |
| macOS x64 | [Download](https://github.com/maietta/tui-ambience-maker/releases/latest) | [Download](https://github.com/maietta/tui-ambience-maker/releases/tag/nightly) |

### Installation

```bash
# Download and extract
tar xzf omarchy-theme-tui-linux.tar.gz  # Linux/macOS
# or unzip omarchy-theme-tui-windows.zip  # Windows

# Run directly
./omarchy-theme-tui

# Or install system-wide
./install.sh
```

**⚠️ Important:** The `yoga.wasm` file must be in the same directory as the binary.

## Usage

### Interactive TUI Mode

```bash
# Run the TUI application
./omarchy-theme-tui
```

The TUI provides an interactive interface where you can:
- Browse for images with ASCII preview
- Select color strategies
- Choose dark/light mode
- Toggle rounded corners and transparency
- See live desktop mockup preview
- Export or install themes directly

**Keyboard Shortcuts:**
- `i` - Browse for images
- `s` - Change strategy
- `m` - Change mode (dark/light/auto)
- `w` - Walker size
- `r` - Regenerate (cycle hue variations 1-9)
- `e` - Export to zip
- `I` - Install directly to Omarchy
- `n` - Change theme name
- `c` - Toggle rounded corners
- `t` - Toggle transparency
- `C` - Clear all images
- `q` / `Esc` - Quit

### Command Line Mode

```bash
# Generate a theme from an image
./omarchy-theme-tui generate /path/to/wallpaper.jpg

# With options
./omarchy-theme-tui generate image1.jpg image2.jpg \
  --name "my-theme" \
  --strategy vibrant \
  --mode dark \
  --rounded \
  --transparency \
  --walker-size medium

# Install directly to Omarchy
./omarchy-theme-tui generate wallpaper.jpg --install

# Preview only (no export)
./omarchy-theme-tui preview wallpaper.jpg --strategy analogous
```

## Color Strategies

### Image-based Strategies

These respect the image's actual colors:

- **Dominant**: Pure frequency - the most common colors rise to the top. Balanced and neutral.
- **Vibrant**: Heavy chroma bias - vivid patches punch above their frequency weight.
- **Muted**: Anti-chroma bias - prefer neutral tones for a soft feel.
- **Pastel**: Light + moderate - prefers bright regions, enforces soft desaturated lightness.

### Harmonic Strategies

These use classical color theory anchored to the image's dominant hue:

- **Monochrome**: Every ANSI slot derived from one dominant hue with small rotations.
- **Analogous**: All 6 ANSI slots within ~90° of the dominant hue.
- **Triadic**: Three hues 120° apart on the color wheel.
- **Split-complementary**: Dominant + two hues adjacent to its complement.
- **Complementary**: Dominant + opposite on the color wheel.

## How It Works

1. **Pixel Quantization**: Images are scaled to 256px and colors are bucketed into 5-bit per channel
2. **Multi-image Harmonization**: Multiple images contribute equally regardless of size
3. **OKLCH Color Space**: Perceptually uniform color math (like Material You)
4. **Gamut Mapping**: Colors kept within sRGB displayable range with binary search
5. **Strategy-aware Sampling**: Different weight functions for each strategy
6. **ANSI Target Hues**: 6 target angles (red 29°, yellow 85°, green 150°, cyan 200°, blue 255°, magenta 325°)
7. **Bright Variants**: Generated by boosting OKLCH L by 0.08 perceptually

## Installation to Omarchy

After generating a theme:

```bash
# Method 1: Export to zip, then install
./omarchy-theme-tui generate wallpaper.jpg -o ~/Downloads/my-theme.zip
unzip -o ~/Downloads/my-theme.zip -d ~/.config/omarchy/themes/
omarchy-theme-set "my-theme"

# Method 2: Direct install
./omarchy-theme-tui generate wallpaper.jpg --install
omarchy-theme-set "my-theme"
```

## Building from Source

### Prerequisites
- [Bun](https://bun.sh) (for building)
- [Node.js](https://nodejs.org) 20+ (for development)

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd omarchy-theme-tui

# Install dependencies
npm install --legacy-peer-deps

# Build TypeScript
npm run build

# Run in development mode
bun src/index.ts
```

### Building Binary

```bash
# Build TypeScript first
npm run build

# Build standalone binary
bun build dist/index.ts --compile --outfile omarchy-theme-tui

# Copy required WASM file
cp node_modules/yoga-wasm-web/dist/yoga.wasm .

# Package for distribution
tar czf omarchy-theme-tui-linux.tar.gz omarchy-theme-tui yoga.wasm
```

### Cross-compilation

```bash
# Build for different platforms
bun build dist/index.ts --compile --target=bun-linux-x64 --outfile omarchy-theme-tui-linux
bun build dist/index.ts --compile --target=bun-windows-x64 --outfile omarchy-theme-tui.exe
bun build dist/index.ts --compile --target=bun-darwin-arm64 --outfile omarchy-theme-tui-macos
```

## Project Structure

```
src/
├── color/              # Color space utilities
│   ├── oklch.ts       # OKLCH color space implementation
│   ├── quantization.ts # Color bucket extraction
│   └── index.ts       # Re-exports
├── theme/              # Theme generation
│   ├── strategies.ts   # Color strategy implementations
│   ├── generator.ts    # Theme generation and export
│   └── index.ts        # Re-exports
├── ui/                 # TUI application
│   └── app.tsx         # Ink-based TUI with modals
├── utils/              # Utilities
│   ├── image.ts        # Image processing (jimp - pure JS)
│   └── export.ts       # Theme export functions
├── yoga-shim.ts        # WASM embedding for compiled binary
├── cli.ts              # Command-line interface
└── index.ts            # Entry point

.github/workflows/      # GitHub Actions
├── ci.yml             # Build and test on PR/push
├── nightly.yml        # Nightly builds (unstable)
└── release.yml        # Stable releases
```

## Automated Builds

This project uses GitHub Actions to automatically build and release binaries:

### Stable Releases
- **Trigger**: Git tags (e.g., `v1.2.3`)
- **Frequency**: Manual, when ready
- **Quality**: Production-ready, tested
- **Download**: [Latest Stable](https://github.com/maietta/tui-ambience-maker/releases/latest)

### Nightly Builds
- **Trigger**: Every push to `main` + daily at 2 AM UTC
- **Frequency**: Automatic, continuous
- **Quality**: Development, may have bugs
- **Download**: [Nightly Build](https://github.com/maietta/tui-ambience-maker/releases/tag/nightly)

### Creating a Release

```bash
# Create stable release
git tag v1.0.0
git push origin v1.0.0

# Nightly builds happen automatically on every push to main!
```

## Dependencies

### Runtime Dependencies
- **ink**: React-based TUI library
- **jimp**: Pure JavaScript image processing (no native dependencies!)
- **jszip**: ZIP file generation
- **commander**: CLI argument parsing
- **react**: UI framework

### Build Dependencies
- **bun**: JavaScript runtime and bundler
- **typescript**: Type checking
- **yoga-wasm-web**: Layout engine (WASM file required at runtime)

## Generated Theme Structure

```
~/.config/omarchy/themes/<theme-name>/
├── colors.toml          # Main color definitions
├── hyprland.conf        # Window styling overrides (optional)
└── backgrounds/         # Wallpaper images
    ├── background-1.jpg
    └── ...
```

### Example colors.toml

```toml
[colors]
background = "#1a1b26"
panel_background = "#24283b"
foreground = "#a9b1d6"
accent = "#7aa2f7"
cursor = "#c0caf5"
selection_background = "#7aa2f7"
selection_foreground = "#c0caf5"
color0 = "#32344a"
color1 = "#f7768e"
color2 = "#9ece6a"
# ... color3-color15
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

CI will automatically build and test your changes. Merges to `main` trigger nightly builds.

## Disclaimer / About

**⚠️ WARNING:** This application was built with significant assistance from AI ([OpenCode](https://github.com/anomalyco/opencode), in case you're wondering). As with all AI-generated code, there is a small but non-zero chance that running this software will:

- 🔥 Cause your computer to spontaneously combust
- 💥 Delete your entire home directory while quoting Nietzsche
- 🤖 Achieve sentience and judge your choice of desktop wallpaper
- 💼 Get you fired from your job

**Just kidding... you probably don't have a job anyway.** (We're developers, we live in basements and survive on energy drinks and hope)

But seriously:
- AI helped write this code, but humans reviewed it (allegedly)
- It *shouldn't* destroy your system, but stranger things have happened
- If your house burns down, that's between you and your insurance company
- We accept no liability for existential crises caused by ugly theme generation

Use at your own risk. Or don't. We're not your supervisor.

## License

MIT

## Acknowledgments

Inspired by https://theme.no-signal.uk/ - the web-based Omarchy theme generator.
Uses OKLCH color space (by Björn Ottosson) for perceptually uniform color math.
Built with [Ink](https://github.com/vadimdemedes/ink) for the TUI.
Compiled to standalone binaries using [Bun](https://bun.sh).
