// NOCTURNE — THE GLASS ARCHIVE
// config.js — every tunable constant of the game in one place.
// Palette: midnight-blue architecture, warm gold light, turquoise surveillance, red alarm.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const PALETTE = {
  bg: '#070B1A',
  floorA: '#171E3A',
  floorB: '#121830',
  floorSheen: 'rgba(232,179,75,0.05)',
  wall: '#232C4E',
  wallTop: '#2E3A63',
  wallTrim: '#E8B34B',
  gold: '#E8B34B',
  goldDim: '#9C7A33',
  cream: '#F2EAD8',
  turquoise: '#35E0D2',
  turquoiseDim: '#1E7A72',
  red: '#FF3B4E',
  redDim: '#8E1F2C',
  navy: '#0B1026',
  charcoal: '#1A2138',
  velvet: '#7A1E2B',
  glass: 'rgba(120,200,255,0.16)',
  smoke: 'rgba(190,200,220,0.55)',
  thief: '#2DE1C2',
  thiefDark: '#0E5F55',
  guard: '#FFD166',
  guardDark: '#8A6D1F',
  caseGold: '#C9A227',
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 178,
  crouchSpeed: 96,
  channelTime: 1.5, // seconds holding E at the artifact case
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  alertSpeed: 92, // +25% while the alarm is in ALERT
  chaseSpeed: 188,
  visionRange: 252,
  visionFov: (75 * Math.PI) / 180,
  catchRadius: 26,
  // suspicion fills per second while the thief is seen (scaled by range + stance)
  detectNear: 58, // <= 110 px
  detectFar: 24, // at max range
  detectCrouchMul: 0.45,
  detectMovingMul: 1.15,
  decayPerSec: 18,
  chaseLoseSightSec: 3.0,
  searchSec: 4.0,
  noiseHearRadius: 130,
};

export const CAMERA = {
  visionRange: 300,
  visionFov: (55 * Math.PI) / 180,
  alarmPerSec: 2.6, // alarm added while a camera sees the thief
  disabledSec: 10, // EMP duration
};

export const ALARM = {
  decayPerSec: 1.2,
  suspiciousAt: 35,
  alertAt: 70,
  lockdownAt: 100,
  guardSuspicionRate: 0.9, // alarm per second while any guard is > 60 suspicion
};

export const TOOLS = {
  smoke: { start: 2, max: 4, radius: 92, lifeSec: 6, noiseRadius: 110 },
  decoy: { start: 3, max: 6, noiseRadius: 260 },
  emp: { start: 1, max: 2, noiseRadius: 200, suspicionPing: 25 },
};

export const WIN_RANKS = [
  { maxDetections: 0, name: 'GHOST', blurb: 'No one ever knew you were there.' },
  { maxDetections: 2, name: 'SHADOW', blurb: 'A whisper in the dark.' },
  { maxDetections: 5, name: 'PROFESSIONAL', blurb: 'Clean. Mostly.' },
  { maxDetections: Infinity, name: 'LOUD', blurb: 'The archive will remember you.' },
];
