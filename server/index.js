import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Try to create HTTPS server if certificates exist, otherwise use HTTP
let server;
let isHttps = false;

try {
  const certPath = path.join(__dirname, 'certs');
  const keyPath = path.join(certPath, 'key.pem');
  const certFilePath = path.join(certPath, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certFilePath)
    };
    server = createHttpsServer(options, app);
    isHttps = true;
    console.log('🔒 HTTPS server initialized with certificates');
  } else {
    server = createServer(app);
    console.log('🔓 HTTP server initialized (no certificates found)');
  }
} catch (error) {
  console.log('⚠️  Failed to load certificates, using HTTP:', error.message);
  server = createServer(app);
}

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://*.netlify.app",
      "https://mujtv.netlify.app",
      "https://muj.tv",
      "*" // Fallback for development
    ],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users and rooms
const activeUsers = new Map();
const waitingUsers = new Map();
const activeRooms = new Map();

// Helper function to broadcast online count
const broadcastOnlineCount = () => {
  const count = activeUsers.size;
  console.log(`Broadcasting online count: ${count} (activeUsers: ${activeUsers.size})`);
  io.emit('onlineCount', count);
  io.emit('userJoined', count); // Also emit userJoined for consistency
};

// Helper functions
const getRandomCountry = () => {
  const countries = [
    { country: 'United States', flag: '🇺🇸' },
    { country: 'United Kingdom', flag: '🇬🇧' },
    { country: 'Germany', flag: '🇩🇪' },
    { country: 'France', flag: '🇫🇷' },
    { country: 'Japan', flag: '🇯🇵' },
    { country: 'Brazil', flag: '🇧🇷' },
    { country: 'Canada', flag: '🇨🇦' },
    { country: 'Australia', flag: '🇦🇺' },
    { country: 'Italy', flag: '🇮🇹' },
    { country: 'Spain', flag: '🇪🇸' },
    { country: 'Netherlands', flag: '🇳🇱' },
    { country: 'Sweden', flag: '🇸🇪' },
    { country: 'South Korea', flag: '🇰🇷' },
    { country: 'Mexico', flag: '🇲🇽' },
    { country: 'India', flag: '🇮🇳' },
    { country: 'Russia', flag: '🇷🇺' }
  ];
  return countries[Math.floor(Math.random() * countries.length)];
};

