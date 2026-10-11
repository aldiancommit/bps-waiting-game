/**
 * Deterministic PRNG and Hashing Utility for Memory Angka.
 * Implements Mulberry32 (fast 32-bit PRNG) and Murmur-like integer hash.
 * 100% pure JavaScript, zero external dependencies.
 */

export function hashString(str) {
    let hash = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
        hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
}

export function hashInts(a, b, c = 0) {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b);
    h ^= Math.imul(b ^ (h >>> 13), 0xc2b2ae35);
    h ^= Math.imul(c ^ (h >>> 16), 0x27d4eb2d);
    return (h ^ (h >>> 15)) >>> 0;
}

export class Mulberry32 {
    constructor(seed) {
        this.s = (typeof seed === 'string' ? hashString(seed) : (seed >>> 0)) || 1;
    }

    /**
     * Returns a pseudo-random float in [0, 1).
     */
    next() {
        let t = (this.s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a random integer in [min, max] inclusive.
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * In-place Fisher-Yates shuffle using this deterministic PRNG.
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
}
