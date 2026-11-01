export interface AckError {
  ok: false;
  code: string;
  message: string;
}

export type AckSuccess<T extends object> = { ok: true } & T;

export type Ack<T extends object> = AckSuccess<T> | AckError;
