import {
  calculateCm,
  calculateTrimResponse
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY = {
  id: "loads.pitch.component-sum",
  version: 1
};

function hasRequiredCapability(capabilityContext) {
  if (!capabilityContext) {
    return false;
  }

  const capabilitySource =
    capabilityContext.capabilities ??
    capabilityContext;

  if (Array.isArray(capabilitySource)) {
    return capabilitySource.some((capability) => (
      capability &&
      capability.id === REQUIRED_CAPABILITY.id &&
      Number(capability.version) >= REQUIRED_CAPABILITY.version
    ));
  }

  if (
    capabilitySource &&
    typeof capabilitySource === "object"
  ) {
    const capability =
      capabilitySource[REQUIRED_CAPABILITY.id];

    if (typeof capability === "number") {
      return (
        capability >= REQUIRED_CAPABILITY.version
      );
    }

    return Boolean(
      capability &&
      Number(capability.version) >=
        REQUIRED_CAPABILITY.version
    );
  }

  return false;
}

function validateAircraft(aircraft) {
  if (!aircraft || typeof aircraft !== "object") {
    throw new TypeError("aircraft must be an object");
  }

  for (const key of [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ]) {
    if (
      typeof aircraft[key] !== "number" ||
      !Number.isFinite(aircraft[key])
    ) {
      throw new TypeError(
        `${key} must be a finite number`
      );
    }
  }
}

function buildPlotPoints(aircraft) {
  const points = [];

  for (
    let angleDeg = -10;
    angleDeg <= 10;
    angleDeg += 1
  ) {
    points.push({
      x: angleDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        angleDeg
      )
    });
  }

  if (
    aircraft.angleOfAttackDeg < -10 ||
    aircraft.angleOfAttackDeg > 10
  ) {
    points.push({
      x: aircraft.angleOfAttackDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        aircraft.angleOfAttackDeg
      )
    });
  }

  return points;
}

function buildPlot(aircraft, includePoints = true) {
  return {
    id: "cm-alpha",
    title: "Cm-alpha relationship",
    xLabel: "Angle of attack (deg)",
    yLabel: "Pitching-moment coefficient",
    series: [
      {
        label: "Cm(alpha)",
        points: includePoints
          ? buildPlotPoints(aircraft)
          : []
      }
    ],
    regions: [],
    referenceLines: [
      {
        value: 0,
        axis: "y",
        label: "Trim line"
      }
    ]
  };
}

function unavailableAnalysis(aircraft) {
  return {
    results: [
      {
        key: "analysisStatus",
        label: "Analysis",
        value: "Analysis unavailable",
        unit: "",
        precision: 0,
        emphasis: true
      }
    ],

    verificationCases: [],

    decision: {
      question:
        "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
      interpretation: "Analysis unavailable",
      status: "neutral"
    },

    plots: [
      buildPlot(aircraft, false)
    ],

    scene: null
  };
}

function buildVerificationCases() {
  const numericalCase = {
    name: "9.1 Numerical case",

    inputs: {
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    },

    expected: {
      cm: 6.68667e-5,
      trimAngleRad: 0.05,
      deltaCm: -0.0279253,
      trimmed: false,
      tendency: "restoring"
    }
  };

  const behavioralCase = {
    name: "9.2 Behavioral case",

    inputs: {
      cm0: 0.04,
      cmAlphaPerRad: 1,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    },

    expected: {
      cm: 0.08991642,
      trimAngleRad: -0.04,
      deltaCm: 0.0349066,
      disturbanceProduct: 0.00121847,
      trimmed: false,
      tendency: "destabilizing"
    }
  };

  const boundaryCase = {
    name: "9.3 Boundary or sanity case",

    inputs: {
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    },

    expected: {
      cm: 0.04,
      trimAngleRad: null,
      deltaCm: 0,
      tendency: "neutral"
    }
  };

  const numerical =
    calculateTrimResponse(
      numericalCase.inputs
    );

  const behavioral =
    calculateTrimResponse(
      behavioralCase.inputs
    );

  const boundary =
    calculateTrimResponse(
      boundaryCase.inputs
    );

  return [
    {
      ...numericalCase,

      passed:
        Math.abs(
          numerical.cm -
          numericalCase.expected.cm
        ) <= 1e-9 &&

        Math.abs(
          numerical.trimAngleRad -
          numericalCase.expected.trimAngleRad
        ) <= 1e-12 &&

        Math.abs(
          numerical.deltaCm -
          numericalCase.expected.deltaCm
        ) <= 1e-7 &&

        numerical.trimmed ===
          numericalCase.expected.trimmed &&

        numerical.tendency ===
          numericalCase.expected.tendency
    },

    {
      ...behavioralCase,

      passed:
        Math.abs(
          behavioral.cm -
          behavioralCase.expected.cm
        ) <= 1e-8 &&

        Math.abs(
          behavioral.trimAngleRad -
          behavioralCase.expected.trimAngleRad
        ) <= 1e-12 &&

        Math.abs(
          behavioral.deltaCm -
          behavioralCase.expected.deltaCm
        ) <= 1e-7 &&

        Math.abs(
          behavioral.disturbanceProduct -
          behavioralCase.expected.disturbanceProduct
        ) <= 1e-7 &&

        behavioral.trimmed ===
          behavioralCase.expected.trimmed &&

        behavioral.tendency ===
          behavioralCase.expected.tendency
    },

    {
      ...boundaryCase,

      passed:
        Math.abs(
          boundary.cm -
          boundaryCase.expected.cm
        ) <= 1e-12 &&

        boundary.trimAngleRad ===
          boundaryCase.expected.trimAngleRad &&

        boundary.deltaCm ===
          boundaryCase.expected.deltaCm &&

        boundary.tendency ===
          boundaryCase.expected.tendency
    }
  ];
}

