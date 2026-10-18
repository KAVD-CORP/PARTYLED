/**
 * WebSocket client service for PARTY LED sessions.
 * Handles connection, reconnection, and message routing.
 */
import { RoomSnapshot, RoomState, ServerMessage, ClientMessage, ConnectionStatus, SessionMode } from '../types/session';
import { getWebSocketUrl, SERVER_URL } from './config';

type MessageHandler = (message: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

class PartyLedSocket {
  private ws: WebSocket | null = null;
  private serverUrl: string = SERVER_URL;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect: boolean = false;
  private reconnectAttempt = 0;
  private outbox: ClientMessage[] = [];
  private session: ClientMessage | null = null;
  /** Latest room snapshot, so a newly mounted screen can render immediately. */
  lastSnapshot: RoomSnapshot | null = null;

  /**
   * Connect to the WebSocket server.
   */
  connect(serverUrl?: string): void {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }

    this.setStatus('connecting');
    this.shouldReconnect = true;

    const wsUrl = getWebSocketUrl(this.serverUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempt = 0;
        const queued = this.outbox.splice(0);
        if (this.session && !queued.some((m) => m.type === 'join_room' || m.type === 'create_room')) {
          this.ws?.send(JSON.stringify(this.session));
        }
        queued.forEach((message) => this.send(message));
        console.log('[PartyLedSocket] Connected to', wsUrl);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: ServerMessage = JSON.parse(
            typeof event.data === 'string' ? event.data : event.data.toString()
          );
          if ('snapshot' in message) this.lastSnapshot = message.snapshot;
          if (message.type === 'host_disconnected') this.lastSnapshot = null;
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (err) {
          console.error('[PartyLedSocket] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[PartyLedSocket] Disconnected');
        this.setStatus('disconnected');
        this.ws = null;

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('[PartyLedSocket] Error:', error);
        this.setStatus('error');
      };
    } catch (err) {
      console.error('[PartyLedSocket] Failed to connect:', err);
      this.setStatus('error');

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.session = null;
    this.outbox = [];
    this.lastSnapshot = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Send a message to the server.
   */
  send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (message.type !== 'clock_ping') {
      // Queued clock pings would carry stale timestamps and skew the offset.
      this.outbox.push(message);
    }
  }

  // ─── Host Actions ─────────────────────────────────────────────

  /**
   * Create a new room as host.
   */
  createRoom(mode: SessionMode, clientId: string, gridCols?: number, gridRows?: number): void {
    this.send({ type: 'create_room', mode, gridCols, gridRows, clientId });
  }

  /**
   * Join an existing room as client.
   */
  joinRoom(roomCode: string, clientId: string, hostToken?: string): void {
    this.rememberSession(roomCode, clientId, hostToken);
    this.send({ type: 'join_room', roomCode: roomCode.toUpperCase(), clientId, hostToken });
  }

  /** Rejoin automatically after every reconnect so the device keeps its cell. */
  rememberSession(roomCode: string, clientId: string, hostToken?: string): void {
    this.session = { type: 'rejoin_room', roomCode: roomCode.toUpperCase(), clientId, hostToken };
  }

  forgetSession(): void {
    this.session = null;
  }

  assignCell(clientId: string, cell: number | null, hostToken: string): void {
    this.send({ type: 'assign_cell', clientId, cell, hostToken });
  }

  requestCell(cell: number): void {
    this.send({ type: 'request_cell', cell });
  }

  /**
   * Update the room state (host only).
   */
  updateState(state: Partial<RoomState>, hostToken: string): void {
    this.send({ type: 'update_state', state, hostToken });
  }

  /**
   * Update grid dimensions (host only, swarm mode).
   */
  setGrid(cols: number, rows: number, hostToken: string): void {
    this.send({ type: 'set_grid', cols, rows, hostToken });
  }

  // ─── Event Handlers ───────────────────────────────────────────

  /**
   * Register a handler for incoming server messages.
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a handler for connection status changes.
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    // Immediately fire with current status
    handler(this.status);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Get the current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  // ─── Private ──────────────────────────────────────────────────

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt++, 15000);
    console.log(`[PartyLedSocket] Reconnecting in ${delay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

// Export a singleton instance
export const socket = new PartyLedSocket();
