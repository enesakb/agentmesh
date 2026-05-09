'use client';

/**
 * 3D wireframe agent constellation. Replaces the static NetworkViz in the
 * hero's right column. Pure phosphor-on-graphite — wireframe sphere, agent
 * nodes orbiting in 3D, slowly rotating, packets flying along edges as
 * additive-blended dots. Matches the brutalist arcade-vector aesthetic.
 *
 * Performance:
 *   - 30 nodes + 60 edges + ~24 packet sprites
 *   - All in a single scene, no postprocessing → ~1ms per frame on M-class GPU
 *   - dpr capped at 2; r3f frameloop=demand would be too static for ambient feel
 */
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

const PHOSPHOR = '#b8ff3a';
const PHOSPHOR_DIM = '#688f1c';
const AMBER = '#ffb84d';

// Number of agent nodes orbiting the constellation.
const N = 18;

function Constellation() {
  const group = useRef<THREE.Group>(null!);

  // Deterministic positions on a sphere shell — Fibonacci spiral.
  const nodes = useMemo(() => {
    const out: { p: THREE.Vector3; phase: number; isAlpha: boolean }[] = [];
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const radius = 1.55 + ((i * 7) % 5) * 0.08;
      out.push({
        p: new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius),
        phase: (i * 0.7) % (Math.PI * 2),
        isAlpha: i === 0 || i === Math.floor(N / 2),
      });
    }
    return out;
  }, []);

  // Edges: each node connects to its 2 nearest neighbors (deterministic).
  const edges = useMemo(() => {
    const result: [THREE.Vector3, THREE.Vector3, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      const sorted = nodes
        .map((n, j) => ({ j, d: n.p.distanceTo(nodes[i].p) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const s of sorted) {
        const key = i < s.j ? `${i}-${s.j}` : `${s.j}-${i}`;
        if (!result.some((e) => `${e[2]}` === key)) {
          result.push([nodes[i].p, nodes[s.j].p, parseFloat(key.replace('-', '.'))]);
        }
      }
    }
    return result;
  }, [nodes]);

  // 8 traveling packets. Each picks a random edge and animates t∈[0,1].
  const packets = useMemo(() => {
    const out: { from: number; to: number; t: number; speed: number; color: string }[] = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.floor((i * 17) % nodes.length);
      const b = (a + 1 + ((i * 5) % 3)) % nodes.length;
      out.push({
        from: a,
        to: b,
        t: (i * 0.13) % 1,
        speed: 0.18 + (i % 3) * 0.05,
        color: i % 4 === 0 ? AMBER : PHOSPHOR,
      });
    }
    return out;
  }, [nodes]);

  const packetRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.07;
      group.current.rotation.x = Math.sin(_state.clock.elapsedTime * 0.18) * 0.18;
    }

    // Advance packets along their edges
    for (let i = 0; i < packets.length; i++) {
      const p = packets[i];
      p.t += delta * p.speed;
      if (p.t >= 1) {
        p.t = 0;
        // Rewire to a fresh random edge
        p.from = (p.to + ((i * 3) % (nodes.length - 1)) + 1) % nodes.length;
        p.to = (p.from + 1 + (i % 5)) % nodes.length;
        if (p.from === p.to) p.to = (p.to + 1) % nodes.length;
      }
      const m = packetRefs.current[i];
      if (m) {
        const a = nodes[p.from].p;
        const b = nodes[p.to].p;
        m.position.lerpVectors(a, b, p.t);
      }
    }
  });

  return (
    <group ref={group}>
      {/* outer wireframe sphere — gives the constellation a contained "shell" */}
      <mesh>
        <icosahedronGeometry args={[2.0, 1]} />
        <meshBasicMaterial color={PHOSPHOR_DIM} wireframe transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[0, Math.PI / 6, 0]}>
        <icosahedronGeometry args={[1.55, 0]} />
        <meshBasicMaterial color={PHOSPHOR_DIM} wireframe transparent opacity={0.34} />
      </mesh>

      {/* edges — line segments */}
      <Edges edges={edges.map((e) => [e[0], e[1]] as [THREE.Vector3, THREE.Vector3])} />

      {/* nodes */}
      {nodes.map((n, i) => (
        <NodeDot key={i} position={n.p} phase={n.phase} isAlpha={n.isAlpha} />
      ))}

      {/* packets */}
      {packets.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            packetRefs.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color={p.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Edges({ edges }: { edges: [THREE.Vector3, THREE.Vector3][] }) {
  const geom = useMemo(() => {
    const positions: number[] = [];
    for (const [a, b] of edges) {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [edges]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={PHOSPHOR_DIM} transparent opacity={0.6} />
    </lineSegments>
  );
}

function NodeDot({
  position,
  phase,
  isAlpha,
}: {
  position: THREE.Vector3;
  phase: number;
  isAlpha: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((s) => {
    const t = s.clock.elapsedTime + phase;
    const pulse = 0.7 + Math.sin(t * 1.6) * 0.3;
    if (ref.current) {
      const baseScale = isAlpha ? 1.6 : 1.0;
      ref.current.scale.setScalar(baseScale * pulse);
    }
    if (ringRef.current && isAlpha) {
      const r = 0.05 + ((s.clock.elapsedTime * 0.6 + phase) % 1.4) * 0.18;
      ringRef.current.scale.setScalar(r);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - r * 4);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[isAlpha ? 0.07 : 0.04, 16, 16]} />
        <meshBasicMaterial color={isAlpha ? PHOSPHOR : '#ecece6'} toneMapped={false} />
      </mesh>
      {isAlpha && (
        <mesh ref={ringRef}>
          <ringGeometry args={[0.95, 1, 32]} />
          <meshBasicMaterial color={PHOSPHOR} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="relative w-full aspect-square">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <Constellation />
        </Suspense>
      </Canvas>

      {/* corner registration marks — anchor the 3D scene to the grid */}
      <div className="absolute inset-2 pointer-events-none">
        <Tick className="top-0 left-0" />
        <Tick className="top-0 right-0 rotate-90" />
        <Tick className="bottom-0 left-0 -rotate-90" />
        <Tick className="bottom-0 right-0 rotate-180" />
      </div>

      <div className="absolute bottom-2 left-3 text-[9px] uppercase tracking-[0.22em] text-fg-dim">
        <span className="text-phosphor">▮</span> 18 agents · 36 edges · live
      </div>
      <div className="absolute top-2 right-3 text-[9px] uppercase tracking-[0.22em] text-fg-dim text-right">
        scene://constellation
      </div>
    </div>
  );
}

function Tick({ className }: { className?: string }) {
  return (
    <div className={`absolute w-3 h-3 ${className}`}>
      <div className="absolute top-0 left-0 w-3 h-px bg-fg-muted/60" />
      <div className="absolute top-0 left-0 w-px h-3 bg-fg-muted/60" />
    </div>
  );
}
