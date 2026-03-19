'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Skill {
  id: string;
  name: string;
  years?: number;
  level: string;
}

type Category = 'primary' | 'strong' | 'ai' | 'working' | 'hobby';

interface TechRadarProps {
  highlightedSkill?: string | null;
  focusCategory?: string | null;
  onActionConsumed?: () => void;
}

interface SimNode extends Skill {
  x: number;
  y: number;
  vx: number;
  vy: number;
  category: Category;
}

interface PlacedNode extends Skill {
  x: number;
  y: number;
  category: Category;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DetailCard {
  node: PlacedNode;
  screenX: number;
  screenY: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const VIEW_SIZE = 1000;
const CENTER = VIEW_SIZE / 2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, w: VIEW_SIZE, h: VIEW_SIZE };

const CATEGORY_META: Record<Category, { label: string; cx: number; cy: number }> = {
  primary: { label: 'EXPERT', cx: CENTER, cy: CENTER - 80 },
  strong: { label: 'PROFESSIONAL', cx: CENTER + 250, cy: CENTER - 160 },
  ai: { label: 'AI / LLM', cx: CENTER + 260, cy: CENTER + 180 },
  working: { label: 'WORKING KNOWLEDGE', cx: CENTER - 260, cy: CENTER + 180 },
  hobby: { label: 'HOBBY', cx: CENTER - 250, cy: CENTER - 160 },
};

const LEVEL_SIZE: Record<string, number> = {
  expert: 7,
  professional: 5,
  familiar: 3.5,
};

const LEVEL_OPACITY: Record<string, number> = {
  expert: 1.0,
  professional: 0.7,
  familiar: 0.4,
};

const LEVEL_LABELS: Record<string, string> = {
  expert: 'Expert',
  professional: 'Professional',
  familiar: 'Working Knowledge',
};

const SKILL_PATHS: string[][] = [
  ['objective-c', 'swift-ios', 'swiftui', 'arkit-scenekit'],
  ['react-typescript', 'react-native', 'vue-js'],
  ['python-django-fastapi', 'langchain-langgraph', 'ai-agent-orchestration', 'rag-vector-search'],
  ['python-django-fastapi', 'redis-celery', 'postgresql', 'docker-devops'],
  ['llm-agents', 'prompt-engineering', 'openai-anthropic-apis', 'claude-code', 'mcp-protocol'],
  ['llm-agents', 'ai-agent-orchestration', 'langfuse', 'vibe-coding'],
  ['unity3d-csharp', 'unreal-engine-cpp'],
  ['computer-vision-opencv', 'arkit-scenekit'],
  ['webrtc', 'livekit', 'elevenlabs', 'whisper-openai'],
  ['system-architecture', 'product-management'],
  ['spring-boot-java', 'aspnet-csharp'],
  ['opencode', 'cursor-windsurf', 'claude-code'],
];

const NEIGHBOR_COUNT = 3;
const BG_STAR_COUNT = 80;

/* ------------------------------------------------------------------ */
/*  Seeded PRNG                                                        */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Background stars (deterministic)                                   */
/* ------------------------------------------------------------------ */

interface BgStar {
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
}

function generateBgStars(): BgStar[] {
  const rng = seededRandom(777);
  const stars: BgStar[] = [];
  for (let i = 0; i < BG_STAR_COUNT; i++) {
    stars.push({
      x: rng() * VIEW_SIZE,
      y: rng() * VIEW_SIZE,
      r: 0.5 + rng() * 1.5,
      opacity: 0.08 + rng() * 0.22,
      delay: rng() * 6,
    });
  }
  return stars;
}

const BG_STARS = generateBgStars();

/* ------------------------------------------------------------------ */
/*  Force-directed layout (synchronous)                                */
/* ------------------------------------------------------------------ */

function runForceSimulation(skillsData: any): PlacedNode[] {
  const allCategories = Object.keys(CATEGORY_META) as Category[];
  const nodes: SimNode[] = [];

  const rng = seededRandom(42);

  for (const cat of allCategories) {
    const skills = (skillsData as Record<Category, Skill[]>)[cat] || [];
    const meta = CATEGORY_META[cat];
    for (const skill of skills) {
      nodes.push({
        ...skill,
        category: cat,
        x: meta.cx + (rng() - 0.5) * 200,
        y: meta.cy + (rng() - 0.5) * 200,
        vx: 0,
        vy: 0,
      });
    }
  }

  const REPULSION = 3000;
  const MIN_DIST = 50;
  const CLUSTER_STRENGTH = 0.012;
  const CENTER_GRAVITY = 0.001;
  const DAMPING = 0.92;
  const ITERATIONS = 250;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        if (dist < MIN_DIST * 2) {
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
          nodes[j].vx -= fx;
          nodes[j].vy -= fy;
        }
      }
    }

    // Attraction toward cluster center
    for (const node of nodes) {
      const meta = CATEGORY_META[node.category];
      const dx = meta.cx - node.x;
      const dy = meta.cy - node.y;
      node.vx += dx * CLUSTER_STRENGTH;
      node.vy += dy * CLUSTER_STRENGTH;
    }

    // Center gravity
    for (const node of nodes) {
      const dx = CENTER - node.x;
      const dy = CENTER - node.y;
      node.vx += dx * CENTER_GRAVITY;
      node.vy += dy * CENTER_GRAVITY;
    }

    // Apply velocity + damping
    for (const node of nodes) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;

      // Boundary clamp
      node.x = Math.max(40, Math.min(VIEW_SIZE - 40, node.x));
      node.y = Math.max(40, Math.min(VIEW_SIZE - 40, node.y));
    }
  }

  return nodes.map(({ vx, vy, ...rest }) => rest);
}

