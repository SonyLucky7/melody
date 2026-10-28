import https from 'https';
import http from 'http';

/**
 * Built-in Keep-Alive Robot for Render.com
 * Pings the live health endpoint every 8 minutes (480,000 ms)
 * to prevent the server from ever entering sleep mode.
 */
export function startKeepAliveRobot(targetUrl?: string) {
  const url = targetUrl || process.env.RENDER_EXTERNAL_URL || 'https://melody-mzsm.onrender.com/health';

  console.log(`[Keep-Alive Robot] Initialized for: ${url} (Interval: 8 minutes)`);

  const ping = () => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Melody-KeepAlive-Robot/1.0' } }, (res) => {
        if (res.statusCode === 200) {
          console.log(`[Keep-Alive Robot] Ping successful (Status: 200) at ${new Date().toISOString()}`);
        } else {
          console.warn(`[Keep-Alive Robot] Ping returned status ${res.statusCode}`);
        }
      });

      req.on('error', (err) => {
        console.warn(`[Keep-Alive Robot] Ping error: ${err.message}`);
      });

      req.setTimeout(15000, () => {
        req.destroy();
      });
    } catch (e: any) {
      console.warn(`[Keep-Alive Robot] Unexpected error: ${e.message}`);
    }
  };

  // Initial ping after 30 seconds
  setTimeout(ping, 30 * 1000);

  // Recurring ping every 8 minutes
  const interval = setInterval(ping, 8 * 60 * 1000);
  interval.unref(); // Allows process to exit cleanly if needed
}
