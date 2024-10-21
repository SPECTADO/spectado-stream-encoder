import logger from "./src/logger.ts";
import { args } from "./src/args.ts";

Deno.addSignalListener("SIGINT", () => {
  logger.log("SIGINT received - exiting...");
  Deno.exit();
});

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  logger.log("SPECTADO-STREAM_ENCODER is starting...");
  logger.debug("args", args);

  Deno.serve({ port: args.port ? parseInt(args.port) : 7080 }, (_req) => {
    return new Response("Hello, World!");
  });
}
