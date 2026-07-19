/**
 * Generates stylized low-poly prop GLBs for the immersive story stage.
 * Run: node scripts/generate-prop-models.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Blob } from 'node:buffer';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter expects browser Blob / FileReader APIs
if (!globalThis.Blob) globalThis.Blob = Blob;
if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    onerror = null;
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((buf) => {
          this.result = buf;
          this.onloadend?.({ target: this });
        })
        .catch((err) => this.onerror?.(err));
    }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/immersive/models');

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: opts.flatShading ?? false,
  });
}

function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function hut() {
  const g = new THREE.Group();
  g.name = 'hut';
  // Mud-brick walls
  add(g, new THREE.CylinderGeometry(0.52, 0.58, 0.72, 16), mat('#A67C52', { roughness: 0.92 }), 0, 0.36, 0);
  // Thatch layers
  add(g, new THREE.ConeGeometry(0.82, 0.28, 14), mat('#8B5A2B', { roughness: 0.95 }), 0, 0.82, 0);
  add(g, new THREE.ConeGeometry(0.68, 0.32, 14), mat('#6B4226', { roughness: 0.95 }), 0, 1.0, 0);
  add(g, new THREE.ConeGeometry(0.42, 0.28, 12), mat('#5C3A1E', { roughness: 0.95 }), 0, 1.18, 0);
  // Door recess
  add(g, new THREE.BoxGeometry(0.28, 0.42, 0.08), mat('#3d2914', { roughness: 0.9 }), 0, 0.24, 0.54);
  // Windows (emissive for night)
  add(
    g,
    new THREE.BoxGeometry(0.16, 0.14, 0.04),
    mat('#F5D76E', { roughness: 0.4, emissive: '#F5D76E', emissiveIntensity: 0.35 }),
    -0.32,
    0.42,
    0.5
  );
  add(
    g,
    new THREE.BoxGeometry(0.16, 0.14, 0.04),
    mat('#F5D76E', { roughness: 0.4, emissive: '#F5D76E', emissiveIntensity: 0.35 }),
    0.32,
    0.42,
    0.5
  );
  // Ring base
  add(g, new THREE.CylinderGeometry(0.62, 0.64, 0.06, 16), mat('#7A5C3A', { roughness: 0.95 }), 0, 0.03, 0);
  return g;
}

function tree() {
  const g = new THREE.Group();
  g.name = 'tree';
  add(g, new THREE.CylinderGeometry(0.09, 0.14, 0.95, 10), mat('#4a3728', { roughness: 0.9 }), 0, 0.48, 0);
  add(g, new THREE.SphereGeometry(0.48, 12, 10), mat('#2D6A4F', { roughness: 0.85 }), 0, 1.25, 0);
  add(g, new THREE.SphereGeometry(0.38, 12, 10), mat('#40916C', { roughness: 0.8 }), -0.22, 1.45, 0.1);
  add(g, new THREE.SphereGeometry(0.36, 12, 10), mat('#1B4332', { roughness: 0.85 }), 0.25, 1.4, -0.12);
  add(g, new THREE.SphereGeometry(0.28, 10, 8), mat('#52B788', { roughness: 0.8 }), 0.05, 1.7, 0.05);
  return g;
}

function bananaTree() {
  const g = new THREE.Group();
  g.name = 'banana_tree';
  add(g, new THREE.CylinderGeometry(0.07, 0.12, 1.2, 10), mat('#5C4033', { roughness: 0.9 }), 0, 0.6, 0);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.7, 0.05),
      mat(i % 2 === 0 ? '#52B788' : '#2D6A4F', { roughness: 0.75 })
    );
    leaf.position.set(Math.cos(angle) * 0.18, 1.25, Math.sin(angle) * 0.18);
    leaf.rotation.set(0.65, angle, 0.12);
    leaf.castShadow = true;
    g.add(leaf);
  }
  add(g, new THREE.SphereGeometry(0.14, 10, 10), mat('#D4A017', { roughness: 0.55 }), 0.22, 0.85, 0.12);
  add(g, new THREE.SphereGeometry(0.1, 8, 8), mat('#E9C46A', { roughness: 0.55 }), 0.28, 0.72, 0.08);
  return g;
}

function stall() {
  const g = new THREE.Group();
  g.name = 'stall';
  // Posts
  for (const x of [-0.4, 0.4]) {
    for (const z of [-0.22, 0.22]) {
      add(g, new THREE.CylinderGeometry(0.035, 0.04, 0.85, 8), mat('#6b3a2a', { roughness: 0.88 }), x, 0.42, z);
    }
  }
  // Roof
  add(g, new THREE.BoxGeometry(1.05, 0.06, 0.7), mat('#C05621', { roughness: 0.7 }), 0, 0.88, 0);
  add(g, new THREE.BoxGeometry(1.1, 0.04, 0.75), mat('#DD6B20', { roughness: 0.65 }), 0, 0.94, 0, 0.15, 0, 0);
  // Counter
  add(g, new THREE.BoxGeometry(0.85, 0.08, 0.45), mat('#8B6914', { roughness: 0.8 }), 0, 0.42, 0.05);
  // Produce piles
  add(g, new THREE.SphereGeometry(0.1, 8, 8), mat('#E63946', { roughness: 0.6 }), -0.2, 0.52, 0.05);
  add(g, new THREE.SphereGeometry(0.09, 8, 8), mat('#F4A261', { roughness: 0.6 }), 0, 0.52, 0.08);
  add(g, new THREE.SphereGeometry(0.1, 8, 8), mat('#2A9D8F', { roughness: 0.6 }), 0.2, 0.52, 0.02);
  return g;
}

function rock() {
  const g = new THREE.Group();
  g.name = 'rock';
  add(g, new THREE.DodecahedronGeometry(0.3, 0), mat('#8A8178', { roughness: 0.95, flatShading: true }), 0, 0.22, 0);
  add(g, new THREE.DodecahedronGeometry(0.18, 0), mat('#6C757D', { roughness: 0.95, flatShading: true }), 0.18, 0.12, 0.1);
  add(g, new THREE.DodecahedronGeometry(0.14, 0), mat('#ADB5BD', { roughness: 0.92, flatShading: true }), -0.14, 0.1, -0.08);
  return g;
}

function drum() {
  const g = new THREE.Group();
  g.name = 'drum';
  add(g, new THREE.CylinderGeometry(0.24, 0.22, 0.5, 16), mat('#5C4033', { roughness: 0.8 }), 0, 0.28, 0);
  add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16), mat('#C4A574', { roughness: 0.45 }), 0, 0.54, 0);
  add(g, new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16), mat('#3d2914', { roughness: 0.9 }), 0, 0.04, 0);
  // Decorative rings
  add(g, new THREE.TorusGeometry(0.245, 0.02, 8, 24), mat('#D4A017', { roughness: 0.4, metalness: 0.25 }), 0, 0.4, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.TorusGeometry(0.235, 0.018, 8, 24), mat('#D4A017', { roughness: 0.4, metalness: 0.25 }), 0, 0.18, 0, Math.PI / 2, 0, 0);
  return g;
}

function waterJug() {
  const g = new THREE.Group();
  g.name = 'water_jug';
  add(g, new THREE.SphereGeometry(0.2, 16, 14), mat('#B08968', { roughness: 0.55 }), 0, 0.22, 0);
  add(g, new THREE.CylinderGeometry(0.07, 0.1, 0.14, 12), mat('#8B6914', { roughness: 0.65 }), 0, 0.42, 0);
  add(g, new THREE.TorusGeometry(0.09, 0.025, 8, 16), mat('#6b3a2a', { roughness: 0.7 }), 0.14, 0.28, 0, 0, 0, 0.45);
  add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.04, 10), mat('#5C4033', { roughness: 0.7 }), 0, 0.5, 0);
  return g;
}

function goat() {
  const g = new THREE.Group();
  g.name = 'goat';
  add(g, new THREE.CapsuleGeometry(0.15, 0.32, 6, 12), mat('#C4A574', { roughness: 0.85 }), 0, 0.32, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.SphereGeometry(0.13, 12, 10), mat('#A89070', { roughness: 0.85 }), 0.22, 0.42, 0);
  add(g, new THREE.ConeGeometry(0.035, 0.12, 6), mat('#5C4033', { roughness: 0.9 }), 0.28, 0.56, 0.05, 0.3, 0, 0.2);
  add(g, new THREE.ConeGeometry(0.035, 0.12, 6), mat('#5C4033', { roughness: 0.9 }), 0.28, 0.56, -0.05, 0.3, 0, -0.2);
  add(g, new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), mat('#8B7355', { roughness: 0.9 }), -0.22, 0.28, 0, 0.4, 0, 0);
  for (const [x, z] of [
    [-0.1, 0.1],
    [-0.1, -0.1],
    [0.12, 0.1],
    [0.12, -0.1],
  ]) {
    add(g, new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6), mat('#6b3a2a', { roughness: 0.9 }), x, 0.11, z);
  }
  return g;
}

function bench() {
  const g = new THREE.Group();
  g.name = 'bench';
  add(g, new THREE.BoxGeometry(1.0, 0.07, 0.38), mat('#6b3a2a', { roughness: 0.8 }), 0, 0.22, 0);
  add(g, new THREE.BoxGeometry(1.0, 0.08, 0.06), mat('#5C4033', { roughness: 0.85 }), 0, 0.38, -0.16);
  for (const x of [-0.38, 0.38]) {
    add(g, new THREE.BoxGeometry(0.07, 0.2, 0.34), mat('#8B6914', { roughness: 0.85 }), x, 0.1, 0);
  }
  return g;
}

function board() {
  const g = new THREE.Group();
  g.name = 'board';
  add(g, new THREE.BoxGeometry(1.5, 0.95, 0.08), mat('#2C3E50', { roughness: 0.7 }), 0, 0.55, 0);
  add(g, new THREE.BoxGeometry(1.58, 1.02, 0.04), mat('#8B6914', { roughness: 0.85 }), 0, 0.55, -0.04);
  // Legs
  add(g, new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8), mat('#5C4033', { roughness: 0.9 }), -0.55, 0.1, 0);
  add(g, new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8), mat('#5C4033', { roughness: 0.9 }), 0.55, 0.1, 0);
  // Chalk lines
  add(g, new THREE.BoxGeometry(0.9, 0.02, 0.01), mat('#E8E8E8', { roughness: 0.5 }), 0, 0.7, 0.045);
  add(g, new THREE.BoxGeometry(0.7, 0.02, 0.01), mat('#E8E8E8', { roughness: 0.5 }), 0, 0.55, 0.045);
  add(g, new THREE.BoxGeometry(0.8, 0.02, 0.01), mat('#E8E8E8', { roughness: 0.5 }), 0, 0.4, 0.045);
  return g;
}

const BUILDERS = {
  hut,
  tree,
  banana_tree: bananaTree,
  stall,
  rock,
  drum,
  water_jug: waterJug,
  goat,
  bench,
  board,
};

async function exportGlb(object, outPath) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, {
    binary: true,
    onlyVisible: true,
  });
  const buffer = Buffer.from(result);
  fs.writeFileSync(outPath, buffer);
  return buffer.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, build] of Object.entries(BUILDERS)) {
    const group = build();
    // Center on ground: keep y as authored (base at ~0)
    const outPath = path.join(OUT_DIR, `${name}.glb`);
    const bytes = await exportGlb(group, outPath);
    console.log(`wrote ${name}.glb (${bytes} bytes)`);
  }
  console.log('done →', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
