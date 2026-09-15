# The WebGalaxy

An immersive 3D visualisation of the internet. Categories of websites are
represented as independent **universes** inside one shared galaxy; websites
will later live inside those universes as celestial objects.

**There is no hierarchy between universes.** The only container is The
WebGalaxy itself; every universe is an equal, independent region of it.

## Phase 1 — 3D foundation

This phase builds the visual and architectural foundation only:

- full-viewport React Three Fiber scene with a three-layer procedural starfield
- cinematic intro (stars fade in → camera flies forward → title → pull back →
  universes reveal), skippable
- ten placeholder universes with five distinct visual types (spiral galaxy,
  globular cluster, nebula, stellar stream, planetary system)
- floating labels, hover response, damped orbit / pan / zoom camera,
  pointer parallax
- device-aware quality profile (particle counts, DPR, post-processing)

## Phase 2 — Celestial website system

Websites now live inside their universe as celestial objects:

- `WebsiteDefinition` model + a sample dataset of 57 sites across all ten
  universes (`src/data/websites.ts`)
- four object types — **stars** (prominent sites), **planets**, **moons**
  (visually circling another site; not a hierarchy) and a few **comets** on
  long eccentric paths with analytic tails
- procedural placement (best-candidate sampling inside each universe's layout
  ellipsoid, importance pulls inward, footprints keep clear) and deterministic
  orbits (drift ellipses, moon orbits, comet ellipses), scaled by each
  universe's `layout.energy`
- identity without logo assets: brand accent colour + monogram baked into a
  procedurally generated surface texture (planets/moons), a dark monogram in a
  star's core, a glowing one on a comet head. A `logo` field is reserved.
- distance-based discovery: objects fade in as the camera approaches (major
  stars from further away), collapse to glow points beyond the LOD distance,
  and reveal in stages (stars → planets → moons → comets) when a universe is
  entered
- hover (scale, glow, orbit slows, label, cursor) and selection (camera flies
  in and follows the orbit, siblings and the universe structure dim, a
  placeholder card appears); Esc / "← The WebGalaxy" step back out
- per-universe environments: drifting dust tinted by palette, faint background
  bodies, layout profiles (dense AI, sparse Cybersecurity, calm Education, …)
- exploration modes in the store: `galaxy` → `universe` → `website`

Still no backend, database, search, auth, external navigation or full
information panel.

## Stack

React 19 · TypeScript · Vite · Three.js · @react-three/fiber · @react-three/drei ·
@react-three/postprocessing · Tailwind CSS 4 · Zustand · GSAP

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
npm run lint
```

## Structure

```
src/
  components/
    3d/
      WebGalaxyScene.tsx     Canvas + scene composition
      StarField.tsx          three parallax star shells (custom point shader)
      BackgroundNebula.tsx   faint sky-sphere haze
      UniverseField.tsx      places every universe (flat list — no nesting)
      universe/
        Universe.tsx         one universe: structure, hover/active/dim, label
        UniverseWebsites.tsx places + animates the universe's websites
        UniverseEnvironment.tsx  dust and background bodies
      celestial/
        CelestialObject.tsx  orbit, visibility/LOD, hover/focus easing, label
        StarWebsite.tsx  PlanetWebsite.tsx  MoonWebsite.tsx  CometWebsite.tsx  CometTrail.tsx
        ObjectGlow.tsx  GlyphSprite.tsx  celestialFrame.ts
      interaction/
        UniverseInteraction.tsx  WebsiteInteraction.tsx   pointer handling
      CameraController.tsx   GSAP intro + exploration flights + damped OrbitControls
      PointerTracker.tsx     smoothed pointer for parallax
      Effects.tsx            bloom + vignette (lazy-loaded, skipped on low tier)
      DevBridge.tsx          dev-only window hooks for tests (`window.__webgalaxy`)
      visuals/               particle cloud, glow sprites, orbiting bodies
      shaders/               shared GLSL
    ui/
      GalaxyTitle.tsx  Navigation.tsx  UniverseLabel.tsx  WebsiteLabel.tsx
      ExplorationContext.tsx  WebsitePlaceholder.tsx  InteractionHint.tsx  IntroSkip.tsx
  data/
    universes.ts             universe definitions (position, scale, visual type, palette, layout)
    websites.ts              website definitions (universeId, objectType, importance, accent, glyph)
  utils/
    celestial.ts             sizes, fade distances, procedural textures
    generatePositions.ts     best-candidate placement with clearance
    generateOrbits.ts        drift / moon / comet orbits + evaluator
  lib/
    universeGeometry/        deterministic procedural builders per visual type
    celestialRegistry.ts     id → Object3D lookup for camera flights
    sceneMotion.ts           per-frame values shared between timeline and shaders
    intro.ts                 handle used by the UI to skip the intro
    random.ts                seeded PRNG
  hooks/
    useQualityProfile.ts     device tier → render budget
    useParallax.ts           camera-space pointer parallax for a group
    useExplorationKeys.ts    Esc steps back a level
  store/galaxyStore.ts       Zustand: hovered/active/selected ids, exploration mode, camera target
  types/galaxy.ts            domain types
  styles/index.css           Tailwind + theme tokens
```

### Conventions

- Universe layout is authored in `data/universes.ts` and validated against both
  overview cameras (landscape and portrait) so labels never overlap at rest.
- Values that change every frame (reveal progress, pointer, hover easing) live
  in plain mutable objects read inside `useFrame`, not in React state.
- All Three.js resources are created through JSX so R3F disposes them on
  unmount; generated canvas textures are disposed in effect cleanups.
- A universe's hit sphere is removed from raycasting while the camera is
  inside it — R3F keeps a hovered object that stopped propagation blocking
  everything behind it until it leaves the hit list.
- Colours are authored as sRGB hex; shaders output through
  `colorspace_fragment`, and the canvas runs without tone mapping so the
  post-processed and fallback paths look identical.
