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

## Phase 5 — Intelligence, relationships & advanced discovery

The galaxy becomes a map of how the web connects. **Relationships connect
equals** — "GitHub — Vercel" means the two are used together, never that one
owns, contains or outranks the other; universes likewise only have
*affinities*. Everything is deterministic and local; the service layer is
shaped so a backend/AI can replace it later without touching the UI.

- **relationship data** (`types/galaxy.ts`, `data/relationships.ts`, inline
  `website.relationships`): a controlled vocabulary — `related`,
  `alternative`, `integration`, `ecosystem`, `complementary`, `competitor`,
  `same-company`. Symmetrical by default (declared once, mirrored), `directed`
  only where a connection genuinely flows one way. Cross-universe links are
  allowed and kept sparse
- **validation** (`services/relationshipService.ts`): unknown ids, self links,
  unknown types and duplicates are dropped with a dev warning — the dataset
  deliberately ships three bad entries to prove the app never breaks
- **visual connections** (`3d/relationships/`): when a website is focused,
  up to six of its connections are drawn as thin animated sprite curves
  between the *live* positions of both ends, arcing gently and fading near
  the bodies; nothing is drawn otherwise. Pattern and motion, not colour,
  tell the types apart — continuous (related / ecosystem / same-company),
  dashed (alternative / competitor), flowing packets (works with), dot–dash
  (complements). Symmetrical links breathe outward from the middle; only
  directed ones move source → target. Far ends keep a minimum presence and a
  quiet label even across the galaxy. Lines linger briefly while fading on a
  change of focus
- **panel** (`WebsiteInfoPanel`): the *Related* section is the accessible twin
  of the lines (same set, same order, type spelled out, plus an `sr-only`
  sentence), with a legend of the patterns on screen; *Explore Similar* /
  *Find Alternatives* / *Works With* light up a result set in the scene and
  list it with reasons; *You may also explore* offers 3 scored next stops.
  Trending / emerging websites carry a small badge
- **discovery paths & history**: every focus extends the explorer's own
  trail (`activeDiscoveryPath`, drawn as a faint directed thread); a return to
  the overview or a random jump starts a fresh one. *Recently explored* lives
  in the Explore panel; history and session signals persist in
  `sessionStorage` only (tab-local, never uploaded)
