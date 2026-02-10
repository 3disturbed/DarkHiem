import {
  CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM, CAMERA_DEFAULT_ZOOM,
  CAMERA_LERP_SPEED, CAMERA_ZOOM_SPEED
} from '../../shared/Constants.js';
import { lerp, clamp } from '../../shared/MathUtils.js';

export default class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = CAMERA_DEFAULT_ZOOM;
    this.targetZoom = CAMERA_DEFAULT_ZOOM;

    // Pinch-to-zoom state
    this._pinchStartDist = 0;
    this._pinchStartZoom = 0;
  }

  follow(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(dt) {
    // Frame-rate independent exponential decay
    const posFactor = 1 - Math.pow(1 - CAMERA_LERP_SPEED, dt * 60);
    const zoomFactor = 1 - Math.pow(1 - CAMERA_ZOOM_SPEED, dt * 60);
    this.x = lerp(this.x, this.targetX, posFactor);
    this.y = lerp(this.y, this.targetY, posFactor);
    this.zoom = lerp(this.zoom, this.targetZoom, zoomFactor);

    // Snap to pixel grid to prevent sub-pixel tile shimmer
    this.x = Math.round(this.x * this.zoom) / this.zoom;
    this.y = Math.round(this.y * this.zoom) / this.zoom;
  }

  zoomBy(delta) {
    this.targetZoom = clamp(
      this.targetZoom + delta,
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM
    );
  }

  setZoom(value) {
    this.targetZoom = clamp(value, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX, screenY, canvasWidth, canvasHeight) {
    const worldX = (screenX - canvasWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - canvasHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX, worldY, canvasWidth, canvasHeight) {
    const screenX = (worldX - this.x) * this.zoom + canvasWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + canvasHeight / 2;
    return { x: screenX, y: screenY };
  }

  // Handle pinch-to-zoom start
  onPinchStart(distance) {
    this._pinchStartDist = distance;
    this._pinchStartZoom = this.zoom;
  }

  // Handle pinch-to-zoom move
  onPinchMove(distance) {
    if (this._pinchStartDist <= 0) return;
    const scale = distance / this._pinchStartDist;
    this.setZoom(this._pinchStartZoom * scale);
  }
}
