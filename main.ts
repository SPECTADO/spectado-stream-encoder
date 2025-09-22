import logger from "/src/logger.ts";
import { args } from "/src/args.ts";
import {
  syncConfigToSession,
  SessionStatus,
  checkSessionsStatus,
} from "/src/sessionManager.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import { Config } from "/src/types/config.d.ts";

const VERSION = "1.0 beta 5";
const STATUS_CHECK_INT = 5000;
const CONFIG_RELOAD_INT = 30000;

declare global {
  // deno-lint-ignore no-var
  var config: Config;
  // deno-lint-ignore no-var
  var streams: Array<SessionManagerItem>;
  // deno-lint-ignore no-var
  var wasLastLoggerLineStatus: boolean;
}

Deno.addSignalListener("SIGINT", () => {
  logger.log("SIGINT received - exiting...");
  Deno.exit();
});

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  logger.log("SPECTADO-STREAM-ENCODER is starting...");
  logger.log(`Version: ${VERSION}`);
  logger.log("Platform:", Deno.build.os);
  logger.log("--------------------------------------");
  logger.debug("args", args);

  // Read the file and parse the JSON content
  const configDataFile = await Deno.readTextFile("./config.json");

  // setup globals
  globalThis.config = JSON.parse(configDataFile);
  globalThis.streams = [] as SessionManagerItem[];
  syncConfigToSession();
  checkSessionsStatus();
}

// re-sync settings
setInterval(() => {
  syncConfigToSession();
}, CONFIG_RELOAD_INT);

// check status and connect streams...
setInterval(() => {
  checkSessionsStatus();
}, STATUS_CHECK_INT);

// main event loop
setInterval(() => {
  logger.statusLine(
    globalThis.streams
      .map(
        (session: SessionManagerItem): string =>
          `${session.id} ${session.status} ${
            session.status === SessionStatus.live
              ? "✅"
              : session.status === SessionStatus.stopped
              ? "❌"
              : "⚠️"
          }`
      )
      .join(" | ")
  );
}, 1000);
