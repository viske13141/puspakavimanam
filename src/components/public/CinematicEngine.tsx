import { useEffect, useRef, useCallback, useState } from "react";
import { useReducedMotion } from "motion/react";

// ─── Canvas engine ────────────────────────────────────────────────────────────

interface EngineProps {
  frames: string[];
  poster?: string;
  /** px height of the outer scroll container */
  scrollHeight: number;
  /** ref to the outer scroll container so we can measure its position */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** called with 0–1 progress whenever scroll changes */
  onProgress?: (p: number) => void;
}

export function CinematicFrameCanvas({
  frames,
  poster,
  scrollHeight,
  containerRef,
  onProgress,
}: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentIdxRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const total = frames.length;
  const reduceMotion = useReducedMotion();

  // Draw frame at index
  const draw = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imagesRef.current[idx];
    if (!img) {
      // find nearest loaded frame
      let best = -1;
      for (let d = 1; d < total; d++) {
        if (idx - d >= 0 && imagesRef.current[idx - d]) { best = idx - d; break; }
        if (idx + d < total && imagesRef.current[idx + d]) { best = idx + d; break; }
      }
      if (best < 0) return;
      return draw(best);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: cw, height: ch } = canvas;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }, [total]);

  // RAF loop — only repaints when dirty
  useEffect(() => {
    function loop() {
      if (dirtyRef.current) {
        draw(currentIdxRef.current);
        dirtyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  // Resize canvas to DPR
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    dirtyRef.current = true;
  }, []);

  // Scroll → frame index
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / (scrollHeight - window.innerHeight)));
    onProgress?.(progress);
    const idx = Math.min(total - 1, Math.floor(progress * (total - 1)));
    if (idx !== currentIdxRef.current) {
      currentIdxRef.current = idx;
      dirtyRef.current = true;
    }
  }, [containerRef, scrollHeight, total, onProgress]);

  // Progressive frame loading
  useEffect(() => {
    if (total === 0) return;
    imagesRef.current = new Array(total).fill(null);
    let cancelled = false;

    const loadAt = (i: number) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[i] = img;
        if (i === 0 || currentIdxRef.current === i) dirtyRef.current = true;
      };
      img.src = frames[i];
    };

    loadAt(0); // first frame immediately
    let i = 1;
    const iv = setInterval(() => {
      if (cancelled || i >= total) { clearInterval(iv); return; }
      loadAt(i++);
    }, 25);

    return () => { cancelled = true; clearInterval(iv); };
  }, [frames, total]);

  // ResizeObserver
  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [resize]);

  // Scroll listener
  useEffect(() => {
    if (reduceMotion) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll, reduceMotion]);

  if (reduceMotion) {
    return (
      <div className="absolute inset-0">
        {poster && <img src={poster} alt="" className="h-full w-full object-cover" />}
      </div>
    );
  }

  return (
    <>
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
        />
      )}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      />
    </>
  );
}

// ─── Scroll-progress hook ─────────────────────────────────────────────────────

export function useScrollProgress(
  containerRef: React.RefObject<HTMLDivElement | null>,
  scrollHeight: number,
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / (scrollHeight - window.innerHeight)));
      setProgress(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [containerRef, scrollHeight]);

  return progress;
}

// ─── Overlay panel — fades in/out at scroll range ────────────────────────────

interface OverlayPanelProps {
  /** 0–1 scroll progress range when this panel is visible */
  start: number;
  end: number;
  progress: number;
  children: React.ReactNode;
  className?: string;
}

export function CinematicOverlayPanel({
  start,
  end,
  progress,
  children,
  className = "",
}: OverlayPanelProps) {
  const fadeZone = 0.04; // fraction of total scroll for fade in/out
  let opacity = 0;
  if (progress >= start && progress <= end) {
    const fadeIn = Math.min(1, (progress - start) / fadeZone);
    const fadeOut = Math.min(1, (end - progress) / fadeZone);
    opacity = Math.min(fadeIn, fadeOut);
  }

  const visible = opacity > 0;

  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 transition-none ${className}`}
      style={{
        opacity,
        pointerEvents: visible ? "auto" : "none",
        zIndex: 10,
      }}
    >
      {children}
    </div>
  );
}

// ─── Full cinematic experience container ──────────────────────────────────────

interface CinematicExperienceProps {
  frames: string[];
  poster?: string;
  scrollHeight?: number;
  children: (progress: number) => React.ReactNode;
  /** Rendered after the cinematic section (footer etc.) */
  after?: React.ReactNode;
}

export function CinematicExperience({
  frames,
  poster,
  scrollHeight = 5000,
  children,
  after,
}: CinematicExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const reduceMotion = useReducedMotion();

  // Also drive progress from canvas engine callback
  const handleProgress = useCallback((p: number) => setProgress(p), []);

  if (reduceMotion) {
    return (
      <>
        <div className="relative min-h-screen overflow-hidden">
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0" style={{ zIndex: 10 }}>
            {children(0)}
          </div>
        </div>
        {after}
      </>
    );
  }

  return (
    <>
      {/* Outer scroll container — its height drives the animation */}
      <div ref={containerRef} style={{ height: scrollHeight }} className="relative">
        {/* Sticky viewport — stays fixed while user scrolls through scrollHeight */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Layer 0+1: poster + canvas */}
          <CinematicFrameCanvas
            frames={frames}
            poster={poster}
            scrollHeight={scrollHeight}
            containerRef={containerRef}
            onProgress={handleProgress}
          />
          {/* Layer 2+: overlay content driven by progress */}
          <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: "none" }}>
            {children(progress)}
          </div>
        </div>
      </div>
      {after}
    </>
  );
}
