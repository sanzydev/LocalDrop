import React from 'react';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
} from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useTheme, ColorScheme } from '../../theme/theme';
import './ThemePickerDialog.css';

interface ThemePickerDialogProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteOption {
  id: ColorScheme;
  name: string;
  description: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
}

const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Fresh & clean cyan-blue',
    primaryLight: '#00639b',
    primaryDark: '#96ccff',
    accent: '#38bdf8',
  },
  {
    id: 'violet',
    name: 'Cyber Violet',
    description: 'Futuristic electric purple',
    primaryLight: '#6750a4',
    primaryDark: '#d0bcff',
    accent: '#a855f7',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    description: 'Natural fresh forest green',
    primaryLight: '#006d44',
    primaryDark: '#74daa3',
    accent: '#10b981',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Warm glowing tangerine',
    primaryLight: '#8b5000',
    primaryDark: '#ffb870',
    accent: '#f59e0b',
  },
  {
    id: 'rose',
    name: 'Rose Crimson',
    description: 'Vibrant neon crimson',
    primaryLight: '#9b4055',
    primaryDark: '#ffb2be',
    accent: '#f43f5e',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    description: 'True black AMOLED glow',
    primaryLight: '#0284c7',
    primaryDark: '#00e5ff',
    accent: '#000000',
  },
];

export const ThemePickerDialog: React.FC<ThemePickerDialogProps> = ({
  open,
  onClose,
}) => {
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="localdrop-theme-dialog-header">
          <div className="localdrop-theme-dialog-icon">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="localdrop-theme-dialog-title">Choose Theme</h2>
            <p className="localdrop-theme-dialog-subtitle">Personalize your LocalDrop experience</p>
          </div>
        </div>
      }
      maxWidth="540px"
      actions={
        <Button variant="filled" onClick={onClose} className="localdrop-theme-done-btn">
          Done
        </Button>
      }
    >
      <div className="localdrop-theme-picker-body">
        <div className="localdrop-theme-section">
          <span className="localdrop-theme-section-title">Appearance Mode</span>
          <div className="localdrop-theme-mode-row">
            <button
              type="button"
              className={`localdrop-mode-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              aria-label="Light theme"
            >
              <Sun size={18} />
              <span>Light</span>
              {theme === 'light' && <Check size={14} className="localdrop-mode-check" />}
            </button>

            <button
              type="button"
              className={`localdrop-mode-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              aria-label="Dark theme"
            >
              <Moon size={18} />
              <span>Dark</span>
              {theme === 'dark' && <Check size={14} className="localdrop-mode-check" />}
            </button>

            <button
              type="button"
              className={`localdrop-mode-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              aria-label="System theme"
            >
              <Laptop size={18} />
              <span>System</span>
              {theme === 'system' && <Check size={14} className="localdrop-mode-check" />}
            </button>
          </div>
        </div>

        <div className="localdrop-theme-section">
          <span className="localdrop-theme-section-title">Color Palette</span>
          <div className="localdrop-palette-grid">
            {PALETTE_OPTIONS.map((pal) => {
              const isSelected = colorScheme === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  className={`localdrop-palette-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setColorScheme(pal.id)}
                >
                  <div
                    className="localdrop-palette-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${pal.primaryLight} 0%, ${pal.primaryDark} 50%, ${pal.accent} 100%)`,
                    }}
                  >
                    {isSelected && (
                      <div className="localdrop-swatch-check">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  <div className="localdrop-palette-meta">
                    <span className="localdrop-palette-name">{pal.name}</span>
                    <span className="localdrop-palette-desc">{pal.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
