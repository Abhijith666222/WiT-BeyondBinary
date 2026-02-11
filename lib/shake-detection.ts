/**
 * Shake detection for mobile. Uses acceleration (device-only) when available,
 * else accelerationIncludingGravity. Lower threshold for mobile sensitivity.
 */

const SHAKE_THRESHOLD = 10;
const SHAKE_COOLDOWN_MS = 2500;

export function getShakeHandler(onShake: () => void): (e: Event) => void {
  let lastShake = 0;

  return (evt: Event) => {
    const e = evt as unknown as {
      acceleration?: { x?: number | null; y?: number | null; z?: number | null } | null;
      accelerationIncludingGravity?: { x?: number | null; y?: number | null; z?: number | null } | null;
    };
    const now = Date.now();
    if (now - lastShake < SHAKE_COOLDOWN_MS) return;

    let accel = 0;
    const a = e.acceleration;
    const ag = e.accelerationIncludingGravity;

    if (a && (a.x != null || a.y != null || a.z != null)) {
      const x = Math.abs(Number(a.x) || 0);
      const y = Math.abs(Number(a.y) || 0);
      const z = Math.abs(Number(a.z) || 0);
      accel = Math.max(x, y, z);
    } else if (ag) {
      const x = Number(ag.x) || 0;
      const y = Number(ag.y) || 0;
      const z = Number(ag.z) || 0;
      accel = Math.sqrt(x * x + y * y + z * z);
      if (accel > 0 && accel < 15) {
        const delta = Math.abs(accel - 9.8);
        if (delta > 4) accel = delta;
      }
    }

    if (accel > SHAKE_THRESHOLD) {
      lastShake = now;
      onShake();
    }
  };
}

export async function requestShakePermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return false;
  const DevMotion = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  const req = DevMotion?.requestPermission;
  if (!req) return true;
  try {
    const r = await req();
    return r === "granted";
  } catch {
    return false;
  }
}
