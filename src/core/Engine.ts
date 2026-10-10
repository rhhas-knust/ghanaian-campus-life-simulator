/**
 * Renderer, scene and camera ownership.
 *
 * Deliberately thin: it knows about WebGL and the window, and nothing about the
 * campus, the player or the UI. The one piece of real logic here is quality
 * switching, which has an awkward constraint — `antialias` is fixed when a
 * WebGL context is created, so changing it means building a new renderer and a
 * new canvas. Everything else (pixel ratio, shadows, draw distance) can be
 * changed in place.
 *
 * Pointer lock is requested on the CONTAINER, not the canvas, precisely so that
 * swapping the canvas out from under it does not break mouse look.
 */

import {
  ACESFilmicToneMapping,
  NoToneMapping,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

import { CAMERA_SETTINGS, type QualityPreset } from '../config/settings';

export class Engine {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;

  private renderer: WebGLRenderer;
  private quality: QualityPreset;
  private resizeFrame = 0;

  constructor(
    private readonly container: HTMLElement,
    quality: QualityPreset,
    private readonly onContextLost: () => void,
  ) {
    this.quality = quality;
    this.camera = new PerspectiveCamera(
      CAMERA_SETTINGS.fieldOfView,
      1,
      CAMERA_SETTINGS.near,
      quality.drawDistance,
    );
    // YXZ keeps yaw and pitch independent, which is what a first-person camera
    // needs; the default XYZ order introduces roll as soon as you look up.
    this.camera.rotation.order = 'YXZ';

    this.renderer = this.createRenderer(quality);
    this.handleResize();

    window.addEventListener('resize', this.scheduleResize);
    window.addEventListener('orientationchange', this.scheduleResize);
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  get webglRenderer(): WebGLRenderer {
    return this.renderer;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Applies a quality preset.
   *
   * @returns `true` when the renderer had to be rebuilt, which means shaders
   *          will recompile and the caller should show progress.
   */
  applyQuality(quality: QualityPreset): boolean {
    const needsNewContext = quality.antialias !== this.quality.antialias;
    this.quality = quality;

    this.camera.far = quality.drawDistance;
    this.camera.updateProjectionMatrix();

    if (needsNewContext) {
      this.disposeRenderer();
      this.renderer = this.createRenderer(quality);
      this.handleResize();
      return true;
    }

    this.configureRenderer(this.renderer, quality);
    this.handleResize();
    return false;
  }

  /** Matches the drawing buffer to the container, honouring the pixel-ratio cap. */
  handleResize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();

    // Capping the pixel ratio is the single biggest performance lever on a
    // phone: a 3x-density screen renders 9x the pixels of a 1x one.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatioCap));
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    window.removeEventListener('resize', this.scheduleResize);
    window.removeEventListener('orientationchange', this.scheduleResize);
    if (this.resizeFrame !== 0) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = 0;
    }
    this.disposeRenderer();
  }

  private createRenderer(quality: QualityPreset): WebGLRenderer {
    const renderer = new WebGLRenderer({
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      // We never read back pixels or composite the canvas over page content.
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    this.configureRenderer(renderer, quality);
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.container.append(renderer.domElement);
    return renderer;
  }

  private configureRenderer(renderer: WebGLRenderer, quality: QualityPreset): void {
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = quality.shadowMapSize >= 2048 ? PCFSoftShadowMap : PCFShadowMap;
    // Tone mapping costs a few instructions per pixel; skip it on the low preset
    // where fill rate is the bottleneck.
    renderer.toneMapping = quality.shadows ? ACESFilmicToneMapping : NoToneMapping;
    renderer.toneMappingExposure = 1.05;
  }

  private disposeRenderer(): void {
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /**
   * Coalesces resize events into one per frame. Android fires a burst of these
   * while the address bar slides away.
   */
  private readonly scheduleResize = (): void => {
    if (this.resizeFrame !== 0) {
      return;
    }
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.handleResize();
    });
  };

  private readonly handleContextLost = (event: Event): void => {
    // Without `preventDefault` the context can never be restored. Phones drop
    // the context when the tab is backgrounded under memory pressure.
    event.preventDefault();
    this.onContextLost();
  };
}
