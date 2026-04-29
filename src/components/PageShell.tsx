import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import ParticleBackground from "@/components/ParticleBackground";

interface PageShellProps {
  children: React.ReactNode;
  /** Show animated three.js particle backdrop. Off by default in Calm Hotel. */
  withParticles?: boolean;
  /** Show diffuse warm spotlight orbs. Off by default for a quieter feel. */
  withSpotlights?: boolean;
  /** Show subtle paper-grain texture overlay. */
  withGrain?: boolean;
  /** Padding preset. */
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  /** Scroll the inner area instead of the outer (for app pages with sticky nav). */
  scrollable?: boolean;
}

/**
 * Reusable page shell — "Calm Hotel" backdrop.
 *
 * The default look is intentionally quiet: warm ivory background, no particles,
 * no spotlight orbs, just generous whitespace and an optional paper grain.
 * Pages that want the legacy livelier backdrop can opt back in via the
 * `withParticles` / `withSpotlights` props.
 */
const PageShell: React.FC<PageShellProps> = ({
  children,
  withParticles = false,
  withSpotlights = false,
  withGrain = false,
  padding = "md",
  className = "",
  scrollable = false,
}) => {
  useEffect(() => {
    AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 30 });
  }, []);

  const padCls =
    padding === "none"
      ? ""
      : padding === "sm"
      ? "p-3 sm:p-4"
      : padding === "lg"
      ? "p-6 sm:p-10"
      : "p-4 sm:p-6";

  return (
    <div
      className={`relative min-h-screen w-full bg-background text-foreground overflow-x-hidden ${
        scrollable ? "overflow-y-auto scrollbar-thin" : ""
      } ${padCls} ${className} ${withGrain ? "bg-grain" : ""}`}
    >
      {withParticles && <ParticleBackground color="#a98f6f" count={180} opacity={0.16} />}
      {withSpotlights && (
        <>
          <div
            aria-hidden="true"
            className="spotlight spotlight-violet"
            style={{ width: "44vw", height: "44vw", top: "-12%", left: "-12%" }}
          />
          <div
            aria-hidden="true"
            className="spotlight spotlight-pink"
            style={{ width: "36vw", height: "36vw", bottom: "-14%", right: "-10%" }}
          />
        </>
      )}
      <div className="relative z-10 page-fade-in">{children}</div>
    </div>
  );
};

export default PageShell;
