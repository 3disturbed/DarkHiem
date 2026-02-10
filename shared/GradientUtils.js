// Calculate gradient (0.0 - 1.0) of a world X position within a biome's bounds
export function biomeGradient(worldX, biomeStartX, biomeEndX) {
  const range = biomeEndX - biomeStartX;
  if (range <= 0) return 0.5;
  return Math.max(0, Math.min(1, (worldX - biomeStartX) / range));
}

// Apply curve to gradient value
export function applyCurve(t, curve = 'linear') {
  switch (curve) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2;
    case 'linear':
    default:
      return t;
  }
}

// Interpolate density based on gradient position
export function gradientDensity(gradient, densityAtLeft, densityAtRight) {
  return densityAtLeft + (densityAtRight - densityAtLeft) * gradient;
}

// Check if a gradient position is within a spawn range
export function inGradientRange(gradient, minGradient, maxGradient) {
  return gradient >= minGradient && gradient <= maxGradient;
}
