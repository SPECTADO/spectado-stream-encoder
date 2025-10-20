export interface IcecastConfig {
  mount: string;
  username?: string;
  password: string;
  server: string;
}

export interface EncoderConfig {
  id: string;
  bitrate?: number;
  channels?: number;
  samplerate?: number;
  format?: string;
  captureAudioCard: string;
  audioFilter?: string;
  enableNormalize?: boolean;
  customArgs?: string[] | null;
  outdir?: string | null;
  icecast: IcecastConfig;
}

export interface Config {
  ffmpegBinaryPath: string;
  ffmpegCaptureMode: "avfoundation" | "alsa" | "dshow";
  webui?: number;
  encoders: EncoderConfig[];
}
