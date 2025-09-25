import logger from "/src/logger.ts";
import { args } from "/src/args.ts";
import {
  syncConfigToSession,
  SessionStatus,
  checkSessionsStatus,
} from "/src/sessionManager.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import { Config } from "/src/types/config.d.ts";
import { startWebServer, stopWebServer } from "/src/webServer.ts";

const VERSION = "1.0 beta 7";
const STATUS_CHECK_INT = 1000;
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
  logger.log("SIGINT received - stopping services...");
  stopWebServer();
  logger.log("Exiting...");
  Deno.exit();
});

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  logger.log("SPECTADO-STREAM-ENCODER is starting...");
  logger.log(`Version: ${VERSION}`);
  logger.log("Platform:", Deno.build.os);
  logger.log("--------------------------------------");
  logger.debug("args", args);

  globalThis.streams = [] as SessionManagerItem[];

  //syncConfigToSession();
  reloadConfig();
  checkSessionsStatus();
}

async function reloadConfig() {
  // Read the file and parse the JSON content
  const configDataFile = await Deno.readTextFile("./config.json");

  // setup globals
  globalThis.config = JSON.parse(configDataFile);

  syncConfigToSession();

  // Start web server with configured port or default to 8080
  const webPort = globalThis.config.webui || 8080;
  startWebServer(webPort);
}

// re-sync settings
setInterval(() => {
  reloadConfig();
}, CONFIG_RELOAD_INT);

// check status and connect streams...
setInterval(() => {
  checkSessionsStatus();
}, STATUS_CHECK_INT);

// main event loop
setInterval(() => {
  logger.statusLine(
    `✅ Active: ${
      globalThis.streams.filter((s) => s.status === SessionStatus.live).length
    }  | ⚠️ Error: ${
      globalThis.streams.filter((s) => s.status === SessionStatus.error).length
    } | ❌ Stopped: ${
      globalThis.streams.filter(
        (s) =>
          s.status === SessionStatus.stopped ||
          s.status === SessionStatus.connecting
      ).length
    } | ${globalThis.streams
      .filter((s) => s.status === SessionStatus.error)
      .map((item) => item.id)
      .join(", ")}`
  );
}, 1000);
