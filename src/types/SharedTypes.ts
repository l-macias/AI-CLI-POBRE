export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand;
};

export type Result<TValue, TError = Error> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      error: TError;
    };

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];
