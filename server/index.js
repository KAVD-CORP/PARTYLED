const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');
const path = require('path');

const DEFAULT_STATE = { mode: 'display-control', contentType: 'text', text: 'PARTY LED', imageUrl: '', effect: 'marquee', bgColor: '#000000', textColor: '#ffffff', textSize: 70, speed: 150, brightness: 1, isPlaying: false, blackout: false, startAt: null };
const EFFECTS = ['marquee', 'static', 'pixel', 'rainbow', 'neon', 'pulse', 'glitch', 'strobe', 'wave', 'chase'];
const makeCode = () => crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
const makeToken = () => crypto.randomBytes(24).toString('base64url');
const isMode = (value) => value === 'display-control' || value === 'swarm-billboard';
const grid = (value, fallback) => Number.isInteger(value) && value >= 1 && value <= 8 ? value : fallback;

function createPartyServer(options = {}) {
  const port = options.port ?? (Number(process.env.PORT) || 3001);
  const origin = (options.publicOrigin || process.env.PUBLIC_ORIGIN || process.env.EXPO_PUBLIC_SERVER_URL || `http://localhost:${port}`).replace(/\/$/, '');
  const hostGraceMs = options.hostGraceMs || Number(process.env.HOST_GRACE_MS) || 30000;
  const rooms = new Map();
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const webBuild = path.join(__dirname, '..', 'dist');

  app.use((_req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); next(); });
  app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
  app.get('/.well-known/apple-app-site-association', (_req, res) => res.type('application/json').send({ applinks: { apps: [], details: [{ appID: 'APPLE_TEAM_ID.com.yourname.digitalsignboard', paths: ['/join*'] }] } }));
  app.get('/.well-known/assetlinks.json', (_req, res) => res.json([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'com.yourname.digitalsignboard', sha256_cert_fingerprints: ['ANDROID_RELEASE_SHA256'] } }]));
  app.get('/api/room/:code', (req, res) => {
    const room = rooms.get(req.params.code.toUpperCase());
    res.json(room ? { exists: true, mode: room.state.mode, deviceCount: count(room) } : { exists: false });
  });
  app.use(express.static(webBuild));
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(webBuild, 'index.html'), (error) => error && next()));

  const count = (room) => [...room.clients.entries()].filter(([id, client]) => id !== room.hostId && client.ws?.readyState === WebSocket.OPEN).length;
  const send = (ws, payload) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); };
  const snapshot = (room, clientId) => ({
    roomCode: room.code, state: room.state, gridCols: room.gridCols, gridRows: room.gridRows,
    cell: room.clients.get(clientId)?.cell ?? null,
    cells: [...room.clients.entries()].filter(([, client]) => client.cell !== null).map(([id, client]) => ({ clientId: id, cell: client.cell })),
    deviceCount: count(room), serverTime: Date.now(),
  });
  const broadcast = (room, type) => {
    for (const [clientId, client] of room.clients) send(client.ws, { type, snapshot: snapshot(room, clientId) });
  };
  const assignCell = (room, clientId, requested) => {
    const client = room.clients.get(clientId);
    if (!client) return;
    const capacity = room.gridCols * room.gridRows;
    const used = new Set([...room.clients.entries()].filter(([id, other]) => id !== clientId && other.cell !== null).map(([, other]) => other.cell));
    let cell = Number.isInteger(requested) && requested >= 0 && requested < capacity && !used.has(requested) ? requested : null;
    if (cell === null) for (let index = 0; index < capacity; index += 1) if (!used.has(index)) { cell = index; break; }
    client.cell = cell;
  };
  const validHost = (ws, message) => {
    const room = rooms.get(ws.roomCode);
    if (!room || !ws.isHost || message.hostToken !== room.hostToken) {
      send(ws, { type: 'error', code: 'NOT_HOST', message: 'Only the host can control this room.' });
      return null;
    }
    return room;
  };
  const sanitizeState = (update, room) => {
    const next = { ...room.state };
    ['text', 'imageUrl', 'bgColor', 'textColor', 'contentType', 'effect', 'mode'].forEach((key) => {
      if (typeof update[key] === 'string') next[key] = update[key].slice(0, key === 'text' ? 500 : 2048);
    });
    ['textSize', 'speed', 'brightness'].forEach((key) => { if (typeof update[key] === 'number' && Number.isFinite(update[key])) next[key] = update[key]; });
    ['isPlaying', 'blackout'].forEach((key) => { if (typeof update[key] === 'boolean') next[key] = update[key]; });
    if (!isMode(next.mode)) next.mode = room.state.mode;
    if (!['text', 'image'].includes(next.contentType)) next.contentType = 'text';
    if (!EFFECTS.includes(next.effect)) next.effect = 'marquee';
    next.textSize = Math.max(20, Math.min(300, next.textSize));
    next.speed = Math.max(10, Math.min(1000, next.speed));
    next.brightness = Math.max(0.05, Math.min(1, next.brightness));
    next.startAt = next.isPlaying && !room.state.isPlaying ? Date.now() + 700 : next.isPlaying ? room.state.startAt : null;
    return next;
  };
  const disconnect = (ws) => {
    const room = rooms.get(ws.roomCode);
    const client = room?.clients.get(ws.clientId);
    if (!room || !client || client.ws !== ws) return;
    client.ws = null;
    if (ws.isHost) {
      room.hostWs = null;
      room.hostDeadline = Date.now() + hostGraceMs;
      for (const recipient of room.clients.values()) send(recipient.ws, { type: 'host_reconnecting', expiresAt: room.hostDeadline });
    } else {
      broadcast(room, 'device_count');
    }
  };

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (raw) => {
      let message; try { message = JSON.parse(raw.toString()); } catch { send(ws, { type: 'error', message: 'Invalid JSON.' }); return; }
      if (message.type === 'clock_ping') return send(ws, { type: 'clock_pong', clientSentAt: message.clientSentAt, serverTime: Date.now() });
      if (message.type === 'create_room') {
        if (!isMode(message.mode) || typeof message.clientId !== 'string') return send(ws, { type: 'error', message: 'Invalid room details.' });
        let code; do { code = makeCode(); } while (rooms.has(code));
        const room = { code, hostToken: makeToken(), hostId: message.clientId, hostWs: ws, hostDeadline: null, clients: new Map(), gridCols: grid(message.gridCols, 3), gridRows: grid(message.gridRows, 2), state: { ...DEFAULT_STATE, mode: message.mode } };
        rooms.set(code, room); ws.roomCode = code; ws.clientId = message.clientId; ws.isHost = true;
        room.clients.set(ws.clientId, { ws, cell: null });
        return send(ws, { type: 'room_created', hostToken: room.hostToken, joinUrl: `${origin}/join?code=${code}`, snapshot: snapshot(room, ws.clientId) });
      }
      const room = rooms.get(String(message.roomCode || ws.roomCode || '').toUpperCase());
      if (!room) return send(ws, { type: 'error', code: 'ROOM_NOT_FOUND', message: 'Room not found.' });
      if (message.type === 'join_room' || message.type === 'rejoin_room') {
        if (typeof message.clientId !== 'string') return send(ws, { type: 'error', message: 'Invalid device identity.' });
        ws.roomCode = room.code; ws.clientId = message.clientId; ws.isHost = message.hostToken === room.hostToken;
        const client = room.clients.get(ws.clientId) || { ws: null, cell: null }; client.ws = ws; room.clients.set(ws.clientId, client);
        if (ws.isHost) { room.hostWs = ws; room.hostDeadline = null; } else if (client.cell === null) assignCell(room, ws.clientId);
        send(ws, { type: 'room_joined', snapshot: snapshot(room, ws.clientId) }); return broadcast(room, 'device_count');
      }
      if (message.type === 'update_state') { const hostRoom = validHost(ws, message); if (hostRoom) { hostRoom.state = sanitizeState(message.state || {}, hostRoom); broadcast(hostRoom, 'state_update'); } return; }
      if (message.type === 'set_grid') { const hostRoom = validHost(ws, message); if (hostRoom) { hostRoom.gridCols = grid(message.cols, hostRoom.gridCols); hostRoom.gridRows = grid(message.rows, hostRoom.gridRows); for (const id of hostRoom.clients.keys()) if (id !== hostRoom.hostId) assignCell(hostRoom, id, hostRoom.clients.get(id).cell); broadcast(hostRoom, 'grid_update'); } return; }
      if (message.type === 'assign_cell') { const hostRoom = validHost(ws, message); if (hostRoom && hostRoom.clients.has(message.clientId) && message.clientId !== hostRoom.hostId) {
        const mover = hostRoom.clients.get(message.clientId);
        const holder = [...hostRoom.clients.values()].find((other) => other !== mover && other.cell === message.cell);
        if (holder) { holder.cell = mover.cell; mover.cell = message.cell; } else assignCell(hostRoom, message.clientId, message.cell);
        broadcast(hostRoom, 'grid_update');
      } return; }
      if (message.type === 'request_cell') { if (room.clients.has(ws.clientId) && !ws.isHost) { assignCell(room, ws.clientId, message.cell); broadcast(room, 'grid_update'); } return; }
      send(ws, { type: 'error', message: 'Unknown message type.' });
    });
    ws.on('close', () => disconnect(ws));
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) ws.terminate(); else { ws.isAlive = false; ws.ping(); } }
    for (const [code, room] of rooms) if (room.hostDeadline && Date.now() >= room.hostDeadline) { for (const client of room.clients.values()) send(client.ws, { type: 'host_disconnected' }); rooms.delete(code); }
  }, 15000);
  const listen = (targetPort = port) => new Promise((resolve) => server.listen(targetPort, '0.0.0.0', () => resolve(server.address().port)));
  const close = () => new Promise((resolve) => { clearInterval(heartbeat); wss.close(() => server.close(resolve)); });
  return { app, server, wss, rooms, listen, close };
}

if (require.main === module) createPartyServer().listen().then((port) => console.log(`PARTY LED listening on ${port}`));
module.exports = { createPartyServer };
