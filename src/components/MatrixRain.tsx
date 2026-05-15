"use client";

import { useEffect, useRef } from "react";

/**
 * Dijital yağmur — klasik matrix efekti. Sayfa arka planında, düşük opaklıkta
 * (.matrix-rain CSS class'ı opaklığı + konumu yönetir). İçeriğin altında durur.
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Karakter havuzu: katakana + rakam + birkaç latin — matrix dokusu
    const GLYPHS =
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789:.=*+-<>¦".split("");
    const FONT_SIZE = 15;

    let columns = 0;
    let drops: number[] = [];
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(window.innerWidth / FONT_SIZE);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * window.innerHeight) / FONT_SIZE),
      );
    };
    resize();

    let last = 0;
    const FRAME_MS = 55; // akış hızı

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < FRAME_MS) return;
      last = t;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Yarı saydam siyah dikdörtgen — iz (trail) etkisi
      ctx.fillStyle = "rgba(6, 8, 7, 0.09)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px "IBM Plex Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Baş karakter parlak, gerisi sönük yeşil
        ctx.fillStyle = Math.random() > 0.94 ? "#9affc0" : "#43f57f";
        ctx.fillText(glyph, x, y);

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    raf = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-rain" aria-hidden="true" />;
}
