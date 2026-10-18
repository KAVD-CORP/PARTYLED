const WebSocket = require('ws');
const { createPartyServer } = require('./index');

const party = createPartyServer({ port: 0, publicOrigin: 'https://party.example', hostGraceMs: 100 });
let passed = 0;
const assert = (condition, label) => { if (!condition) throw new Error(label); passed += 1; console.log(`PASS ${label}`); };
const connect = (url) => new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.once('open', () => resolve(ws)); ws.once('error', reject); });
const next = (ws, predicate, timeout = 3000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { ws.off('message', handler); reject(new Error('Timed out waiting for message')); }, timeout);
  const handler = (raw) => { const message = JSON.parse(raw); if (predicate(message)) { clearTimeout(timer); ws.off('message', handler); resolve(message); } };
  ws.on('message', handler);
});
const sendAndWait = async (ws, message, predicate) => { const result = next(ws, predicate); ws.send(JSON.stringify(message)); return result; };

(async () => {
  const port = await party.listen();
  const url = `ws://127.0.0.1:${port}`;
  try {
    const host = await connect(url);
    const created = await sendAndWait(host, { type: 'create_room', mode: 'swarm-billboard', gridCols: 3, gridRows: 2, clientId: 'host' }, (m) => m.type === 'room_created');
    assert(created.joinUrl.startsWith('https://party.example/join?code='), 'room uses public HTTPS join URL');
    assert(created.snapshot.cell === null, 'host controls the room without occupying a cell');

    const clients = [];
    for (let index = 0; index < 6; index += 1) {
      const client = await connect(url);
      const joined = await sendAndWait(client, { type: 'join_room', roomCode: created.snapshot.roomCode, clientId: `client-${index}` }, (m) => m.type === 'room_joined');
      assert(joined.snapshot.cell === index, `client ${index + 1} is auto-assigned cell ${index}`);
      clients.push({ client, id: `client-${index}`, cell: joined.snapshot.cell });
    }
    assert(new Set(clients.map(({ cell }) => cell)).size === 6, 'all six client cells are unique');

    const swapped = next(host, (m) => m.type === 'grid_update');
    host.send(JSON.stringify({ type: 'assign_cell', hostToken: created.hostToken, clientId: 'client-0', cell: 5 }));
    const swap = (await swapped).snapshot.cells;
    assert(swap.find((c) => c.clientId === 'client-0').cell === 5 && swap.find((c) => c.clientId === 'client-5').cell === 0, 'host reassignment swaps occupied cells');
    clients[0].cell = 5;

    const forbidden = await sendAndWait(clients[0].client, { type: 'update_state', hostToken: 'bad', state: { text: 'HACKED' } }, (m) => m.type === 'error');
    assert(forbidden.code === 'NOT_HOST', 'non-host control is rejected');

    const updates = clients.map(({ client }) => next(client, (m) => m.type === 'state_update'));
    host.send(JSON.stringify({ type: 'update_state', hostToken: created.hostToken, state: { text: 'SYNCED', isPlaying: true, effect: 'pixel' } }));
    const results = await Promise.all(updates);
    assert(results.every((m) => m.snapshot.state.effect === 'pixel'), 'new pixel effect passes server validation');
    assert(results.every((m) => m.snapshot.state.text === 'SYNCED' && m.snapshot.state.startAt > m.snapshot.serverTime), 'broadcast has shared future start time');

    const late = await connect(url);
    const lateJoin = await sendAndWait(late, { type: 'join_room', roomCode: created.snapshot.roomCode, clientId: 'late' }, (m) => m.type === 'room_joined');
    assert(lateJoin.snapshot.state.text === 'SYNCED', 'late joiner receives current state');

    const original = clients[0];
    original.client.close();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const reconnect = await connect(url);
    const rejoined = await sendAndWait(reconnect, { type: 'rejoin_room', roomCode: created.snapshot.roomCode, clientId: original.id }, (m) => m.type === 'room_joined');
    assert(rejoined.snapshot.cell === original.cell, 'reconnect keeps cell assignment');

    const clock = await sendAndWait(late, { type: 'clock_ping', clientSentAt: Date.now() }, (m) => m.type === 'clock_pong');
    assert(clock.serverTime >= clock.clientSentAt, 'clock synchronization reply is returned');
    [host, late, reconnect, ...clients.slice(1).map(({ client }) => client)].forEach((ws) => ws.close());
    console.log(`\n${passed} assertions passed`);
  } finally {
    await party.close();
  }
})().catch((error) => { console.error(error); party.close().finally(() => process.exit(1)); });
