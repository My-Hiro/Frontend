import { useEffect, useState } from "react";

interface PointerPosition {
  x: number;
  y: number;
  visible: boolean;
}

interface Props {
  active: boolean;
  targetSelector: string | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function TourPointer({ active, targetSelector }: Props) {
  const [position, setPosition] = useState<PointerPosition>({ x: 0, y: 0, visible: false });

  useEffect(() => {
    if (!active || !targetSelector) {
      setPosition({ x: 0, y: 0, visible: false });
      return;
    }

    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const update = () => {
      if (window.innerWidth < 980) {
        setPosition((current) => (current.visible ? { x: 0, y: 0, visible: false } : current));
        return;
      }
      const target = document.querySelector(targetSelector);
      if (!(target instanceof HTMLElement)) {
        setPosition((current) => (current.visible ? { ...current, visible: false } : current));
        return;
      }

      const rect = target.getBoundingClientRect();
      const x = clamp(rect.right - 16, 14, window.innerWidth - 72);
      const y = clamp(rect.bottom - 14, 14, window.innerHeight - 84);

      setPosition((current) => {
        if (current.visible && Math.abs(current.x - x) < 1 && Math.abs(current.y - y) < 1) {
          return current;
        }
        return { x, y, visible: true };
      });
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
      window.visualViewport.addEventListener("scroll", schedule);
    }

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(schedule);
      const target = document.querySelector(targetSelector);
      if (target instanceof Element) {
        resizeObserver.observe(target);
      }
      resizeObserver.observe(document.documentElement);
    }

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(schedule);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", schedule);
        window.visualViewport.removeEventListener("scroll", schedule);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [active, targetSelector]);

  if (!position.visible) {
    return null;
  }

  return (
    <div
      className="tour-pointer"
      style={{
        left: position.x,
        top: position.y
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 90" className="tour-pointer-svg">
        <path
          d="M22 13c0-5 8-6 9 0v20h2V7c0-5 8-6 9 0v26h2V11c0-5 8-6 9 0v22h2V17c0-5 8-6 9 0v35c0 16-12 28-28 28h-3c-12 0-22-10-22-22V35c0-5 8-6 9 0v17h2V13z"
          className="tour-pointer-fill"
        />
        <circle cx="62" cy="15" r="9" className="tour-pointer-pulse" />
      </svg>
    </div>
  );
}
