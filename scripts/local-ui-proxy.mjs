// Test-only TLS termination. Never imported by application or production deployment.
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export async function startUiProxy() {
  assert(process.env.LQADWA_TEST_STATE, 'Use the isolated integration harness');
  const state = path.resolve(process.env.LQADWA_TEST_STATE);
  assert(state.startsWith(path.resolve('.wrangler') + path.sep) && /^integration-/.test(path.basename(state)));
  const key = path.join(state, 'ui-key.pem'), cert = path.join(state, 'ui-cert.pem');
  const openssl = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl';
  execFileSync(openssl, ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
  const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (incoming, outgoing) => {
    const headers = { ...incoming.headers, host: 'localhost:5173' };
    // Local Worker sees HTTP after termination; preserve hostile origins for its CSRF check.
    if (headers.origin === 'https://localhost:5443') headers.origin = 'http://localhost:5173';
    const upstream = request({ hostname: '127.0.0.1', port: 5173, path: incoming.url, method: incoming.method, headers }, response => {
      outgoing.writeHead(response.statusCode || 502, response.headers); response.pipe(outgoing);
    });
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Local test upstream unavailable'); });
    incoming.on('aborted', () => upstream.destroy()); incoming.pipe(upstream);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5443, '127.0.0.1', resolve); });
  return async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); };
}
