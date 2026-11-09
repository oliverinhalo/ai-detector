import { describe, expect, it } from 'vitest';
import { createStore } from './storage';

interface Note {
  text: string;
  done: boolean;
}

const isNote = (v: unknown): v is Note =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Note).text === 'string' &&
  typeof (v as Note).done === 'boolean';

const make = (version = 2) =>
  createStore<Note>({
    key: 'test:note',
    version,
    fallback: { text: '', done: false },
    validate: isNote,
    migrations: {
      1: (value) => ({ ...(value as object), done: false }),
    },
  });

describe('createStore', () => {
  it('returns the fallback when nothing is stored', () => {
    const r = make().load();
    expect(r.status).toBe('default');
    expect(r.value).toEqual({ text: '', done: false });
  });

  it('round-trips a value', () => {
    const store = make();
    expect(store.save({ text: 'buy milk', done: true })).toBe(true);
    const r = store.load();
    expect(r.status).toBe('loaded');
    expect(r.value).toEqual({ text: 'buy milk', done: true });
  });

  it('recovers from data that is not JSON rather than throwing', () => {
    localStorage.setItem('test:note', 'not json at all {{{');
    const r = make().load();
    expect(r.status).toBe('recovered');
    expect(r.value).toEqual({ text: '', done: false });
  });

  it('recovers from a value of the wrong shape', () => {
    localStorage.setItem('test:note', JSON.stringify({ v: 2, d: { text: 42 } }));
    const r = make().load();
    expect(r.status).toBe('recovered');
    if (r.status === 'recovered') expect(r.reason).toMatch(/validation/);
  });

  it('migrates an older version forward', () => {
    localStorage.setItem('test:note', JSON.stringify({ v: 1, d: { text: 'old' } }));
    const r = make(2).load();
    expect(r.status).toBe('loaded');
    expect(r.value).toEqual({ text: 'old', done: false });
  });

  it('refuses data written by a newer version instead of corrupting it', () => {
    localStorage.setItem(
      'test:note',
      JSON.stringify({ v: 99, d: { text: 'future', done: true } }),
    );
    const r = make(2).load();
    expect(r.status).toBe('recovered');
    if (r.status === 'recovered') expect(r.reason).toMatch(/newer version/);
  });

  it('reports a failed write rather than throwing', () => {
    const store = make();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    expect(store.save({ text: 'x', done: false })).toBe(false);
    Storage.prototype.setItem = original;
  });

  it('clears without throwing when storage is unavailable', () => {
    const store = make();
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => {
      throw new DOMException('SecurityError');
    };
    expect(() => store.clear()).not.toThrow();
    Storage.prototype.removeItem = original;
  });
});
