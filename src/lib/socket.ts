import { io } from 'socket.io-client';

const socket = io({
  reconnectionAttempts: 10,
  timeout: 10000,
  autoConnect: true
});

socket.on('connect_error', (error) => {
  console.warn('Socket connection error:', error.message);
});

export default socket;
