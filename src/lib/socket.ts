// NOTE: Socket.io is disabled as this application is optimized for Serverless deployments (Vercel/Netlify).
// Real-time updates are now handled via Supabase Realtime in src/lib/supabase.ts

const socket = {
  on: () => {},
  off: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {},
};

export default socket;
