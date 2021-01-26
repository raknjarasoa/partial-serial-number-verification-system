import { Injectable } from "@angular/core";

const enum KeyStatus {
  KEY_GOOD = "KEY_GOOD",
  KEY_INVALID = "KEY_INVALID",
  KEY_BLACKLISTED = "KEY_BLACKLISTED",
  KEY_PHONY = "KEY_PHONY"
}

const BLACK_LIST = ["11111111"];

@Injectable()
export class PkvService {
  /**
   * Generates a Key Byte
   * @param {32bit number} seed e.g. 0xA2791717
   * @param {8bit number} a
   * @param {8bit number} b
   * @param {8bit number} c
   * @return {8bit hex string}
   */
  private getKeyByte(seed: number, a: number, b: number, c: number): string {
    let result: number;

    a = a % 25;
    b = b % 3;

    if (a % 2 === 0) {
      result = ((seed >> a) & 0x000000ff) ^ ((seed >> b) | c);
    } else {
      result = ((seed >> a) & 0x000000ff) ^ ((seed >> b) & c);
    }

    result = result & 0xff; /* mask 255 values! */
    return result
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  }

  /**
   * Generates the checksum
   * @param {string} s Seed + Keys
   * @return {16bit hex string}
   */
  private getChecksum(seedWithKeys: string): string {
    let left = 0x0056; /* 101 unsigned 16bit number */
    let right = 0x00af; /* 175 unsigned 16bit number */
    let sum: number; /* unsigned 16bit number */

    if (seedWithKeys.length) {
      for (let i = 0; i < seedWithKeys.length; i++) {
        right += seedWithKeys.charCodeAt(i);

        if (right > 0x00ff) {
          right -= 0x00ff;
        }

        left += right;

        if (left > 0x00ff) {
          left -= 0x00ff;
        }
      }
    }

    sum = (left << 8) + right;
    return sum.toString(16).padStart(4, "0");
  }

  /**
   * Checks if the checksum in the serial is correct
   * @param {String} key The 20 chars serial
   * @return {boolean}
   */
  private checkKeyChecksum(key20: string): boolean {
    let result = false;
    let serial = key20.replace(/-/g, "").toUpperCase();

    if (serial.length !== 20) {
      return result;
    }

    const checkSum = serial.slice(serial.length - 4);

    serial = serial.slice(0, 16);
    // TODO
    result = checkSum === this.getChecksum(serial).toUpperCase();

    return result;
  }

  /**
   * Generates a serial number
   * @param {32bit number} seed
   * @return {20 chars String}
   */
  public createKey(seed: number): string {
    let keyBytes: string[] = [];

    /* Fill keyBytes with values derived from Seed.
	The parameters used here must be extactly the same
	as the ones used in the PKV_CheckKey function.
	A real key system should use more than four bytes. */

    keyBytes[0] = this.getKeyByte(seed, 24, 3, 200);
    keyBytes[1] = this.getKeyByte(seed, 10, 0, 56);
    keyBytes[2] = this.getKeyByte(seed, 1, 2, 91);
    keyBytes[3] = this.getKeyByte(seed, 7, 1, 100);

    let result = "";

    /* the key string begins with a hexadecimal string of the seed */
    result += seed.toString(16).toUpperCase();
    result = result.padStart(8, "0");

    /* then is followed by hexadecimal strings of each byte in the key */
    for (let i = 0; i < keyBytes.length; i++) {
      result += keyBytes[i].toUpperCase();
    }

    /* Add checksum to key string */
    result += this.getChecksum(result).toUpperCase();

    /* Add some hyphens to make it easier to type */
    let serial = result.split("");
    let j = serial.length - 4;

    while (j > 1) {
      serial.splice(j, 0, "-");
      j = j - 4;
    }

    return serial.join("");
  }

  /**
   * Check if the Serial is valid
   * @param {String} s 20 chars serial
   */
  public checkKey(serial: string): KeyStatus {
    let result = KeyStatus.KEY_INVALID;

    if (!this.checkKeyChecksum(serial)) {
      /* bad checksum or wrong number of characters */
      return result;
    }

    /* remove cosmetic hypens and normalize case */
    let key = serial.replace(/-/g, "").toUpperCase();

    /* test against blacklist */
    if (BLACK_LIST.length) {
      for (let i = 0; i < BLACK_LIST.length; i++) {
        if (key.indexOf(BLACK_LIST[i].toUpperCase()) > -1) {
          result = KeyStatus.KEY_BLACKLISTED;
          return result;
        }
      }
    }

    /* At this point, the key is either valid or forged,
     * because a forged key can have a valid checksum.
     * We now test the "bytes" of the key to determine if it is
     * actually valid.
     * When building your release application, use conditional defines
     * or comment out most of the byte checks!  This is the heart
     * of the partial key verification system. By not compiling in
     * each check, there is no way for someone to build a keygen that
     * will produce valid keys.  If an invalid keygen is released, you
     * simply change which byte checks are compiled in, and any serial
     * number built with the fake keygen no longer works.
     * Note that the parameters used for getKeyByte calls MUST
     * MATCH the values that PKV_MakeKey uses to make the key in the
     * first place!
     */

    result = KeyStatus.KEY_PHONY;

    /* extract the Seed from the supplied key string */
    let seed = key.substr(0, 8);
    /* test whether the seed is a valid HEX */
    if (seed.match(/[A-F0-9]{8}/) === null) {
      return result;
    }

    /* Keys test - never test them all! */

    /* Testing K1 */
    let keyByte = key.substr(8, 2);
    let kb = this.getKeyByte(parseInt(seed, 16), 24, 3, 200);

    if (keyByte !== kb.toUpperCase()) {
      return result;
    }

    /* Testing K2 */
    keyByte = key.substr(10, 2);
    kb = this.getKeyByte(parseInt(seed, 16), 10, 0, 56);
    if (keyByte !== kb.toUpperCase()) {
      return result;
    }

    /* Testing K3 */
    keyByte = key.substr(12, 2);
    kb = this.getKeyByte(parseInt(seed, 16), 1, 2, 91);
    if (keyByte !== kb.toUpperCase()) {
      return result;
    }

    /* Testing K4 */
    keyByte = key.substr(14, 2);
    kb = this.getKeyByte(parseInt(seed, 16), 7, 1, 100);
    if (keyByte !== kb.toUpperCase()) {
      return result;
    }

    /* If we get this far, then it means the key is either good, or was made
     * with a keygen derived from "this" release. */

    result = KeyStatus.KEY_GOOD;
    return result;
  }
}
