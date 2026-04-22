const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3030;
const KIT_API_KEY = process.env.KIT_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/subscribe', async (req, res) => {
  const { email, firstName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const payload = JSON.stringify({
    email_address: email,
    first_name: firstName || '',
    tags: ['3k-field-guide']
  });

  const options = {
    hostname: 'api.kit.com',
    path: '/v4/subscribers',
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': KIT_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const kitReq = https.request(options, (kitRes) => {
    let data = '';
    kitRes.on('data', chunk => data += chunk);
    kitRes.on('end', () => {
      if (kitRes.statusCode === 200 || kitRes.statusCode === 201) {
        res.json({ success: true, downloadUrl: '/guide.pdf' });
      } else {
        console.error('Kit error:', kitRes.statusCode, data);
        res.status(500).json({ error: 'Subscription failed' });
      }
    });
  });

  kitReq.on('error', (err) => {
    console.error('Kit request error:', err);
    res.status(500).json({ error: 'Subscription failed' });
  });

  kitReq.write(payload);
  kitReq.end();
});

app.listen(PORT, () => {
  console.log(`Canopy Academy landing page running at http://localhost:${PORT}`);
});
