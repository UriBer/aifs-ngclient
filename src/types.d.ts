/**
 * Type declarations for external modules
 */

declare module 'blake3' {
  export function createHash(): {
    update(data: Buffer | string): void;
    digest(encoding?: string): string | Buffer;
  };
  export function hash(data: Buffer | string, encoding?: string): string | Buffer;
}