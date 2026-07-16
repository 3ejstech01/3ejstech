if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: SESSION_SECRET (or NEXTAUTH_SECRET) must be set in production. Refusing to start.');
  process.exit(1);
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Starts the Next.js server in-process.
// `dev` is explicit so the Electron main process can force production mode
// when packaged (there is no standalone `node` binary to spawn in a build).
async function startServer(dev = process.env.NODE_ENV !== 'production') {
  const hostname = 'localhost';
  const port = process.env.PORT || 3000;
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`> Ready on http://${hostname}:${port}`);
  return server;
}

module.exports = { startServer };

// Allow running directly: `node server.js`
if (require.main === module) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
