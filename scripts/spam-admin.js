#!/usr/bin/env node

// Simple script to fire repeated requests to admin API to test rate limiting
// Usage: node scripts/spam-admin.js --url=http://localhost:4000 --count=200 --token=<token> --delay=50 --stopOn429

const http = require('http');
const https = require('https');
const { URL } = require('url');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, val] = arg.split('=');
    if (key.startsWith('--')) {
      args[key.replace('--', '')] = val || true;
    }
  });
  return args;
}

(async function main() {
  const args = parseArgs();
  const urlString = args.url || 'http://localhost:4000';
  const count = parseInt(args.count || '200', 10);
  const token = args.token || '';
  const path = args.path || (args['no-auth'] ? '/api/cv' : '/api/admin/cvs');
  const delay = parseInt(args.delay || '50', 10);
  const stopOn429 = !!args.stopOn429;

  const url = new URL(urlString);
  const httpLib = url.protocol === 'https:' ? https : http;

  console.log(`Spamming ${count} requests to ${url.origin}${path} with delay ${delay}ms`);

  for (let i = 0; i < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = httpLib.request(options, (res) => {
      const { statusCode } = res;
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          console.log(`${i + 1}/${count} -> ${statusCode} ${json.message ? `: ${json.message}` : ''}`);
        } catch (e) {
          console.log(`${i + 1}/${count} -> ${statusCode}`);
        }
        if (stopOn429 && statusCode === 429) {
          console.log('Received 429, exiting.');
          process.exit(0);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('Request error', err.message);
      resolve();
    });

    req.end();
  }
  console.log('Done');
})();
