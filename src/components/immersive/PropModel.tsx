'use client';

import { Component, useMemo, useState, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Material, Mesh, Object3D } from 'three';
import { Color, MeshStandardMaterial } from 'three';
import type { PropType } from '@/lib/immersive/types';
import { getPropModelConfig } from '@/lib/immersive/propModels';

interface PropModelProps {
  type: PropType;
  accentColor: string;
  highlighted?: boolean;
  windowGlow?: number;
  visualRole?: 'normal' | 'trail' | 'dim' | 'glow' | 'hint' | 'wrong';
  fallback: ReactNode;
}

function prepareScene(
  source: Object3D,
  accentColor: string,
  highlighted: boolean,
  windowGlow: number,
  accentTint: boolean,
  visualRole: 'normal' | 'trail' | 'dim' | 'glow' | 'hint' | 'wrong' = 'normal'
): Object3D {
  const root = source.clone(true);
  const accent = new Color(accentColor);

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMats = materials.map((mat) => {
      const next = (mat as Material).clone() as MeshStandardMaterial;
      if (!(next instanceof MeshStandardMaterial)) return next;

      const isWindow = next.emissiveIntensity > 0.2 && next.emissive.getHex() !== 0;

      if (isWindow) {
        next.emissive = new Color('#F5D76E');
        next.emissiveIntensity = Math.max(0.15, windowGlow);
      } else if (visualRole === 'glow' || (highlighted && visualRole !== 'dim')) {
        next.emissive = accent.clone();
        next.emissiveIntensity = visualRole === 'glow' ? 0.55 : visualRole === 'hint' ? 0.38 : 0.28;
      } else if (visualRole === 'trail') {
        next.emissive = new Color('#FFE8C8');
        next.emissiveIntensity = 0.1;
        next.color.offsetHSL(0.02, 0.08, 0.06);
      } else if (visualRole === 'dim') {
        next.emissiveIntensity = 0;
        next.color.lerp(new Color('#6a5a48'), 0.42);
        next.color.multiplyScalar(0.72);
      } else if (visualRole === 'wrong') {
        next.emissive = new Color('#C45C4A');
        next.emissiveIntensity = 0.2;
      } else {
        next.emissiveIntensity = Math.min(next.emissiveIntensity, 0.05);
      }

      if (accentTint && !isWindow && visualRole !== 'dim') {
        const c = next.color;
        const greenBias = c.g > c.r && c.g > c.b;
        const warmBias = c.r > 0.45 && c.g > 0.25 && c.b < 0.35;
        if (greenBias || warmBias) {
          next.color.lerp(accent, 0.22);
        }
      }

      return next;
    });

    mesh.material = nextMats.length === 1 ? nextMats[0] : nextMats;
  });

  return root;
}

function LoadedPropModel({
  url,
  scale,
  offsetY,
  rotationY,
  accentTint,
  accentColor,
  highlighted,
  windowGlow,
  visualRole,
}: {
  url: string;
  scale: number;
  offsetY: number;
  rotationY: number;
  accentTint: boolean;
  accentColor: string;
  highlighted: boolean;
  windowGlow: number;
  visualRole: 'normal' | 'trail' | 'dim' | 'glow' | 'hint' | 'wrong';
}) {
  const gltf = useGLTF(url);
  const scene = useMemo(
    () =>
      prepareScene(
        gltf.scene,
        accentColor,
        highlighted,
        windowGlow,
        accentTint,
        visualRole
      ),
    [gltf.scene, accentColor, highlighted, windowGlow, accentTint, visualRole]
  );

  return (
    <group position={[0, offsetY, 0]} scale={scale} rotation={[0, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Loads a GLB prop when configured; otherwise renders the procedural fallback.
 */
export default function PropModel({
  type,
  accentColor,
  highlighted = false,
  windowGlow = 0,
  visualRole = 'normal',
  fallback,
}: PropModelProps) {
  const config = getPropModelConfig(type);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(config && failedUrl === config.url);

  if (!config || failed) {
    return <>{fallback}</>;
  }

  return (
    <ModelErrorBoundary
      key={config.url}
      onError={() => setFailedUrl(config.url)}
      fallback={fallback}
    >
      <LoadedPropModel
        url={config.url}
        scale={config.scale}
        offsetY={config.offsetY}
        rotationY={config.rotationY ?? 0}
        accentTint={Boolean(config.accentTint)}
        accentColor={accentColor}
        highlighted={highlighted}
        windowGlow={windowGlow}
        visualRole={visualRole}
      />
    </ModelErrorBoundary>
  );
}

export function preloadPropModels(urls: string[]) {
  for (const url of urls) {
    try {
      useGLTF.preload(url);
    } catch {
      // runtime fallback covers failures
    }
  }
}
