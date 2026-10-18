/** Shared protocol definitions for the PARTY LED host and displays. */
export type SessionMode = 'display-control' | 'swarm-billboard';
export type ContentType = 'text' | 'image';
export type DisplayEffect =
  | 'marquee'
  | 'static'
  | 'pixel'
  | 'rainbow'
  | 'neon'
  | 'pulse'
  | 'glitch'
  | 'strobe'
  | 'wave'
  | 'chase';

export const DISPLAY_EFFECTS: { id: DisplayEffect; label: string }[] = [
  { id: 'marquee', label: 'Scroll' },
  { id: 'static', label: 'Still' },
  { id: 'pixel', label: 'LED pixels' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'neon', label: 'Neon' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'strobe', label: 'Strobe' },
  { id: 'wave', label: 'Crowd wave' },
  { id: 'chase', label: 'Color chase' },
];

export interface RoomState {
  mode: SessionMode;
  contentType: ContentType;
  text: string;
  imageUrl: string;
  effect: DisplayEffect;
  bgColor: string;
  textColor: string;
  textSize: number;
  speed: number;
  brightness: number;
  isPlaying: boolean;
  blackout: boolean;
  /** Milliseconds on the server's clock; shared animations begin here. */
  startAt: number | null;
}

export interface GridCell {
  clientId: string;
  cell: number;
}

export interface RoomSnapshot {
  roomCode: string;
  state: RoomState;
  gridCols: number;
  gridRows: number;
  cell: number | null;
  cells: GridCell[];
  deviceCount: number;
  serverTime: number;
}

export type ClientMessage =
  | { type: 'create_room'; mode: SessionMode; gridCols?: number; gridRows?: number; clientId: string }
  | { type: 'join_room'; roomCode: string; clientId: string; hostToken?: string }
  | { type: 'rejoin_room'; roomCode: string; clientId: string; hostToken?: string }
  | { type: 'update_state'; state: Partial<RoomState>; hostToken: string }
  | { type: 'set_grid'; cols: number; rows: number; hostToken: string }
  | { type: 'assign_cell'; clientId: string; cell: number | null; hostToken: string }
  | { type: 'request_cell'; cell: number }
  | { type: 'clock_ping'; clientSentAt: number };

export type ServerMessage =
  | { type: 'room_created'; hostToken: string; joinUrl: string; snapshot: RoomSnapshot }
  | { type: 'room_joined'; snapshot: RoomSnapshot }
  | { type: 'room_snapshot'; snapshot: RoomSnapshot }
  | { type: 'state_update'; snapshot: RoomSnapshot }
  | { type: 'grid_update'; snapshot: RoomSnapshot }
  | { type: 'device_count'; snapshot: RoomSnapshot }
  | { type: 'clock_pong'; clientSentAt: number; serverTime: number }
  | { type: 'host_reconnecting'; expiresAt: number }
  | { type: 'host_disconnected' }
  | { type: 'error'; message: string; code?: string };

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const DEFAULT_ROOM_STATE: RoomState = {
  mode: 'display-control',
  contentType: 'text',
  text: 'PARTY LED',
  imageUrl: '',
  effect: 'marquee',
  bgColor: '#000000',
  textColor: '#ffffff',
  textSize: 70,
  speed: 150,
  brightness: 1,
  isPlaying: false,
  blackout: false,
  startAt: null,
};
