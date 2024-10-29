import logger from "/src/logger.ts";
import { args } from "/src/args.ts";
import { syncConfigToSession, SessionStatus } from "/src/sessionManager.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import { Config } from "/src/types/config.d.ts";

const VERSION = "0.1-beta";

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
  logger.log("SPECTADO-STREAM_ENCODER is starting...");
  logger.log(`Version: ${VERSION}`);
  logger.log("--------------------------------------");
  logger.debug("args", args);

  // Read the file and parse the JSON content
  const configDataFile = await Deno.readTextFile("./config.json");

  // setup globals
  globalThis.config = JSON.parse(configDataFile);
  globalThis.streams = [] as SessionManagerItem[];
  syncConfigToSession();
}

// main event loop
setInterval(() => {
  logger.statusLine(
    globalThis.streams
      .map(
        (session: SessionManagerItem): string =>
          `${session.id} ${session.status === SessionStatus.live ? "✅" : "❌"}`
      )
      .join(" | ")
  );
}, 1000);
