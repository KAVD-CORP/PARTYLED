import { useEffect, useState } from 'react';
import { serverNow } from '../services/clock';

/** Re-renders ~30 times a second with the synchronized server time while `active`. */
export function useServerNow(active: boolean): number {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 33) {
        last = t;
        setNow(serverNow());
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return now;
}
