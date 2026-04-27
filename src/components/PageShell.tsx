import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import ParticleBackground from "@/components/ParticleBackground";

interface PageShellProps {
  children: React.ReactNode;
  /** Show animated three.js particle backdrop. */
  withParticles?: boolean;
  /** Show diffuse spotlight orbs (cheap CSS, always safe). */
  withSpotlights?: boolean;
  /** Padding preset. */
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  /** Scroll the inner area instead of the outer (for app pages with sticky nav). */
  scrollable?: boolean;
}

/**
 * Reusable page shell with consistent backdrop, spotlights and entrance animation.
 * Each page using this gets the same modern feel (Grok/ChatGPT/Blackbox blend).
 */
const PageShell: React.FC<PageShellProps> = ({
  children,
  withParticles = false,
  withSpotlights = true,
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
      } ${padCls} ${className}`}
    >
      {withParticles && <ParticleBackground color="#8b5cf6" count={350} opacity={0.25} />}
      {withSpotlights && (
        <>
          <div
            aria-hidden="true"
            className="spotlight spotlight-violet"
            style={{ width: "44vw", height: "44vw", top: "-10%", left: "-10%" }}
          />
          <div
            aria-hidden="true"
            className="spotlight spotlight-cyan"
            style={{ width: "36vw", height: "36vw", bottom: "-12%", right: "-8%" }}
          />
          <div
            aria-hidden="true"
            className="spotlight spotlight-pink"
            style={{ width: "28vw", height: "28vw", top: "40%", right: "30%", opacity: 0.12 }}
          />
        </>
      )}
      <div className="relative z-10 page-fade-in">{children}</div>
    </div>
  );
};

export default PageShell;
