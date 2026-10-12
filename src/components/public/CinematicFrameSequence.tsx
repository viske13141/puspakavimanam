import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "motion/react";

export interface CinematicFrameSequenceProps {
  frames: string[];
  /** Total scroll height in px that drives the full animation */
  scrollHeight?: number;
  /** Poster shown before first frame loads */
  poster?: string;
  /** Content overlaid on top of the canvas */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Renders a scroll-driven frame sequence on an HTML canvas.
 * Frames are loaded progressively; the canvas always shows the nearest
 * already-loaded frame so there are no blank flashes.
 */
export function CinematicFrameSequence({
  frames,
  scrollHeight = 4000,
  poster,
  children,
  className = "",
}: CinematicFrameSequenceProps) {
  const reduceMotion = useReducedMotion();
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);

  const total = frames.length;

  // Draw a specific frame index onto the canvas
  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imagesRef.current[idx];
    if (!img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: cw, height: ch } = canvas;
    // Cover-fit
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh);
  }, []);

  // Resize canvas to match device pixel ratio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    dirtyRef.current = true;
  }, []);

  // Scroll handler — maps scroll progress to frame index
  const onScroll = useCallback(() => {
    const el = stickyRef.current;
    if (!el) return;
    const rect = el.parentElement!.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / (scrollHeight - window.innerHeight)));
    const idx = Math.min(total - 1, Math.floor(progress * total));
    if (idx !== currentFrameRef.current) {
      currentFrameRef.current = idx;
      dirtyRef.current = true;
    }
  }, [total, scrollHeight]);

  // RAF render loop — only repaints when dirty
  useEffect(() => {
    function loop() {
      if (dirtyRef.current) {
        drawFrame(currentFrameRef.current);
        dirtyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // Load frames progressively: first frame immediately, rest in batches
  useEffect(() => {
    if (total === 0) return;
    imagesRef.current = new Array(total).fill(null);

    function loadAt(i: number) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        imagesRef.current[i] = img;
        // If this is the first loaded frame, draw immediately
        if (i === 0 || (currentFrameRef.current === i)) {
          dirtyRef.current = true;
        }
      };
      img.src = frames[i];
    }

    // Load frame 0 first (poster replacement)
    loadAt(0);

    // Load remaining frames with a small stagger to avoid network congestion
    let i = 1;
    const interval = setInterval(() => {
      if (i >= total) { clearInterval(interval); return; }
      loadAt(i);
      i++;
    }, 30);

    return () => clearInterval(interval);
  }, [frames, total]);

  // Resize observer
  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  // Scroll listener
  useEffect(() => {
    if (reduceMotion) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll, reduceMotion]);

  // Reduced-motion: just show poster/first frame statically
  if (reduceMotion) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ height: "100vh" }}>
        {poster && (
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {children}
      </div>
    );
  }

  return (
    <div style={{ height: scrollHeight }} className={`relative ${className}`}>
      <div ref={stickyRef} className="sticky top-0 h-screen overflow-hidden">
        {/* Poster shown until first frame paints */}
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
          className="absolute inset-0 h-full w-full"
          style={{ zIndex: 1 }}
          aria-hidden="true"
        />
        {children && (
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
