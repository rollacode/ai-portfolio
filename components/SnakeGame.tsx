'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRID = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 80;

const COLORS = {
  snake: '#84cc16',       // lime-500
  food: '#ef4444',        // red-500
  bgLight: '#f5f5f5',     // neutral-100
  bgDark: '#141414',      // near-black
  gridLight: 'rgba(0,0,0,0.05)',
  gridDark: 'rgba(255,255,255,0.05)',
};

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Coord = { x: number; y: number };

const OPPOSITE: Record<Dir, Dir> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function randomFood(snake: Coord[]): Coord {
  let pos: Coord;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SnakeGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Game state refs (avoid re-renders during game loop)
  const snakeRef = useRef<Coord[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Dir>('RIGHT');
  const nextDirRef = useRef<Dir>('RIGHT');
  const foodRef = useRef<Coord>(randomFood(snakeRef.current));
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const startedRef = useRef(false);

  // Reactive state for UI elements only
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [canvasSize, setCanvasSize] = useState(300);

  // Touch tracking
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  /* ---- Resize observer ------------------------------------------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const w = container.clientWidth;
      const size = Math.min(w, 600);
      setCanvasSize(size);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  /* ---- Draw ------------------------------------------------------ */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dark = isDark();
    const cell = canvas.width / GRID;

    // Background
    ctx.fillStyle = dark ? COLORS.bgDark : COLORS.bgLight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = dark ? COLORS.gridDark : COLORS.gridLight;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }

    // Snake
    const snake = snakeRef.current;
    ctx.fillStyle = COLORS.snake;
    for (const seg of snake) {
      const pad = cell * 0.08;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * cell + pad,
        seg.y * cell + pad,
        cell - pad * 2,
        cell - pad * 2,
        cell * 0.2,
      );
      ctx.fill();
    }

    // Food
    const food = foodRef.current;
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(
      food.x * cell + cell / 2,
      food.y * cell + cell / 2,
      cell * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Overlays
    if (gameOverRef.current) {
      ctx.fillStyle = dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = dark ? '#fff' : '#171717';
      ctx.font = `bold ${canvas.width * 0.06}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height * 0.42);

      ctx.font = `${canvas.width * 0.04}px ui-monospace, monospace`;
      ctx.fillStyle = dark ? '#a3a3a3' : '#737373';
      ctx.fillText(
        `Score: ${scoreRef.current}`,
        canvas.width / 2,
        canvas.height * 0.52,
      );
    } else if (!startedRef.current) {
      ctx.fillStyle = dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = dark ? '#fff' : '#171717';
      ctx.font = `bold ${canvas.width * 0.05}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Snake', canvas.width / 2, canvas.height * 0.44);
    }
  }, []);

  /* ---- Tick ------------------------------------------------------ */

  const tick = useCallback(() => {
    if (gameOverRef.current || !startedRef.current) return;

    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    // Apply queued direction
    dirRef.current = nextDirRef.current;

    switch (dirRef.current) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      gameOverRef.current = true;
      setGameOver(true);
      draw();
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOverRef.current = true;
      setGameOver(true);
      draw();
      return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      foodRef.current = randomFood(snake);

      // Increase speed
      if (intervalRef.current) clearInterval(intervalRef.current);
      const speed = Math.max(
        MIN_SPEED,
        INITIAL_SPEED - scoreRef.current * 3,
      );
      intervalRef.current = setInterval(tick, speed);
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw]);

  /* ---- Start / Restart ------------------------------------------- */

  const startGame = useCallback(() => {
    // Reset state
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    foodRef.current = randomFood(snakeRef.current);
    scoreRef.current = 0;
    gameOverRef.current = false;
    startedRef.current = true;

    setScore(0);
    setGameOver(false);
    setStarted(true);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, INITIAL_SPEED);
    draw();
  }, [tick, draw]);

  /* ---- Keyboard -------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keyMap: Record<string, Dir> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        W: 'UP',
        s: 'DOWN',
        S: 'DOWN',
        a: 'LEFT',
        A: 'LEFT',
        d: 'RIGHT',
        D: 'RIGHT',
      };

      const newDir = keyMap[e.key];
      if (newDir && newDir !== OPPOSITE[dirRef.current]) {
        e.preventDefault();
        nextDirRef.current = newDir;
      }
    },
    [],
  );

  /* ---- Touch ----------------------------------------------------- */

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimum swipe distance
      if (Math.max(absDx, absDy) < 30) {
        // Tap — start game if not started
        if (!startedRef.current || gameOverRef.current) {
          startGame();
        }
        return;
      }

      let newDir: Dir;
      if (absDx > absDy) {
        newDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        newDir = dy > 0 ? 'DOWN' : 'UP';
      }

      if (newDir !== OPPOSITE[dirRef.current]) {
        nextDirRef.current = newDir;
      }

      touchStart.current = null;
    },
    [startGame],
  );

  /* ---- Effects --------------------------------------------------- */

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw, canvasSize]);

  // Keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Touch listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ---- Render ---------------------------------------------------- */

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center gap-3">
      <p className="text-sm font-mono text-neutral-500">
        Score: {score}
      </p>
      <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg shadow-sm"
          style={{ width: canvasSize, height: canvasSize }}
        />
        {/* Clickable overlay — initial state */}
        {!started && !gameOver && (
          <div
            role="button"
            tabIndex={0}
            onClick={startGame}
            onKeyDown={(e) => { if (e.key === 'Enter') startGame(); }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer rounded-lg"
          >
            {/* Spacer to push button below canvas-drawn title */}
            <div style={{ height: canvasSize * 0.12 }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-5 py-2 rounded-md font-mono text-sm font-semibold
                         bg-lime-500 text-neutral-900 hover:bg-lime-400
                         transition-colors shadow-md"
            >
              Click to Start
            </button>
            <p className="text-xs font-mono text-neutral-400">
              Arrow keys / WASD to move
            </p>
          </div>
        )}
        {/* Clickable overlay — game over */}
        {gameOver && (
          <div
            role="button"
            tabIndex={0}
            onClick={startGame}
            onKeyDown={(e) => { if (e.key === 'Enter') startGame(); }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer rounded-lg"
          >
            {/* Spacer to push button below canvas-drawn "Game Over" + score */}
            <div style={{ height: canvasSize * 0.18 }} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-5 py-2 rounded-md font-mono text-sm font-semibold
                         bg-lime-500 text-neutral-900 hover:bg-lime-400
                         transition-colors shadow-md"
            >
              Click to Restart
            </button>
          </div>
        )}
      </div>
      {started && !gameOver && (
        <p className="text-xs font-mono text-neutral-400">
          Arrow keys / WASD to move
        </p>
      )}
    </div>
  );
}
