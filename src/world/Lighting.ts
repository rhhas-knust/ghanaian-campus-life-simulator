/**
 * Daylight and sky.
 *
 * The brief calls for natural tropical daylight, which in practice means a high,
 * hard, slightly warm sun and a lot of bounce light off bright ground. Three
 * lights do the whole job:
 *
 *   HemisphereLight  — blue from the sky, warm laterite bounce from below. This
 *                      is what stops shadowed walls reading as flat grey.
 *   DirectionalLight — the sun itself, and the only shadow caster.
 *   AmbientLight     — a small floor so nothing is ever pure black.
 *
 * The sky is a single inward-facing sphere with a two-stop gradient shader: one
 * draw call, no texture download, and it costs nothing to fill because it is
 * drawn behind everything else.
 */

import {
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  PointLight,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

import { LAMPS, planPoint } from '../config/campusLayout';
import { ATMOSPHERE } from '../config/palette';
import type { QualityPreset } from '../config/settings';

/** Sun azimuth/elevation, chosen for long raking shadows across the courtyard. */
const SUN_DIRECTION = new Vector3(-0.42, 0.72, 0.55).normalize();
const SUN_DISTANCE = 120;

export interface LightingHandles {
  readonly sun: DirectionalLight;
  readonly hemisphere: HemisphereLight;
  readonly ambient: AmbientLight;
  readonly sky: Mesh;
  readonly lampLights: PointLight[];
}

export function buildLighting(scene: Scene, quality: QualityPreset): LightingHandles {
  const hemisphere = new HemisphereLight(ATMOSPHERE.skyHorizon, ATMOSPHERE.groundBounce, 1.15);
  hemisphere.position.set(0, 60, 0);
  scene.add(hemisphere);

  const ambient = new AmbientLight(0xffffff, 0.26);
  scene.add(ambient);

  const sun = new DirectionalLight(ATMOSPHERE.sunColour, 2.1);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(SUN_DISTANCE);
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  if (quality.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    // The shadow box follows the player (see `updateShadowFocus`) rather than
    // covering the whole 272 m campus, which would leave each shadow texel
    // half a metre wide. Distant buildings lose their shadows, but fog is
    // already softening them by then.
    const extent = quality.shadowRadius;
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = SUN_DISTANCE * 2;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.09;
    sun.shadow.camera.updateProjectionMatrix();
  }

  const sky = buildSky(quality);
  scene.add(sky);

  scene.fog = new Fog(
    ATMOSPHERE.fogColour,
    quality.drawDistance * quality.fogNearFactor,
    quality.drawDistance * quality.fogFarFactor,
  );

  const lampLights = quality.lampPointLights ? buildLampLights(scene) : [];

  return { sun, hemisphere, ambient, sky, lampLights };
}

/** Inward-facing gradient dome. Written as a shader to avoid a texture download. */
function buildSky(quality: QualityPreset): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      topColour: { value: new Color(ATMOSPHERE.skyTop) },
      horizonColour: { value: new Color(ATMOSPHERE.skyHorizon) },
      // Pushes the gradient's midpoint down so the bright band sits on the
      // horizon rather than halfway up the sky.
      offset: { value: 0.08 },
      exponent: { value: 0.72 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColour;
      uniform vec3 horizonColour;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float height = normalize(vWorldPosition).y + offset;
        float blend = pow(max(height, 0.0), exponent);
        gl_FragColor = vec4(mix(horizonColour, topColour, clamp(blend, 0.0, 1.0)), 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });

  // Sits just inside the camera's far plane so it is never clipped away.
  const geometry = new SphereGeometry(quality.drawDistance * 0.92, 16, 10);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Warm point light inside each lamp head. High preset only.
 *
 * In full daylight these read as a subtle warm pool under the lantern rather
 * than anything dramatic — the real reason they exist is that Phase 2's
 * time-of-day cycle needs them already wired to the lamp data.
 */
function buildLampLights(scene: Scene): PointLight[] {
  const lights: PointLight[] = [];

  for (const lamp of LAMPS) {
    const [x, z] = planPoint(lamp.at);
    const light = new PointLight(0xffe2a8, 0.5, 14, 2);
    light.position.set(x, lamp.height - 0.3, z);
    // Shadow-casting point lights need six render passes each. Never.
    light.castShadow = false;
    light.name = `lamp-light:${lamp.id}`;
    scene.add(light);
    lights.push(light);
  }

  return lights;
}

/**
 * Re-centres the sun and its shadow box on the player.
 *
 * The focus is snapped to whole shadow texels: without that, every step the
 * player takes slides the shadow map by a fraction of a texel and every shadow
 * edge on screen shimmers.
 */
export function updateShadowFocus(handles: LightingHandles, quality: QualityPreset, x: number, z: number): void {
  if (!quality.shadows) {
    return;
  }
  const texel = (quality.shadowRadius * 2) / quality.shadowMapSize;
  const snappedX = Math.round(x / texel) * texel;
  const snappedZ = Math.round(z / texel) * texel;
  handles.sun.target.position.set(snappedX, 0, snappedZ);
  handles.sun.position.set(
    snappedX + SUN_DIRECTION.x * SUN_DISTANCE,
    SUN_DIRECTION.y * SUN_DISTANCE,
    snappedZ + SUN_DIRECTION.z * SUN_DISTANCE,
  );
  handles.sun.target.updateMatrixWorld();
}

/** Releases the sky's geometry and shader. */
export function disposeLighting(handles: LightingHandles): void {
  for (const light of handles.lampLights) {
    light.removeFromParent();
    light.dispose();
  }
  handles.sky.geometry.dispose();
  const material = handles.sky.material;
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose();
    }
  } else {
    material.dispose();
  }
}

/** Outdoor values, captured once so indoors can be undone exactly. */
const outdoorIntensity = new WeakMap<LightingHandles, { hemisphere: number; ambient: number }>();

/**
 * Indoors there is no sun or sky: the campus sun would light rooms through the
 * ceiling and throw the ceiling's shadow over everything. Interiors are lit by
 * a brighter, warmer fill instead, with glowing lamp and window panels for
 * the look of light sources — no real point lights, which are expensive on
 * phones.
 */
export function setIndoorLighting(handles: LightingHandles, scene: Scene, indoor: boolean, quality: QualityPreset): void {
  let saved = outdoorIntensity.get(handles);
  if (!saved) {
    saved = { hemisphere: handles.hemisphere.intensity, ambient: handles.ambient.intensity };
    outdoorIntensity.set(handles, saved);
  }
  handles.sun.visible = !indoor;
  handles.sky.visible = !indoor;
  for (const lamp of handles.lampLights) {
    lamp.visible = !indoor;
  }
  handles.hemisphere.intensity = indoor ? 1.55 : saved.hemisphere;
  handles.ambient.intensity = indoor ? 0.75 : saved.ambient;
  scene.fog = indoor
    ? null
    : new Fog(ATMOSPHERE.fogColour, quality.drawDistance * quality.fogNearFactor, quality.drawDistance * quality.fogFarFactor);
}
