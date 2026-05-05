"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { getOrCreateCursorIcon } from "@/lib/icons/getSessionIcon";

function subscribeToSessionIcon(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function getClientIconSnapshot() {
  return getOrCreateCursorIcon();
}

function getServerIconSnapshot() {
  return "bridge-mini.png";
}

function subscribeToPointerCapability(onStoreChange: () => void) {
  const pointerQuery = window.matchMedia("(pointer: fine)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  pointerQuery.addEventListener("change", onStoreChange);
  motionQuery.addEventListener("change", onStoreChange);

  return () => {
    pointerQuery.removeEventListener("change", onStoreChange);
    motionQuery.removeEventListener("change", onStoreChange);
  };
}

function getClientPointerSnapshot() {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getServerPointerSnapshot() {
  return false;
}

export function CursorCompanion() {
  const icon = useSyncExternalStore(
    subscribeToSessionIcon,
    getClientIconSnapshot,
    getServerIconSnapshot,
  );
  const enabled = useSyncExternalStore(
    subscribeToPointerCapability,
    getClientPointerSnapshot,
    getServerPointerSnapshot,
  );
  const companionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !companionRef.current) return;

    const companion = companionRef.current;
    const target = { x: -80, y: -80 };
    const current = { x: -80, y: -80 };
    let frameId = 0;
    let hasPointer = false;

    function scheduleAnimation() {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    function handleMouseMove(event: MouseEvent) {
      target.x = event.clientX + 14;
      target.y = event.clientY + 14;

      if (!hasPointer) {
        current.x = target.x;
        current.y = target.y;
        companion.style.opacity = "0.7";
        hasPointer = true;
      }

      scheduleAnimation();
    }

    function handleMouseLeave() {
      hasPointer = false;
      companion.style.opacity = "0";
    }

    function animate() {
      frameId = 0;

      if (!hasPointer || document.hidden) return;

      current.x += (target.x - current.x) * 0.15;
      current.y += (target.y - current.y) * 0.15;
      companion.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

      if (
        Math.abs(target.x - current.x) > 0.2 ||
        Math.abs(target.y - current.y) > 0.2
      ) {
        scheduleAnimation();
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [enabled, icon]);

  if (!enabled) return null;

  return (
    <div
      ref={companionRef}
      aria-hidden="true"
      className="fixed left-0 top-0 z-[9999] size-5 opacity-0 transition-opacity duration-200 [image-rendering:pixelated]"
      style={{
        pointerEvents: "none",
        transform: "translate3d(-80px, -80px, 0)",
      }}
    >
      <Image
        src={`/icons/${icon}`}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="h-full w-full object-contain [image-rendering:pixelated]"
        draggable={false}
      />
    </div>
  );
}
