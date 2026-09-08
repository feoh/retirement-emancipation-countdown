import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MotionPreference } from "./domain/settings";

type AnimationMode = "full" | "ambient";

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const COLORS = ["#6ee7a8", "#ffd166", "#ff8fab", "#8ec5ff", "#f5f3ff"];
const MAX_PARTICLES = 320;

function FireworksCanvas({
  mode,
  onFullShowComplete,
}: {
  mode: AnimationMode;
  onFullShowComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onFullShowComplete);

  useEffect(() => {
    onCompleteRef.current = onFullShowComplete;
  }, [onFullShowComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const activeCanvas: HTMLCanvasElement = canvas;
    const activeContext: CanvasRenderingContext2D = context;

    let frameId = 0;
    let startTime = 0;
    let lastBurst = 0;
    let hiddenAt = document.hidden ? performance.now() : 0;
    let running = !document.hidden;
    const particles: Particle[] = [];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = activeCanvas.getBoundingClientRect();
      activeCanvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      activeCanvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      activeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function burst() {
      const width = activeCanvas.clientWidth;
      const height = activeCanvas.clientHeight;
      const count = mode === "full" ? 44 : 16;
      const originX = width * (0.15 + Math.random() * 0.7);
      const originY = height * (0.15 + Math.random() * 0.45);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let index = 0; index < count; index++) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.16;
        const speed = (mode === "full" ? 1.8 : 0.8) + Math.random() * 2.4;
        const maxLife = 55 + Math.random() * 35;
        particles.push({
          x: originX,
          y: originY,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color,
          size: 1.2 + Math.random() * 1.8,
        });
      }
      if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }
    }

    function draw(timestamp: number) {
      if (!running) return;
      if (startTime === 0) startTime = timestamp;
      const burstInterval = mode === "full" ? 380 : 2200;
      if (timestamp - lastBurst >= burstInterval) {
        burst();
        lastBurst = timestamp;
      }

      activeContext.clearRect(
        0,
        0,
        activeCanvas.clientWidth,
        activeCanvas.clientHeight,
      );
      activeContext.globalCompositeOperation = "lighter";
      for (let index = particles.length - 1; index >= 0; index--) {
        const particle = particles[index];
        particle.velocityY += 0.025;
        particle.velocityX *= 0.992;
        particle.velocityY *= 0.992;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.life -= 1;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        activeContext.globalAlpha = particle.life / particle.maxLife;
        activeContext.fillStyle = particle.color;
        activeContext.beginPath();
        activeContext.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2,
        );
        activeContext.fill();
      }
      activeContext.globalAlpha = 1;
      activeContext.globalCompositeOperation = "source-over";

      if (mode === "full" && timestamp - startTime >= 8_000) {
        onCompleteRef.current();
        return;
      }
      frameId = window.requestAnimationFrame(draw);
    }

    function handleVisibility() {
      running = !document.hidden;
      window.cancelAnimationFrame(frameId);
      if (!running) {
        hiddenAt = performance.now();
        return;
      }
      if (hiddenAt > 0 && startTime > 0) {
        startTime += performance.now() - hiddenAt;
      }
      hiddenAt = 0;
      frameId = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    frameId = window.requestAnimationFrame(draw);
    return () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      particles.length = 0;
    };
  }, [mode]);

  return <canvas ref={canvasRef} className="fireworks" aria-hidden="true" />;
}

function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function shouldReduceMotion(
  motion: MotionPreference,
  systemReduced: boolean,
): boolean {
  return motion === "always" || (motion === "system" && systemReduced);
}

interface RetirementCelebrationProps {
  motion: MotionPreference;
  firstVisit: boolean;
  onFirstVisit: () => void;
  children: ReactNode;
}

export function RetirementCelebration({
  motion,
  firstVisit,
  onFirstVisit,
  children,
}: RetirementCelebrationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const systemReduced = useSystemReducedMotion();
  const reduceMotion = shouldReduceMotion(motion, systemReduced);
  const firstVisitRecorded = useRef(false);
  const [playAnyway, setPlayAnyway] = useState(false);
  const [animation, setAnimation] = useState<AnimationMode>(() =>
    firstVisit && !reduceMotion ? "full" : "ambient",
  );

  useEffect(() => {
    if (firstVisit && !firstVisitRecorded.current) {
      firstVisitRecorded.current = true;
      headingRef.current?.focus();
      onFirstVisit();
    }
  }, [firstVisit, onFirstVisit]);

  const showAnimation = !reduceMotion || playAnyway;
  const effectiveAnimation = showAnimation ? animation : null;

  return (
    <section className="celebration" aria-labelledby="celebration-title">
      {effectiveAnimation ? (
        <FireworksCanvas
          mode={effectiveAnimation}
          onFullShowComplete={() => setAnimation("ambient")}
        />
      ) : (
        <div className="static-fireworks" aria-hidden="true">
          <span>✦</span>
          <span>✺</span>
          <span>✦</span>
        </div>
      )}

      <div className="celebration-content">
        <p className="eyebrow">The countdown is complete</p>
        <h2 ref={headingRef} id="celebration-title" tabIndex={-1}>
          You did it.
        </h2>
        <p className="celebration-lede">
          Your time is yours now. No agenda, no action items, no follow-up
          required.
        </p>
        {children}
        <div className="celebration-actions">
          {animation === "full" && effectiveAnimation && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setAnimation("ambient")}
            >
              Continue
            </button>
          )}
          {reduceMotion && !playAnyway ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setPlayAnyway(true);
                setAnimation("full");
              }}
            >
              Play fireworks anyway
            </button>
          ) : (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setAnimation("full")}
            >
              Replay the show
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
