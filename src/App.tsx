import { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  Send, 
  SkipForward, 
  Phone,
  PhoneOff,
  Users,
  Volume2,
  VolumeX,
  FlipHorizontal
} from 'lucide-react';
import socketService from './services/socketService';
import webrtcService from './services/webrtcService';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'stranger';
  timestamp: Date;
}

interface ConnectionState {
  status: 'idle' | 'searching' | 'connected' | 'disconnected';
  partner?: {
    country: string;
    flag: string;
    name?: string;
    gender?: string;
  };
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVolumeEnabled, setIsVolumeEnabled] = useState(true);
  const [isVideoInverted, setIsVideoInverted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle'
  });
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState('');
  const [partnerName, setPartnerName] = useState('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Function to retry media access
  const retryMediaAccess = async () => {
    try {
      setMediaError(null);
      const localStream = await webrtcService.startLocalStream();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (error) {
      console.error('Failed to start local stream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera/microphone';
      setMediaError(errorMessage);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update video transform when invert state changes
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.style.transform = isVideoInverted ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }, [isVideoInverted]);

  // Initialize backend connection
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);
        console.log('Connected to backend');
        
        // Set up WebRTC service
        await webrtcService.initialize();
        
        // Set up event listeners
        setupSocketListeners();
        setupWebRTCListeners();
        
        // Start local video stream
        try {
          setMediaError(null); // Clear any previous errors
          const localStream = await webrtcService.startLocalStream();
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        } catch (error) {
          console.error('Failed to start local stream:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to access camera/microphone';
          setMediaError(errorMessage);
        }
        
        // Fetch initial online count
        try {
          const host = window.location.hostname;
          const protocol = window.location.protocol;
          
          let apiUrl;
          if (host === 'localhost' || host === '127.0.0.1') {
            // For localhost, check if frontend is HTTPS and use same protocol for backend
            const isSecure = protocol === 'https:';
            apiUrl = isSecure ? 'https://localhost:3001/api/stats' : 'http://localhost:3001/api/stats';
          } else {
            // For network/production environments, use same protocol as frontend
            apiUrl = `${protocol}//${host}:3001/api/stats`;
          }
          
          console.log('Fetching stats from:', apiUrl);
          const response = await fetch(apiUrl);
          const stats = await response.json();
          setOnlineCount(stats.onlineCount || stats.activeUsers || 0);
        } catch (error) {
          console.error('Failed to fetch initial stats:', error);
        }
        
      } catch (error) {
        console.error('Failed to connect to backend:', error);
      }
    };

    initializeBackend();

    return () => {
      socketService.disconnect();
      webrtcService.cleanup();
    };
  }, []);

  const setupSocketListeners = () => {
    // User data
    socketService.onUserData((data) => {
      console.log('Received user data:', data);
    });

    // Search events
    socketService.onSearchStarted(() => {
      setConnection({ status: 'searching' });
      setMessages([]);
    });

    socketService.onMatchFound((data) => {
      console.log('Match found:', data);
      const partner = data.users.find(user => user.id !== socketService.getSocketId());
      console.log('Partner data:', partner);
      console.log('Partner name:', partner?.name);
      console.log('Partner gender:', partner?.gender);
      
      setConnection({ 
        status: 'connected',
        partner: {
          country: partner?.country,
          flag: partner?.flag,
          name: partner?.name,
          gender: partner?.gender
        }
      });
      setPartnerName(partner?.name || 'Stranger');
      console.log('Set partner name to:', partner?.name || 'Stranger');
      
      // Initialize WebRTC connection
      initializeWebRTCConnection();
    });

    // Partner events
    socketService.onPartnerSkipped(() => {
      setConnection({ status: 'searching' });
      setMessages([]);
      webrtcService.cleanup();
      setTimeout(() => {
        socketService.startSearch();
      }, 1000);
    });

    socketService.onPartnerDisconnected(() => {
      setConnection({ status: 'idle' });
      setMessages([]);
      webrtcService.cleanup();
    });

    socketService.onStopped(() => {
      setConnection({ status: 'idle' });
      setMessages([]);
    });

    // Chat messages
    socketService.onNewMessage((message) => {
      const isMe = message.sender === socketService.getSocketId();
      const newMessage: Message = {
        id: message.id,
        text: message.text,
        sender: isMe ? 'me' : 'stranger',
        timestamp: new Date(message.timestamp)
      };
      setMessages(prev => [...prev, newMessage]);
    });

    // Listen for online count updates
    socketService.onOnlineCount((count: number) => {
      console.log('Received online count update:', count);
      setOnlineCount(count);
    });

    // Listen for user joined/left events
    socketService.onUserJoined((count: number) => {
      console.log('User joined, new count:', count);
      setOnlineCount(count);
    });

    socketService.onUserLeft((count: number) => {
      console.log('User left, new count:', count);
      setOnlineCount(count);
    });
  };

  const setupWebRTCListeners = () => {
    webrtcService.onRemoteStream = (stream) => {
      console.log('Setting remote stream to video element');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        // Force video to play
        remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
      }
    };

    webrtcService.onConnectionStateChange = (state) => {
      console.log('WebRTC connection state:', state);
      if (state === 'connected') {
        console.log('WebRTC connected - ensuring remote stream is displayed');
        // Force refresh remote video
        const remoteStream = webrtcService.getRemoteStream();
        if (remoteStream && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
        }
      }
    };

    webrtcService.onIceConnectionStateChange = (state) => {
      console.log('ICE connection state:', state);
    };
  };

  const initializeWebRTCConnection = async () => {
    try {
      console.log('Initializing WebRTC connection...');
      
      // Ensure we have a fresh WebRTC connection
      webrtcService.cleanup();
      await webrtcService.initialize();
      
      // Start local stream
      const localStream = await webrtcService.startLocalStream();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      
      // Wait a bit for both clients to be ready and check for existing offers
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // If we haven't received an offer yet, we become the initiator
      if (!webrtcService.hasOffer()) {
        console.log('Becoming initiator...');
        await webrtcService.createOffer();
      } else {
        console.log('Already received offer, waiting for connection...');
      }
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      // Try to reset and retry once more
      try {
        console.log('Retrying WebRTC initialization...');
        webrtcService.cleanup();
        await webrtcService.initialize();
        const localStream = await webrtcService.startLocalStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!webrtcService.hasOffer()) {
          await webrtcService.createOffer();
        }
      } catch (retryError) {
        console.error('Failed to retry WebRTC initialization:', retryError);
      }
    }
  };

  const handleSendMessage = () => {
    if (currentMessage.trim() && connection.status === 'connected') {
      socketService.sendMessage(currentMessage);
      setCurrentMessage('');
    }
  };

  const handleStartChat = () => {
    if (!userName.trim() || !userGender) {
      setShowNameModal(true);
      return;
    }
    socketService.startSearch(userName, userGender);
  };

  const handleNameSubmit = () => {
    if (userName.trim() && userGender) {
      console.log('Submitting name:', userName, 'gender:', userGender);
      setShowNameModal(false);
      socketService.startSearch(userName, userGender);
    }
  };

  const handleNext = () => {
    socketService.next();
  };

  const handleStop = () => {
    socketService.stop();
  };

  const refreshOnlineCount = async () => {
    try {
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      
      let apiUrl;
      if (host === 'localhost' || host === '127.0.0.1') {
        // For localhost, check if frontend is HTTPS and use same protocol for backend
        const isSecure = protocol === 'https:';
        apiUrl = isSecure ? 'https://localhost:3001/api/stats' : 'http://localhost:3001/api/stats';
      } else {
        // For network/production environments, use same protocol as frontend
        apiUrl = `${protocol}//${host}:3001/api/stats`;
      }
      
      console.log('Refreshing stats from:', apiUrl);
      const response = await fetch(apiUrl);
      const stats = await response.json();
      const newCount = stats.onlineCount || stats.activeUsers || 0;
      console.log('Manual refresh - online count:', newCount);
      setOnlineCount(newCount);
    } catch (error) {
      console.error('Failed to refresh online count:', error);
    }
  };

  const getStatusDisplay = () => {
    switch (connection.status) {
      case 'searching':
        return { text: 'Looking for someone...', color: 'text-yellow-400', pulse: true };
      case 'connected':
        const displayName = partnerName || connection.partner?.name || 'Stranger';
        const genderInfo = connection.partner?.gender ? ` (${connection.partner.gender})` : '';
        return { 
          text: `Connected with ${displayName}${genderInfo} ${connection.partner?.flag || ''}`, 
          color: 'text-green-400', 
          pulse: false 
        };
      default:
        return { text: 'Ready to start', color: 'text-gray-400', pulse: false };
    }
  };

  const getGenderEmoji = (gender?: string) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return '👨';
      case 'female':
        return '👩';
      case 'other':
        return '🧑';
      default:
        return '';
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MUJ.TV
                </h1>
                <p className="text-xs text-gray-400">Connect with strangers worldwide</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  {onlineCount.toLocaleString()}
                </span>
                <button 
                  onClick={refreshOnlineCount}
                  className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                  title="Refresh online count"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* Status Bar */}
          <div className="mb-6 text-center">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm ${status.pulse ? 'animate-pulse' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'searching' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          </div>

          {/* Video Container - Side by Side */}
          <div className="bg-black/20 rounded-2xl overflow-hidden max-w-7xl mx-auto mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Local Video */}
              <div className="relative bg-black/30 rounded-xl overflow-hidden aspect-[4/3]">
                <div className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded-md text-sm font-medium text-white z-10">
                  You
                </div>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transition-transform duration-300"
                />
                {connection.status === 'idle' && !mediaError && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <div className="text-center">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-base font-medium text-white">Your Camera</p>
                  </div>
                  </div>
                )}
              </div>
              
              {/* Remote Video */}
              <div className="relative bg-black/30 rounded-xl overflow-hidden aspect-[4/3]">
                <div className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded-md text-sm font-medium text-white z-10">
                  {connection.status === 'connected' ? (partnerName || connection.partner?.name || 'Partner') : 'Waiting...'}
                </div>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-cover"
                />
                {connection.status === 'searching' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-base font-medium text-white">Looking for someone...</p>
                  </div>
                  </div>
                )}
                {connection.status === 'idle' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <div className="text-center">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-base font-medium text-white">Partner's Camera</p>
                  </div>
                  </div>
                )}
              </div>
            </div>

            {/* Media Error Overlay */}
            {mediaError && (
              <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-50">
                <div className="text-center max-w-md mx-auto p-6">
                  <VideoOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-white mb-2">Camera/Microphone Error</p>
                  <p className="text-sm text-gray-300 mb-4">{mediaError}</p>
                  <button
                    onClick={retryMediaAccess}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6">
            {/* Start/Stop Button */}
            {connection.status === 'idle' ? (
              <button
                onClick={handleStartChat}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-3 sm:px-6 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Start Chat</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-4 py-3 sm:px-6 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Stop</span>
              </button>
            )}

            {/* Next Button */}
            {connection.status === 'connected' && (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-4 py-3 sm:px-6 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Next</span>
              </button>
            )}

            {/* Video Toggle */}
            <button
              onClick={() => {
                setIsVideoEnabled(!isVideoEnabled);
                webrtcService.toggleVideo(!isVideoEnabled);
              }}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled 
                  ? 'bg-white/20 hover:bg-white/30' 
                  : 'bg-red-500/20 hover:bg-red-500/30'
              }`}
            >
              {isVideoEnabled ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                setIsAudioEnabled(!isAudioEnabled);
                webrtcService.toggleAudio(!isAudioEnabled);
              }}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled 
                  ? 'bg-white/20 hover:bg-white/30' 
                  : 'bg-red-500/20 hover:bg-red-500/30'
              }`}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Volume Toggle */}
            <button
              onClick={() => {
                setIsVolumeEnabled(!isVolumeEnabled);
                webrtcService.toggleRemoteAudio(!isVolumeEnabled);
              }}
              className={`p-3 rounded-full transition-colors ${
                isVolumeEnabled 
                  ? 'bg-white/20 hover:bg-white/30' 
                  : 'bg-red-500/20 hover:bg-red-500/30'
              }`}
            >
              {isVolumeEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Invert Video Toggle */}
            <button
              onClick={() => setIsVideoInverted(!isVideoInverted)}
              className={`p-3 rounded-full transition-colors ${
                isVideoInverted 
                  ? 'bg-blue-500/20 hover:bg-blue-500/30' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title="Invert Video (Mirror Effect)"
            >
              <FlipHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-full transition-colors ${
                showChat 
                  ? 'bg-blue-500/20 hover:bg-blue-500/30' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-full lg:w-80 bg-black/20 backdrop-blur-md border-t lg:border-l lg:border-t-0 border-white/10 flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-medium">Chat</h3>
              <p className="text-sm text-gray-400">
                {connection.status === 'connected' ? (
                  <span>
                    Connected with {partnerName || connection.partner?.name || 'Stranger'}
                    {connection.partner?.gender && (
                      <span className="ml-1">
                        {getGenderEmoji(connection.partner.gender)} {connection.partner.gender}
                      </span>
                    )}
                  </span>
                ) : (
                  'Not connected'
                )}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.sender === 'me'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  disabled={connection.status !== 'connected'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={connection.status !== 'connected' || !currentMessage.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name Input Modal */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-white mb-4">Enter Your Details</h2>
              <p className="text-gray-300 mb-4">
                Please enter your name and select your gender to start chatting. This information will be displayed to your chat partner.
              </p>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Your name..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
                autoFocus
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setUserGender('male')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      userGender === 'male'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => setUserGender('female')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      userGender === 'female'
                        ? 'bg-pink-500 border-pink-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => setUserGender('other')}
                    className={`py-2 px-4 rounded-lg border transition-colors ${
                      userGender === 'other'
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Other
                  </button>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleNameSubmit}
                  disabled={!userName.trim() || !userGender}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Start Chat
                </button>
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;