const findMatch = (userId) => {
  const user = waitingUsers.get(userId);
  if (!user) return null;
  const userGender = user.gender?.toLowerCase();

  for (const [waitingUserId, userData] of waitingUsers) {
    if (waitingUserId === userId) continue;
    const partnerGender = userData.gender?.toLowerCase();

    if (
      (userGender === 'male' && partnerGender === 'female') ||
      (userGender === 'female' && partnerGender === 'male') ||
      (userGender === 'other') ||
      (partnerGender === 'other')
    ) {
      return waitingUserId;
    }
  }
  return null;
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeUsers: activeUsers.size,
    waitingUsers: waitingUsers.size,
    activeRooms: activeRooms.size,
    totalConnections: io.engine.clientsCount,
    onlineCount: activeUsers.size
  });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Store user info
  const userId = socket.id;
  const userCountry = getRandomCountry();
  
  console.log(`User connecting: ${userId} from ${userCountry.country}`);
  
  activeUsers.set(userId, {
    socketId: userId,
    country: userCountry,
    name: null, // Will be set when user starts searching
    gender: null, // Will be set when user starts searching
    connectedAt: new Date(),
    status: 'idle'
  });

  console.log(`Active users after connection: ${activeUsers.size}`);

  // Broadcast updated online count
  broadcastOnlineCount();

  // Send initial user data
  socket.emit('userData', {
    userId,
    country: userCountry
  });

  // Handle start searching
  socket.on('startSearch', (data) => {
    const userName = data?.name || 'Stranger';
    const userGender = data?.gender || 'Not specified';
    console.log(`User ${userId} (${userName}, ${userGender}) started searching`);
    console.log('Received data:', data);
    
    // Update user with their name and gender
    activeUsers.get(userId).name = userName;
    activeUsers.get(userId).gender = userGender;
    activeUsers.get(userId).status = 'searching';
    waitingUsers.set(userId, activeUsers.get(userId));
    
    socket.emit('searchStarted');
    
    // Try to find a match
    const matchId = findMatch(userId);
    if (matchId) {
      // Create a room for the matched users
      const roomId = uuidv4();
      const user1 = activeUsers.get(userId);
      const user2 = activeUsers.get(matchId);
      
      console.log('User1 data:', user1);
      console.log('User2 data:', user2);
      
      activeRooms.set(roomId, {
        id: roomId,
        users: [userId, matchId],
        createdAt: new Date()
      });
      
      // Remove both users from waiting list
      waitingUsers.delete(userId);
      waitingUsers.delete(matchId);
      
      // Update user status
      activeUsers.get(userId).status = 'connected';
      activeUsers.get(matchId).status = 'connected';
      
      // Join both users to the room
      socket.join(roomId);
      io.sockets.sockets.get(matchId)?.join(roomId);
      
      // Notify both users of the match
      const matchData = {
        roomId,
        users: [
          { id: userId, country: user1.country, name: user1.name, gender: user1.gender },
          { id: matchId, country: user2.country, name: user2.name, gender: user2.gender }
        ]
      };
      
      console.log('Sending match data:', matchData);
      io.to(roomId).emit('matchFound', matchData);
      
      console.log(`Match found: ${userId} (${user1.name}, ${user1.gender}) and ${matchId} (${user2.name}, ${user2.gender}) in room ${roomId}`);
    }
  });

  // Handle next (skip current partner)
  socket.on('next', () => {
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    if (userRooms.length > 0) {
      const room = userRooms[0];
      
      // Notify other user about the skip
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          io.to(userIdInRoom).emit('partnerSkipped');
        }
      });
      
      // Remove the room
      activeRooms.delete(room.id);
      
      // Update user statuses
      room.users.forEach(userIdInRoom => {
        if (activeUsers.has(userIdInRoom)) {
          activeUsers.get(userIdInRoom).status = 'idle';
        }
      });
      
      // Start new search
      socket.emit('searchStarted');
      activeUsers.get(userId).status = 'searching';
      waitingUsers.set(userId, activeUsers.get(userId));
      
      const matchId = findMatch(userId);
      if (matchId) {
        // Create new room logic (same as above)
        const roomId = uuidv4();
        const user1 = activeUsers.get(userId);
        const user2 = activeUsers.get(matchId);
        
        activeRooms.set(roomId, {
          id: roomId,
          users: [userId, matchId],
          createdAt: new Date()
        });
        
        waitingUsers.delete(userId);
        waitingUsers.delete(matchId);
        
        activeUsers.get(userId).status = 'connected';
        activeUsers.get(matchId).status = 'connected';
        
        socket.join(roomId);
        io.sockets.sockets.get(matchId)?.join(roomId);
        
        io.to(roomId).emit('matchFound', {
          roomId,
          users: [
            { id: userId, country: user1.country, name: user1.name, gender: user1.gender },
            { id: matchId, country: user2.country, name: user2.name, gender: user2.gender }
          ]
        });
      }
    }
  });

  // Handle stop (disconnect)
  socket.on('stop', () => {
    console.log(`User ${userId} stopped`);
    
    // Remove from waiting list
    waitingUsers.delete(userId);
    
    // Update status
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).status = 'idle';
    }
    
    // Leave any rooms
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    userRooms.forEach(room => {
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          io.to(userIdInRoom).emit('partnerDisconnected');
        }
      });
      activeRooms.delete(room.id);
    });
    
    socket.emit('stopped');
  });

  // Handle chat messages
  socket.on('sendMessage', (messageData) => {
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    if (userRooms.length > 0) {
      const room = userRooms[0];
      const message = {
        id: uuidv4(),
        text: messageData.text,
        sender: userId,
        timestamp: new Date()
      };
      
      // Broadcast to room
      io.to(room.id).emit('newMessage', message);
    }
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    if (userRooms.length > 0) {
      const room = userRooms[0];
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          console.log(`Forwarding offer from ${userId} to ${userIdInRoom}`);
          io.to(userIdInRoom).emit('offer', {
            offer: data.offer,
            from: userId
          });
        }
      });
    }
  });

  socket.on('answer', (data) => {
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    if (userRooms.length > 0) {
      const room = userRooms[0];
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          console.log(`Forwarding answer from ${userId} to ${userIdInRoom}`);
          io.to(userIdInRoom).emit('answer', {
            answer: data.answer,
            from: userId
          });
        }
      });
    }
  });

  socket.on('iceCandidate', (data) => {
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    if (userRooms.length > 0) {
      const room = userRooms[0];
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          console.log(`Forwarding ICE candidate from ${userId} to ${userIdInRoom}`);
          io.to(userIdInRoom).emit('iceCandidate', {
            candidate: data.candidate,
            from: userId
          });
        }
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnecting: ${userId}`);
    
    // Remove from waiting list
    waitingUsers.delete(userId);
    
    // Handle room cleanup
    const userRooms = Array.from(activeRooms.values()).filter(room => 
      room.users.includes(userId)
    );
    
    userRooms.forEach(room => {
      room.users.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
          io.to(userIdInRoom).emit('partnerDisconnected');
        }
      });
      activeRooms.delete(room.id);
    });
    
    // Remove from active users
    activeUsers.delete(userId);
    
    console.log(`Active users after disconnection: ${activeUsers.size}`);
    
    // Broadcast updated online count
    broadcastOnlineCount();
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for network access

server.listen(PORT, HOST, () => {
  const protocol = isHttps ? 'https' : 'http';
  console.log(`🚀 Server running on ${protocol}://${HOST}:${PORT}`);
  console.log(`📊 Health check: ${protocol}://${HOST}:${PORT}/api/health`);
  console.log(`📈 Stats: ${protocol}://${HOST}:${PORT}/api/stats`);
  console.log(`🌐 Network access: Server accessible from any IP on port ${PORT}`);
  
  // Broadcast online count every 10 seconds to keep clients synchronized
  setInterval(() => {
    if (activeUsers.size > 0) {
      console.log(`Periodic broadcast: ${activeUsers.size} active users`);
      broadcastOnlineCount();
    }
  }, 10000);
}); 