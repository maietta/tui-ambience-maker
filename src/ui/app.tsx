/**
 * Main TUI application using Ink - Modal overlay with file picker
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp, render, useStdout } from 'ink';
import { processImages } from '../utils/image.js';
import { 
  extractDominantColors, 
  normalizeMultiImageBuckets, 
  detectMode,
  ColorBucket,
} from '../color/index.js';
import { 
  generateTheme, 
  ThemeConfig, 
  StrategyType,
  generateInstallCommand,
} from '../theme/index.js';
import { exportThemeToZip, exportThemeToOmarchy } from '../utils/export.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import asciify from 'asciify-image';

const STRATEGIES: { label: string; value: StrategyType }[] = [
  { label: 'Dominant - Pure frequency', value: 'dominant' },
  { label: 'Vibrant - Heavy chroma bias', value: 'vibrant' },
  { label: 'Muted - Anti-chroma bias', value: 'muted' },
  { label: 'Pastel - Light and soft', value: 'pastel' },
  { label: 'Monochrome - Single hue', value: 'monochrome' },
  { label: 'Analogous - Within 90°', value: 'analogous' },
  { label: 'Triadic - 120° apart', value: 'triadic' },
  { label: 'Split-complementary', value: 'split-complementary' },
  { label: 'Complementary - Opposite', value: 'complementary' },
];

const MODES = [
  { label: 'Auto', value: 'auto' },
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];

const WALKER_SIZES = [
  { label: 'Small (14px)', value: 'small' },
  { label: 'Medium (18px)', value: 'medium' },
  { label: 'Large (22px)', value: 'large' },
];

type View = 'main' | 'file-picker' | 'name-input' | 'strategy' | 'mode' | 'walker-size' | 'export' | 'installing';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Compact inline modal that overlays on the main content
function InlineModal({ 
  title, 
  children, 
  height = 20,
  width = 80,
}: { 
  title: string; 
  children: React.ReactNode; 
  height?: number;
  width?: number;
}) {
  return (
    <Box 
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      height={height}
      width={width}
      paddingX={1}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {children}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Escape to close</Text>
      </Box>
    </Box>
  );
}

// File Browser Component
function FileBrowser({ 
  initialPath,
  onSelect,
  onCancel,
}: { 
  initialPath: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load directory contents
  useEffect(() => {
    const loadDir = async () => {
      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        const entries: FileEntry[] = [];

        // Add parent directory
        const parent = path.dirname(currentPath);
        if (parent !== currentPath) {
          entries.push({
            name: '..',
            path: parent,
            isDirectory: true,
          });
        }

        // Sort: directories first, then files
        const dirs = items.filter(d => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
        const files = items
          .filter(d => !d.isDirectory())
          .filter(d => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(d.name))
          .sort((a, b) => a.name.localeCompare(b.name));

        entries.push(...dirs.map(d => ({
          name: d.name + '/',
          path: path.join(currentPath, d.name),
          isDirectory: true,
        })));

        entries.push(...files.map(d => ({
          name: d.name,
          path: path.join(currentPath, d.name),
          isDirectory: false,
        })));

        setEntries(entries);
        setSelectedIndex(0);
      } catch (err) {
        setEntries([{ name: '..', path: path.dirname(currentPath), isDirectory: true }]);
      }
    };

    loadDir();
  }, [currentPath]);

  // Generate ASCII preview when selection changes
  useEffect(() => {
    const generatePreview = async () => {
      const selected = entries[selectedIndex];
      if (selected && !selected.isDirectory) {
        try {
          const ascii = await asciify(selected.path, {
            fit: 'box',
            width: 28,
            height: 12,
            color: false, // Disable ANSI colors for better Ink compatibility
            format: 'string',
          });
          setImagePreview(ascii as string);
        } catch (err) {
          setImagePreview(`Error: ${err instanceof Error ? err.message : 'Failed to load'}`);
        }
      } else {
        setImagePreview(null);
      }
    };

    generatePreview();
  }, [selectedIndex, entries]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => Math.min(entries.length - 1, i + 1));
    } else if (key.return) {
      const selected = entries[selectedIndex];
      if (selected) {
        if (selected.isDirectory) {
          setCurrentPath(selected.path);
        } else {
          onSelect(selected.path);
        }
      }
    } else if (input === ' ') {
      // Space to select multiple files (would need multi-select logic)
      const selected = entries[selectedIndex];
      if (selected && !selected.isDirectory) {
        onSelect(selected.path);
      }
    }
  });

  return (
    <InlineModal title={`File Browser: ${currentPath.replace(os.homedir(), '~')}`} height={20} width={78}>
      <Box flexDirection="row" gap={1}>
        {/* File List */}
        <Box flexDirection="column" width={42}>
          <Box flexDirection="column" overflow="hidden" height={13}>
            {entries.map((entry, index) => (
              <Box key={entry.path}>
                <Text 
                  color={index === selectedIndex ? 'cyan' : entry.isDirectory ? 'blue' : undefined}
                  backgroundColor={index === selectedIndex ? '#2a2f3e' : undefined}
                  bold={index === selectedIndex}
                >
                  {index === selectedIndex ? '▶ ' : '  '}
                  {entry.isDirectory ? '📁 ' : '🖼️ '}
                  {entry.name.length > 34 ? entry.name.slice(0, 31) + '...' : entry.name}
                </Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>↑↓ navigate | Enter select | Esc back | Space select</Text>
          </Box>
        </Box>

        {/* Preview Panel */}
        <Box 
          flexDirection="column" 
          borderStyle="single" 
          borderColor="gray"
          paddingX={1}
          width={32}
          height={15}
        >
          <Text bold dimColor>Preview</Text>
          {imagePreview ? (
            <Box marginTop={1} flexDirection="column" overflow="hidden">
              {imagePreview.split('\n').slice(0, 11).map((line, i) => (
                <Text key={i}>{line.slice(0, 30)}</Text>
              ))}
            </Box>
          ) : (
            <Box marginTop={1}>
              <Text dimColor italic>
                {entries[selectedIndex]?.isDirectory 
                  ? 'Directory' 
                  : 'Select an image to preview'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </InlineModal>
  );
}

// Selection List Component
function SelectionList<T extends { label: string; value: string }>({
  items,
  selectedIndex,
}: {
  items: T[];
  selectedIndex: number;
}) {
  return (
    <Box flexDirection="column" overflow="hidden">
      {items.map((item, index) => (
        <Box key={item.value}>
          <Text 
            color={index === selectedIndex ? 'cyan' : undefined}
            backgroundColor={index === selectedIndex ? '#2a2f3e' : undefined}
            bold={index === selectedIndex}
          >
            {index === selectedIndex ? '▶ ' : '  '}
            {item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// Main Panel Component
function MainPanel({ 
  imagePaths, 
  options, 
  theme, 
  isProcessing, 
  error,
}: { 
  imagePaths: string[];
  options: any;
  theme: ThemeConfig | null;
  isProcessing: boolean;
  error: string | null;
}) {
  const { stdout } = useStdout();
  const height = (stdout?.rows || 24) - 4; // Leave room for shortcuts

  return (
    <Box 
      flexDirection="column" 
      height={height}
      paddingX={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan" backgroundColor="#1a1b26">
          {' '} Omarchy Theme Generator {' '}
        </Text>
        <Text dimColor> - Drop images to generate themes</Text>
      </Box>

      <Box flexDirection="row" gap={2} flexGrow={1}>
        {/* Left panel - Images & Options */}
        <Box flexDirection="column" width={35} gap={1}>
          {/* Images Box */}
          <Box 
            flexDirection="column" 
            borderStyle="single" 
            borderColor={imagePaths.length > 0 ? "green" : "gray"}
            paddingX={1}
            height={Math.min(10, 5 + imagePaths.length)}
            flexGrow={imagePaths.length > 0 ? 1 : 0}
          >
            <Text bold>Images ({imagePaths.length})</Text>
            <Box flexDirection="column" overflow="hidden">
              {imagePaths.length === 0 ? (
                <Text dimColor italic>Press i to browse for images</Text>
              ) : (
                imagePaths.slice(0, 6).map((p, i) => (
                  <Text key={i}>{i + 1}. {path.basename(p).slice(0, 28)}</Text>
                ))
              )}
              {imagePaths.length > 6 && (
                <Text dimColor>...and {imagePaths.length - 6} more</Text>
              )}
            </Box>
          </Box>

          {/* Options Box */}
          <Box 
            flexDirection="column" 
            borderStyle="single" 
            borderColor="gray"
            paddingX={1}
            flexGrow={1}
          >
            <Text bold>Configuration</Text>
            <Box marginY={1} flexDirection="column">
              <OptionRow label="Strategy" value={options.strategy} />
              <OptionRow label="Mode" value={options.mode} />
              <OptionRow label="Walker" value={options.walker_size} />
              <OptionRow label="Rounded" value={options.rounded_corners ? '✓' : '✗'} />
              <OptionRow label="Transparent" value={options.transparency ? '✓' : '✗'} />
            </Box>
          </Box>
        </Box>

        {/* Right panel - Theme Preview */}
        <Box flexDirection="column" flexGrow={1} gap={1}>
          {/* Theme Header */}
          <Box 
            borderStyle="single" 
            borderColor="cyan"
            paddingX={1}
            height={3}
          >
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold>{options.themeName}</Text>
              {theme && (
                <Text dimColor>
                  {theme.mode} | r{options.rotationIndex + 1}/9
                </Text>
              )}
            </Box>
            {isProcessing && (
              <Text color="yellow">Processing images...</Text>
            )}
          </Box>

          {/* Theme Preview - Desktop Mockup in upper right */}
          {theme && (
            <Box flexDirection="column" gap={1}>
              {/* Desktop Mockup */}
              <DesktopMockup 
                theme={theme} 
                rounded={options.rounded_corners}
                transparency={options.transparency}
              />
              
              {/* Color Summary */}
              <Box 
                flexDirection="column" 
                borderStyle="single"
                borderColor="gray"
                paddingX={1}
                flexGrow={1}
              >
                <Text bold>Colors</Text>
                <Box marginY={1}>
                  <ColorRow label="Bg" hex={theme.colors.background} />
                  <ColorRow label="Panel" hex={theme.colors.panel_background} />
                  <ColorRow label="Fg" hex={theme.colors.foreground} />
                  <ColorRow label="Accent" hex={theme.colors.accent} highlight />
                </Box>
                
                {/* ANSI Palette */}
                <Box marginTop={1}>
                  <Text dimColor>Palette:</Text>
                  <Box marginY={1}>
                    <PaletteRow 
                      colors={[
                        theme.colors.color0, theme.colors.color1, theme.colors.color2, 
                        theme.colors.color3, theme.colors.color4, theme.colors.color5,
                        theme.colors.color6, theme.colors.color7
                      ]} 
                    />
                    <Box marginTop={1}>
                      <PaletteRow 
                        colors={[
                          theme.colors.color8, theme.colors.color9, theme.colors.color10,
                          theme.colors.color11, theme.colors.color12, theme.colors.color13,
                          theme.colors.color14, theme.colors.color15
                        ]} 
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Error */}
          {error && (
            <Box borderStyle="single" borderColor="red" paddingX={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Shortcuts */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          i-browse | s-strategy | m-mode | w-walker | r-regenerate | e-export | I-install | n-name | c-rounded | t-transparency | C-clear | q-quit
        </Text>
      </Box>

    </Box>
  );
}

function OptionRow({ label, value }: { label: string; value: string }) {
  return (
    <Box flexDirection="row">
      <Text dimColor>{label.padEnd(12)}:</Text>
      <Text>{value}</Text>
    </Box>
  );
}

function ColorRow({ 
  label, 
  hex, 
  highlight = false 
}: { 
  label: string; 
  hex: string; 
  highlight?: boolean;
}) {
  return (
    <Box flexDirection="row" marginY={0}>
      <Text>{label.padEnd(12)}:</Text>
      <Box><Text backgroundColor={hex}>  </Text></Box>
      <Text> </Text>
      <Text color={highlight ? 'cyan' : undefined} bold={highlight}>{hex}</Text>
    </Box>
  );
}

function PaletteRow({ colors }: { colors: string[] }) {
  return (
    <Box flexDirection="row" gap={0}>
      {colors.map((hex, i) => (
        <Box key={i} width={3} height={1}>
          <Text backgroundColor={hex}>   </Text>
        </Box>
      ))}
    </Box>
  );
}

// Desktop Mockup Preview Component
function DesktopMockup({ 
  theme,
  rounded = false,
  transparency = false,
}: { 
  theme: ThemeConfig;
  rounded?: boolean;
  transparency?: boolean;
}) {
  const c = theme.colors;
  const c0 = c.background;
  const c1 = c.panel_background;
  const c2 = c.foreground;
  const c3 = c.accent;
  
  // Use sharp corners unless rounded option is on
  const borderStyle = rounded ? 'round' : 'single';
  
  return (
    <Box 
      flexDirection="column" 
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      height={18}
    >
      <Text bold>Desktop Preview</Text>
      
      {/* Mock Desktop */}
      <Box 
        flexDirection="column" 
        marginTop={1}
        height={14}
        width={40}
      >
        {/* Waybar - using text background */}
        <Box height={1} width={40}>
          <Text backgroundColor={c1} color={c3}>{' ● '}</Text>
          <Text backgroundColor={c1} color={c2}>{' 1  2  3  4  '}</Text>
          <Text backgroundColor={c1}>{'                                        '}</Text>
          <Text backgroundColor={c1} color={c2}>{'~ ❯ '}</Text>
          <Text backgroundColor={c1}>{'          '}</Text>
          <Text backgroundColor={c1} color={c2}>{'󰕮  󰍛  󰁹'}</Text>
        </Box>

        {/* Desktop Area with Terminal */}
        <Box flexDirection="column" flexGrow={1}>
          {/* Background fill rows */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Box key={i} height={1} width={40}>
              <Text backgroundColor={c0}>{'                                        '}</Text>
            </Box>
          ))}
          
          {/* Active Terminal Window - overlay */}
          <Box 
            flexDirection="column"
            borderStyle={borderStyle}
            borderColor={c3}
            width={24}
            height={10}
            marginTop={-10}
            marginLeft={2}
          >
            {/* Terminal content with background */}
            <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
              <Box height={1} width={22}>
                <Text backgroundColor={c0} color={c2}>{'~ ❯ ls                                  '}</Text>
              </Box>
              <Box marginY={1} height={1} width={22}>
                <Text backgroundColor={c0} color={c.color4}>{'dir1 '}</Text>
                <Text backgroundColor={c0} color={c.color2}>{'dir2 '}</Text>
                <Text backgroundColor={c0} color={c.color1}>{'file        '}</Text>
              </Box>
              <Box marginTop={1} height={1} width={22}>
                <Text backgroundColor={c0} color={c2}>{'~ ❯                                     '}</Text>
              </Box>
              {/* ANSI preview in terminal */}
              <Box marginTop={1} height={1} width={22}>
                <Text backgroundColor={c.color1}>{'  '}</Text>
                <Text backgroundColor={c.color2}>{'  '}</Text>
                <Text backgroundColor={c.color3}>{'  '}</Text>
                <Text backgroundColor={c.color4}>{'  '}</Text>
                <Text backgroundColor={c.color5}>{'  '}</Text>
                <Text backgroundColor={c.color6}>{'  '}</Text>
                <Text backgroundColor={c.color7}>{'          '}</Text>
              </Box>
            </Box>
          </Box>

          {/* Walker Launcher - floating overlay */}
          <Box 
            flexDirection="column"
            borderStyle="single"
            borderColor={c2}
            width={18}
            height={4}
            marginLeft={8}
            marginTop={-5}
          >
            <Box height={1} width={16}>
              <Text backgroundColor={c1} color={c2}>{'Search...               '}</Text>
            </Box>
            <Box height={1} width={16}>
              <Text backgroundColor={c1}>{'                        '}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Main Application
function ThemeGeneratorApp() {
  const { exit } = useApp();
  
  const [view, setView] = useState<View>('main');
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [buckets, setBuckets] = useState<ColorBucket[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string>('');
  
  const [options, setOptions] = useState({
    strategy: 'dominant' as StrategyType,
    mode: 'auto' as 'dark' | 'light' | 'auto',
    rounded_corners: false,
    transparency: false,
    walker_size: 'medium' as 'small' | 'medium' | 'large',
    themeName: 'my-theme',
    rotationIndex: 0,
  });

  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get initial path for file browser (Photos directory)
  const getInitialBrowserPath = () => {
    const home = os.homedir();
    const photosPath = path.join(home, 'Photos');
    const picturesPath = path.join(home, 'Pictures');
    
    // Try Photos first, then Pictures, then home
    if (existsSync(photosPath)) {
      return photosPath;
    } else if (existsSync(picturesPath)) {
      return picturesPath;
    } else {
      return home;
    }
  };

  // Process images when they change
  useEffect(() => {
    if (imagePaths.length === 0) {
      setBuckets([]);
      setTheme(null);
      return;
    }

    const process = async () => {
      setIsProcessing(true);
      setError(null);
      
      try {
        const processed = await processImages(imagePaths);
        
        if (processed.length === 0) {
          throw new Error('No images could be processed');
        }
        
        const bucketsPerImage = processed.map(p => 
          extractDominantColors(p.pixels, { maxColors: 16 })
        );
        
        const normalizedBuckets = normalizeMultiImageBuckets(bucketsPerImage);
        const mode = options.mode === 'auto' 
          ? detectMode(normalizedBuckets) 
          : options.mode;

        const newTheme = generateTheme(normalizedBuckets, options.themeName, {
          mode,
          strategy: options.strategy,
          rounded_corners: options.rounded_corners,
          transparency: options.transparency,
          walker_size: options.walker_size,
          rotation_index: options.rotationIndex,
        });

        setBuckets(normalizedBuckets);
        setTheme(newTheme);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    };

    process();
  }, [imagePaths, options.strategy, options.mode, options.rounded_corners, 
      options.transparency, options.walker_size, options.themeName, options.rotationIndex]);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      if (view !== 'main') {
        setView('main');
        setInputValue('');
        setSelectedIndex(0);
      } else {
        exit();
      }
      return;
    }

    if (view === 'main') {
      if (input === 'q') exit();
      else if (input === 'i') { setView('file-picker'); setSelectedIndex(0); }
      else if (input === 's') { setView('strategy'); setSelectedIndex(STRATEGIES.findIndex(s => s.value === options.strategy)); }
      else if (input === 'm') { setView('mode'); setSelectedIndex(MODES.findIndex(m => m.value === options.mode)); }
      else if (input === 'w') { setView('walker-size'); setSelectedIndex(WALKER_SIZES.findIndex(w => w.value === options.walker_size)); }
      else if (input === 'r') setOptions(o => ({ ...o, rotationIndex: (o.rotationIndex + 1) % 9 }));
      else if (input === 'e') handleExport(false);
      else if (input === 'I') handleExport(true);
      else if (input === 'n') { setView('name-input'); setInputValue(options.themeName); }
      else if (input === 'c') setOptions(o => ({ ...o, rounded_corners: !o.rounded_corners }));
      else if (input === 't') setOptions(o => ({ ...o, transparency: !o.transparency }));
      else if (input === 'C') setImagePaths([]);
      return;
    }

    const items = view === 'strategy' ? STRATEGIES : view === 'mode' ? MODES : WALKER_SIZES;
    
    if (key.upArrow) {
      setSelectedIndex(i => (i - 1 + items.length) % items.length);
    } else if (key.downArrow) {
      setSelectedIndex(i => (i + 1) % items.length);
    } else if (key.return) {
      if (view === 'strategy') {
        setOptions(o => ({ ...o, strategy: items[selectedIndex].value as StrategyType }));
      } else if (view === 'mode') {
        setOptions(o => ({ ...o, mode: items[selectedIndex].value as 'dark' | 'light' | 'auto' }));
      } else {
        setOptions(o => ({ ...o, walker_size: items[selectedIndex].value as 'small' | 'medium' | 'large' }));
      }
      setView('main');
      setSelectedIndex(0);
    }

    if ((view === 'name-input') && key.return && inputValue) {
      setOptions(o => ({ ...o, themeName: inputValue }));
      setInputValue('');
      setView('main');
    } else if ((view === 'name-input') && (key.backspace || key.delete)) {
      setInputValue(v => v.slice(0, -1));
    } else if ((view === 'name-input') && !key.ctrl && !key.meta && input.length === 1) {
      setInputValue(v => v + input);
    }
  });

  const handleExport = useCallback(async (install: boolean) => {
    if (!theme || imagePaths.length === 0) return;

    setView(install ? 'installing' : 'export');
    
    try {
      if (install) {
        const themeDir = await exportThemeToOmarchy(theme, imagePaths);
        setExportPath(themeDir);
      } else {
        const zipPath = path.join(
          process.env.HOME || '/home/user',
          'Downloads',
          `${theme.name}.zip`
        );
        await exportThemeToZip(theme, imagePaths, zipPath);
        setExportPath(zipPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setView('main');
    }
  }, [theme, imagePaths]);

  const handleFileSelect = (filePath: string) => {
    setImagePaths(prev => [...prev, filePath]);
    setView('main');
  };

  // Render different views with modal overlay
  const renderModal = () => {
    if (view === 'file-picker') {
      return (
        <FileBrowser 
          initialPath={getInitialBrowserPath()}
          onSelect={handleFileSelect}
          onCancel={() => setView('main')}
        />
      );
    }

    if (view === 'name-input') {
      return (
        <InlineModal title="Theme Name" width={50} height={10}>
          <Text>Enter theme name:</Text>
          <Box marginY={1} borderStyle="single" paddingX={1}>
            <Text>{inputValue || ' '}</Text>
          </Box>
          <Text dimColor>Type name and press Enter</Text>
        </InlineModal>
      );
    }

    if (view === 'strategy') {
      return (
        <InlineModal title="Select Strategy" width={52} height={14}>
          <SelectionList items={STRATEGIES} selectedIndex={selectedIndex} />
        </InlineModal>
      );
    }

    if (view === 'mode') {
      return (
        <InlineModal title="Select Mode" width={30} height={8}>
          <SelectionList items={MODES} selectedIndex={selectedIndex} />
        </InlineModal>
      );
    }

    if (view === 'walker-size') {
      return (
        <InlineModal title="Select Walker Size" width={35} height={8}>
          <SelectionList items={WALKER_SIZES} selectedIndex={selectedIndex} />
        </InlineModal>
      );
    }

    if (view === 'export') {
      return (
        <InlineModal title="Export Complete" width={60} height={12}>
          <Text color="green">Theme exported successfully!</Text>
          <Box marginY={1}>
            <Text>Location: {exportPath}</Text>
          </Box>
          <Text dimColor>Install command:</Text>
          <Box borderStyle="single" paddingX={1} marginY={1}>
            <Text>{generateInstallCommand(theme?.name || '')}</Text>
          </Box>
        </InlineModal>
      );
    }

    if (view === 'installing') {
      return (
        <InlineModal title="Installation Complete" width={60} height={12}>
          <Text color="green">Theme installed to Omarchy!</Text>
          <Box marginY={1}>
            <Text>Location: {exportPath}</Text>
          </Box>
          <Text dimColor>Activate with:</Text>
          <Box borderStyle="single" paddingX={1} marginY={1}>
            <Text>omarchy-theme-set "{theme?.name}"</Text>
          </Box>
        </InlineModal>
      );
    }

    return null;
  };

  // Render modal or main panel
  const modal = renderModal();
  
  if (modal) {
    return (
      <Box flexDirection="column" height={24}>
        {/* Background: MainPanel dimmed */}
        <Box flexDirection="column" height={24}>
          <MainPanel 
            imagePaths={imagePaths}
            options={options}
            theme={theme}
            isProcessing={isProcessing}
            error={error}
          />
        </Box>
        
        {/* Foreground: Modal centered */}
        <Box 
          flexDirection="column" 
          height={24}
          marginTop={-24}
          justifyContent="center"
          alignItems="center"
        >
          {modal}
        </Box>
      </Box>
    );
  }

  return (
    <MainPanel 
      imagePaths={imagePaths}
      options={options}
      theme={theme}
      isProcessing={isProcessing}
      error={error}
    />
  );
}

export function runApp() {
  render(<ThemeGeneratorApp />);
}
