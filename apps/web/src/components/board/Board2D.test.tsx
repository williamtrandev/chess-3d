import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameStore } from '@/lib/game-store';
import { THEMES } from '@/lib/themes';
import { GameStoreContext } from '../game/game-context';
import { Board2D } from './Board2D';

const renderBoard = (store = createGameStore()) => {
  render(
    <GameStoreContext.Provider value={store}>
      <Board2D theme={THEMES.wood} />
    </GameStoreContext.Provider>,
  );
  return store;
};

const square = (name: string) => {
  const cell = document.querySelector<HTMLElement>(`[data-square="${name}"]`);
  if (!cell) throw new Error(`no square ${name}`);
  return cell;
};

afterEach(cleanup);

describe('Board2D', () => {
  it('renders 64 squares with white at the bottom', () => {
    renderBoard();
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(64);
    expect(cells[0]?.dataset.square).toBe('a8');
    expect(square('e1').getAttribute('aria-label')).toBe('e1 vua trắng');
  });

  it('flips for the black side', () => {
    const store = createGameStore();
    store.getState().flip();
    renderBoard(store);
    expect(screen.getAllByRole('gridcell')[0]?.dataset.square).toBe('h1');
  });

  it('moves a piece with two clicks', () => {
    const store = renderBoard();
    fireEvent.click(square('e2'));
    expect(square('e2').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(square('e4'));
    expect(store.getState().lastMove?.san).toBe('e4');
    expect(square('e4').getAttribute('aria-label')).toBe('e4 tốt trắng');
  });
});