/* ------------------------------------------------------------------ */
/*  Precompute neighbors + constellation edges                         */
/* ------------------------------------------------------------------ */

function computeNeighbors(nodes: PlacedNode[]): Map<string, PlacedNode[]> {
  const map = new Map<string, PlacedNode[]>();
  for (const node of nodes) {
    const others = nodes
      .filter((s) => s.id !== node.id && s.category !== node.category)
      .map((s) => ({ skill: s, dist: Math.hypot(s.x - node.x, s.y - node.y) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, NEIGHBOR_COUNT)
      .map((e) => e.skill);
    map.set(node.id, others);
  }
  return map;
}

interface ConstellationEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  category: Category;
  id: string;
}

function computeConstellationEdges(nodes: PlacedNode[]): ConstellationEdge[] {
  const edges: ConstellationEdge[] = [];
  const allCategories = Object.keys(CATEGORY_META) as Category[];

  for (const cat of allCategories) {
    const catNodes = nodes.filter((n) => n.category === cat);
    if (catNodes.length < 2) continue;

    // Minimum spanning tree via Prim's for clean constellation lines
    const inTree = new Set<string>();
    inTree.add(catNodes[0].id);

    while (inTree.size < catNodes.length) {
      let bestDist = Infinity;
      let bestFrom: PlacedNode | null = null;
      let bestTo: PlacedNode | null = null;

      for (const node of catNodes) {
        if (!inTree.has(node.id)) continue;
        for (const other of catNodes) {
          if (inTree.has(other.id)) continue;
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrom = node;
            bestTo = other;
          }
        }
      }

      if (bestFrom && bestTo) {
        inTree.add(bestTo.id);
        edges.push({
          x1: bestFrom.x,
          y1: bestFrom.y,
          x2: bestTo.x,
          y2: bestTo.y,
          category: cat,
          id: `${bestFrom.id}-${bestTo.id}`,
        });
      }
    }
  }

  return edges;
}

/* ------------------------------------------------------------------ */
/*  Compute category centroids from actual node positions              */
/* ------------------------------------------------------------------ */

function computeCentroids(nodes: PlacedNode[]): Map<Category, { x: number; y: number }> {
  const map = new Map<Category, { x: number; y: number }>();
  const allCategories = Object.keys(CATEGORY_META) as Category[];

  for (const cat of allCategories) {
    const catNodes = nodes.filter((n) => n.category === cat);
    if (catNodes.length === 0) continue;
    const cx = catNodes.reduce((s, n) => s + n.x, 0) / catNodes.length;
    const cy = catNodes.reduce((s, n) => s + n.y, 0) / catNodes.length;
    map.set(cat, { x: cx, y: cy });
  }

  return map;
}

