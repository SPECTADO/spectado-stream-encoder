import chalk from "chalk";
import process from "node:process";

export const LOG_TYPES = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
  FFDEBUG: 5,
};

const logType =
  process.env.NODE_ENV === "production" ? LOG_TYPES.WARNING : LOG_TYPES.DEBUG;

const logTime = () => {
  const nowDate = new Date();
  return `${nowDate.toLocaleDateString()} ${nowDate.toLocaleTimeString([], {
    hour12: false,
  })}`;
};

const log = (...args: any[]) => {
  console.log(logTime(), process.pid, chalk.bold.green(">>"), ...args);
};

const info = (...args: any[]) => {
  if (logType < LOG_TYPES.INFO) return;
  console.log(logTime(), process.pid, chalk.bold.blue("[INFO]"), ...args);
};

const statusLine = (...args: any[]) => {
  if (logType < LOG_TYPES.INFO) return;
  // Move cursor up one line and clear it
  Deno.stdout.writeSync(new TextEncoder().encode("\x1b[1A\x1b[2K"));
  console.log(chalk.bold.blue("→ "), ...args);
};

const warn = (...args: any[]) => {
  if (logType < LOG_TYPES.WARNING) return;
  console.log(logTime(), process.pid, chalk.bold.yellow("[WARN]"), ...args);
};

const error = (...args: any[]) => {
  if (logType < LOG_TYPES.ERROR) return;
  console.log(logTime(), process.pid, chalk.bold.redBright("[ERROR]"), ...args);
};

const debug = (...args: any[]) => {
  if (logType < LOG_TYPES.DEBUG) return;
  console.log(
    logTime(),
    process.pid,
    chalk.bold.blueBright("[DEBUG]"),
    ...args
  );
};

const ffdebug = (...args: any[]) => {
  if (logType < LOG_TYPES.FFDEBUG) return;
  console.log(logTime(), process.pid, chalk.bold.bgYellow("[FFMPEG]"), ...args);
};

export default {
  log,
  statusLine,
  info,
  warn,
  error,
  debug,
  ffdebug,
};
