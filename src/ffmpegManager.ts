import { EncoderConfig, IcecastConfig } from "/src/types/config.d.ts";

const creatFfmpegConfig = (icecastConfig: IcecastConfig) => {
  const argv = [];

  argv.push("-loglevel");
  argv.push("info");
  argv.push("-re");
  argv.push("-i");
  argv.push("-");
  argv.push("-muxdelay");
  argv.push("1");
  argv.push("-muxpreload");
  argv.push("1");
  argv.push("-acodec");
  argv.push("mp3");
  argv.push("-ab");
  argv.push("64k");
  argv.push("-ac");
  argv.push("2"); // chnnels
  argv.push("-ar");
  argv.push("44100"); // sample rate
  /*
  if (xxx.normalize) {
        argv.push("-af");
        argv.push("loudnorm=I=-16:LRA=12:TP=-1.5");
    }
        */
  argv.push("-f");
  argv.push("mp3"); //TODO: AAC support
  argv.push(
    `icecast://${icecastConfig.user}:${icecastConfig.password}@${icecastConfig.server}/${icecastConfig.mount}`
  );

  return argv;
};
