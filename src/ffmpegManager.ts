import { EncoderConfig, IcecastConfig } from "/src/types/config.d.ts";
import { updateSessionStatus, SessionStatus } from "/src/sessionManager.ts";
import logger from "/src/logger.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";

const supportedFormats = ["mp3", "aac", "aac+"];
const restartOnCleanExit = 5;
const restartOnError = 20;

export const createFfmpegListDevicesConfig = () => {
  const argv: string[] = [];
  // -f avfoundation -list_devices true -i ""

  argv.push("-f");
  argv.push(globalThis.config.ffmpegCaptureMode);
  argv.push("-list_devices");
  argv.push("true");
  argv.push("-i");
  argv.push(`""`);
  return argv;
};

export const creatFfmpegConfig = (encoderConfig: EncoderConfig) => {
  const icecastConfig: IcecastConfig = encoderConfig.icecast;
  const argv: string[] = [];

  if (
    !encoderConfig.format ||
    supportedFormats.includes(encoderConfig.format) === false
  ) {
    throw new Error(
      `Invalid encoder format "${
        encoderConfig.format
      }". Supported: ${supportedFormats.join(",")}`
    );
    return;
  }

  let captureAudioCard = encoderConfig.captureAudioCard;
  // Windows (dshow) device name needs the audio= prefix and quoting
  if (Deno.build.os === "windows")
    captureAudioCard = `audio="${encoderConfig.captureAudioCard}"`;

  argv.push("-loglevel");
  argv.push("info");
  argv.push("-f");
  argv.push(globalThis.config.ffmpegCaptureMode);
  argv.push("-i");
  argv.push(captureAudioCard);

  if (encoderConfig.format === "aac") {
    argv.push("-acodec");
    argv.push("aac");
  }

  if (encoderConfig.format === "aac+") {
    argv.push("-acodec");
    argv.push("libfdk_aac");
  }

  if (!encoderConfig.format || encoderConfig.format === "mp3") {
    argv.push("-acodec");
    argv.push("mp3");
  }

  argv.push("-ab");
  argv.push(`${encoderConfig.bitrate || 128}k`);
  argv.push("-ac");
  argv.push((encoderConfig.chanels || 2).toString()); // chnnels
  argv.push("-ar");
  argv.push((encoderConfig.samplerate || 44100).toString()); // sample rate
  /*
  if (encoderConfig.enableNormalize) {
        argv.push("-af");
        argv.push("loudnorm=I=-16:LRA=12:TP=-1.5");
    }
        */

  argv.push("-f");
  if (encoderConfig.format === "aac" || encoderConfig.format === "aac+") {
    argv.push("adts");
  }

  if (!encoderConfig.format || encoderConfig.format === "mp3") {
    argv.push("mp3");
  }
  argv.push(
    `icecast://${icecastConfig.username || "source"}:${
      icecastConfig.password
    }@${icecastConfig.server}/${icecastConfig.mount}`
  );

  logger.debug("[FFMPEG] create config", { encoderConfig, argv });
  return argv;
};

export const startAndWatchEncoderThread = async (
  session: SessionManagerItem
) => {
  if (!session) return false;

  const encoderConfig = session.encoder;
  const argv = creatFfmpegConfig(encoderConfig);

  //const ffmpeg_exec = spawn("ffmpeg", argv);

  const command = new Deno.Command(globalThis.config.ffmpegBinaryPath, {
    args: argv,
    stdout: "piped",
    stderr: "piped",
  });

  const ffmpeg_exec = command.spawn();

  logger.debug(
    `Created ffmpeg process with id ${ffmpeg_exec.pid} | ${
      globalThis.config.ffmpegBinaryPath
    } ${argv ? argv.join(" ") : "---"}`
  );

  updateSessionStatus(session.id, SessionStatus.live);

  const { code, stdout, stderr } = await ffmpeg_exec.output();
  const rawError = new TextDecoder().decode(stderr);
  //const rawOutput = new TextDecoder().decode(stdout);

  updateSessionStatus(session.id, SessionStatus.error);

  logger.debug(
    `[ffmpeg] process with ${ffmpeg_exec.pid} exited with code`,
    code
  );
  if (code === 255) {
    // clean exit
    setTimeout(() => {
      updateSessionStatus(session.id, SessionStatus.stopped);
    }, restartOnCleanExit * 1000);
    return;
  }

  setTimeout(() => {
    updateSessionStatus(session.id, SessionStatus.stopped);
  }, restartOnError * 1000);

  logger.error("[ffmpeg] process with ${ffmpeg_exec.pid} error", { rawError });
};
