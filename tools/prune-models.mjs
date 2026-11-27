// Strips meshes/materials/textures that no PropSpec.only pattern uses from prop GLBs (FR-003).
// Usage: node tools/prune-models.mjs [--dry]   (idempotent; re-run after changing `only` in src/data/props.ts)
// Keep the table in sync with src/data/props.ts: union of `only` patterns per file. Files whose props
// use no `only` (or whose every mesh is used) need no entry.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { statSync } from 'node:fs';

const KEEP = {
  'architecture/vintage_light_switch.glb': [/^Object_4$/],
  'hallway/wooden_coat_rack.glb': [/^Object_4$/],
  'hallway/vintage_framed_photos.glb': [/^pictureFrame3Large/, /^pictureFrame1Large/, /^pictureFrame2Large/, /^pictureFrame2_/, /^pictureFrame1_/, /^pictureFrame3_/],
  'furniture/leather_armchair.glb': [/ARMCHAIR/, /FLOORLAMP/],
};
const dry = process.argv.includes('--dry');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const [rel, pats] of Object.entries(KEEP)) {
  const file = new URL(`../public/models/${rel}`, import.meta.url).pathname;
  const before = statSync(file).size;
  const doc = await io.read(file);
  // three's GLTFLoader names a mesh object after its glTF node name, which is what PropSpec.only tests
  let removed = 0;
  for (const node of doc.getRoot().listNodes()) {
    if (node.getMesh() && !pats.some((p) => p.test(node.getName()))) { node.setMesh(null); removed++; }
  }
  await doc.transform(prune());
  if (!dry) await io.write(file, doc);
  const after = dry ? before : statSync(file).size;
  console.log(`${rel}: removed ${removed} mesh node(s), ${before} -> ${after} bytes`);
}
