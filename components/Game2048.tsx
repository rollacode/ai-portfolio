'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean;
  isNew?: boolean;
}

interface GameState {
  tiles: Tile[];
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
  nextId: number;
}

type Action =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'NEW_GAME' }
  | { type: 'KEEP_PLAYING' };

type Direction = 'left' | 'right' | 'up' | 'down';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRID_SIZE = 4;

const TILE_COLORS: Record<number, string> = {
  2: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
  4: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100',
  8: 'bg-neutral-300 dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100',
  16: 'bg-neutral-400 dark:bg-neutral-500 text-white',
  32: 'bg-neutral-500 dark:bg-neutral-400 text-white',
  64: 'bg-neutral-600 dark:bg-neutral-300 text-white dark:text-neutral-900',
  128: 'bg-lime-500 text-white',
  256: 'bg-lime-500 text-white',
  512: 'bg-lime-500 text-white',
  1024: 'bg-lime-500 text-white',
  2048: 'bg-lime-400 text-black font-bold',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getEmptyCells(tiles: Tile[]): [number, number][] {
  const occupied = new Set(tiles.map((t) => `${t.row},${t.col}`));
  const empty: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!occupied.has(`${r},${c}`)) empty.push([r, c]);
    }
  }
  return empty;
}

function spawnTile(tiles: Tile[], nextId: number): { tile: Tile; nextId: number } | null {
  const empty = getEmptyCells(tiles);
  if (empty.length === 0) return null;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  return { tile: { id: nextId, value, row, col, isNew: true }, nextId: nextId + 1 };
}

function buildGrid(tiles: Tile[]): (Tile | null)[][] {
  const grid: (Tile | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null),
  );
  for (const t of tiles) {
    grid[t.row][t.col] = t;
  }
  return grid;
}

/** Slide a single row to the left, returning new tiles and score gained. */
function slideRow(
  row: (Tile | null)[],
  rowIdx: number,
  nextId: number,
): { tiles: Tile[]; score: number; nextId: number; moved: boolean } {
  const filtered = row.filter((t): t is Tile => t !== null);
  const result: Tile[] = [];
  let score = 0;
  let id = nextId;
  let moved = false;
  let colIdx = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value) {
      // Merge
      const mergedValue = filtered[i].value * 2;
      result.push({
        id: id++,
        value: mergedValue,
        row: rowIdx,
        col: colIdx,
        mergedFrom: true,
      });
      score += mergedValue;
      // Check if positions changed
      if (filtered[i].row !== rowIdx || filtered[i].col !== colIdx) moved = true;
      if (filtered[i + 1].row !== rowIdx || filtered[i + 1].col !== colIdx) moved = true;
      i++; // skip next tile (it was merged)
    } else {
      result.push({
        id: filtered[i].id,
        value: filtered[i].value,
        row: rowIdx,
        col: colIdx,
      });
      if (filtered[i].row !== rowIdx || filtered[i].col !== colIdx) moved = true;
    }
    colIdx++;
  }

  return { tiles: result, score, nextId: id, moved };
}

function moveTiles(
  tiles: Tile[],
  direction: Direction,
  currentNextId: number,
): { tiles: Tile[]; score: number; nextId: number; moved: boolean } {
  const grid = buildGrid(tiles);
  let allNewTiles: Tile[] = [];
  let totalScore = 0;
  let id = currentNextId;
  let anyMoved = false;

  for (let i = 0; i < GRID_SIZE; i++) {
    let line: (Tile | null)[];

    switch (direction) {
      case 'left':
        line = grid[i].slice();
        break;
      case 'right':
        line = grid[i].slice().reverse();
        break;
      case 'up':
        line = grid.map((row) => row[i]);
        break;
      case 'down':
        line = grid.map((row) => row[i]).reverse();
        break;
    }

    // slideRow always produces a left-aligned result, so we remap coordinates after
    const { tiles: slid, score, nextId: newId, moved } = slideRow(line, 0, id);
    id = newId;
    totalScore += score;
    if (moved) anyMoved = true;

    // Remap coordinates back to the real grid
    for (const t of slid) {
      const pos = t.col; // position in the slid row (0-based from left)
      switch (direction) {
        case 'left':
          t.row = i;
          t.col = pos;
          break;
        case 'right':
          t.row = i;
          t.col = GRID_SIZE - 1 - pos;
          break;
        case 'up':
          t.row = pos;
          t.col = i;
          break;
        case 'down':
          t.row = GRID_SIZE - 1 - pos;
          t.col = i;
          break;
      }
      allNewTiles.push(t);
    }
  }

  return { tiles: allNewTiles, score: totalScore, nextId: id, moved: anyMoved };
}

function canMove(tiles: Tile[]): boolean {
  if (tiles.length < GRID_SIZE * GRID_SIZE) return true;
  const grid = buildGrid(tiles);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = grid[r][c]?.value;
      if (c + 1 < GRID_SIZE && grid[r][c + 1]?.value === v) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1]?.[c]?.value === v) return true;
    }
  }
  return false;
}

function hasWon(tiles: Tile[]): boolean {
  return tiles.some((t) => t.value >= 2048);
}

