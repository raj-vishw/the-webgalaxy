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

## Phase 3 — Interactive exploration & website experience

The environment is now fully explorable, as one continuous space:

- **view modes** `galaxy → universe → website` (navigation state only — the
  data stays flat) with cinematic camera flights between them; closing a
  website restores the exact pose the user had before focusing it
- **website info panel** (`WebsiteInfoPanel`): monogram/logo, name, universe,
  description, type, tags, prominence bar, *Visit Website* (new tab, with
  feedback) and *Back*; every field degrades gracefully when data is missing
- **location indicator** `WEBGALAXY / AI / CHATGPT` (clickable segments),
  **universe info** card (name, description, websites discovered), contextual
  **interaction hints** per view that step aside once the user is active
- **selection language**: hover ring hint + label; focused websites get a
  tilted orbital ring with travelling motes, stronger glow, calmer motion and
  a finer close-up sphere (`detail` LOD); a selected universe brightens and
  swells until the camera is inside, other universes recede but stay present
- **interaction layer** (`interaction/GalaxyInteraction.tsx`,
  `utils/interaction.ts`): only tagged hit volumes carry handlers (particles
  are never raycast); overlapping hits are re-ranked selected website →
  website → universe. A typed `interactionEvents` bus emits hover / select /
  visit / back / camera-travel events for a future audio layer.
- **input**: mouse, drag, scroll, tap, drag, pinch; Esc steps back a level;
  buttons have visible focus rings
- **reduced motion** (`prefers-reduced-motion`): faster intro, sub-second
  flights without arcs, calmer orbits/dust, no idle drift or parallax,
  near-instant UI transitions

## Phase 4 — Search, discovery & navigation

Every way of finding something turns into the same physical journey through
the galaxy (`utils/navigation.ts` → store → `CameraTransition`):

- **global search** (`/`, Ctrl/⌘ K, or the nav button): live, ranked local
  search over names, descriptions, tags and universe names
  (`utils/search.ts`: exact > starts-with > partial name > universe > tag >
  description, prominence breaks ties); universes and websites both appear;
  arrow keys / Enter / Esc; empty-state suggestions, universe chips and a
  static **Featured** list (`data/featured.ts`); "Nothing found" with *Clear
  Search*. Choosing a website in another universe flies **through that
  universe first** (a bezier via a waypoint) and the destination stays lit
  the whole way
- **filters** (`F`): universe × object type × importance band, combined with
  AND; non-matching websites recede to 15 % and stop responding, nothing is
  removed; *Clear Filters* restores everything
- **discovery** (`D`): *Discover Something* / *Discover Universe* — candidates
  flash through the scene and the overlay, slow down, stop on the destination
  ("Destination found"), then the camera travels there. Only complete entries
  (URL + description) are eligible. Reduced motion skips the scan
- **navigation**: `Explore` universe list (`E`), top-down **minimap** (`M`)
  with camera position/heading and clickable markers, and the location
  indicator `THE WEBGALAXY / AI / CHATGPT`; the document title follows
- **interruptible flights**: touching the scene mid-flight stops the camera
  where it is and hands control back
- **performance**: search/filter/discovery state is translated by
  `EmphasisBridge` into per-frame sets in `sceneMotion`; typing never
  re-renders a 3D component
- `utils/navigation.ts` also exposes route-shaped `locationPath()` /
  `parseLocationPath()` for a future router — universes are still not pages

Still no backend, auth, submissions, admin or recommendation engine.

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
        UniverseContents.tsx websites + environment (unscaled world space)
        UniverseWebsites.tsx places + animates the universe's websites
        UniverseEnvironment.tsx  dust and background bodies
      celestial/
        CelestialObject.tsx  orbit, visibility/LOD, hover/focus easing, label
        StarWebsite.tsx  PlanetWebsite.tsx  MoonWebsite.tsx  CometWebsite.tsx  CometTrail.tsx
        SelectionRing.tsx  ObjectGlow.tsx  GlyphSprite.tsx  celestialFrame.ts
      interaction/
        GalaxyInteraction.tsx    scene-wide hit ranking + motion preference
        UniverseInteraction.tsx  WebsiteInteraction.tsx   tagged hit volumes
      camera/
        CameraController.tsx GSAP intro, damped OrbitControls, focus follow, minimap pose
        CameraTargeting.tsx  resolves a destination (focus, position, optional waypoint)
        CameraTransition.tsx flies there — bezier through waypoints, interruptible
      EmphasisBridge.tsx     store → per-frame emphasis/filter sets
      PointerTracker.tsx     smoothed pointer for parallax
      Effects.tsx            bloom + vignette (lazy-loaded, skipped on low tier)
      DevBridge.tsx          dev-only window hooks for tests (`window.__webgalaxy`)
      visuals/               particle cloud, glow sprites, orbiting bodies
      shaders/               shared GLSL
    search/      SearchOverlay.tsx  SearchInput.tsx  SearchResults.tsx  SearchResult.tsx  CelestialIcon.tsx
    filters/     FilterPanel.tsx  UniverseFilter.tsx  ObjectTypeFilter.tsx  ImportanceFilter.tsx  FilterSelect.tsx
    discovery/   DiscoveryButton.tsx  DiscoveryAnimation.tsx
    navigation/  UniverseNavigator.tsx  GalaxyMinimap.tsx  LocationIndicator.tsx
    ui/
      GalaxyTitle.tsx  GalaxyNavigation.tsx  UniverseLabel.tsx  WebsiteLabel.tsx
      UniverseInfo.tsx  WebsiteInfoPanel.tsx  InteractionHints.tsx  IntroSkip.tsx  panel.ts
  data/
    featured.ts              static featured picks + search suggestions
    universes.ts             universe definitions (position, scale, visual type, palette, layout)
    websites.ts              website definitions (universeId, objectType, importance, accent, glyph)
  utils/
    search.ts                ranked local search
    filtering.ts             filter model + matching
    discovery.ts             random picks + scan sequence
    navigation.ts            camera-targeting API + route-shaped location helpers
    camera.ts                overview / approach / view-distance / flight timing math
    interaction.ts           interaction event bus + hit ranking
    celestial.ts             sizes, fade distances, metadata fallbacks, procedural textures
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
    useKeyboardShortcuts.ts  / ⌘K F E D M Esc
  store/galaxyStore.ts       Zustand: view mode, ids, camera target/previous pose, overlay, search query, filters, discovery, minimap
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