/* ------------------------------------------------------------------ */
/*  Find skill tree paths for a given skill                            */
/* ------------------------------------------------------------------ */

function findPathsForSkill(skillId: string): { from: string; to: string }[] {
  const pathEdges: { from: string; to: string }[] = [];
  for (const path of SKILL_PATHS) {
    if (!path.includes(skillId)) continue;
    for (let i = 0; i < path.length - 1; i++) {
      pathEdges.push({ from: path[i], to: path[i + 1] });
    }
  }
  return pathEdges;
}

function findPathSkillIds(skillId: string): Set<string> {
  const ids = new Set<string>();
  for (const path of SKILL_PATHS) {
    if (path.includes(skillId)) {
      for (const id of path) ids.add(id);
    }
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*  ViewBox zoom/pan hook                                              */
/* ------------------------------------------------------------------ */

function useViewBoxZoomPan(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEWBOX);

  const dragState = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startVbX: number;
    startVbY: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, startVbX: 0, startVbY: 0 });

  const pinchState = useRef<{
    active: boolean;
    initialDist: number;
    initialVb: ViewBox;
    pointers: Map<number, { x: number; y: number }>;
  }>({ active: false, initialDist: 0, initialVb: DEFAULT_VIEWBOX, pointers: new Map() });

  const clampViewBox = useCallback((vb: ViewBox): ViewBox => {
    const w = Math.min(VIEW_SIZE / MIN_SCALE, Math.max(VIEW_SIZE / MAX_SCALE, vb.w));
    const h = Math.min(VIEW_SIZE / MIN_SCALE, Math.max(VIEW_SIZE / MAX_SCALE, vb.h));
    const maxPan = VIEW_SIZE * 0.5;
    const x = Math.min(maxPan, Math.max(-maxPan, vb.x));
    const y = Math.min(maxPan, Math.max(-maxPan, vb.y));
    return { x, y, w, h };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;

      pinchState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchState.current.pointers.size === 2) {
        const pts = Array.from(pinchState.current.pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        pinchState.current.active = true;
        pinchState.current.initialDist = dist;
        pinchState.current.initialVb = { ...viewBox };
        dragState.current.active = false;
        return;
      }

      if (pinchState.current.pointers.size === 1) {
        dragState.current = {
          active: true,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startVbX: viewBox.x,
          startVbY: viewBox.y,
        };
        el.setPointerCapture(e.pointerId);
      }
    },
    [containerRef, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      pinchState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchState.current.active && pinchState.current.pointers.size === 2) {
        const pts = Array.from(pinchState.current.pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratio = pinchState.current.initialDist / dist;
        const initVb = pinchState.current.initialVb;
        const newW = initVb.w * ratio;
        const newH = initVb.h * ratio;
        const cx = initVb.x + initVb.w / 2;
        const cy = initVb.y + initVb.h / 2;
        setViewBox(clampViewBox({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }));
        return;
      }

      if (dragState.current.active && e.pointerId === dragState.current.pointerId) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dxSvg = ((e.clientX - dragState.current.startX) / rect.width) * viewBox.w;
        const dySvg = ((e.clientY - dragState.current.startY) / rect.height) * viewBox.h;
        setViewBox(
          clampViewBox({
            ...viewBox,
            x: dragState.current.startVbX - dxSvg,
            y: dragState.current.startVbY - dySvg,
          }),
        );
      }
    },
    [containerRef, viewBox, clampViewBox],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pinchState.current.pointers.delete(e.pointerId);
    if (pinchState.current.pointers.size < 2) pinchState.current.active = false;
    if (dragState.current.pointerId === e.pointerId) {
      dragState.current.active = false;
      dragState.current.pointerId = null;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 + e.deltaY * 0.001;
      setViewBox((prev) => {
        const rect = el.getBoundingClientRect();
        const mouseX = prev.x + ((e.clientX - rect.left) / rect.width) * prev.w;
        const mouseY = prev.y + ((e.clientY - rect.top) / rect.height) * prev.h;
        const newW = prev.w * factor;
        const newH = prev.h * factor;
        const newX = mouseX - ((e.clientX - rect.left) / rect.width) * newW;
        const newY = mouseY - ((e.clientY - rect.top) / rect.height) * newH;
        return clampViewBox({ x: newX, y: newY, w: newW, h: newH });
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, clampViewBox]);

  const resetViewBox = useCallback(() => setViewBox(DEFAULT_VIEWBOX), []);

  const isTransformed =
    viewBox.x !== 0 || viewBox.y !== 0 || viewBox.w !== VIEW_SIZE || viewBox.h !== VIEW_SIZE;

  return { viewBox, onPointerDown, onPointerMove, onPointerUp, resetViewBox, isTransformed };
}

