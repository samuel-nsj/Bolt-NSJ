/**
 * Rate Limiter
 *
 * Implements sliding window rate limiting per customer
 */

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 50) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if identifier is rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(identifier) || [];

    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      console.log(`Rate limit exceeded for ${identifier}`);
      return true;
    }

    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return false;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    return Math.max(0, this.maxRequests - validTimestamps.length);
  }
}
