# KTX2 (Basis Universal) compression trial: FR-005, track K (report only)

Status: trial done, nothing under `src/` or `public/` changed. Numbers below were measured in this container with the
commands listed in Method. Anything not measured is marked **not measured**.

## Verdict

- ETC1S is fine for roughness and AO. It is acceptable for diffuse. It is **not** acceptable for normal maps on the
  rough plaster wall (p99 normal error 11.5 deg at 1k and 16.5 deg at 2k).
- UASTC keeps quality for all four map types (SSIM 0.986 to 0.9998; normal error p99 0.6 to 6.8 deg), but its files are
  larger than the JPEGs. At 1k it is 3 to 6x larger for the maps and 6 to 11x larger for the normal maps; at 2k it is about 1.7x larger overall.
- **Download.** At 1k (desktop `low`) KTX2 saves nothing: ETC1S is 2.15 MB vs 2.20 MB of JPEG for the 3 measured sets,
  and UASTC for everything is 5x bigger. At 2k (medium/high) ETC1S-everything saves 72 %
  (29.5 MB to 8.1 MB). The recommended mix (ETC1S for diff/rough/ao, UASTC for normals) saves 32 % (20.1 MB).
- **VRAM.** This is the real gain. 1k sets: 67.1 MB as RGBA8+mips to 10.5 MB (mixed) or 8.4 MB (ETC1S only). 2k sets: 268 MB to 42 MB (mixed).
- **GLB textures are already WebP (5.1 MB for 120 images).** Converting them would *increase* the download
  (ETC1S ~9.3 MB, with UASTC normals ~18 MB) but cut their VRAM from ~272 MB to ~34 to 44 MB.

## Method

Encoder (installed outside the repo, nothing committed):

- `npm i npm-basis-converter@1.0.0` into `/tmp/claude-0/trackK/npm`. GitHub release downloads were blocked by the session proxy
  (403), so this npm package was the only route. It ships a repackaged, modified build of Binomial's `basisu`
  (its README says it is a modified fork of HacksawStudios/basisu, with the SSE4.1 binary removed, so possibly slower).
  Binary: `bin/linux/x64/basisu`, sha256 `5f72d4ee8c45838e68b9cfcd9bddc39e3a2eb5597fe60a07943958355d1aa2c2`.
  Reports itself as **Basis Universal v1.50.0 (2019-2024)**. It is not the official release binary, so a re-run with the official one is worth doing before a final decision (the codec should be the same).
- KTX-Software `toktx` was not obtainable here. Python 3 with numpy 2.5.3 and Pillow 13.0.0. scikit-image and scipy are not available,
  so SSIM is my own numpy implementation (11x11 gaussian, sigma 1.5, K1 0.01, K2 0.03, valid region, mean over R,G,B
  channels, or the single R channel for the greyscale rough/ao maps).

Inputs: `public/textures/{plastered_wall,wood_floor,damaged_concrete_floor}/{1k/,}{diff,nor,rough,ao}.jpg`
(1024^2 and 2048^2, 12 + 12 files). The JPEGs are themselves lossy, so every quality number is
**loss relative to the JPEG**, not relative to an original. The greyscale JPEGs (rough, ao) were expanded to RGB PNGs
before encoding (so ETC1S stores them as 3 identical channels; a true 1-channel path was not tried).

Encodes (all with `-ktx2 -mipmap`, so KTX2 sizes include the full mip chain; the JPEG sizes do not):

| variant | flags |
|---|---|
| ETC1S | `-q 255 -comp_level 2` (+`-linear` for rough/ao, `-normal_map` for nor, sRGB for diff). `-max_endpoints/-max_selectors 16128` gave byte-identical size and quality on the 3 worst files, so q255 is already the ceiling. |
| UASTC | `-uastc -uastc_level 2` + default Zstd supercompression, RDO off (+ `-linear` / `-normal_map` as above) |
| UASTC RDO (3 worst files only) | `-uastc_rdo_l 1` and `-uastc_rdo_l 4` |

