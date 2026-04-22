const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3030;
const KIT_API_KEY = process.env.KIT_API_KEY;
const TAG_ID = 19096324; // 3k-field-guide
const SEQUENCE_ID = 2731684; // 3K Field Guide Welcome

function kitRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.kit.com',
      path: `/v4${endpoint}`,
      method,
      headers: {
        'X-Kit-Api-Key': KIT_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/subscribe', async (req, res) => {
  const { email, firstName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Step 1: Create/update subscriber
    const subRes = await kitRequest('POST', '/subscribers', {
      email_address: email,
      first_name: firstName || ''
    });

    if (subRes.status !== 200 && subRes.status !== 201) {
      console.error('Kit subscriber error:', subRes.status, subRes.body);
      return res.status(500).json({ error: 'Subscription failed' });
    }

    // Step 2: Apply 3k-field-guide tag
    const tagRes = await kitRequest('POST', `/tags/${TAG_ID}/subscribers`, {
      email_address: email
    });

    if (tagRes.status !== 200 && tagRes.status !== 201) {
      console.error('Kit tag error:', tagRes.status, tagRes.body);
    }

    // Step 3: Add to welcome sequence
    const seqRes = await kitRequest('POST', `/sequences/${SEQUENCE_ID}/subscribers`, {
      email_address: email
    });

    if (seqRes.status !== 200 && seqRes.status !== 201) {
      console.error('Kit sequence error:', seqRes.status, seqRes.body);
    }

    res.json({ success: true, downloadUrl: '/guide.pdf' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Canopy Academy landing page running at http://localhost:${PORT}`);
});
