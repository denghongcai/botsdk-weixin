declare module "silk-wasm" {
  export interface DecodeResult {
    data: ArrayBuffer;
    duration: number;
    sampleRate: number;
  }
  export function decode(buffer: Buffer, sampleRate: number): Promise<DecodeResult>;
}
