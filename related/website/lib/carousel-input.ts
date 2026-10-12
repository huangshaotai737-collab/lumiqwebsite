export class CarouselInput {
  private lockedUntil = 0;
  private lastWheel = -Infinity;
  private consumed = false;
  private total = 0;
  navigate(now: number) {
    if (now < this.lockedUntil) return false;
    this.lockedUntil = now + 750;
    this.consumed = true;
    return true;
  }
  wheel(delta: number, eventTime: number, now = eventTime): -1 | 0 | 1 {
    if (!Number.isFinite(delta) || delta === 0) return 0;
    if (eventTime - this.lastWheel > 280) {
      this.consumed = false;
      this.total = 0;
    }
    // Every tail event extends the gesture, including events during the lock.
    this.lastWheel = eventTime;
    if (this.consumed) return 0;
    if (now < this.lockedUntil) {
      this.consumed = true;
      return 0;
    }
    if (Math.sign(delta) !== Math.sign(this.total)) this.total = 0;
    this.total += delta;
    if (Math.abs(this.total) < 12) return 0;
    const direction = this.total > 0 ? 1 : -1;
    this.navigate(now);
    return direction;
  }
}
