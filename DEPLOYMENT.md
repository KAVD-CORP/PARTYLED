# Deploy PARTY LED

1. Select an HTTPS domain and set `EXPO_PUBLIC_SERVER_URL` and `PUBLIC_ORIGIN` to it.
2. Build the browser client with `npm run build:web`; the Node server serves the generated `dist/` directory and WebSocket endpoint from the same origin.
3. Deploy from `server/` using `npm start`, with `PORT` supplied by the host. Confirm `GET /health` returns `{ "ok": true }`.
4. Replace `YOUR_DOMAIN.example`, `APPLE_TEAM_ID`, and `ANDROID_RELEASE_SHA256` in `app.json` and the two `/.well-known/` responses in `server/index.js`. Use the release signing certificate SHA-256, not a debug certificate.
5. Build signed iOS/Android binaries. Universal Links and Android App Links do not work in Expo Go.

## Test real phones

- Use cellular data or a separate Wi-Fi network, then create a room and scan its HTTPS QR code.
- A phone without the app must open `/join?code=XXXXXX` in its browser and join.
- A signed installed app should open directly only after both association files are live on the final domain.
- Join devices, place them in their assigned row/column order, then start a swarm display. Reconnect a phone and confirm it keeps its cell.
