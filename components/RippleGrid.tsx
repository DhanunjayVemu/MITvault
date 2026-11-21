"use client";

import { useEffect, useRef } from "react";

// A full-viewport grid that ripples outward from the cursor like rings on
// water — the lines actually bend, and the rings keep travelling outward
// continuously rather than just sitting fixed under the pointer.
export default function RippleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SPACING = 44; // grid cell size, px
    const SEGMENT = 10; // px per subdivided step along a line (smaller = smoother curve)
    const MAX_RADIUS = 260; // how far a ripple's influence reaches, px
    const AMPLITUDE = 7; // peak displacement, px
    const WAVELENGTH = 46; // px per ripple ring
    const SPEED = 0.09; // ring travel speed (radians per frame-ish)
    const BRIGHT_ALPHA = 0.55; // opacity of the grid right at the cursor (fades to 0 by MAX_RADIUS)

    let width = 0;
    let height = 0;
    let dpr = 1;
    let gridColor = "rgba(0,0,0,0.06)";
    let raf = 0;
    let time = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    const readGridColor = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--grid-line").trim();
      if (value) gridColor = value;
    };

    // Swaps the alpha channel of an "rgba(r, g, b, a)" string, so the glow
    // can reuse the theme's own grid-line color instead of a hardcoded one.
    const withAlpha = (rgba: string, alpha: number) => {
      const match = rgba.match(/rgba?\(([^)]+)\)/);
      if (!match) return rgba;
      const [r, g, b] = match[1].split(",").map((part) => part.trim());
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const displace = (x: number, y: number): [number, number] => {
      if (!mouse.active) return [x, y];
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MAX_RADIUS || dist < 0.001) return [x, y];
      const falloff = 1 - dist / MAX_RADIUS;
      const wave = Math.sin(dist / WAVELENGTH - time * SPEED);
      const magnitude = AMPLITUDE * wave * falloff * falloff;
      const nx = dx / dist;
      const ny = dy / dist;
      return [x + nx * magnitude, y + ny * magnitude];
    };

    const drawLine = (points: [number, number][]) => {
      context.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    };

    const drawBrightOverlay = () => {
      if (!mouse.active) return;

      const gradient = context.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MAX_RADIUS);
      gradient.addColorStop(0, withAlpha(gridColor, BRIGHT_ALPHA));
      gradient.addColorStop(1, withAlpha(gridColor, 0));
      context.strokeStyle = gradient;
      context.lineWidth = 1.4;

      // Only redraw the small patch of lines that fall inside the glow
      // radius — the gradient itself handles the actual fade, this just
      // limits the (re)work to the area around the cursor.
      const minX = Math.max(0, Math.floor((mouse.x - MAX_RADIUS) / SPACING) * SPACING);
      const maxX = Math.min(width, Math.ceil((mouse.x + MAX_RADIUS) / SPACING) * SPACING);
      const minY = Math.max(0, Math.floor((mouse.y - MAX_RADIUS) / SPACING) * SPACING);
      const maxY = Math.min(height, Math.ceil((mouse.y + MAX_RADIUS) / SPACING) * SPACING);

      for (let x = minX; x <= maxX; x += SPACING) {
        const pts: [number, number][] = [];
        for (let y = minY; y <= maxY; y += SEGMENT) pts.push(displace(x, y));
        pts.push(displace(x, maxY));
        drawLine(pts);
      }
      for (let y = minY; y <= maxY; y += SPACING) {
        const pts: [number, number][] = [];
        for (let x = minX; x <= maxX; x += SEGMENT) pts.push(displace(x, y));
        pts.push(displace(maxX, y));
        drawLine(pts);
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.strokeStyle = gridColor;
      context.lineWidth = 1;

      for (let x = 0; x <= width; x += SPACING) {
        const pts: [number, number][] = [];
        for (let y = 0; y <= height; y += SEGMENT) pts.push(displace(x, y));
        pts.push(displace(x, height));
        drawLine(pts);
      }
      for (let y = 0; y <= height; y += SPACING) {
        const pts: [number, number][] = [];
        for (let x = 0; x <= width; x += SEGMENT) pts.push(displace(x, y));
        pts.push(displace(width, y));
        drawLine(pts);
      }

      drawBrightOverlay();
    };

    const loop = () => {
      time += 1;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handlePointerLeave = () => {
      mouse.active = false;
      draw();
    };

    readGridColor();
    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    const themeObserver = new MutationObserver(readGridColor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    if (!prefersReducedMotion) raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      themeObserver.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" />;
}
