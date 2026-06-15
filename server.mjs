import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';
import https from 'https';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// 2. CORS Restriction (Allow local development and same-origin ports)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// 3. API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

const PORT = process.env.PORT || 3001;

// Settrade Credentials
const appId = process.env.SETTRADE_APP_ID;
const appSecretBase64 = process.env.SETTRADE_APP_SECRET;
const brokerId = process.env.SETTRADE_BROKER_ID || 'SANDBOX';
const appCode = process.env.SETTRADE_APP_CODE || 'ALGO';

// State
let accessToken = null;
let lastLoginTime = 0;

// Derive PEM key
const rawKey = Buffer.from(appSecretBase64, 'base64');
const pkcs8Header = Buffer.from('3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420', 'hex');
const derKey = Buffer.concat([pkcs8Header, rawKey]);
const pem = `-----BEGIN PRIVATE KEY-----\n${derKey.toString('base64')}\n-----END PRIVATE KEY-----`;

function loginSettrade() {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const params = '';
    const content = `${appId}.${params}.${timestamp}`;

    const signer = crypto.createSign('SHA256');
    signer.update(content);
    const signature = signer.sign(pem, 'hex');

    const payload = JSON.stringify({
      apiKey: appId,
      params: params,
      timestamp: timestamp,
      signature: signature
    });

    const url = `https://open-api.settrade.com/api/oam/v1/${brokerId}/broker-apps/${appCode}/login`;
    
    console.log(`[Settrade API] Logging in to ${brokerId}...`);

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.access_token) {
            accessToken = json.access_token;
            lastLoginTime = Date.now();
            console.log('[Settrade API] Login Successful!');
            resolve(accessToken);
          } else {
            console.error('[Settrade API] Login Failed:', json);
            reject(new Error(json.message || 'Login Failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Ensure token is valid
async function getValidToken() {
  // Simple token cache (assume valid for 1 hour)
  if (!accessToken || Date.now() - lastLoginTime > 3600000) {
    await loginSettrade();
  }
  return accessToken;
}

// State for Yahoo Data
let yahooCache = {}; // { 'PTT': { price: 35.50, timestamp: 123456789 } }

async function fetchYahooPrices(requestedSymbols, forceRefresh = false) {
  const now = Date.now();
  const symbolsToFetch = [];
  const results = {};

  // Check cache
  requestedSymbols.forEach(symbol => {
    const cached = yahooCache[symbol];
    if (!forceRefresh && cached && now - cached.timestamp < 60000) { // 1 minute
      results[symbol] = cached.price;
    } else {
      symbolsToFetch.push(symbol);
    }
  });

  if (symbolsToFetch.length > 0) {
    console.log(`[Yahoo Finance] Fetching latest real prices for: ${symbolsToFetch.join(', ')}`);
    
    const promises = symbolsToFetch.map(symbol => {
      return new Promise((resolve) => {
        const cleanSymbol = symbol.endsWith('.BK') || symbol.startsWith('^') ? symbol : `${symbol}.BK`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.chart && json.chart.result && json.chart.result[0]) {
                const result = json.chart.result[0];
                const price = result.meta.regularMarketPrice;
                if (price) {
                  resolve({ symbol, price });
                  return;
                }
              }
              resolve({ symbol, price: null });
            } catch (e) {
              resolve({ symbol, price: null });
            }
          });
        }).on('error', () => {
          resolve({ symbol, price: null });
        });
      });
    });

    const fetchedResults = await Promise.all(promises);

    fetchedResults.forEach(res => {
      if (res.price) {
        yahooCache[res.symbol] = { price: res.price, timestamp: now };
        results[res.symbol] = res.price;
      } else {
        // Fallback for missing symbol or API error: use last known or 0
        const fallbackPrice = yahooCache[res.symbol]?.price || 0;
        results[res.symbol] = fallbackPrice;
      }
    });
  }

  return results;
}

app.get('/api/prices', async (req, res) => {
  try {
    let symbolsParam = req.query.symbols;
    if (!symbolsParam) {
      symbolsParam = 'PTT,AOT,CPALL,ADVANC,KBANK,GULF,BDMS,BBL,SCC,DELTA';
    } else if (typeof symbolsParam !== 'string' || symbolsParam.length > 300) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const forceRefresh = req.query.force === 'true';
    
    // 4. Input Validation & Sanitization
    const validSymbolRegex = /^[A-Z0-9.\^]+$/;
    const requestedSymbols = symbolsParam
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s && validSymbolRegex.test(s));

    if (requestedSymbols.length === 0 || requestedSymbols.length > 50) {
      return res.status(400).json({ success: false, error: 'Invalid symbols' });
    }

    // 1. Try to maintain Settrade API Login (Priority 1)
    try {
      const token = await getValidToken();
    } catch (settradeErr) {
      // Gracefully fallback to Yahoo
    }

    // 2. Fetch Real Prices from Yahoo Finance (Priority 2 / Fallback)
    const realPrices = await fetchYahooPrices(requestedSymbols, forceRefresh);
    
    res.json({
      source: 'Yahoo Finance + Settrade Gateway',
      success: true,
      data: realPrices
    });
  } catch (error) {
    console.error('[Prices API] Error:', error);
    res.status(500).json({
      source: 'Error',
      success: false,
      error: 'Internal Server Error', // 5. Error Information Leakage Prevention
      data: {}
    });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { stocksData } = req.body;
    
    // 4. Input Validation
    if (!stocksData || !Array.isArray(stocksData) || stocksData.length > 100) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'API Key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert stock trader (Quant/Trader). Analyze the following real-time Thai stock prices (SET) and select exactly 2 stocks that have the best short-term trading potential right now based on price action and momentum principles.
Data:
${JSON.stringify(stocksData, null, 2)}

Respond ONLY with a valid JSON array matching this exact format, with no markdown, no backticks, and no extra text:
[
  {
    "symbol": "STOCK_SYMBOL",
    "targetPrice": 0.00,
    "stopLoss": 0.00,
    "reason": "Brief technical analysis reason in Thai"
  }
]`;

    console.log('[Gemini API] Sending analysis request...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let responseText = response.text;
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/\`\`\`/g, '').trim();
    }

    const aiSignals = JSON.parse(responseText);
    console.log('[Gemini API] Successfully generated analysis.');

    res.json({
      success: true,
      data: aiSignals
    });

  } catch (error) {
    console.error('[Gemini API] Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' }); // 5. Error Information Leakage Prevention
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[API Gateway] Serving static files from ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[API Gateway] Server running on http://localhost:${PORT}`);
  console.log(`[API Gateway] Broker: ${brokerId} | App ID: ${appId}`);
});
