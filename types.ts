export enum LoadingState {
  IDLE = 'IDLE',
  SUMMARIZING = 'SUMMARIZING',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  MIXING_AUDIO = 'MIXING_AUDIO',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export enum MusicStyle {
  NO_MUSIC = 'NO_MUSIC',
  CALM = 'CALM',
  UPBEAT = 'UPBEAT',
  FOCUS = 'FOCUS',
}

export interface SummaryResult {
  title: string;
  script: string;
  audioUrl: string;
}