- **recommendations** (`services/recommendationService.ts`): a plain sum of
  bounded signals — explicit relationship, relationships with earlier stops
  (decaying), shared tags weighted by the session's tag profile, same / paired
  universe, repeat universe visits, prominence, object type, trend — normalised
  to 0–1, with short explanations ("Works with GitHub", "Shares hosting,
  devops", "You keep exploring Cybersecurity"). Recently viewed websites step
  back. `getSimilarWebsites` adds description keywords and comparable
  prominence and ignores the session so "similar" means the same for everyone
- **trending & emerging** (`data/trends.ts`): a static demo snapshot
  (`trendingScore`, `trendDirection`, `emerging`, `asOf`) — explicitly not live
  traffic. Trending websites breathe with a wide slow glow, emerging ones
  carry a few drifting sparks; neither changes size
- **discovery console** (`D`): Random · Similar · Alternatives · Related ·
  Trending · Emerging · Universe, all through the same scan → "Destination
  found" → flight; modes that need a focused website wait for one, and an
  empty pool is announced instead of faked
- **universe affinities** (`data/recommendations.ts`): "Also worth exploring"
  chips on the universe card suggest peer universes, with the reason as a
  tooltip
- **search & filters**: a confident name match expands into *Related to X* /
  *Alternatives to X* sections (keyboard-navigable like the rest); the empty
  state lists Trending and Emerging; a fourth filter — Trending / Emerging /
  Related / Alternatives — combines with the others (related / alternatives
  are relative to the focused website when there is one)
- **camera**: following a connection is the same flight as any focus
  (through the destination's universe when it lies elsewhere); the approach
  now turns away from neighbouring bodies so the camera never parks inside
  one, and a focus that crosses universes forgets the old free-exploration
  pose so *Back* returns to the new universe
- **accessibility & performance**: relationships are always available as text;
  discovery/highlight state flows through `EmphasisBridge` into per-frame
  sets (`sceneMotion.relations`), and at most a handful of connection curves
  exist at any time

Still no backend, auth, submissions, admin, machine learning or live data.

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
        SelectionRing.tsx  ObjectGlow.tsx  GlyphSprite.tsx  TrendMarker.tsx  celestialFrame.ts
      interaction/
        GalaxyInteraction.tsx    scene-wide hit ranking + motion preference
        UniverseInteraction.tsx  WebsiteInteraction.tsx   tagged hit volumes
      camera/
        CameraController.tsx GSAP intro, damped OrbitControls, focus follow, minimap pose
        CameraTargeting.tsx  resolves a destination (focus, position, optional waypoint)
        CameraTransition.tsx flies there — bezier through waypoints, interruptible
      relationships/
        RelationshipGraph.tsx  connections of the focused website / highlight set
        RelationshipLines.tsx  the drawn set, with fade-out of dropped lines
        ConnectionLine.tsx     one animated sprite curve between two live positions
        DiscoveryPath.tsx      the explorer's trail
        connectionStyles.ts    type → pattern / strength
      EmphasisBridge.tsx     store → per-frame emphasis/filter/relation sets
      PointerTracker.tsx     smoothed pointer for parallax
      Effects.tsx            bloom + vignette (lazy-loaded, skipped on low tier)
      DevBridge.tsx          dev-only window hooks for tests (`window.__webgalaxy`)
      visuals/               particle cloud, glow sprites, orbiting bodies
      shaders/               shared GLSL
    search/      SearchOverlay.tsx  SearchInput.tsx  SearchResults.tsx  SearchResult.tsx  CelestialIcon.tsx
    filters/     FilterPanel.tsx  UniverseFilter.tsx  ObjectTypeFilter.tsx  ImportanceFilter.tsx  DiscoveryFilter.tsx  FilterSelect.tsx
    discovery/   DiscoveryMenu.tsx  DiscoveryAnimation.tsx  RecommendationPanel.tsx  HighlightList.tsx
                 SimilarWebsites.tsx  AlternativeWebsites.tsx  IntegrationWebsites.tsx  TrendingWebsites.tsx  EmergingWebsites.tsx
    relationships/  RelatedWebsites.tsx  RelationshipNode.tsx  RelationshipLegend.tsx
    history/     ExplorationHistory.tsx
    navigation/  UniverseNavigator.tsx  GalaxyMinimap.tsx  LocationIndicator.tsx
    ui/
      GalaxyTitle.tsx  GalaxyNavigation.tsx  UniverseLabel.tsx  WebsiteLabel.tsx
      UniverseInfo.tsx  WebsiteInfoPanel.tsx  InteractionHints.tsx  IntroSkip.tsx  panel.ts
  data/
    featured.ts              static featured picks + search suggestions
    universes.ts             universe definitions (position, scale, visual type, palette, layout)
    websites.ts              website definitions (universeId, objectType, importance, accent, glyph, relationships)
    relationships.ts         shared relationship dataset (validated at load)
    trends.ts                static demo trend snapshot
    recommendations.ts       scoring weights + universe affinities
  services/
    relationshipService.ts   merge + validate + query the relationship graph
    recommendationService.ts deterministic, explainable scoring; trending / emerging; similar
    discoveryService.ts      discovery modes, highlight sets, search expansion, filter contexts
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
    celestialRegistry.ts     id → Object3D lookup for camera flights and connections
    sceneMotion.ts           per-frame values shared between timeline and shaders
    sessionStorage.ts        guarded tab-local persistence of history and signals
    intro.ts                 handle used by the UI to skip the intro
    random.ts                seeded PRNG
  hooks/
    useQualityProfile.ts     device tier → render budget
    useParallax.ts           camera-space pointer parallax for a group
    useKeyboardShortcuts.ts  / ⌘K F E D M Esc
  store/galaxyStore.ts       Zustand: view mode, ids, camera target/previous pose, overlay, search query, filters, discovery,
                             minimap, exploration history, session signals, recommendations, visible relationships, path, highlight
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
- Relationships are edges between equals. Nothing in data, services, store or
  UI may derive a parent/child, level or ownership from them; a relationship
  list is ranked for *display* only.
- Global element resets live in `@layer base` so Tailwind utilities keep
  precedence.
