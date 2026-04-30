import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

function loadDotEnv() {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envPath = join(__dirname, '..', '.env');
    const contents = readFileSync(envPath, 'utf8');

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    // Ignore missing .env file; env vars can still be provided by the shell.
  }
}

loadDotEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const FLOW_URL = process.env.FLOW_URL || process.env.VITE_FLOW_URL;
if (!FLOW_URL) {
  throw new Error('Missing required FLOW_URL or VITE_FLOW_URL environment variable.');
}

app.post('/fetch-files', async (req, res) => {
  try {
    const { pageSize = 5000, nextLink } = req.body;

    const body = { pageSize }
    if (nextLink) body.nextLink = nextLink

    const response = await fetch(FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Flow request failed: ${response.status}` });
    }

    const data = await response.json();

    res.json({
      items: data.items ?? [],
      nextLink: data.nextLink ?? null
    });

  } catch (err) {
    console.error('Error calling Flow:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});