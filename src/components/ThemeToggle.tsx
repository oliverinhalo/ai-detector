import { useTheme } from '../lib/useTheme';

const LABEL = { system: 'Match system', light: 'Light', dark: 'Dark' } as const;

export function ThemeToggle() {
  const { theme, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Change theme.`}
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-[var(--dur-state)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
    >
      <span aria-hidden="true">{theme === 'dark' ? '◗' : theme === 'light' ? '◖' : '◍'}</span>
      {LABEL[theme]}
    </button>
  );
}
