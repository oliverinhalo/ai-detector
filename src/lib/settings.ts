import { createStore } from './storage';

export interface Settings {
  /** Minimum probability for a sentence to be highlighted. */
  sensitivity: number;
}

export const DEFAULT_SETTINGS: Settings = { sensitivity: 0.6 };

export const settingsStore = createStore<Settings>({
  key: 'ai-detector:state',
  version: 1,
  fallback: DEFAULT_SETTINGS,
  validate: (v): v is Settings =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Settings).sensitivity === 'number' &&
    (v as Settings).sensitivity >= 0.3 &&
    (v as Settings).sensitivity <= 0.9,
});
