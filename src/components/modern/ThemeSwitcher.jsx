import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { themes, applyTheme, getStoredTheme } from '../../design/themes';

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme());

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    applyTheme(themeName);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost flex items-center gap-2 px-3 py-2"
        title="Change theme"
      >
        <Palette size={18} />
        <span className="hidden md:inline text-sm font-semibold">Theme</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 glass-panel theme-popover rounded-2xl p-4 z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Choose Theme</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-secondary hover:text-primary transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    currentTheme === key
                      ? 'glass-panel border-2'
                      : 'hover:bg-amber-50/70 border border-transparent'
                  }`}
                >
                  <div className="flex gap-1">
                    <span
                      className="w-6 h-6 rounded-lg border shadow-md"
                      style={{ borderColor: 'rgba(41, 37, 36, 0.16)', background: theme.brandA }}
                    />
                    <span
                      className="w-6 h-6 rounded-lg border shadow-md"
                      style={{ borderColor: 'rgba(41, 37, 36, 0.16)', background: theme.brandB }}
                    />
                    <span
                      className="w-6 h-6 rounded-lg border shadow-md"
                      style={{ borderColor: 'rgba(41, 37, 36, 0.16)', background: theme.brandC }}
                    />
                  </div>
                  <span className="flex-1 text-left font-semibold text-sm text-primary">{theme.name}</span>
                  {currentTheme === key && <Check size={18} className="text-primary" />}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(41, 37, 36, 0.12)' }}>
              <p className="text-xs text-secondary">Your theme preference is saved locally</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
