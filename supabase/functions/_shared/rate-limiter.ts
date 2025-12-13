export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    if (validTimestamps.length >= this.maxRequests) {
      return true;
    }

    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return false;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validTimestamps);
      }
    }
  }
}
