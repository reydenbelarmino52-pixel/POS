import { io } from 'socket.io-client';

// Only connect if not in a serverless environment or handle failures
const socket = io({
  reconnectionAttempts: 3,
  timeout: 5000,
  autoConnect: true
});

socket.on('connect_error', (error) => {
  console.warn('Socket connection failed (Expected on serverless platforms like Netlify/Vercel):', error.message);
  socket.disconnect(); // Stop retrying if it fails (likely serverless)
});

export default socket;
