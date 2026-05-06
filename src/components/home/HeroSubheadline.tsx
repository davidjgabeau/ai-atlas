"use client";

import { useEffect, useState } from "react";

type HeroSubheadlineProps = {
  count: number;
};

export function HeroSubheadline({ count }: HeroSubheadlineProps) {
  const [displayCount, setDisplayCount] = useState(() =>
    getTicketStartValue(count),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const timeoutId = window.setTimeout(() => setDisplayCount(count), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const startValue = getTicketStartValue(count);
    const duration = 900;
    let frameId = 0;
    let startTime = 0;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(
        startValue + (count - startValue) * easedProgress,
      );

      setDisplayCount(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [count]);

  return (
    <p
      className="text-body mt-5 text-[18px] leading-[1.45] text-[#4F4A43] md:mt-5 md:text-[17px] md:leading-[1.5]"
      aria-label={`${count} early-stage AI companies across consumer, healthcare, infrastructure, and more.`}
    >
      <span className="hero-count-ticket" aria-hidden="true">
        {displayCount}
      </span>{" "}
      <span className="lg:hidden">
        early-stage AI {count === 1 ? "company" : "companies"} across consumer,
        healthcare, infrastructure, and more.
      </span>
      <span className="hidden lg:inline">
        AI {count === 1 ? "startup" : "startups"} across consumer, healthcare,
        infrastructure, and more.
      </span>
    </p>
  );
}

function getTicketStartValue(count: number) {
  return Math.max(0, count - 8);
}