function createInitialState(): GameState {
  let nextId = 1;
  const tiles: Tile[] = [];

  const first = spawnTile(tiles, nextId);
  if (first) {
    tiles.push(first.tile);
    nextId = first.nextId;
  }
  const second = spawnTile(tiles, nextId);
  if (second) {
    tiles.push(second.tile);
    nextId = second.nextId;
  }

  return {
    tiles,
    score: 0,
    bestScore: 0,
    gameOver: false,
    won: false,
    keepPlaying: false,
    nextId,
  };
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const fresh = createInitialState();
      fresh.bestScore = state.bestScore;
      return fresh;
    }

    case 'KEEP_PLAYING':
      return { ...state, keepPlaying: true, won: false };

    case 'MOVE': {
      if (state.gameOver) return state;
      if (state.won && !state.keepPlaying) return state;

      const { tiles: movedTiles, score, nextId, moved } = moveTiles(
        state.tiles,
        action.direction,
        state.nextId,
      );

      if (!moved) return state;

      // Clear transient flags
      const cleaned = movedTiles.map((t) => ({ ...t, isNew: false, mergedFrom: false }));

      // Spawn new tile
      const spawned = spawnTile(cleaned, nextId);
      const finalTiles = spawned ? [...cleaned, spawned.tile] : cleaned;
      const finalNextId = spawned ? spawned.nextId : nextId;

      const newScore = state.score + score;
      const newBest = Math.max(state.bestScore, newScore);
      const won = !state.keepPlaying && hasWon(finalTiles);
      const gameOver = !canMove(finalTiles);

      return {
        ...state,
        tiles: finalTiles,
        score: newScore,
        bestScore: newBest,
        won,
        gameOver,
        nextId: finalNextId,
      };
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Tile Component                                                     */
/* ------------------------------------------------------------------ */

function TileView({ tile }: { tile: Tile }) {
  const colorClass =
    TILE_COLORS[tile.value] || 'bg-lime-500 text-white';

  const fontSize =
    tile.value >= 1024
      ? 'text-lg sm:text-xl'
      : tile.value >= 128
        ? 'text-xl sm:text-2xl'
        : 'text-2xl sm:text-3xl';

  return (
    <motion.div
      layoutId={String(tile.id)}
      initial={tile.isNew ? { scale: 0 } : false}
      animate={tile.mergedFrom ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={
        tile.mergedFrom
          ? { duration: 0.2, ease: 'easeInOut' }
          : tile.isNew
            ? { type: 'spring', stiffness: 400, damping: 20, duration: 0.3 }
            : { type: 'spring', stiffness: 300, damping: 28, duration: 0.15 }
      }
      className={`absolute inset-0 flex items-center justify-center rounded-lg font-bold font-mono select-none ${fontSize} ${colorClass}`}
    >
      {tile.value}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Game2048() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ----- Keyboard controls ----- */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        dispatch({ type: 'MOVE', direction: dir });
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* ----- Touch controls ----- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.x;
    const dy = touch.clientY - touchRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    let direction: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    dispatch({ type: 'MOVE', direction });
    touchRef.current = null;
  }, []);

  /* ----- Build grid lookup for rendering ----- */
  const gridTiles: (Tile | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null),
  );
  for (const t of state.tiles) {
    gridTiles[t.row][t.col] = t;
  }

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none" ref={containerRef}>
      {/* Score bar */}
      <div className="flex justify-between w-full max-w-[320px] sm:max-w-[360px] gap-3">
        <div className="flex-1 rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50 px-4 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Score
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {state.score}
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50 px-4 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Best
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {state.bestScore}
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'NEW_GAME' })}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          New Game
        </button>
      </div>

      {/* Grid */}
      <div
        className="relative bg-neutral-200/50 dark:bg-neutral-800/50 rounded-xl p-2 w-full max-w-[320px] sm:max-w-[360px] aspect-square"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const r = Math.floor(i / GRID_SIZE);
            const c = i % GRID_SIZE;
            const tile = gridTiles[r][c];

            return (
              <div
                key={`cell-${r}-${c}`}
                className="relative rounded-lg bg-gray-50/70 dark:bg-white/[0.05]"
              >
                <AnimatePresence mode="popLayout">
                  {tile && <TileView key={tile.id} tile={tile} />}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Game over overlay */}
        <AnimatePresence>
          {state.gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-xl bg-neutral-900/60 dark:bg-black/70 flex flex-col items-center justify-center gap-3 z-10"
            >
              <span className="text-2xl font-bold text-white">Game Over</span>
              <button
                onClick={() => dispatch({ type: 'NEW_GAME' })}
                className="rounded-lg bg-white text-neutral-900 px-5 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win overlay */}
        <AnimatePresence>
          {state.won && !state.keepPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-xl bg-lime-500/80 flex flex-col items-center justify-center gap-3 z-10"
            >
              <span className="text-3xl font-bold text-white">2048!</span>
              <div className="flex gap-2">
                <button
                  onClick={() => dispatch({ type: 'KEEP_PLAYING' })}
                  className="rounded-lg bg-white text-neutral-900 px-5 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => dispatch({ type: 'NEW_GAME' })}
                  className="rounded-lg bg-neutral-900 text-white px-5 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls hint */}
      <p className="text-xs text-neutral-400 dark:text-neutral-500 hidden md:block">
        Arrow keys to play
      </p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 md:hidden">
        Swipe to play
      </p>
    </div>
  );
}
