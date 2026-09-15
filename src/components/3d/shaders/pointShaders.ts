/**
 * Shared GLSL for the point-sprite particle systems (background stars and
 * universe structures). All particles are soft additive discs drawn without
 * textures, so nothing needs to be loaded.
 */

const softDisc = /* glsl */ `
  // Soft gaussian core with a faint wider halo. d is the distance from the
  // sprite centre in [0, 1].
  float softDisc(float d) {
    float core = exp(-d * d * 5.0);
    float halo = exp(-d * 2.5) * 0.3;
    return core + halo;
  }
`

export const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uAttenuation; // 0 = constant pixel size, 1 = perspective-scaled
  uniform float uDrift;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Very slow, tiny drift so the field feels alive without visible motion.
    p += uDrift * vec3(
      sin(uTime * 0.05 + aSeed * 12.0),
      cos(uTime * 0.04 + aSeed * 7.0),
      sin(uTime * 0.03 + aSeed * 5.0)
    );

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float atten = mix(1.0, 240.0 / max(-mv.z, 1.0), uAttenuation);
    gl_PointSize = clamp(aSize * uPixelRatio * atten, 1.0, 12.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;

    // Stars appear one by one during the intro: each has its own threshold.
    float reveal = smoothstep(aSeed * 0.85, aSeed * 0.85 + 0.15, uReveal);
    // Calm shimmer: ±8 % over several seconds, never a flash.
    float shimmer = 0.92 + 0.08 * sin(uTime * 0.4 + aSeed * 40.0);

    vColor = aColor;
    vAlpha = aBrightness * reveal * shimmer;
  }
`

export const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  ${softDisc}
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = softDisc(d) * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }
`

export const universeVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uHover;
  uniform float uDim;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float atten = 260.0 / max(-mv.z, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * atten * (1.0 + uHover * 0.1), 1.0, 5.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;

    float reveal = smoothstep(aSeed * 0.7, aSeed * 0.7 + 0.3, uReveal);
    float shimmer = 0.9 + 0.1 * sin(uTime * 0.5 + aSeed * 60.0);

    vColor = aColor;
    vAlpha = aAlpha * reveal * shimmer * (1.0 + uHover * 0.45) * (1.0 - uDim);
  }
`

export const universeFragmentShader = starFragmentShader

/** Billboarded radial glow used for galaxy cores, bright stars and nebulae. */
export const glowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv - 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const glowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uReveal;
  uniform float uHover;
  uniform float uDim;
  varying vec2 vUv;
  void main() {
    float d = length(vUv) * 2.0;
    float a = exp(-d * d * uFalloff) * uIntensity * uReveal * (1.0 + uHover * 0.35) * (1.0 - uDim);
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`

/**
 * Background nebula: a very faint, slowly drifting fbm haze rendered on the
 * inside of a huge sphere. Kept deliberately dim so the scene stays near-black.
 */
export const nebulaVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const nebulaFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uIntensity;
  varying vec3 vDir;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float n = 0.0;
    for (int x = 0; x < 2; x++)
    for (int y = 0; y < 2; y++)
    for (int z = 0; z < 2; z++) {
      vec3 o = vec3(float(x), float(y), float(z));
      float v = hash3(i + o).x;
      vec3 w = mix(1.0 - f, f, o);
      n += v * w.x * w.y * w.z;
    }
    return n;
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 17.0;
      a *= 0.5;
    }
    return v;
  }

  // Broad, guaranteed-smooth lobes of haze; k controls angular width.
  float lobe(vec3 d, vec3 c, float k) {
    return exp(-k * (1.0 - dot(d, normalize(c))));
  }

  void main() {
    vec3 d = vDir;
    float t = uTime * 0.008;
    float shape =
      lobe(d, vec3(-0.55, 0.25, -0.8), 5.0) * 1.0 +
      lobe(d, vec3(0.6, -0.05, -0.8), 7.0) * 0.7 +
      lobe(d, vec3(0.1, 0.55, -0.8), 4.5) * 0.55 +
      lobe(d, vec3(-0.2, -0.6, 0.75), 6.0) * 0.6;
    float n1 = fbm(d * 2.2 + vec3(t, -t * 0.7, t * 0.4));
    float n2 = fbm(d * 4.0 - vec3(t * 0.5, t, 0.0));
    // Noise only modulates the lobes, so there are never hard edges.
    float haze = shape * (0.45 + 0.9 * n1);
    vec3 col = mix(uColorA, uColorB, n2) * haze * uIntensity;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/** Fresnel rim used as a planet's atmosphere. */
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), uPower);
    float a = rim * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`

/** Comet tail: points sampled along the orbit behind the head, fading with age. */
export const cometTrailVertexShader = /* glsl */ `
  attribute float aAge; // 0 at the head → 1 at the end of the tail
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float fade = 1.0 - aAge;
    gl_PointSize = clamp(uSize * fade * uPixelRatio * (260.0 / max(-mv.z, 1.0)), 1.0, 40.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    vAlpha = fade * fade * uOpacity;
  }
`

export const cometTrailFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = exp(-d * d * 3.5) * vAlpha;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`

/**
 * Relationship connection: a run of small sprites along a curve between two
 * websites. `uPattern` selects the visual language (0 continuous, 1 dashed,
 * 2 flowing packets, 3 dot–dash, 4 trail) so relationship types are told
 * apart by pattern and motion, not colour alone. Motion only has a direction
 * when `uDirected` is set; symmetrical links breathe outward from the middle.
 */
export const connectionVertexShader = /* glsl */ `
  attribute float aT; // 0 at the source → 1 at the target
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uTime;
  uniform float uPattern;
  uniform float uDirected;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Ease off near both ends so the line never stabs into a body.
    float ends = smoothstep(0.0, 0.07, aT) * smoothstep(1.0, 0.93, aT);
    // Directed: phase runs source → target. Symmetrical: outward from the centre.
    float pos = uDirected > 0.5 ? aT : abs(aT - 0.5) * 2.0;
    float a = 1.0;
    float size = 1.0;
    if (uPattern < 0.5) {
      a = 0.72 + 0.28 * sin(pos * 14.0 - uTime * 1.1);
    } else if (uPattern < 1.5) {
      float f = fract(aT * 16.0 - (uDirected > 0.5 ? uTime * 0.5 : 0.0));
      a = 0.18 + 0.82 * step(0.42, f);
    } else if (uPattern < 2.5) {
      float f = fract(pos * 5.0 - uTime * 0.8);
      float packet = exp(-pow((f - 0.5) * 4.5, 2.0));
      a = 0.14 + 0.86 * packet;
      size = 0.75 + 1.5 * packet;
    } else if (uPattern < 3.5) {
      float f = fract(aT * 9.0);
      float dash = step(0.5, f) * 0.85;
      float dot = 1.0 - step(0.09, abs(f - 0.22));
      a = (0.16 + 0.84 * max(dash, dot)) * (0.75 + 0.25 * sin(uTime * 2.0 + aT * 9.0));
    } else {
      float f = fract(aT * 3.0 - uTime * 0.35);
      a = 0.35 + 0.65 * exp(-pow((f - 0.5) * 3.0, 2.0));
    }
    vAlpha = a * ends;
    gl_PointSize = clamp(uSize * size * uPixelRatio * (200.0 / max(-mv.z, 1.0)), 1.0, 8.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
  }
`

export const connectionFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = exp(-d * d * 3.0) * vAlpha * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`