Quality: `basisu -unpack` each KTX2, take mip 0 of the **BC7** transcode (desktop target) and compare to the source
PNG with mean absolute difference (0 to 255) and SSIM. For ETC1S I also took the BC1 transcode (0.5 B/px, the real
smallest GPU target); it was within 0.1 MAD (about 0.2 for plastered_wall ao) and 0.003 SSIM of the BC7 transcode in the 1k set, so the tables show BC7. Normal maps
additionally get the angle between source and decoded normal (renormalised), mean and 99th percentile.
Visual check: 4-panel crops (source / ETC1S / UASTC / ETC1S diff x8), 256x256 at 1:1, at the worst-SSIM window of the worst map of each 1k set
(work dir, not committed, will vanish with the container):

- `/tmp/claude-0/trackK/crops/plastered_wall_worst_nor_x704_y64.png`
- `/tmp/claude-0/trackK/crops/wood_floor_worst_ao_x704_y192.png`
- `/tmp/claude-0/trackK/crops/damaged_concrete_floor_worst_diff_x320_y384.png`

I looked at two of the three (plaster nor, concrete diff): ETC1S shows fine high-frequency noise and slight colour blockiness in the
diff x8 panel, but at 1:1 it is hard to tell from the source; UASTC is indistinguishable. Only the 1k set was viewed; the 2k set has numbers only.

GPU memory assumptions (not measured on a GPU): three.js uploads the JPEGs as RGBA8 (4 B/px, 4/3 for mips, greyscale included).
ETC1S transcodes to BC1/ETC2-RGB/BC4 at 0.5 B/px. UASTC transcodes to BC7/ASTC-4x4 at 1 B/px. Mip chains computed exactly.
Real drivers may pad or keep extra copies, so treat VRAM as a ratio, not an absolute.

## Results: 1k set (desktop `low`)

MAD in 0..255, SSIM 0..1, BC7 transcode vs the JPEG source. KB are file bytes.

| set | map | JPEG KB | ETC1S KB | UASTC KB | ETC1S MAD / SSIM | UASTC MAD / SSIM | normal angle mean / p99 (ETC1S; UASTC) |
|---|---|---|---|---|---|---|---|
| plastered_wall | diff | 190 | 211 | 1011 | 2.16 / 0.9394 | 0.36 / 0.9976 | |
| plastered_wall | nor | 348 | 250 | 1291 | 4.41 / 0.8720 | 1.88 / 0.9770 | 3.60 / 11.5 deg; 1.45 / 4.7 deg |
| plastered_wall | rough | 99 | 130 | 806 | 1.01 / 0.9765 | 0.03 / 0.9995 | |
| plastered_wall | ao | 282 | 230 | 1045 | 2.67 / 0.9439 | 0.41 / 0.9981 | |
| wood_floor | diff | 227 | 225 | 1245 | 2.60 / 0.9374 | 0.60 / 0.9957 | |
| wood_floor | nor | 70 | 49 | 708 | 1.02 / 0.9796 | 0.25 / 0.9973 | 0.88 / 2.3 deg; 0.23 / 0.6 deg |
| wood_floor | rough | 168 | 195 | 1054 | 1.62 / 0.9606 | 0.10 / 0.9992 | |
| wood_floor | ao | 266 | 221 | 1115 | 3.00 / 0.9307 | 0.47 / 0.9980 | |
| damaged_concrete_floor | diff | 175 | 216 | 1116 | 2.52 / 0.9320 | 0.42 / 0.9968 | |
| damaged_concrete_floor | nor | 124 | 140 | 1025 | 1.47 / 0.9615 | 0.46 / 0.9938 | 1.19 / 3.8 deg; 0.37 / 1.7 deg |
| damaged_concrete_floor | rough | 199 | 202 | 1026 | 2.05 / 0.9486 | 0.29 / 0.9982 | |
| damaged_concrete_floor | ao | 55 | 83 | 379 | 0.36 / 0.9944 | 0.02 / 0.9998 | |

## Results: 2k set (medium / high)

