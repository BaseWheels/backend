/**
 * Keep-Alive Script for Neon Database
 * Pings database every 4 minutes to prevent auto-pause
 * Run: node keep-alive.js
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes

async function pingDatabase() {
  const url = `${BACKEND_URL}/health`;
  const protocol = BACKEND_URL.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${new Date().toLocaleTimeString()}] ✓ Database kept alive`);
          resolve(data);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] ✗ Ping failed: ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`[${new Date().toLocaleTimeString()}] ✗ Error:`, error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

console.log('🔥 Keep-Alive Script Started');
console.log(`📡 Pinging: ${BACKEND_URL}/health`);
console.log(`⏱️  Interval: every ${PING_INTERVAL / 1000 / 60} minutes\n`);

// Ping immediately on start
pingDatabase().catch(() => {});

// Then ping every 4 minutes
setInterval(() => {
  pingDatabase().catch(() => {});
}, PING_INTERVAL);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Keep-Alive stopped');
  process.exit(0);
});
