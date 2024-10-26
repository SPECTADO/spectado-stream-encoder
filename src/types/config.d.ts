export interface IcecastConfig {
  mount: string;
  user: string;
  password: string;
  server: string;
}

export interface EncoderConfig {
  id: string;
  bitrate: number;
  chanels: number;
  samplerate: number;
  format: string;
  icecast: IcecastConfig;
}

export interface Config {
  ffmpegBinaryPath: string;
  encoders: EncoderConfig[];
}
