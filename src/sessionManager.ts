import { startAndWatchEncoderThread } from "/src/ffmpegManager.ts";
import { EncoderConfig } from "/src/types/config.d.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import logger from "/src/logger.ts";

export enum SessionStatus {
  live,
  connecting,
  error,
  stopped,
}

export const syncConfigToSession = () => {
  if (!globalThis.config || !globalThis.config.encoders) {
    throw new Error("Config is not loaded");
  }

  if (globalThis.config.encoders.length < 1) {
    throw new Error("There are no encoders in the config");
  }

  // add all streams from config.encoders
  globalThis.config.encoders.forEach((encoder: EncoderConfig) => {
    if (!findStream(encoder.id)) {
      addNewStream(encoder);
    }
  });

  // find all streams in the globalThis.streams that are not in the config.encoders
  const streamsToRemove = globalThis.streams.filter(
    (session: SessionManagerItem) => {
      return !globalThis.config.encoders.find(
        (encoder: EncoderConfig) => encoder.id === session.id
      );
    }
  );
  streamsToRemove.forEach((session: SessionManagerItem) => {
    removeStream(session.id);
  });
};

export const checkSessionsStatus = () => {
  const streamsToStart = findStreamOffline();

  if (streamsToStart) {
    logger.debug("[Session Manager] Starting a new encoder", streamsToStart.id);

    updateSessionStatus(streamsToStart.id, SessionStatus.connecting);
    startAndWatchEncoderThread(streamsToStart);
  }
};

export const findStream = (id: string) => {
  return globalThis.streams.find(
    (session: SessionManagerItem) => session.id === id
  );
};

export const findStreamOffline = (): SessionManagerItem | undefined => {
  return globalThis.streams.find(
    (session: SessionManagerItem) => session.status === SessionStatus.stopped
  );
};

export const addNewStream = (encoder: EncoderConfig) => {
  const session: SessionManagerItem = {
    id: encoder.id,
    status: SessionStatus.stopped,
    encoder: encoder,
  };

  globalThis.streams.push(session);
};

export const updateSessionStatus = (id: string, status: SessionStatus) => {
  globalThis.streams = globalThis.streams.map((session) => {
    if (session.id === id) {
      return { ...session, status: status };
    }

    return session;
  });
};

export const removeStream = (id: string) => {};