export const feature = {
  contractVersion: 4,

  id: "trim-response",

  title: "Live Cm–alpha relationship and trim",

  description:
    "Evaluates the linear pitching-moment relationship, trim condition, and small-disturbance tendency.",

  category: "Stability · Student feature",

  learningMode: "concept",

  topicId: "stability",

  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg"
  ],

  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1
    }
  ],

  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1
    }
  ],

  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm-alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up."
  ],

  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle."
  ],

  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },

  analyze(aircraft, capabilityContext) {
    validateAircraft(aircraft);

    if (!hasRequiredCapability(capabilityContext)) {
      return unavailableAnalysis(aircraft);
    }

    const response =
      calculateTrimResponse(aircraft);

    const verificationCases =
      buildVerificationCases();

    const interpretation =
      response.trimmed
        ? `The selected condition is trimmed within the 1e-6 Cm tolerance. A ${response.tendency} disturbance tendency is predicted by the linear quasi-static model.`
        : `The selected condition is not trimmed because |Cm(alpha)| exceeds the 1e-6 tolerance. The linear quasi-static model predicts a ${response.tendency} disturbance tendency.`;

    return {
      results: [
        {
          key: "cm",
          label: "Cm(alpha)",
          value: response.cm,
          unit: "",
          precision: 6,
          emphasis: true
        },

        {
          key: "trimAngleDeg",
          label: "Trim angle",
          value:
            response.trimAngleDeg === null
              ? "not available"
              : response.trimAngleDeg,
          unit:
            response.trimAngleDeg === null
              ? ""
              : "deg",
          precision: 6
        },

        {
          key: "deltaCm",
          label: "delta_Cm",
          value: response.deltaCm,
          unit: "",
          precision: 6
        },

        {
          key: "trimmed",
          label: "Selected condition",
          value:
            response.trimmed
              ? "trimmed"
              : "not trimmed",
          unit: "",
          precision: 0
        },

        {
          key: "disturbanceTendency",
          label: "Disturbance tendency",
          value: response.tendency,
          unit: "",
          precision: 0
        }
      ],

      verificationCases,

      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",

        interpretation,

        status:
          response.trimmed &&
          response.tendency === "restoring"
            ? "pass"
            : "caution"
      },

      plots: [
        buildPlot(aircraft, true)
      ],

      scene: null
    };
  }
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft =
      runtimeContext?.aircraft;

    validateAircraft(aircraft);

    if (!hasRequiredCapability(runtimeContext)) {
      return {
        values: {
          analysisStatus:
            "Analysis unavailable"
        }
      };
    }

    const response =
      calculateTrimResponse(aircraft);

    return {
      values: {
        cm: response.cm,

        trimAngleRad:
          response.trimAngleRad === null
            ? "not available"
            : response.trimAngleRad,

        trimAngleDeg:
          response.trimAngleDeg === null
            ? "not available"
            : response.trimAngleDeg,

        deltaCm:
          response.deltaCm,

        disturbanceProduct:
          response.disturbanceProduct,

        trimmed:
          response.trimmed,

        disturbanceTendency:
          response.tendency
      }
    };
  }
};