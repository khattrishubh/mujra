import { io, Socket } from 'socket.io-client';

export interface UserData {
  userId: string;
  country: {
    country: string;
    flag: string;
  };
  name?: string;
  gender?: string;
}

export interface MatchData {
  roomId: string;
  users: Array<{
    id: string;
    country: {
      country: string;
      flag: string;
    };
    name?: string;
    gender?: string;
  }>;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    // Use environment variable for production backend URL, fallback to localhost for development
    const isProduction = import.meta.env.PROD;
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (isProduction) {
      // In production, use the deployed backend URL
      // You'll need to set this environment variable in Netlify
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (backendUrl) {
        this.serverUrl = backendUrl;
      } else {
        // Fallback for production without environment variable
        // This will work for Render deployment
        const currentHost = window.location.hostname;
        if (currentHost.includes('onrender.com')) {
          this.serverUrl = `https://mujtv-backend.onrender.com`;
        } else {
          this.serverUrl = 'https://your-backend-url.railway.app'; // Replace with your actual backend URL
        }
      }
    } else {
      // For localhost development
      if (host === 'localhost' || host === '127.0.0.1') {
        const isSecure = protocol === 'https:';
        this.serverUrl = isSecure ? `https://localhost:3001` : `http://localhost:3001`;
      } else {
        this.serverUrl = `${protocol}//${host}:3001`;
      }
    }
    
    console.log('Socket service initialized with URL:', this.serverUrl);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true,
        });

        this.socket.on('connect', () => {
          console.log('Connected to server:', this.serverUrl);
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          
          // If HTTPS connection fails and we're on localhost, try HTTP fallback
          const host = window.location.hostname;
          if ((host === 'localhost' || host === '127.0.0.1') && 
              this.serverUrl.startsWith('https://') && 
              !this.socket?.connected) {
            
            console.log('HTTPS connection failed, trying HTTP fallback...');
            this.serverUrl = `http://localhost:3001`;
            
            // Disconnect current socket and try again
            if (this.socket) {
              this.socket.disconnect();
            }
            
            // Create new socket with HTTP URL
            this.socket = io(this.serverUrl, {
              transports: ['websocket', 'polling'],
              timeout: 10000,
              forceNew: true,
            });
            
            this.socket.on('connect', () => {
              console.log('Connected to server with HTTP fallback:', this.serverUrl);
              resolve();
            });
            
            this.socket.on('connect_error', (fallbackError) => {
              console.error('HTTP fallback connection also failed:', fallbackError);
              reject(fallbackError);
            });
            
            return;
          }
          
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // User management
  onUserData(callback: (data: UserData) => void): void {
    this.socket?.on('userData', callback);
  }

  // Search functionality
  startSearch(name?: string, gender?: string): void {
    this.socket?.emit('startSearch', { name, gender });
  }

  onSearchStarted(callback: () => void): void {
    this.socket?.on('searchStarted', callback);
  }

  onMatchFound(callback: (data: MatchData) => void): void {
    this.socket?.on('matchFound', callback);
  }

  // Navigation
  next(): void {
    this.socket?.emit('next');
  }

  stop(): void {
    this.socket?.emit('stop');
  }

  onPartnerSkipped(callback: () => void): void {
    this.socket?.on('partnerSkipped', callback);
  }

  onPartnerDisconnected(callback: () => void): void {
    this.socket?.on('partnerDisconnected', callback);
  }

  onStopped(callback: () => void): void {
    this.socket?.on('stopped', callback);
  }

  // Chat functionality
  sendMessage(text: string): void {
    this.socket?.emit('sendMessage', { text });
  }

  onNewMessage(callback: (message: Message) => void): void {
    this.socket?.on('newMessage', callback);
  }

  // WebRTC signaling
  sendOffer(offer: RTCSessionDescriptionInit): void {
    this.socket?.emit('offer', { offer });
  }

  sendAnswer(answer: RTCSessionDescriptionInit): void {
    this.socket?.emit('answer', { answer });
  }

  sendIceCandidate(candidate: RTCIceCandidateInit): void {
    this.socket?.emit('iceCandidate', { candidate });
  }

  onOffer(callback: (data: { offer: RTCSessionDescriptionInit; from: string }) => void): void {
    this.socket?.on('offer', callback);
  }

  onAnswer(callback: (data: { answer: RTCSessionDescriptionInit; from: string }) => void): void {
    this.socket?.on('answer', callback);
  }

  onIceCandidate(callback: (data: { candidate: RTCIceCandidateInit; from: string }) => void): void {
    this.socket?.on('iceCandidate', callback);
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Online count events
  onOnlineCount(callback: (count: number) => void): void {
    this.socket?.on('onlineCount', callback);
  }

  onUserJoined(callback: (count: number) => void): void {
    this.socket?.on('userJoined', callback);
  }

  onUserLeft(callback: (count: number) => void): void {
    this.socket?.on('userLeft', callback);
  }

  // Get socket instance for direct access (if needed)
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService; 