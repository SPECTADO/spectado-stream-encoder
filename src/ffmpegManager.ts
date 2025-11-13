import { EncoderConfig, IcecastConfig } from "/src/types/config.d.ts";
import { updateSessionStatus, SessionStatus } from "/src/sessionManager.ts";
import logger from "/src/logger.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import lo from "https://esm.sh/lodash";

const { isArray } = lo;
const supportedFormats = ["mp3", "mp3lame", "aac", "aac+"];
const restartOnCleanExit = 5;
const restartOnError = 20;

const segmentDuration = 60; // in seconds
const playlistWindowSizeInHours = 6; // hours
const playlistSize =
  Math.floor((playlistWindowSizeInHours * 3600) / segmentDuration) || 10;

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

const formatCaptureDeviceName = (deviceName: string): string => {
  let captureAudioCard = deviceName;
  // Windows (dshow) device name needs the audio= prefix and quoting
  if (Deno.build.os === "windows") captureAudioCard = `audio=${deviceName}`;

  return captureAudioCard;
};

const creatFfmpegConfig = (encoderConfig: EncoderConfig): string[] | null => {
  const argv: string[] = [];
  const icecastConfig: IcecastConfig = encoderConfig.icecast;

  if (
    !encoderConfig.format ||
    supportedFormats.includes(encoderConfig.format) === false
  ) {
    logger.error(
      `[FFMPEG] Unsupported encoder format: ${encoderConfig.format}`
    );
    return null;
  }

  const captureAudioCard = formatCaptureDeviceName(
    encoderConfig.captureAudioCard
  );

  argv.push("-hide_banner");
  argv.push("-loglevel");
  argv.push("info");
  argv.push("-f");
  argv.push(globalThis.config.ffmpegCaptureMode);
  argv.push("-thread_queue_size");
  argv.push("4096");
  // -guess_layout_max 0 → prevents FFmpeg from auto-assigning a surround layout; channels are treated as c0, c1, c2… in order.
  argv.push("-guess_layout_max");
  argv.push("0");

  argv.push("-i");
  argv.push(`${captureAudioCard}`);

  if (encoderConfig.audioFilter) {
    // -filter:a "pan=stereo|c0=c8|c1=c9"
    argv.push("-filter:a");
    argv.push(`${encoderConfig.audioFilter}`);
  }

  if (encoderConfig.format === "aac") {
    argv.push("-acodec");
    argv.push("aac");
  }

  if (encoderConfig.format === "aac+") {
    argv.push("-acodec");
    argv.push("libfdk_aac");
  }

  if (encoderConfig.format === "mp3lame") {
    argv.push("-acodec");
    argv.push("libmp3lame");
  }

  if (!encoderConfig.format || encoderConfig.format === "mp3") {
    argv.push("-acodec");
    argv.push("mp3");
  }

  argv.push("-ab");
  argv.push(`${encoderConfig.bitrate || 128}k`);
  argv.push("-ac");
  argv.push((encoderConfig.channels || 2).toString()); // channels
  argv.push("-ar");
  argv.push((encoderConfig.samplerate || 44100).toString()); // sample rate
  /*
  if (encoderConfig.enableNormalize) {
        argv.push("-af");
        argv.push("loudnorm=I=-16:LRA=12:TP=-1.5");
    }
        */

  if (encoderConfig.format === "aac" || encoderConfig.format === "aac+") {
    argv.push("-content_type");
    argv.push("audio/mpeg");
    argv.push("-f");
    argv.push("adts");
  }

  if (
    !encoderConfig.format ||
    encoderConfig.format === "mp3" ||
    encoderConfig.format === "mp3lame"
  ) {
    argv.push("-content_type");
    argv.push("audio/mpeg");
    argv.push("-f");
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
  const argv =
    encoderConfig.customArgs && isArray(encoderConfig.customArgs)
      ? encoderConfig.customArgs
      : creatFfmpegConfig(encoderConfig);

  //const ffmpeg_exec = spawn("ffmpeg", argv);
  if (!argv) return;
  const command = new Deno.Command(globalThis.config.ffmpegBinaryPath, {
    args: argv,
    stdout: "piped",
    stderr: "piped",
  });

  logger.log(`[FFMPEG] Starting encoder ffmpeg ${argv?.join(" ")}`);

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

  logger.error(`[ffmpeg] process with ${ffmpeg_exec.pid} error`, { rawError });
};
