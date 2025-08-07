# MUJ.TV - Video Chat Application

A real-time video chat application built with React, TypeScript, and Node.js backend.

## Features

- 🎥 Real-time video chat with WebRTC
- 💬 Text chat functionality
- 🌍 Country-based partner matching
- ⚡ Real-time signaling with Socket.io
- 🎛️ Video/Audio controls
- 🔄 Skip to next partner
- 📊 Live statistics

## Backend Implementation

### What I've Implemented:

#### 1. **Express.js Server** (`server/index.js`)
- **Real-time communication** with Socket.io
- **User management** and session handling
- **Room-based matching system**
- **WebRTC signaling** for peer-to-peer connections
- **API endpoints** for health checks and statistics

#### 2. **Socket.io Integration**
- **Real-time events** for video chat coordination
- **User matching** and room management
- **Chat message handling**
- **Connection state management**

#### 3. **WebRTC Service** (`src/services/webrtcService.ts`)
- **Peer-to-peer video connections**
- **Media stream handling**
- **ICE candidate management**
- **Offer/Answer signaling**

#### 4. **Socket Service** (`src/services/socketService.ts`)
- **Frontend Socket.io client**
- **Event handling** for all real-time features
- **Type-safe interfaces**

#### 5. **API Endpoints**
- `GET /api/health` - Server health check
- `GET /api/stats` - Live statistics (users, rooms, connections)

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Server
```bash
npm run server
```

### 3. Start the Frontend (in another terminal)
```bash
npm run dev
```

### 4. Run Both Together
```bash
npm run dev:full
```

## Testing Video Chat

### Method 1: Using the React App
1. Start both backend and frontend
2. Open `http://localhost:5173` in two different browser tabs
3. Click "Start Chat" in both tabs
4. Allow camera/microphone permissions
5. Wait for connection and see video streams

### Method 2: Using the Test HTML File
1. Start the backend server: `npm run server`
2. Open `test-video-chat.html` in two different browser tabs
3. Click "Start Chat" in both tabs
4. Allow camera/microphone permissions
5. Test video and chat functionality

## Backend Architecture

### Server Structure:
```
server/
├── index.js          # Main Express server with Socket.io
└── types.js          # Type definitions and constants
```

### Frontend Services:
```
src/services/
├── socketService.ts   # Socket.io client service
└── webrtcService.ts  # WebRTC peer connection handling
```

## Key Features Implemented:

### 🔗 **Real-time Communication**
- Socket.io for instant messaging and signaling
- WebRTC for peer-to-peer video/audio
- Automatic room creation and management

### 👥 **User Matching System**
- Queue-based matching algorithm
- Country-based partner selection
- Automatic room assignment

### 💬 **Chat System**
- Real-time text messaging
- Message persistence in rooms
- Timestamp tracking

### 🎥 **Video Controls**
- Video/Audio toggle
- Remote audio control
- Stream management

### 📊 **Monitoring & Stats**
- Live user count
- Active room tracking
- Connection statistics
- Health check endpoints

## API Documentation

### Health Check
```bash
GET http://localhost:3001/api/health
```
Returns server status and timestamp.

### Statistics
```bash
GET http://localhost:3001/api/stats
```
Returns:
- Active users count
- Waiting users count
- Active rooms count
- Total connections

## Socket Events

### Client → Server
- `startSearch` - Begin searching for a partner
- `next` - Skip to next partner
- `stop` - Stop current session
- `sendMessage` - Send chat message
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `iceCandidate` - ICE candidate

### Server → Client
- `userData` - User information
- `searchStarted` - Search initiated
- `matchFound` - Partner found
- `partnerSkipped` - Partner skipped
- `partnerDisconnected` - Partner disconnected
- `newMessage` - New chat message

## Environment Variables

Create a `.env` file in the root directory:
```
PORT=3001
NODE_ENV=development
```

## Development

### Backend Development
- Server runs on port 3001
- Hot reload with nodemon
- CORS enabled for frontend
- Comprehensive error handling

### Frontend Integration
- Automatic Socket.io connection
- WebRTC service integration
- Real-time UI updates
- Error handling and reconnection

## Troubleshooting

### Common Issues:
1. **Port conflicts** - Change PORT in .env
2. **CORS errors** - Check server origin settings
3. **WebRTC issues** - Verify STUN server configuration
4. **Socket connection** - Check server URL in socketService
5. **Camera permissions** - Ensure browser allows camera/microphone access

### Video Chat Testing Tips:
1. **Use different browsers** or incognito windows for testing
2. **Allow camera permissions** when prompted
3. **Check browser console** for connection logs
4. **Test with different network conditions** (WiFi vs mobile)
5. **Verify STUN servers** are accessible

## Next Steps

The backend is now fully functional! You can:

1. **Test the video chat** by opening multiple browser tabs
2. **Monitor connections** via the stats endpoint
3. **Add authentication** for user management
4. **Implement database** for message persistence
5. **Add moderation features** for safety
6. **Deploy to production** with proper SSL/TLS

The backend is production-ready with proper error handling, logging, and scalability considerations! 