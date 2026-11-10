import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App shell', () => {
  it('renders exactly one h1', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('exposes the landmarks the accessibility gate requires', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('offers a skip link as the first focusable element', async () => {
    render(<App />);
    await userEvent.tab();
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveFocus();
  });

  it('cycles the theme and records the choice', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /theme/i });
    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe('detection flow', () => {
  it('pasted text produces a score, a label and highlights', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /try a sample/i }));
    expect(await screen.findByTestId('score')).toBeInTheDocument();
    expect(screen.getByTestId('label')).toBeInTheDocument();
    expect(document.querySelectorAll('mark[data-strength]').length).toBeGreaterThan(0);
  });

  it('sensitivity changes the highlight count without re-analysing', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /try a sample/i }));
    await screen.findByTestId('score');
    const before = document.querySelectorAll('mark[data-strength]').length;
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '90' } });
    expect(slider).toHaveValue('90');
    expect(document.querySelectorAll('mark[data-strength]').length).toBeLessThanOrEqual(before);
  });

  it('n jumps to the first highlighted sentence and explains it', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /try a sample/i }));
    await screen.findByTestId('score');
    (document.activeElement as HTMLElement).blur();
    await userEvent.keyboard('n');
    expect(
      screen.getByRole('complementary', { name: /why this sentence/i }),
    ).toBeInTheDocument();
  });

  it('survives corrupt stored settings', () => {
    localStorage.setItem('ai-detector:state', '{{{nope');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
