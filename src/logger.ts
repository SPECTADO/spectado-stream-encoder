// deno-lint-ignore-file no-explicit-any
import chalk from "chalk";
import process from "node:process";
import dayjs from "dayjs";

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
  return dayjs().format("HH:mm:ss");

  //const nowDate = new Date(); return `${nowDate.toLocaleDateString()} ${nowDate.toLocaleTimeString([], {  hour12: false,})}`;
};

const clearStatusLine = () => {
  if (globalThis.wasLastLoggerLineStatus === true) {
    // Move cursor up one line and clear it
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[1A\x1b[2K"));
    globalThis.wasLastLoggerLineStatus = false;
  }
};

const log = (...args: any[]) => {
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.green(">>"), ...args);
  globalThis.wasLastLoggerLineStatus = false;
};

const info = (...args: any[]) => {
  if (logType < LOG_TYPES.INFO) return;
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.blue("[INFO]"), ...args);
  globalThis.wasLastLoggerLineStatus = false;
};

const statusLine = (...args: any[]) => {
  if (logType < LOG_TYPES.INFO) return;
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.green("→"), ...args);
  globalThis.wasLastLoggerLineStatus = true;
};

const warn = (...args: any[]) => {
  if (logType < LOG_TYPES.WARNING) return;
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.yellow("[WARN]"), ...args);
  globalThis.wasLastLoggerLineStatus = false;
};

const error = (...args: any[]) => {
  if (logType < LOG_TYPES.ERROR) return;
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.redBright("[ERROR]"), ...args);
  globalThis.wasLastLoggerLineStatus = false;
};

const debug = (...args: any[]) => {
  if (logType < LOG_TYPES.DEBUG) return;
  clearStatusLine();
  console.log(
    logTime(),
    process.pid,
    chalk.bold.blueBright("[DEBUG]"),
    ...args
  );
  globalThis.wasLastLoggerLineStatus = false;
};

const ffdebug = (...args: any[]) => {
  if (logType < LOG_TYPES.FFDEBUG) return;
  clearStatusLine();
  console.log(logTime(), process.pid, chalk.bold.bgYellow("[FFMPEG]"), ...args);
  globalThis.wasLastLoggerLineStatus = false;
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
