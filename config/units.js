export const DISTANCE = Object.freeze({
  kilometersPerAstronomicalUnit: 149597870.7,
  kilometersPerLightYear: 9460730472580.8,
  kilometersPerParsec: 30856775814913.7,
  metersPerKilometer: 1000,
  sceneUnitsPerAstronomicalUnit: 30,
});

export const DISTANCE_UNITS = Object.freeze({
  kilometer: "km",
  astronomicalUnit: "AU",
  lightYear: "ly",
  parsec: "pc",
});

export const SCENE_UNITS_PER_LIGHT_YEAR =
  DISTANCE.kilometersPerLightYear /
  DISTANCE.kilometersPerAstronomicalUnit *
  DISTANCE.sceneUnitsPerAstronomicalUnit;

export function astronomicalUnitsToSceneUnits(au) {
  return au * DISTANCE.sceneUnitsPerAstronomicalUnit;
}