| set | map | JPEG KB | ETC1S KB | UASTC KB | ETC1S MAD / SSIM | UASTC MAD / SSIM | normal angle mean / p99 (ETC1S; UASTC) |
|---|---|---|---|---|---|---|---|
| plastered_wall | diff | 2435 | 754 | 4352 | 2.32 / 0.9318 | 0.47 / 0.9958 | |
| plastered_wall | nor | 4505 | 953 | 5223 | 5.60 / 0.8382 | 2.54 / 0.9616 | 4.81 / 16.5 deg; 1.99 / 6.8 deg |
| plastered_wall | rough | 1476 | 496 | 3369 | 0.96 / 0.9762 | 0.04 / 0.9994 | |
| plastered_wall | ao | 2560 | 779 | 4078 | 2.28 / 0.9544 | 0.38 / 0.9980 | |
| wood_floor | diff | 2984 | 812 | 5026 | 3.00 / 0.9289 | 0.94 / 0.9917 | |
| wood_floor | nor | 1864 | 450 | 4245 | 1.49 / 0.9521 | 0.52 / 0.9914 | 1.34 / 3.2 deg; 0.42 / 1.1 deg |
| wood_floor | rough | 2268 | 719 | 4266 | 2.04 / 0.9524 | 0.23 / 0.9986 | |
| wood_floor | ao | 2826 | 782 | 4429 | 3.38 / 0.9442 | 0.58 / 0.9982 | |
| damaged_concrete_floor | diff | 2655 | 791 | 4737 | 3.09 / 0.8878 | 0.63 / 0.9938 | |
| damaged_concrete_floor | nor | 2572 | 591 | 4512 | 1.87 / 0.9351 | 0.75 / 0.9862 | 1.62 / 5.8 deg; 0.58 / 2.4 deg |
| damaged_concrete_floor | rough | 2547 | 710 | 4158 | 2.80 / 0.9214 | 0.38 / 0.9978 | |
| damaged_concrete_floor | ao | 843 | 291 | 1810 | 0.35 / 0.9938 | 0.02 / 0.9997 | |

## Totals per resolution (the 3 measured sets, 12 maps each)

| | JPEG download | ETC1S all | UASTC all | Mixed (ETC1S diff/rough/ao + UASTC nor) | VRAM RGBA8+mips | VRAM ETC1S all | VRAM UASTC all | VRAM mixed |
|---|---|---|---|---|---|---|---|---|
| 1k, 3 sets | 2.20 MB | 2.15 MB | 11.82 MB | 4.74 MB | 67.1 MB | 8.4 MB | 16.8 MB | 10.5 MB |
| 2k, 3 sets | 29.53 MB | 8.13 MB | 50.20 MB | 20.11 MB | 268.4 MB | 33.5 MB | 67.1 MB | 41.9 MB |

(Per set the VRAM figures are identical because all maps are the same size: 1k RGBA 22.4 MB, ETC1S 2.8 MB, UASTC 5.6 MB; 2k RGBA 89.5 MB, ETC1S 11.2 MB, UASTC 22.4 MB.)

UASTC RDO (1k, three worst files, BC7 vs JPEG source):

| file | no RDO KB / SSIM | RDO l=1 KB / SSIM | RDO l=4 KB / SSIM |
|---|---|---|---|
| plastered_wall nor | 1291 / 0.9770 | 1282 / 0.9757 | 1106 / 0.9325 (p99 12.3 deg) |
| damaged_concrete_floor diff | 1116 / 0.9968 | 867 / 0.9778 | 648 / 0.9278 |
| wood_floor ao | 1115 / 0.9980 | 1029 / 0.9961 | 801 / 0.9510 |

RDO either barely shrinks the file or costs about as much quality as ETC1S does, so there is no UASTC-RDO middle ground worth taking.

## GLB textures (public/models/*/*.glb)

All 27 GLBs hold 120 embedded images, **all already WebP**, 5.12 MB total (256x512, 512 and 1024 px; 6 with real alpha).
I extracted them (decoded to PNG, role from the glTF material: 50 sRGB colour/emissive, 36 linear metallic-roughness/occlusion, 34 normal) and encoded
all 120 with the same flags (ETC1S q255; UASTC for the normals as a separate measurement). Quality was **not measured** for these.

| role | n | WebP in GLB | ETC1S | UASTC (normals only) | VRAM RGBA8+mips | VRAM at 0.5 B/px | VRAM at 1 B/px |
|---|---|---|---|---|---|---|---|
| colour (sRGB) | 50 | 2.20 MB | 4.17 MB | | 115.3 MB | 14.4 MB | |
| linear (rough/ao/metal) | 36 | 1.55 MB | 2.72 MB | | 79.7 MB | 10.0 MB | |
| normal | 34 | 1.37 MB | 2.40 MB | 11.26 MB | 76.9 MB | 9.6 MB | 19.2 MB |
| total | 120 | 5.12 MB | 9.28 MB (all ETC1S) or 18.1 MB (UASTC normals) | | 271.9 MB | 34.0 MB (all ETC1S) or 43.6 MB (UASTC normals) | |

