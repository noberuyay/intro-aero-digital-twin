const TRIM_TOLERANCE = 1e-6;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Inputs: angles in degrees; Cm0 dimensionless; Cm-alpha in 1/rad.
// Outputs: angles in radians/degrees as named; coefficients dimensionless.
// Sign convention: positive angle of attack and pitching moment are nose-up.
// Assumption: linear, quasi-static Cm-alpha model over the investigated range.

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }

  return value;
}

export function degreesToRadians(degrees) {
  return requireFiniteNumber(degrees, "degrees") * DEG_TO_RAD;
}

export function radiansToDegrees(radians) {
  return requireFiniteNumber(radians, "radians") * RAD_TO_DEG;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  if (trimAngleRad === null) {
    return null;
  }

  return radiansToDegrees(trimAngleRad);
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceAlphaRad;
}

export function calculateDisturbanceProduct(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  return disturbanceAlphaRad * deltaCm;
}

export function classifyDisturbance(cmAlphaPerRad, disturbanceAlphaDeg) {
  const product = calculateDisturbanceProduct(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export function calculateTrimResponse(aircraft) {
  if (!aircraft || typeof aircraft !== "object") {
    throw new TypeError("aircraft must be an object");
  }

  const {
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
    disturbanceAlphaDeg
  } = aircraft;

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const cm = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  const trimAngleDeg = trimAngleRad === null
    ? null
    : radiansToDegrees(trimAngleRad);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );
  const disturbanceProduct = disturbanceAlphaRad * deltaCm;

  return {
    alphaRad,
    disturbanceAlphaRad,
    cm,
    trimAngleRad,
    trimAngleDeg,
    deltaCm,
    disturbanceProduct,
    trimmed: isTrimmed(cm),
    tendency: classifyDisturbance(
      cmAlphaPerRad,
      disturbanceAlphaDeg
    )
  };
}