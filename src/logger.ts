// deno-lint-ignore-file no-explicit-any
import dayjs from "dayjs";

export type LogLevelType =
  | 0 // NONE
  | 1 // ERROR
  | 2 // WARNING
  | 3 // INFO
  | 4 // DEBUG
  | 5; // FFDEBUG

export const LOG_TYPES = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
  FFDEBUG: 5,
} as const;

const logType = LOG_TYPES.WARNING;
// const logType = LOG_TYPES.DEBUG;

const logBuffer = [] as Array<{ type: LogLevelType; line: string }>;
let suppressConsoleOutput = false;

const setSuppressConsoleOutput = (suppress: boolean) => {
  suppressConsoleOutput = suppress;
};

const addToLogBuffer = (type: LogLevelType, line: string) => {
  logBuffer.push({ type, line });

  if (logBuffer.length > 10) {
    logBuffer.shift();
  }
};

const logTime = () => {
  return dayjs().format("HH:mm:ss");

  //const nowDate = new Date(); return `${nowDate.toLocaleDateString()} ${nowDate.toLocaleTimeString([], {  hour12: false,})}`;
};

const log = (...args: any[]) => {
  addToLogBuffer(LOG_TYPES.INFO, args.join(" "));
  if (!suppressConsoleOutput) {
    console.log(`[${logTime()}]`, ...args);
  }
};

const info = (...args: any[]) => {
  if (logType < LOG_TYPES.INFO) return;
  addToLogBuffer(LOG_TYPES.INFO, args.join(" "));
  if (!suppressConsoleOutput) {
    console.log(`[${logTime()}] INFO:`, ...args);
  }
};

const warn = (...args: any[]) => {
  if (logType < LOG_TYPES.WARNING) return;
  addToLogBuffer(LOG_TYPES.WARNING, args.join(" "));
  if (!suppressConsoleOutput) {
    console.warn(`[${logTime()}] WARN:`, ...args);
  }
};

const error = (...args: any[]) => {
  if (logType < LOG_TYPES.ERROR) return;
  addToLogBuffer(LOG_TYPES.ERROR, args.join(" "));
  if (!suppressConsoleOutput) {
    console.error(`[${logTime()}] ERROR:`, ...args);
  }
};

const debug = (...args: any[]) => {
  if (logType < LOG_TYPES.DEBUG) return;
  addToLogBuffer(LOG_TYPES.DEBUG, args.join(" "));
  if (!suppressConsoleOutput) {
    console.log(`[${logTime()}] DEBUG:`, ...args);
  }
};

const ffdebug = (...args: any[]) => {
  if (logType < LOG_TYPES.FFDEBUG) return;
  addToLogBuffer(LOG_TYPES.FFDEBUG, args.join(" "));
  if (!suppressConsoleOutput) {
    console.log(`[${logTime()}] FFDEBUG:`, ...args);
  }
};

export default {
  logBuffer,
  log,
  info,
  warn,
  error,
  debug,
  ffdebug,
  setSuppressConsoleOutput,
};