Caveats: the sources are already-lossy WebP, so this is a double-lossy pipeline. The 120-image total counts every image in every GLB, including ones that
may not be loaded in a given loop or quality level, so it is an upper bound on what is resident at once. The byte sizes assume the images are re-embedded in the GLBs
(`KHR_texture_basisu`), not stored externally.

## Recommendation per map type

| map | recommendation | why |
|---|---|---|
| diff (sRGB) | **ETC1S q255** for 2k. At 1k the download is a wash, so only convert for the VRAM gain. | SSIM 0.89 to 0.94 (worst: concrete floor 2k, 0.888), MAD 2.2 to 3.1 of 255. Fine noise, not visible in the 1:1 crop. If the owner sees blockiness on the dark concrete, move that one to UASTC (0.99+). |
| nor | **UASTC (no RDO)** if converted at all; **do not use ETC1S** as encoded here. | ETC1S p99 error 11.5 deg (1k) / 16.5 deg (2k) on the plaster wall, likely to show as sparkly lighting under the lamps (not rendered, so unverified). UASTC p99 4.7 / 6.8 deg there. The cost is download (1k: +0.6 to 0.95 MB per map; 2k: about the same as the JPEG for plaster, 1.6 to 2.4x for the other two). An ETC1S + RG-swizzle (`-separate_rg_to_color_alpha`, Z rebuilt in the shader) path is the usual cheaper alternative; **not tested**, a follow-up. |
| rough | **ETC1S q255** | SSIM 0.92 to 0.98, MAD 1 to 2.8. Smooth data, low risk. |
| ao | **ETC1S q255** | SSIM 0.93 to 0.99, MAD 0.4 to 3.4. Low risk; AO is only used at medium/high with n8ao on top. |
| everything, max quality | UASTC L2 | SSIM >= 0.986 everywhere, but 5x larger than JPEG at 1k. Only worth it for VRAM, never for download. |

## What converting everything would save (estimates, with uncertainty)

Only 3 of the 5 texture sets were measured. `src/world/Level.ts` also uses `concrete_wall_003` and `concrete_wall_005`.
Scaling to all five is a straight ratio extrapolation and could be off by +-20 %.

- **Desktop `low` (1k sets):** download roughly unchanged for ETC1S (-2 %) or +2.5 MB for the mixed recipe, since the 1k JPEGs are small.
  VRAM for the 3 measured sets 67 MB to 10.5 MB (-84 %); the other two sets scale the same way (about 22 MB to 3.5 MB each).
- **Desktop medium/high (2k sets):** download for the 3 measured sets 29.5 MB to 20.1 MB mixed (-32 %) or 8.1 MB ETC1S-only (-72 %, but with bad normals).
  VRAM 268 MB to 42 MB (-84 %). The whole `public/textures` tree is 44 MB on disk (`du`, includes the 1k and 512 copies), so a full conversion saving cannot be stated more precisely than "the measured ratio applied to the other two sets": **not measured**.
- **Mobile (512 sets):** **not tested**; the 512 JPEGs are about 70 to 190 KB per set, so only the VRAM side could matter.
- **GLB textures:** download +4.2 MB (all ETC1S) to +13 MB (UASTC normals); VRAM 272 MB to 34 to 44 MB if all 120 images were resident.
  Net for the game: converting GLBs is a VRAM win and a download loss, so it only makes sense if VRAM is the constraint.
- **Not measured, and needed before any decision:** actual GPU memory in a browser, transcode time on the owner's desktop and phone
  (the Basis transcoder wasm must be loaded, plus `KTX2Loader`), the decode-time saving from dropping JPEG decode, the transcoder wasm size, and how Pages' gzip affects KTX2 (UASTC is
  already Zstd-compressed; ETC1S is BasisLZ).

## Reproduce

Work files (not committed): `/tmp/claude-0/trackK/{src,enc,dec,x,glbimg,glbenc,crops}`, scripts `enc.sh`, `unpack.sh`, `analyze.py`, `report.py`, `glbdump.py`, `glbenc.sh`;
raw numbers in `metrics.json`, `rows.json`. These disappear with the container. Re-run with `basisu` v1.50.0 (official release preferred) and the flags in the Method table.
