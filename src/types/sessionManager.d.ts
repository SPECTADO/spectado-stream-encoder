import { EncoderConfig } from "/src/types/config.d.ts";
import { SessionStatus } from "/src/sessionManager.ts";

export interface SessionManagerItem {
  id: string;
  status: SessionStatus;
  encoder: EncoderConfig;
}
