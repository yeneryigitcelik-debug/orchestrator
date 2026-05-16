"use client";

import { useEffect, useRef } from "react";

/**
 * Matrix dijital yağmuru — tam ekran sabit canvas, içeriğin arkasında (z-0).
 * Panel boşluklarında / header altında düşük opaklıkla görünür.
 * prefers-reduced-motion açıksa animasyon yerine statik seyrek alan çizilir.
 */

const GLYPHS =
  "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ｱｲｳｴｵｶｷｸ:.=*+<>";

export function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FONT = 15;
    let cols = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / FONT);
      drops = Array.from({ length: cols }, () =>
        Math.floor((Math.random() * -canvas.height) / FONT),
      );
      ctx.font = `${FONT}px ui-monospace, monospace`;
      ctx.textBaseline = "top";
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let last = 0;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 60) return; // ~16fps — akıcı ama hafif
      last = t;

      // İz bırakan solma katmanı (bg-deep ile aynı renk)
      ctx.fillStyle = "rgba(0, 6, 0, 0.10)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < cols; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        const x = i * FONT;
        const y = drops[i] * FONT;

        // Ara sıra beyaz-yeşil "lider" karakter
        ctx.fillStyle = Math.random() > 0.97 ? "#d6ffd9" : "#37e85f";
        ctx.fillText(ch, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = Math.floor(Math.random() * -40);
        }
        drops[i]++;
      }
    };

    if (reduced) {
      ctx.fillStyle = "#000600";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(55, 232, 95, 0.18)";
      for (let i = 0; i < cols; i++) {
        const n = Math.floor(Math.random() * 6);
        for (let j = 0; j < n; j++) {
          const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          ctx.fillText(ch, i * FONT, Math.random() * canvas.height);
        }
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="matrix-rain" aria-hidden="true" />;
}
