import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight Three.js particle background.
 * - Reacts subtly to mouse movement and device orientation (gyro).
 * - Respects `prefers-reduced-motion`.
 * - Fixed full-viewport canvas behind the app.
 */
interface Props {
  color?: string;
  count?: number;
  className?: string;
  opacity?: number;
}

const ParticleBackground: React.FC<Props> = ({
  color = "#7c3aed",
  count = 600,
  className = "",
  opacity = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 220;
      positions[i + 1] = (Math.random() - 0.5) * 130;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.6,
      transparent: true,
      opacity,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let mx = 0;
    let my = 0;
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onGyro = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        mx = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
        my = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
      }
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("deviceorientation", onGyro, { passive: true });
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0015 + mx * 0.002;
      points.rotation.x += 0.0008 + my * 0.002;
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onGyro);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, [color, count, opacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
    />
  );
};

export default ParticleBackground;
