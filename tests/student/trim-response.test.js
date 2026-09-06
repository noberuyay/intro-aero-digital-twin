import { describe, expect, test } from "vitest";

import {
  calculateCm,
  calculateTrimAngleRad,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  calculateDisturbanceProduct,
  classifyDisturbance,
  isTrimmed,
  calculateTrimResponse
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  test("9.1 numerical case matches the reference calculation", () => {
    const cm = calculateCm(0.04, -0.8, 2.86);
    const trimAngleRad = calculateTrimAngleRad(0.04, -0.8);
    const trimAngleDeg = calculateTrimAngleDeg(0.04, -0.8);
    const deltaCm = calculateDeltaCm(-0.8, 2.0);
    const product = calculateDisturbanceProduct(-0.8, 2.0);

    expect(cm).toBeCloseTo(6.68667e-5, 9);
    expect(trimAngleRad).toBeCloseTo(0.05, 12);
    expect(trimAngleDeg).toBeCloseTo(2.864789, 5);
    expect(deltaCm).toBeCloseTo(-0.0279253, 7);
    expect(product).toBeCloseTo(-0.0009748, 7);
    expect(isTrimmed(cm)).toBe(false);
    expect(classifyDisturbance(-0.8, 2.0)).toBe("restoring");
  });

  test("9.2 behavioral case changes to a positive slope and destabilizing tendency", () => {
    const response = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 1,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(response.cm).toBeCloseTo(0.08991642, 8);
    expect(response.trimAngleRad).toBeCloseTo(-0.04, 12);
    expect(response.deltaCm).toBeCloseTo(0.0349066, 7);
    expect(response.disturbanceProduct).toBeCloseTo(0.00121847, 7);
    expect(response.trimmed).toBe(false);
    expect(response.tendency).toBe("destabilizing");
  });

  test("9.3 zero slope does not divide by zero and has neutral response", () => {
    const response = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    });

    expect(response.cm).toBe(0.04);
    expect(response.trimAngleRad).toBeNull();
    expect(response.trimAngleDeg).toBeNull();
    expect(response.deltaCm).toBe(0);
    expect(response.disturbanceProduct).toBe(0);
    expect(response.tendency).toBe("neutral");
  });

  test("zero disturbance produces a neutral tendency", () => {
    expect(calculateDeltaCm(-0.8, 0)).toBe(0);
    expect(calculateDisturbanceProduct(-0.8, 0)).toBe(0);
    expect(classifyDisturbance(-0.8, 0)).toBe("neutral");
  });

  test("invalid numeric inputs are rejected", () => {
    expect(() => calculateCm(0.04, -0.8, Number.NaN)).toThrow();
    expect(() => calculateCm(0.04, Infinity, 2.86)).toThrow();
    expect(() => calculateTrimAngleRad(0.04, Number.NaN)).toThrow();
    expect(() => calculateDeltaCm(-0.8, Infinity)).toThrow();
  });
});