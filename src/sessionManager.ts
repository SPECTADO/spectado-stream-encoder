import { EncoderConfig } from "/src/types/config.d.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";

export enum SessionStatus {
  live,
  connecting,
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

export const findStream = (id: string) => {
  return globalThis.streams.find(
    (session: SessionManagerItem) => session.id === id
  );
};

export const addNewStream = (encoder: EncoderConfig) => {
  const session: SessionManagerItem = {
    id: encoder.id,
    status: SessionStatus.connecting,
    encoder: encoder,
  };

  globalThis.streams.push(session);
};

export const removeStream = (id: string) => {};