/* ------------------------------------------------------------------ */
/*  SVG coord to screen coord                                          */
/* ------------------------------------------------------------------ */

function svgToScreen(
  svgX: number,
  svgY: number,
  vb: ViewBox,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: rect.left + ((svgX - vb.x) / vb.w) * rect.width,
    y: rect.top + ((svgY - vb.y) / vb.h) * rect.height,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TechRadar({
  highlightedSkill,
  focusCategory,
  onActionConsumed,
}: TechRadarProps) {
  const { skills: skillsData } = usePortfolioData();
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<DetailCard | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // Dragging state
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }> | null>(
    null,
  );
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const springAnimRef = useRef<number | null>(null);

  // Run force simulation once
  const simulatedNodes = useMemo(() => runForceSimulation(skillsData), [skillsData]);

  // Merge simulated positions with any drag overrides
  const nodes: PlacedNode[] = useMemo(() => {
    if (!nodePositions) return simulatedNodes;
    return simulatedNodes.map((n) => {
      const pos = nodePositions.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });
  }, [simulatedNodes, nodePositions]);

  const constellationEdges = useMemo(() => computeConstellationEdges(nodes), [nodes]);
  const neighborsMap = useMemo(() => computeNeighbors(nodes), [nodes]);
  const centroids = useMemo(() => computeCentroids(nodes), [nodes]);

  const {
    viewBox,
    onPointerDown: vbPointerDown,
    onPointerMove: vbPointerMove,
    onPointerUp: vbPointerUp,
    resetViewBox,
    isTransformed,
  } = useViewBoxZoomPan(containerRef);

  // Path edges for selected skill
  const activePathEdges = useMemo(
    () => (selectedSkill ? findPathsForSkill(selectedSkill) : []),
    [selectedSkill],
  );
  const activePathSkillIds = useMemo(
    () => (selectedSkill ? findPathSkillIds(selectedSkill) : new Set<string>()),
    [selectedSkill],
  );

  // Neighbor connection lines on hover
  const hoverNeighborLines = useMemo(() => {
    if (!hoveredSkill) return [];
    const neighbors = neighborsMap.get(hoveredSkill);
    if (!neighbors) return [];
    const source = nodes.find((n) => n.id === hoveredSkill);
    if (!source) return [];
    return neighbors.map((t) => ({
      x1: source.x,
      y1: source.y,
      x2: t.x,
      y2: t.y,
      id: `neighbor-${source.id}-${t.id}`,
    }));
  }, [hoveredSkill, neighborsMap, nodes]);

  // Handle highlight from tool action
  useEffect(() => {
    if (highlightedSkill) {
      setActiveHighlight(highlightedSkill);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setActiveHighlight(null);
        onActionConsumed?.();
        highlightTimerRef.current = null;
      }, 2500);
    }
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [highlightedSkill, onActionConsumed]);

  // Handle focus category from tool action
  useEffect(() => {
    if (focusCategory) {
      setFocusedCategory(focusCategory);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        setFocusedCategory(null);
        onActionConsumed?.();
        focusTimerRef.current = null;
      }, 5000);
    }
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [focusCategory, onActionConsumed]);

  const isHighlighted = useCallback(
    (name: string) =>
      activeHighlight !== null && name.toLowerCase().includes(activeHighlight.toLowerCase()),
    [activeHighlight],
  );

  // SVG screen coord for detail card
  const showDetailCard = useCallback(
    (node: PlacedNode) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const screen = svgToScreen(node.x, node.y, viewBox, rect);
      setDetailCard({
        node,
        screenX: screen.x - rect.left,
        screenY: screen.y - rect.top,
      });
    },
    [viewBox],
  );

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
        y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
      };
    },
    [viewBox],
  );

  // Pointer handlers
  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };

      // Check if pointer is on a node — start drag
      const target = e.target as Element;
      const nodeEl = target.closest('[data-node-id]');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-node-id');
        if (nodeId) {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) {
            e.stopPropagation();
            const svgPos = screenToSvg(e.clientX, e.clientY);
            dragOffset.current = { dx: node.x - svgPos.x, dy: node.y - svgPos.y };
            setDragNodeId(nodeId);
            containerRef.current?.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      vbPointerDown(e);
    },
    [vbPointerDown, nodes, screenToSvg],
  );

  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragNodeId) {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        const newX = Math.max(30, Math.min(VIEW_SIZE - 30, svgPos.x + dragOffset.current.dx));
        const newY = Math.max(30, Math.min(VIEW_SIZE - 30, svgPos.y + dragOffset.current.dy));

        setNodePositions((prev) => {
          const map = new Map(prev || []);
          // Set dragged node position
          map.set(dragNodeId, { x: newX, y: newY });

          // Mini repulsion from dragged node to nearby nodes
          for (const node of nodes) {
            if (node.id === dragNodeId) continue;
            const nodePos = map.get(node.id) || { x: node.x, y: node.y };
            const dx = nodePos.x - newX;
            const dy = nodePos.y - newY;
            const dist = Math.max(Math.hypot(dx, dy), 1);
            if (dist < 60) {
              const push = ((60 - dist) / 60) * 8;
              const px = (dx / dist) * push;
              const py = (dy / dist) * push;
              map.set(node.id, {
                x: Math.max(30, Math.min(VIEW_SIZE - 30, nodePos.x + px)),
                y: Math.max(30, Math.min(VIEW_SIZE - 30, nodePos.y + py)),
              });
            }
          }
          return map;
        });
        return;
      }
      vbPointerMove(e);
    },
    [dragNodeId, vbPointerMove, screenToSvg, nodes],
  );

  // Spring-back animation: pull node toward its category center after drag
  const startSpringBack = useCallback(
    (nodeId: string) => {
      const node = simulatedNodes.find((n) => n.id === nodeId);
      if (!node) return;
      const target = CATEGORY_META[node.category];
      const vel = { x: 0, y: 0 };

      const animate = () => {
        setNodePositions((prev) => {
          if (!prev) return prev;
          const pos = prev.get(nodeId);
          if (!pos) return prev;

          const dx = target.cx - pos.x;
          const dy = target.cy - pos.y;
          const dist = Math.hypot(dx, dy);

          // Stop when close enough to the cluster area (within 120px)
          if (dist < 120 && Math.hypot(vel.x, vel.y) < 0.5) {
            springAnimRef.current = null;
            return prev;
          }

          // Spring force toward cluster center (only activates when far)
          const pullStrength = dist > 120 ? 0.03 : 0.005;
          vel.x += dx * pullStrength;
          vel.y += dy * pullStrength;
          vel.x *= 0.85;
          vel.y *= 0.85;

          const newX = Math.max(30, Math.min(VIEW_SIZE - 30, pos.x + vel.x));
          const newY = Math.max(30, Math.min(VIEW_SIZE - 30, pos.y + vel.y));

          const map = new Map(prev);
          map.set(nodeId, { x: newX, y: newY });

          // Push nearby nodes aside during spring-back
          for (const other of simulatedNodes) {
            if (other.id === nodeId) continue;
            const op = map.get(other.id) || { x: other.x, y: other.y };
            const odx = op.x - newX;
            const ody = op.y - newY;
            const odist = Math.max(Math.hypot(odx, ody), 1);
            if (odist < 50) {
              const push = ((50 - odist) / 50) * 4;
              map.set(other.id, {
                x: Math.max(30, Math.min(VIEW_SIZE - 30, op.x + (odx / odist) * push)),
                y: Math.max(30, Math.min(VIEW_SIZE - 30, op.y + (ody / odist) * push)),
              });
            }
          }

          return map;
        });

        springAnimRef.current = requestAnimationFrame(animate);
      };

      if (springAnimRef.current) cancelAnimationFrame(springAnimRef.current);
      springAnimRef.current = requestAnimationFrame(animate);
    },
    [simulatedNodes],
  );

  // Cleanup spring animation on unmount
  useEffect(() => {
    return () => {
      if (springAnimRef.current) cancelAnimationFrame(springAnimRef.current);
    };
  }, []);

  const handleContainerPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragNodeId) {
        startSpringBack(dragNodeId);
        setDragNodeId(null);
        return;
      }

      const downPos = pointerDownPos.current;
      vbPointerUp(e);

      if (downPos) {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist < 5) {
          const target = e.target as Element;
          const nodeEl = target.closest('[data-node-id]');
          if (nodeEl) {
            const nodeId = nodeEl.getAttribute('data-node-id');
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
              if (selectedSkill === node.id) {
                setSelectedSkill(null);
                setDetailCard(null);
              } else {
                setSelectedSkill(node.id);
                showDetailCard(node);
              }
            }
          } else {
            setSelectedSkill(null);
            setDetailCard(null);
          }
        }
      }
      pointerDownPos.current = null;
    },
    [dragNodeId, vbPointerUp, nodes, selectedSkill, showDetailCard, startSpringBack],
  );

  // Update detail card position when viewBox changes
  useEffect(() => {
    if (!detailCard) return;
    const el = containerRef.current;
    if (!el) return;
    // Re-find node to get latest position
    const node = nodes.find((n) => n.id === detailCard.node.id);
    if (!node) return;
    const rect = el.getBoundingClientRect();
    const screen = svgToScreen(node.x, node.y, viewBox, rect);
    setDetailCard((prev) =>
      prev ? { ...prev, node, screenX: screen.x - rect.left, screenY: screen.y - rect.top } : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBox, nodes]);

  // Node-level state derivation
  const getNodeState = useCallback(
    (node: PlacedNode) => {
      const highlighted = isHighlighted(node.name);
      const hovered = hoveredSkill === node.id;
      const selected = selectedSkill === node.id;
      const onPath = selectedSkill ? activePathSkillIds.has(node.id) : false;
      const focused = focusedCategory !== null && node.category === focusedCategory;
      const dimmedByFocus = focusedCategory !== null && node.category !== focusedCategory;
      const dimmedBySelection =
        selectedSkill !== null && !onPath && !selected;
      const dimmedByHover =
        hoveredSkill !== null && !hovered && node.category !== nodes.find((n) => n.id === hoveredSkill)?.category;

      const active = highlighted || hovered || focused || selected || onPath;
      let opacity = LEVEL_OPACITY[node.level] || 0.4;
      if (dimmedByFocus) opacity = 0.12;
      if (dimmedBySelection) opacity = 0.12;
      if (dimmedByHover && !dimmedBySelection && !dimmedByFocus) opacity *= 0.3;
      if (active) opacity = 1;
      if (hovered) opacity = 1;

      const size = LEVEL_SIZE[node.level] || 3.5;

      return { highlighted, hovered, selected, onPath, focused, active, opacity, size };
    },
    [isHighlighted, hoveredSkill, selectedSkill, activePathSkillIds, focusedCategory, nodes],
  );

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div className="flex flex-col items-center w-full h-full min-h-[60vh]">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
          Scroll to zoom, drag to pan, drag stars to rearrange
        </span>
        {isTransformed && (
          <button
            onClick={resetViewBox}
            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Constellation area */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-lg"
        style={{ touchAction: 'none' }}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={vbPointerUp}
      >
        <svg
          viewBox={viewBoxStr}
          className="w-full h-full"
          role="img"
          aria-label="Skill Constellation — interactive force-directed skill map"
        >
          <defs>
            {/* Space background gradient */}
            <radialGradient id="space-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(132, 204, 22, 0.015)" />
            </radialGradient>

            {/* Glow gradient for nodes */}
            <radialGradient id="node-glow">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
            </radialGradient>

            {/* Animated dash for skill paths */}
            <style>{`
              @keyframes twinkle {
                0%, 100% { opacity: var(--star-opacity); }
                50% { opacity: 0.02; }
              }
              @keyframes dashFlow {
                to { stroke-dashoffset: -20; }
              }
              .bg-star {
                animation: twinkle 4s ease-in-out infinite;
              }
              .path-edge {
                stroke-dasharray: 6 4;
                animation: dashFlow 1.5s linear infinite;
              }
            `}</style>
          </defs>

          {/* Space background */}
          <rect x="0" y="0" width={VIEW_SIZE} height={VIEW_SIZE} fill="url(#space-bg)" />

          {/* Background stars */}
          {BG_STARS.map((star, i) => (
            <circle
              key={`bg-star-${i}`}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="#84cc16"
              className="bg-star"
              style={
                {
                  '--star-opacity': star.opacity,
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${3 + (i % 4) * 1.5}s`,
                } as React.CSSProperties
              }
            />
          ))}

          {/* Constellation edges (within category) */}
          {constellationEdges.map((edge) => {
            const isFocusedCat = focusedCategory === edge.category;
            const hoveredCat = hoveredSkill
              ? nodes.find((n) => n.id === hoveredSkill)?.category
              : null;
            const isHoveredCat = hoveredCat === edge.category;
            let edgeOpacity = 0.08;
            if (isFocusedCat) edgeOpacity = 0.2;
            if (isHoveredCat) edgeOpacity = 0.25;
            if (focusedCategory && !isFocusedCat) edgeOpacity = 0.03;
            if (selectedSkill && !activePathSkillIds.has(edge.id.split('-')[0])) edgeOpacity = 0.03;

            return (
              <motion.line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke="#84cc16"
                strokeWidth={0.5}
                animate={{ opacity: edgeOpacity }}
                transition={{ duration: 0.4 }}
              />
            );
          })}

          {/* Skill tree path edges (on selection) */}
          <AnimatePresence>
            {selectedSkill &&
              activePathEdges.map((pe) => {
                const fromNode = nodes.find((n) => n.id === pe.from);
                const toNode = nodes.find((n) => n.id === pe.to);
                if (!fromNode || !toNode) return null;
                return (
                  <motion.line
                    key={`path-${pe.from}-${pe.to}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#84cc16"
                    strokeWidth={2}
                    className="path-edge"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                );
              })}
          </AnimatePresence>

          {/* Neighbor lines on hover */}
          <AnimatePresence>
            {hoverNeighborLines.map((line) => (
              <motion.line
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#84cc16"
                strokeWidth={0.5}
                strokeDasharray="4 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </AnimatePresence>

          {/* Category labels at centroids */}
          {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
            const centroid = centroids.get(cat);
            if (!centroid) return null;
            const isFocused = focusedCategory === cat;
            let labelOpacity = 0.5;
            if (isFocused) labelOpacity = 0.9;
            if (focusedCategory && !isFocused) labelOpacity = 0.15;

            return (
              <motion.text
                key={`cat-label-${cat}`}
                x={centroid.x}
                y={centroid.y - (cat === 'hobby' ? 30 : 50)}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={11}
                fontWeight={isFocused ? 700 : 400}
                letterSpacing="0.15em"
                className="cursor-pointer select-none"
                animate={{ opacity: labelOpacity, fill: isFocused ? '#84cc16' : '#6b7280' }}
                transition={{ duration: 0.4 }}
                onPointerUp={(e) => {
                  const downPos = pointerDownPos.current;
                  if (downPos) {
                    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
                    if (dist < 5) {
                      e.stopPropagation();
                      if (focusTimerRef.current) {
                        clearTimeout(focusTimerRef.current);
                        focusTimerRef.current = null;
                      }
                      setFocusedCategory((prev) => (prev === cat ? null : cat));
                    }
                  }
                }}
                data-node-id="__label__"
              >
                {CATEGORY_META[cat].label}
              </motion.text>
            );
          })}

          {/* Skill nodes */}
          {nodes.map((node, i) => {
            const state = getNodeState(node);
            const glowRadius = state.size * 3;

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className="cursor-pointer"
                onPointerEnter={() => {
                  if (!dragNodeId) setHoveredSkill(node.id);
                }}
                onPointerLeave={() => {
                  if (!dragNodeId) setHoveredSkill(null);
                }}
              >
                {/* Glow halo */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={state.hovered ? glowRadius * 1.5 : glowRadius}
                  fill="#84cc16"
                  animate={{
                    opacity: state.hovered
                      ? 0.25
                      : state.active
                        ? 0.12
                        : 0.06 * (LEVEL_OPACITY[node.level] || 0.4),
                  }}
                  transition={{ duration: 0.3 }}
                />

                {/* Highlight glow ring */}
                {state.highlighted && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={state.size + 10}
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth={2}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}

                {/* Star node */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  fill="#84cc16"
                  initial={{ r: 0, opacity: 0 }}
                  animate={{
                    r: state.hovered ? state.size * 1.3 : state.size,
                    opacity: state.opacity,
                    scale: [0.92, 1.08, 0.92],
                  }}
                  transition={{
                    r: { delay: i * 0.015, duration: 0.5, ease: 'easeOut' },
                    opacity: { delay: i * 0.015, duration: 0.5, ease: 'easeOut' },
                    scale: {
                      duration: 3 + (i % 5) * 0.7,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: (i % 7) * 0.5,
                    },
                  }}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />

                {/* Label — always visible */}
                <motion.text
                  x={node.x}
                  y={node.y - state.size - 6}
                  textAnchor="middle"
                  fontSize={state.hovered || state.selected ? 12 : 9}
                  fontWeight={state.hovered || state.selected ? 700 : 400}
                  fill={state.active ? '#84cc16' : '#9ca3af'}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: state.hovered || state.selected
                      ? 1
                      : state.active
                        ? 0.9
                        : state.opacity * 0.7,
                  }}
                  transition={{ delay: i * 0.015 + 0.2, duration: 0.3 }}
                  className="pointer-events-none select-none"
                >
                  {node.name}
                </motion.text>
              </g>
            );
          })}
        </svg>

        {/* Detail card overlay */}
        <AnimatePresence>
          {detailCard && (
            <motion.div
              key={detailCard.node.id}
              className="absolute z-10 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg shadow-lg p-3 pointer-events-auto"
              style={{
                left: detailCard.screenX,
                top: detailCard.screenY,
                transform: 'translate(-50%, -120%)',
                minWidth: 160,
                maxWidth: 240,
              }}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <button
                className="absolute top-1.5 right-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none"
                onClick={() => {
                  setDetailCard(null);
                  setSelectedSkill(null);
                }}
                aria-label="Dismiss"
              >
                x
              </button>

              <p className="text-sm font-bold text-lime-500 pr-4 leading-tight">
                {detailCard.node.name}
              </p>

              <span className="inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-500">
                {LEVEL_LABELS[detailCard.node.level] || detailCard.node.level}
              </span>

              {detailCard.node.years && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  {detailCard.node.years} year{detailCard.node.years !== 1 ? 's' : ''} experience
                </p>
              )}

              {/* Show connected paths */}
              {activePathEdges.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                    Skill Tree
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(activePathSkillIds)
                      .filter((id) => id !== detailCard.node.id)
                      .slice(0, 6)
                      .map((id) => {
                        const n = nodes.find((nd) => nd.id === id);
                        return n ? (
                          <span
                            key={id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300"
                          >
                            {n.name}
                          </span>
                        ) : null;
                      })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
