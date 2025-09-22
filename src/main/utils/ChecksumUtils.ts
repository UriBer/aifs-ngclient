import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { createHash } from 'blake3';

/**
 * Utility functions for calculating checksums of files.
 */
export class ChecksumUtils {
  /**
   * Calculates the BLAKE3 checksum of a file.
   * BLAKE3 is a cryptographic hash function that is much faster than MD5 or SHA-256.
   * 
   * @param filePath Path to the file
   * @returns Promise resolving to the BLAKE3 checksum as a hex string
   */
  static async calculateBlake3(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hasher = createHash();
      const stream = createReadStream(filePath);
      
      stream.on('data', (data) => {
        hasher.update(data);
      });
      
      stream.on('end', () => {
        resolve(hasher.digest('hex'));
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Calculates the MD5 checksum of a file.
   * 
   * @param filePath Path to the file
   * @returns Promise resolving to the MD5 checksum as a hex string
   */
  static async calculateMd5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Verifies that a file matches a given checksum.
   * 
   * @param filePath Path to the file
   * @param expectedChecksum Expected checksum
   * @param algorithm Checksum algorithm ('blake3' or 'md5')
   * @returns Promise resolving to true if the checksum matches, false otherwise
   */
  static async verifyChecksum(
    filePath: string,
    expectedChecksum: string,
    algorithm: 'blake3' | 'md5' = 'blake3'
  ): Promise<boolean> {
    try {
      const actualChecksum = algorithm === 'blake3'
        ? await this.calculateBlake3(filePath)
        : await this.calculateMd5(filePath);
      
      return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
    } catch (error) {
      console.error(`Error verifying checksum: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}