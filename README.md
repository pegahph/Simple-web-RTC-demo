# Simple WebRTC Demo

A simple video conferencing application built with WebRTC, Socket.io, and Express. This demo showcases peer-to-peer video communication with room-based meetings.

## Features

- **Real-time Video/Audio Communication**: Peer-to-peer video and audio streaming using WebRTC
- **Room-Based Meetings**: Create or join rooms using unique room IDs
- **Audio/Video Controls**: Toggle audio and video on/off during meetings
- **Mute Indicators**: Visual indicators showing which participants are muted
- **Dynamic User Management**: Automatic handling of users joining and leaving rooms
- **Room ID Sharing**: Copy room ID to clipboard for easy sharing

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: Vanilla JavaScript, WebRTC API
- **Signaling**: Socket.io for WebRTC signaling (offer/answer/ICE candidates)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Simple-web-RTC-demo
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Create or join a meeting room and share the room ID with others

## How It Works

### WebRTC Connection Flow

1. User joins a room via Socket.io
2. Server sends list of existing users in the room
3. New user creates WebRTC offers to all existing users
4. Existing users respond with WebRTC answers
5. ICE candidates are exchanged for peer-to-peer connection establishment
6. Once connected, video/audio streams flow directly between peers

### Architecture

- **server.js**: Express server with Socket.io for signaling
- **public/meeting.html**: Meeting room UI
- **public/meeting.js**: WebRTC peer connection logic and client-side signaling
- **public/index.html**: Home page for creating/joining rooms

## Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Browser Requirements

- Modern browsers with WebRTC support (Chrome, Firefox, Safari, Edge)
- HTTPS required for production (getUserMedia requires secure context)
- Camera and microphone permissions

## Development

The project uses:
- `express` for the web server
- `socket.io` for WebSocket communication
- `nodemon` for development auto-reload

## License

ISC