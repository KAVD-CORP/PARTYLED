import { ServerMessage } from '../types/session';
import { socket } from './websocket';

const samples: number[] = [];
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let offMessage: (() => void) | null = null;

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

export function serverNow(): number {
  return Date.now() + median(samples);
}

/**
 * NTP-style offset estimate, kept as a rolling median to ignore one-off
 * mobile-network delays. Reference-counted so overlapping screens share one loop.
 */
export function startClockSync(): () => void {
  users += 1;
  if (users === 1) {
    offMessage = socket.onMessage((message: ServerMessage) => {
      if (message.type !== 'clock_pong') return;
      const midpoint = (message.clientSentAt + Date.now()) / 2;
      samples.push(message.serverTime - midpoint);
      if (samples.length > 9) samples.shift();
    });
    const ping = () => socket.send({ type: 'clock_ping', clientSentAt: Date.now() });
    for (let i = 0; i < 4; i += 1) setTimeout(ping, i * 250);
    timer = setInterval(ping, 5000);
  }
  return () => {
    users -= 1;
    if (users > 0) return;
    offMessage?.();
    offMessage = null;
    if (timer) clearInterval(timer);
    timer = null;
  };
}
