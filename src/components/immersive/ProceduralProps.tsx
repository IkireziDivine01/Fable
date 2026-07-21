'use client';

import { Float } from '@react-three/drei';

/** Upgraded procedural props — used for FX types and as GLTF fallbacks. */
export function ProceduralPropContent({
  type,
  accentColor,
  highlighted,
  windowGlow = 0,
  visualRole = 'normal',
}: {
  type: string;
  accentColor: string;
  highlighted?: boolean;
  windowGlow?: number;
  visualRole?: 'normal' | 'trail' | 'dim' | 'glow' | 'hint' | 'wrong';
}) {
  const glowHard =
    visualRole === 'glow' ? 0.55 : visualRole === 'hint' ? 0.38 : highlighted ? 0.28 : 0;
  const emissive =
    visualRole === 'wrong'
      ? '#C45C4A'
      : glowHard > 0
        ? accentColor
        : visualRole === 'trail'
          ? '#FFE8C8'
          : '#000000';
  const emissiveIntensity =
    visualRole === 'wrong' ? 0.2 : glowHard > 0 ? glowHard : visualRole === 'trail' ? 0.1 : 0;

  if (type === 'tree') {
    return (
      <>
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.14, 0.95, 12]} />
          <meshStandardMaterial color="#4a3728" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.25, 0]} castShadow>
          <sphereGeometry args={[0.48, 14, 12]} />
          <meshStandardMaterial
            color="#2D6A4F"
            roughness={0.85}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[-0.22, 1.45, 0.1]} castShadow>
          <sphereGeometry args={[0.38, 12, 10]} />
          <meshStandardMaterial color={accentColor} roughness={0.8} />
        </mesh>
        <mesh position={[0.25, 1.4, -0.12]} castShadow>
          <sphereGeometry args={[0.36, 12, 10]} />
          <meshStandardMaterial color="#1B4332" roughness={0.85} />
        </mesh>
        <mesh position={[0.05, 1.7, 0.05]} castShadow>
          <sphereGeometry args={[0.28, 10, 8]} />
          <meshStandardMaterial color="#52B788" roughness={0.8} />
        </mesh>
      </>
    );
  }

  if (type === 'hut') {
    return (
      <>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[0.62, 0.64, 0.06, 18]} />
          <meshStandardMaterial color="#7A5C3A" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.58, 0.72, 18]} />
          <meshStandardMaterial color="#A67C52" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <coneGeometry args={[0.82, 0.28, 16]} />
          <meshStandardMaterial color="#8B5A2B" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <coneGeometry args={[0.68, 0.32, 16]} />
          <meshStandardMaterial
            color={accentColor}
            roughness={0.95}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0, 1.18, 0]} castShadow>
          <coneGeometry args={[0.42, 0.28, 14]} />
          <meshStandardMaterial color="#5C3A1E" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.24, 0.54]} castShadow>
          <boxGeometry args={[0.28, 0.42, 0.08]} />
          <meshStandardMaterial color="#3d2914" roughness={0.9} />
        </mesh>
        <mesh position={[-0.32, 0.42, 0.5]}>
          <boxGeometry args={[0.16, 0.14, 0.04]} />
          <meshStandardMaterial
            color="#F5D76E"
            roughness={0.4}
            emissive="#F5D76E"
            emissiveIntensity={Math.max(0.12, windowGlow)}
          />
        </mesh>
        <mesh position={[0.32, 0.42, 0.5]}>
          <boxGeometry args={[0.16, 0.14, 0.04]} />
          <meshStandardMaterial
            color="#F5D76E"
            roughness={0.4}
            emissive="#F5D76E"
            emissiveIntensity={Math.max(0.12, windowGlow)}
          />
        </mesh>
      </>
    );
  }

  if (type === 'fire') {
    return (
      <Float speed={2} floatIntensity={0.4}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#FF6B35"
            emissive="#FF6B35"
            emissiveIntensity={highlighted ? 1.4 : 1.0}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial
            color="#FFD166"
            emissive="#FFD166"
            emissiveIntensity={highlighted ? 1.6 : 1.2}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.08, 0]} receiveShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.06, 10]} />
          <meshStandardMaterial color="#3d2914" roughness={0.95} />
        </mesh>
      </Float>
    );
  }

  if (type === 'stall') {
    return (
      <>
        {([-0.4, 0.4] as const).flatMap((x) =>
          ([-0.22, 0.22] as const).map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.42, z]} castShadow>
              <cylinderGeometry args={[0.035, 0.04, 0.85, 8]} />
              <meshStandardMaterial color="#6b3a2a" roughness={0.88} />
            </mesh>
          ))
        )}
        <mesh position={[0, 0.88, 0]} castShadow>
          <boxGeometry args={[1.05, 0.06, 0.7]} />
          <meshStandardMaterial
            color={accentColor}
            roughness={0.7}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0, 0.94, 0]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[1.1, 0.04, 0.75]} />
          <meshStandardMaterial color="#DD6B20" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.85, 0.08, 0.45]} />
          <meshStandardMaterial color="#8B6914" roughness={0.8} />
        </mesh>
        <mesh position={[-0.2, 0.52, 0.05]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#E63946" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.52, 0.08]} castShadow>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#F4A261" roughness={0.6} />
        </mesh>
        <mesh position={[0.2, 0.52, 0.02]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#2A9D8F" roughness={0.6} />
        </mesh>
      </>
    );
  }

  if (type === 'board') {
    return (
      <>
        <mesh position={[0, 0.55, -0.04]} castShadow>
          <boxGeometry args={[1.58, 1.02, 0.04]} />
          <meshStandardMaterial color="#8B6914" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.95, 0.08]} />
          <meshStandardMaterial
            color="#2C3E50"
            roughness={0.7}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[-0.55, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>
        <mesh position={[0.55, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>
        {[0.7, 0.55, 0.4].map((y) => (
          <mesh key={y} position={[0, y, 0.045]}>
            <boxGeometry args={[y === 0.55 ? 0.7 : 0.85, 0.02, 0.01]} />
            <meshStandardMaterial color="#E8E8E8" roughness={0.5} />
          </mesh>
        ))}
      </>
    );
  }

  if (type === 'rock') {
    return (
      <>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color="#8A8178"
            roughness={0.95}
            flatShading
            emissive={emissive}
            emissiveIntensity={highlighted ? 0.15 : 0}
          />
        </mesh>
        <mesh position={[0.18, 0.12, 0.1]} castShadow>
          <dodecahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#6C757D" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[-0.14, 0.1, -0.08]} castShadow>
          <dodecahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color="#ADB5BD" roughness={0.92} flatShading />
        </mesh>
      </>
    );
  }

  if (type === 'flower') {
    return (
      <>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.24, 8]} />
          <meshStandardMaterial color="#40916C" roughness={0.7} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.08, 0.28, Math.sin(a) * 0.08]}
              castShadow
            >
              <sphereGeometry args={[0.055, 8, 8]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={highlighted ? 0.4 : 0.12}
                roughness={0.55}
              />
            </mesh>
          );
        })}
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#F4A261" roughness={0.5} />
        </mesh>
      </>
    );
  }

  if (type === 'bench') {
    return (
      <>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.07, 0.38]} />
          <meshStandardMaterial color="#6b3a2a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.38, -0.16]} castShadow>
          <boxGeometry args={[1.0, 0.08, 0.06]} />
          <meshStandardMaterial
            color="#5C4033"
            roughness={0.85}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[-0.38, 0.1, 0]} castShadow>
          <boxGeometry args={[0.07, 0.2, 0.34]} />
          <meshStandardMaterial color="#8B6914" roughness={0.85} />
        </mesh>
        <mesh position={[0.38, 0.1, 0]} castShadow>
          <boxGeometry args={[0.07, 0.2, 0.34]} />
          <meshStandardMaterial color="#8B6914" roughness={0.85} />
        </mesh>
      </>
    );
  }

  if (type === 'banana_tree') {
    return (
      <>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.12, 1.2, 12]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.18, 1.25, Math.sin(angle) * 0.18]}
              rotation={[0.65, angle, 0.12]}
              castShadow
            >
              <boxGeometry args={[0.14, 0.7, 0.05]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? accentColor : '#2D6A4F'}
                roughness={0.75}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
              />
            </mesh>
          );
        })}
        <mesh position={[0.22, 0.85, 0.12]} castShadow>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#D4A017" roughness={0.55} />
        </mesh>
        <mesh position={[0.28, 0.72, 0.08]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#E9C46A" roughness={0.55} />
        </mesh>
      </>
    );
  }

  if (type === 'path') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[1.8, 3.6]} />
        <meshStandardMaterial
          color="#A89070"
          roughness={0.95}
          transparent
          opacity={0.72}
          emissive={emissive}
          emissiveIntensity={highlighted ? 0.12 : 0}
        />
      </mesh>
    );
  }

  if (type === 'water_jug') {
    return (
      <>
        <mesh position={[0, 0.22, 0]} castShadow>
          <sphereGeometry args={[0.2, 16, 14]} />
          <meshStandardMaterial
            color={accentColor}
            roughness={0.55}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 0.14, 12]} />
          <meshStandardMaterial color="#8B6914" roughness={0.65} />
        </mesh>
        <mesh position={[0.14, 0.28, 0]} rotation={[0, 0, 0.45]}>
          <torusGeometry args={[0.09, 0.025, 8, 16]} />
          <meshStandardMaterial color="#6b3a2a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.04, 10]} />
          <meshStandardMaterial color="#5C4033" roughness={0.7} />
        </mesh>
      </>
    );
  }

  if (type === 'drum') {
    return (
      <>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.24, 0.22, 0.5, 18]} />
          <meshStandardMaterial
            color="#5C4033"
            roughness={0.8}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0, 0.54, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.05, 18]} />
          <meshStandardMaterial color="#C4A574" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.04, 18]} />
          <meshStandardMaterial color="#3d2914" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.245, 0.02, 8, 24]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.235, 0.018, 8, 24]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.25} />
        </mesh>
      </>
    );
  }

  if (type === 'goat') {
    return (
      <>
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.15, 0.32, 6, 12]} />
          <meshStandardMaterial color="#C4A574" roughness={0.85} />
        </mesh>
        <mesh position={[0.22, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial
            color="#A89070"
            roughness={0.85}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
        <mesh position={[0.28, 0.56, 0.05]} rotation={[0.3, 0, 0.2]}>
          <coneGeometry args={[0.035, 0.12, 6]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>
        <mesh position={[0.28, 0.56, -0.05]} rotation={[0.3, 0, -0.2]}>
          <coneGeometry args={[0.035, 0.12, 6]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>
        {(
          [
            [-0.1, 0.1],
            [-0.1, -0.1],
            [0.12, 0.1],
            [0.12, -0.1],
          ] as const
        ).map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.11, z]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.22, 6]} />
            <meshStandardMaterial color="#6b3a2a" roughness={0.9} />
          </mesh>
        ))}
      </>
    );
  }

  if (type === 'millet_field') {
    return (
      <>
        {[-0.35, -0.12, 0.12, 0.35].map((x, i) => (
          <group key={i} position={[x, 0, (i % 2) * 0.12 - 0.06]}>
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.02, 0.03, 0.55, 6]} />
              <meshStandardMaterial color="#6B8E23" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial
                color={accentColor}
                roughness={0.7}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
              />
            </mesh>
          </group>
        ))}
      </>
    );
  }

  return null;
}
