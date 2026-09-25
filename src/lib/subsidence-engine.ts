import type { NodeStatus } from "@/types/api";
import type { RiskAnalysis } from "@/types/telemetry";

type EngineState = {
  windows: number;
  baselineRoll: number;
  baselinePitch: number;
  tiltMean: number;
  tiltVariance: number;
  vibrationMean: number;
  vibrationVariance: number;
  previousTilt: number;
  previousRoll: number;
  previousPitch: number;
  previousVibration: number;
  previousFrequency: number;
  ewmaTilt: number;
  ewmaVibration: number;
  cusumTilt: number;
  cusumVibration: number;
  persistence: number;
  riskScore: number;
};

const ALPHA = 0.2;
const CUSUM_K = 0.15;
const WINDOW_HOURS = 5 / 3600;
const STABLE_TILT_DELTA = 0.5;
const STABLE_VIBRATION_DELTA = 0.02;
const MAX_SCORE_INCREASE = 25;

function zScore(value: number, mean: number, variance: number) {
  return (value - mean) / Math.sqrt(Math.max(variance, 0.000001));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function levelFor(score: number): NodeStatus {
  if (score >= 75) return "CRITICAL";
  if (score >= 45) return "WARNING";
  if (score >= 20) return "WATCH";
  return "NORMAL";
}

function magnitudeScore(tiltDeviation: number, vibration: number) {
  const tiltScore = tiltDeviation >= 2 ? 70 : tiltDeviation >= 1 ? 45 : tiltDeviation >= 0.5 ? 20 : 0;
  const vibrationScore = vibration >= 0.06 ? 70 : vibration >= 0.03 ? 45 : vibration >= 0.015 ? 20 : 0;
  return Math.min(100, tiltScore + vibrationScore + (tiltScore > 0 && vibrationScore > 0 ? 15 : 0));
}

function tiltDeviationFromBaseline(rollDeg: number, pitchDeg: number, baselineRoll: number, baselinePitch: number) {
  return Math.hypot(rollDeg - baselineRoll, pitchDeg - baselinePitch);
}

export class SubsidenceEngine {
  private state: EngineState | null = null;

  applyScore(score: number) {
    if (this.state) this.state.riskScore = score;
  }

  analyze(input: { rollDeg: number; pitchDeg: number; vibrationRmsG: number; peakG: number; dominantFrequencyHz: number }): RiskAnalysis {
    if (!this.state) {
      const tiltDeviation = 0;
      const initialScore = Math.max(magnitudeScore(tiltDeviation, input.vibrationRmsG), magnitudeScore(tiltDeviation, input.peakG));
      this.state = {
        windows: 1,
        baselineRoll: input.rollDeg,
        baselinePitch: input.pitchDeg,
        tiltMean: tiltDeviation,
        tiltVariance: 0.000001,
        vibrationMean: input.vibrationRmsG,
        vibrationVariance: 0.000001,
        previousTilt: tiltDeviation,
        previousRoll: input.rollDeg,
        previousPitch: input.pitchDeg,
        previousVibration: input.vibrationRmsG,
        previousFrequency: input.dominantFrequencyHz,
        ewmaTilt: tiltDeviation,
        ewmaVibration: input.vibrationRmsG,
        cusumTilt: 0,
        cusumVibration: 0,
        persistence: 0,
        riskScore: initialScore,
      };
      return this.result(initialScore, levelFor(initialScore), tiltDeviation, 0, 0, 0, 0, 0, 0);
    }

    const state = this.state;
    state.windows += 1;
    const tilt = tiltDeviationFromBaseline(input.rollDeg, input.pitchDeg, state.baselineRoll, state.baselinePitch);
    const tiltChange = tilt - state.previousTilt;
    const vibrationChange = input.vibrationRmsG - state.previousVibration;
    const frequencyChange = input.dominantFrequencyHz - state.previousFrequency;
    const tiltZ = zScore(tilt, state.previousTilt, state.tiltVariance);
    const vibrationZ = zScore(input.vibrationRmsG, state.previousVibration, state.vibrationVariance);

    state.ewmaTilt = ALPHA * tilt + (1 - ALPHA) * state.ewmaTilt;
    state.ewmaVibration = ALPHA * input.vibrationRmsG + (1 - ALPHA) * state.ewmaVibration;
    state.cusumTilt = Math.max(0, state.cusumTilt + Math.abs(tiltChange) - CUSUM_K);
    state.cusumVibration = Math.max(0, state.cusumVibration + Math.abs(vibrationChange) - CUSUM_K);

    const magnitudeRisk = Math.max(magnitudeScore(tilt, input.vibrationRmsG), magnitudeScore(tilt, input.peakG));
    const signalFloor = magnitudeRisk;
    const tiltScore = Math.min(70, Math.round(Math.abs(tiltChange) * 70));
    const vibrationScore = Math.min(70, Math.round(Math.abs(vibrationChange) * 2800));
    const correlationScore = tiltChange > 0 && vibrationChange > 0 ? 15 : 0;
    const changeRisk = clamp(tiltScore + vibrationScore + correlationScore, 0, 100);
    const stable = Math.abs(input.rollDeg - state.previousRoll) < STABLE_TILT_DELTA
      && Math.abs(input.pitchDeg - state.previousPitch) < STABLE_TILT_DELTA
      && Math.abs(vibrationChange) < STABLE_VIBRATION_DELTA;
    const newRisk = Math.max(magnitudeRisk, changeRisk);
    const score = stable
      ? Math.max(signalFloor, state.riskScore - 10)
      : Math.max(state.riskScore, Math.min(newRisk, state.riskScore + MAX_SCORE_INCREASE));
    const level = levelFor(score);
    state.persistence = score >= 20 ? state.persistence + 1 : 0;
    state.riskScore = score;

    state.previousTilt = tilt;
    state.previousRoll = input.rollDeg;
    state.previousPitch = input.pitchDeg;
    state.previousVibration = input.vibrationRmsG;
    state.previousFrequency = input.dominantFrequencyHz;

    return this.result(score, level, tilt, tiltChange, tiltChange / WINDOW_HOURS, vibrationChange, frequencyChange, tiltZ, vibrationZ);
  }

  private result(score: number, level: NodeStatus, tilt: number, tiltChange: number, tiltRate: number, vibrationChange: number, frequencyChange: number, tiltZ: number, vibrationZ: number): RiskAnalysis {
    const state = this.state!;
    return {
      score: Math.round(score),
      level,
      warning: level === "WARNING" || level === "CRITICAL",
      tilt_magnitude_deg: Number(tilt.toFixed(4)),
      tilt_change_deg: Number(tiltChange.toFixed(4)),
      tilt_rate_deg_per_hour: Number(tiltRate.toFixed(4)),
      vibration_change_g: Number(vibrationChange.toFixed(5)),
      frequency_change_hz: Number(frequencyChange.toFixed(3)),
      tilt_z_score: Number(tiltZ.toFixed(3)),
      vibration_z_score: Number(vibrationZ.toFixed(3)),
      ewma_tilt: Number(state.ewmaTilt.toFixed(4)),
      ewma_vibration: Number(state.ewmaVibration.toFixed(5)),
      cusum_tilt: Number(state.cusumTilt.toFixed(4)),
      cusum_vibration: Number(state.cusumVibration.toFixed(5)),
      persistence_windows: state.persistence,
    };
  }
}
