/**
 * Versioned, self-healing local persistence.
 *
 * Assume the stored value is garbage, because one day it will be: a user edits
 * it, a previous version of the app wrote a different shape, the quota is full,
 * or the browser is in a mode where storage throws on access. None of those may
 * white-screen the app.
 *
 * Every app uses this rather than touching localStorage directly.
 */

export type Migration = (value: unknown) => unknown;

export interface StoreOptions<T> {
  /** Storage key. Namespace it with the app slug. */
  key: string;
  /** Current schema version. Bump when the shape changes. */
  version: number;
  /** Value used when nothing is stored, or when what is stored is unrecoverable. */
  fallback: T;
  /** Returns true only for a valid T. Be strict: this is the last line of defence. */
  validate: (value: unknown) => value is T;
  /** `migrations[n]` upgrades a version-n payload to version n+1. */
  migrations?: Record<number, Migration>;
}

export type LoadResult<T> =
  | { status: 'loaded'; value: T }
  | { status: 'default'; value: T }
  | { status: 'recovered'; value: T; reason: string };

interface Envelope {
  v: number;
  d: unknown;
}

const isEnvelope = (value: unknown): value is Envelope =>
  typeof value === 'object' &&
  value !== null &&
  'v' in value &&
  'd' in value &&
  typeof (value as Envelope).v === 'number';

export function createStore<T>(options: StoreOptions<T>) {
  const { key, version, fallback, validate, migrations = {} } = options;

  function load(): LoadResult<T> {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      // Private mode, or storage blocked by policy. Not an error for the user.
      return { status: 'default', value: fallback };
    }
    if (raw === null) return { status: 'default', value: fallback };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: 'recovered', value: fallback, reason: 'stored data was not valid JSON' };
    }

    if (!isEnvelope(parsed)) {
      return {
        status: 'recovered',
        value: fallback,
        reason: 'stored data had an unknown shape',
      };
    }

    let data = parsed.d;
    let v = parsed.v;
    if (v > version) {
      // Written by a newer version of the app. Do not guess; start clean rather
      // than corrupting what the newer version wrote.
      return {
        status: 'recovered',
        value: fallback,
        reason: 'stored data is from a newer version',
      };
    }
    while (v < version) {
      const migrate = migrations[v];
      if (!migrate) {
        return {
          status: 'recovered',
          value: fallback,
          reason: `no migration from version ${v}`,
        };
      }
      try {
        data = migrate(data);
      } catch {
        return {
          status: 'recovered',
          value: fallback,
          reason: `migration from version ${v} failed`,
        };
      }
      v += 1;
    }

    if (!validate(data)) {
      return { status: 'recovered', value: fallback, reason: 'stored data failed validation' };
    }
    return { status: 'loaded', value: data };
  }

  /** Returns false when the write could not be made (quota, private mode). */
  function save(value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify({ v: version, d: value } satisfies Envelope));
      return true;
    } catch {
      return false;
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing useful to do */
    }
  }

  return { load, save, clear, key, version };
}
