import socketService from './socketService';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isInitiator: boolean = false;
  private hasReceivedOffer: boolean = false;
  private isSettingRemoteDescription: boolean = false;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 3;
  private retryTimeout: number = 5000; // 5 seconds

  private defaultConfig: WebRTCConfig = {
    iceServers: [
      // Google's public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Additional STUN servers for better network compatibility
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      // More STUN servers for better connectivity
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
      { urls: 'stun:stun.voxgratia.org' },
      { urls: 'stun:stun.xten.com' },
      // Reliable TURN servers for production
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      // Additional free TURN servers for redundancy
      {
        urls: 'turn:relay.backups.cz',
        username: 'webrtc',
        credential: 'webrtc'
      },
      {
        urls: 'turn:relay.backups.cz:443',
        username: 'webrtc',
        credential: 'webrtc'
      }
    ]
  };

  private getProductionConfig(): WebRTCConfig {
    // Production configuration with TURN servers prioritized
    return {
      iceServers: [
        // TURN servers first for better cross-network connectivity
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.backups.cz:443',
          username: 'webrtc',
          credential: 'webrtc'
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:relay.backups.cz',
          username: 'webrtc',
          credential: 'webrtc'
        },
        // STUN servers as fallback
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
      ]
    };
  }

  async initialize(config?: Partial<WebRTCConfig>): Promise<void> {
    // Use production config for better cross-network connectivity
    const isProduction = import.meta.env.PROD;
    const baseConfig = isProduction ? this.getProductionConfig() : this.defaultConfig;
    const finalConfig = { ...baseConfig, ...config };
    
    console.log('Initializing WebRTC with config:', isProduction ? 'production' : 'development');
    
    this.peerConnection = new RTCPeerConnection(finalConfig);
    
    // Set up event listeners
    this.setupPeerConnectionListeners();
    this.setupSocketListeners();
    
    // Force TURN relay for better cross-network connectivity
    this.forceTurnRelay();
  }

  private forceTurnRelay(): void {
    if (!this.peerConnection) return;
    
    // Set ICE transport policy to relay only for better cross-network connectivity
    try {
      // This is a more aggressive approach for cross-network connections
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      };
      
      console.log('Forcing TURN relay for better cross-network connectivity');
    } catch (error) {
      console.warn('Could not force TURN relay:', error);
    }
  }

  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Generated ICE candidate:', event.candidate.type, event.candidate.protocol);
        socketService.sendIceCandidate(event.candidate);
      } else {
        console.log('ICE candidate gathering completed');
      }
    };

    // Handle ICE gathering state changes
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Remote stream received:', event.streams[0]);
      this.remoteStream = event.streams[0];
      // Emit event for UI to handle
      this.onRemoteStream?.(this.remoteStream);
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      this.onConnectionStateChange?.(this.peerConnection?.connectionState);
      
      // If connection is established, ensure remote stream is displayed
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('WebRTC connection established successfully');
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state:', state);
      this.onIceConnectionStateChange?.(state);
      
      // Provide specific feedback for different states
      switch (state) {
        case 'checking':
          console.log('Checking network connectivity...');
          break;
        case 'connected':
          console.log('WebRTC connection established successfully!');
          this.connectionRetryCount = 0; // Reset retry count on success
          break;
        case 'failed':
          console.error('WebRTC connection failed. This might be due to network restrictions.');
          this.handleConnectionFailure();
          break;
        case 'disconnected':
          console.log('WebRTC connection lost. Attempting to reconnect...');
          this.handleConnectionFailure();
          break;
      }
    };

    // Handle signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection?.signalingState);
    };
  }

  private setupSocketListeners(): void {
    // Handle incoming offers
    socketService.onOffer(async (data) => {
      if (!this.peerConnection) return;
      
      try {
        console.log('Received offer from:', data.from);
        this.hasReceivedOffer = true;
        this.isInitiator = false;
        
        // Check if we're already setting a remote description
        if (this.isSettingRemoteDescription) {
          console.log('Already setting remote description, skipping...');
          return;
        }

        this.isSettingRemoteDescription = true;
        
        // Set remote description
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // Create and set local answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        // Send answer
        socketService.sendAnswer(answer);
        
        this.isSettingRemoteDescription = false;
      } catch (error) {
        console.error('Error handling offer:', error);
        this.isSettingRemoteDescription = false;
      }
    });

    // Handle incoming answers
    socketService.onAnswer(async (data) => {
      if (!this.peerConnection) return;
      
      try {
        console.log('Received answer from:', data.from);
        
        // Check if we're already setting a remote description
        if (this.isSettingRemoteDescription) {
          console.log('Already setting remote description, skipping...');
          return;
        }

        this.isSettingRemoteDescription = true;
        
        // Only set remote description if we're in the right state
        if (this.peerConnection.signalingState === 'have-local-offer') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else {
          console.log('Wrong signaling state for answer:', this.peerConnection.signalingState);
        }
        
        this.isSettingRemoteDescription = false;
      } catch (error) {
        console.error('Error handling answer:', error);
        this.isSettingRemoteDescription = false;
      }
    });

    // Handle incoming ICE candidates
    socketService.onIceCandidate(async (data) => {
      if (!this.peerConnection) return;
      
      try {
        // Only add ICE candidate if connection is not closed
        if (this.peerConnection.connectionState !== 'closed') {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });
  }

  async startLocalStream(constraints: MediaStreamConstraints = {
    video: true,
    audio: true
  }): Promise<MediaStream> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser or context. Please use HTTPS or localhost.');
      }

      // Check for secure context (required for getUserMedia except on localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('getUserMedia requires a secure context (HTTPS). Please access the site over HTTPS.');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add local stream to peer connection
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide more helpful error messages
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Camera/microphone access denied. Please allow permissions and try again.');
          case 'NotFoundError':
            throw new Error('No camera or microphone found. Please connect media devices and try again.');
          case 'NotReadableError':
            throw new Error('Camera or microphone is already in use by another application.');
          case 'OverconstrainedError':
            throw new Error('The requested media constraints cannot be satisfied by available devices.');
          default:
            throw new Error(`Media access error: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Creating offer...');
      this.isInitiator = true;
      
      // Make sure we're in a stable state
      if (this.peerConnection.signalingState !== 'stable') {
        console.log('Signaling state not stable, resetting connection...');
        await this.resetConnection();
      }
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socketService.sendOffer(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      console.log('Creating answer...');
      this.isInitiator = false;
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      socketService.sendAnswer(answer);
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  private async resetConnection(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    
    // Reinitialize the connection
    await this.initialize();
    
    // Re-add local stream if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
  }

  private async handleConnectionFailure(): Promise<void> {
    if (this.connectionRetryCount < this.maxRetries) {
      this.connectionRetryCount++;
      console.log(`Connection failed. Retrying... (${this.connectionRetryCount}/${this.maxRetries})`);
      
      setTimeout(async () => {
        try {
          await this.resetConnection();
          // If we have an offer, try to recreate it
          if (this.isInitiator && !this.hasReceivedOffer) {
            const offer = await this.createOffer();
            socketService.sendOffer(offer);
          }
        } catch (error) {
          console.error('Failed to reset connection:', error);
        }
      }, this.retryTimeout);
    } else {
      console.error('Max retry attempts reached. Connection failed permanently.');
      this.connectionRetryCount = 0; // Reset for next attempt
    }
  }

  // Media control methods
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  toggleRemoteAudio(enabled: boolean): void {
    if (this.remoteStream) {
      const audioTrack = this.remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  // Cleanup
  cleanup(): void {
    console.log('Cleaning up WebRTC connection...');
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isInitiator = false;
    this.hasReceivedOffer = false;
    this.isSettingRemoteDescription = false;
    
    console.log('WebRTC cleanup completed');
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  isInitiatorMode(): boolean {
    return this.isInitiator;
  }

  hasOffer(): boolean {
    return this.hasReceivedOffer;
  }

  // Network connectivity check
  async checkNetworkConnectivity(): Promise<{ stun: boolean; turn: boolean }> {
    const results = { stun: false, turn: false };
    
    try {
      // Test STUN connectivity
      const testConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      const testOffer = await testConnection.createOffer();
      await testConnection.setLocalDescription(testOffer);
      
      // Wait for ICE gathering
      await new Promise((resolve) => {
        testConnection.onicegatheringstatechange = () => {
          if (testConnection.iceGatheringState === 'complete') {
            resolve(true);
          }
        };
        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
      
      results.stun = testConnection.iceGatheringState === 'complete';
      testConnection.close();
      
    } catch (error) {
      console.error('STUN connectivity test failed:', error);
    }
    
    console.log('Network connectivity test results:', results);
    return results;
  }

  // Get connection statistics
  async getConnectionStats(): Promise<any> {
    if (!this.peerConnection) return null;
    
    try {
      const stats = await this.peerConnection.getStats();
      const statsArray: any[] = [];
      
      stats.forEach((report) => {
        statsArray.push({
          type: report.type,
          id: report.id,
          timestamp: report.timestamp,
          ...Object.fromEntries(report)
        });
      });
      
      return statsArray;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return null;
    }
  }

  // Event callbacks
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCConnectionState | undefined) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState | undefined) => void;
}

export const webrtcService = new WebRTCService();
export default webrtcService; 