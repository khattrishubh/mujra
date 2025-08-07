// Type definitions for the video chat server

export const ConnectionStatus = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

export const SocketEvents = {
  // Client to Server
  START_SEARCH: 'startSearch',
  NEXT: 'next',
  STOP: 'stop',
  SEND_MESSAGE: 'sendMessage',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'iceCandidate',
  
  // Server to Client
  USER_DATA: 'userData',
  SEARCH_STARTED: 'searchStarted',
  MATCH_FOUND: 'matchFound',
  PARTNER_SKIPPED: 'partnerSkipped',
  PARTNER_DISCONNECTED: 'partnerDisconnected',
  STOPPED: 'stopped',
  NEW_MESSAGE: 'newMessage'
};

export const APIEndpoints = {
  HEALTH: '/api/health',
  STATS: '/api/stats'
}; 