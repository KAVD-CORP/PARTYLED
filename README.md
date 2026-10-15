# 🎉 PARTY LED

A mobile digital signboard app that turns your phone into a scrolling LED-style marquee. Type a message, pick your colors, hit play, and your device becomes a bold, eye-catching sign — perfect for parties, events, concerts, and anywhere you want to grab attention.

Built with **React Native** and **Expo**.

---

## ✨ Features

- **Scrolling marquee text** — smooth, infinitely looping horizontal scroll powered by `react-native-reanimated`
- **Custom message** — type any text you want displayed on the signboard
- **Background color picker** — choose from 16 preset colors (blacks, reds, greens, blues, purples, white)
- **Text color picker** — independently set the text color with the same palette
- **Adjustable text size** — scale from 70 px up to 120 px in 2 px increments
- **Adjustable scroll speed** — control marquee speed from 10 to 200 pixels/second
- **Fullscreen landscape mode** — tapping PLAY locks the device to landscape and fills the screen with your scrolling message; tap anywhere to exit back to the editor
- **Cross-platform** — runs on Android, iOS, and web

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 54) |
| Language | TypeScript |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| Animations | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| Orientation | [expo-screen-orientation](https://docs.expo.dev/versions/latest/sdk/screen-orientation/) |
| UI | React Native core components + custom themed components |

---

## 📁 Project Structure

```
├── app/
│   ├── _layout.tsx          # Root layout — sets default portrait orientation
│   ├── index.tsx            # Entry redirect → /signboard
│   ├── signboard.tsx        # ★ Main signboard screen (editor + marquee)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigator layout
│       ├── index.tsx        # Home tab (starter welcome page)
│       └── explore.tsx      # Explore tab (documentation examples)
├── components/              # Reusable UI components (themed text/view, parallax scroll, etc.)
├── constants/
│   └── theme.ts             # Color tokens and platform-aware font definitions
├── hooks/                   # Custom hooks (color scheme, theme color)
├── assets/
│   └── images/
│       └── led.png          # App icon
├── app.json                 # Expo project configuration
├── babel.config.js          # Babel config (reanimated plugin)
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — included via npx, no global install needed
- A physical device with [Expo Go](https://expo.dev/go) **or** an Android/iOS emulator

### Install & Run

```bash
# Clone the repo
git clone https://github.com/KAVD-CORP/PARTYLED.git
cd PARTYLED

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or press:

- `a` — open on Android emulator
- `i` — open on iOS simulator
- `w` — open in web browser

---

## 📱 Usage

1. Launch the app — you land on the **signboard editor**
2. Type your message in the text field
3. Pick a **background color** and a **text color** from the swatches
4. Adjust the **text size** and **scroll speed** with the +/- buttons
5. Tap **PLAY** — the screen locks to landscape and your message scrolls across in fullscreen
6. Tap anywhere on the marquee to **stop** and return to the editor

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

© 2026 KAVD CORP
