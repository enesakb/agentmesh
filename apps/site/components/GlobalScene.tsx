'use client';

/**
 * GlobalScene — quiet, atmospheric 3D backdrop.
 *
 * Earlier iterations rendered a full agent constellation here, which fought
 * with foreground content (cards, terminals, text) and read as visual noise.
 *
 * This version is intentionally minimal: a far-away starfield + a slowly
 * drifting wireframe sphere. The scene gives the page a sense of depth and
 * motion without ever competing with content. The "focused" 3D activity
 * lives in <Hero3D /> and the LiveProtocol diagram, where it belongs.
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const PHOSPHOR_DIM = '#3d5a10';

function Stars({ count = 1200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const { geom, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizesArr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribute stars on a thick spherical shell, far from origin.
      const r = 22 + Math.random() * 38;
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3 + 0] = Math.cos(theta) * s * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = Math.sin(theta) * s * r;
      // 90% small dim, 10% bright pinpoints
      sizesArr[i] = Math.random() < 0.1 ? 0.18 : 0.06 + Math.random() * 0.05;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geom: g, sizes: sizesArr };
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.012;
      ref.current.rotation.x += dt * 0.004;
    }
  });

  // We use two layered point clouds: dim base + bright accents.
  // For perf we render once with sizeAttenuation; varying size handled visually
  // via brightness/opacity rather than per-point size.
  void sizes;

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        color="#ecece6"
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function DistantWireframe() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((s, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.04;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.15) * 0.18;
  });
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[14, 1]} />
        <meshBasicMaterial color={PHOSPHOR_DIM} wireframe transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[0.3, 0.2, 0]}>
        <icosahedronGeometry args={[10, 1]} />
        <meshBasicMaterial color={PHOSPHOR_DIM} wireframe transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function CameraDrift({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollRef.current; // 0..1 across the doc
    // Always far away; only sway by a tiny amount so depth is *felt* but never invasive.
    state.camera.position.x = Math.sin(t * 0.08) * 0.6 + p * 1.2;
    state.camera.position.y = Math.cos(t * 0.06) * 0.4 - p * 0.4;
    state.camera.position.z = 24 + Math.sin(t * 0.05) * 0.4;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export function GlobalScene() {
  const scrollRef = useRef(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEnabled(false);
      return;
    }
    if (window.innerWidth < 768) {
      setEnabled(false);
      return;
    }

    let raf = 0;
    let target = 0;
    const tick = () => {
      scrollRef.current += (target - scrollRef.current) * 0.06;
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, transform: 'translateZ(0)' }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 24], fov: 50, near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#07090a', 22, 60]} />
          <Stars />
          <DistantWireframe />
          <CameraDrift scrollRef={scrollRef} />
        </Suspense>
      </Canvas>

      {/* Atmospheric vignette — keeps even the brightest parts subdued */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(7,9,10,0.35) 0%, rgba(7,9,10,0.55) 50%, rgba(7,9,10,0.85) 100%)',
        }}
      />
    </div>
  );
}
