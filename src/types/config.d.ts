export interface IcecastConfig {
  mount: string;
  username?: string;
  password: string;
  server: string;
}

export interface EncoderConfig {
  id: string;
  bitrate?: number;
  chanels?: number;
  samplerate?: number;
  format?: string;
  captureAudioCard: string;
  enableNormalize?: boolean;
  icecast: IcecastConfig;
}

export interface Config {
  ffmpegBinaryPath: string;
  ffmpegCaptureMode: "avfoundation" | "alsa" | "dshow";
  encoders: EncoderConfig[];
}
