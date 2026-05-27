const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'UpSocial Proxy Server is running',
        endpoints: {
            proxy: 'POST /api/proxy',
            korapay: 'POST /api/korapay/initialize',
            verify: 'POST /api/korapay/verify',
            webhook: 'POST /api/korapay/webhook'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// SMM Panel Proxy
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, key, auth } = req.body;
        
        if (!url || !key) {
            return res.status(400).json({ error: 'URL and API key are required' });
        }

        let targetUrl = url;
        let headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'UpSocial-Proxy/1.0'
        };

        if (auth === 'query') {
            const separator = url.includes('?') ? '&' : '?';
            targetUrl = url + separator + 'key=' + encodeURIComponent(key) + '&action=services';
        } else if (auth === 'header') {
            headers['Authorization'] = 'Bearer ' + key;
        } else if (auth === 'header-key') {
            headers['X-API-Key'] = key;
        }

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headers,
            timeout: 30000
        });

        const text = await response.text();
        
        try {
            const data = JSON.parse(text);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: 'Invalid JSON from panel', raw: text.substring(0, 200) });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Korapay Initialize Payment
app.post('/api/korapay/initialize', async (req, res) => {
    try {
        const { amount, email, reference } = req.body;
        const KORAPAY_SECRET = process.env.KORAPAY_SECRET_KEY;
        
        if (!KORAPAY_SECRET) {
            return res.status(500).json({ error: 'Korapay secret key not configured' });
        }
        
        if (!amount || !email) {
            return res.status(400).json({ error: 'Amount and email required' });
        }

        const response = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + KORAPAY_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Number(amount),
                currency: 'NGN',
                reference: reference || 'UPS_' + Date.now(),
                customer: { email: email },
                redirect_url: 'https://grow-withupsocial.github.io/Upsocialnew6/dashboard.html'
            })
        });

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Korapay Verify Payment
app.post('/api/korapay/verify', async (req, res) => {
    try {
        const { reference } = req.body;
        const KORAPAY_SECRET = process.env.KORAPAY_SECRET_KEY;
        
        const response = await fetch('https://api.korapay.com/merchant/api/v1/charges/' + reference, {
            headers: {
                'Authorization': 'Bearer ' + KORAPAY_SECRET
            }
        });

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Korapay Webhook
app.post('/api/korapay/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('Korapay webhook:', JSON.stringify(event, null, 2));
        
        if (event.event === 'charge.success' || event.data?.status === 'success') {
            console.log('Payment success:', event.data?.reference);
        }
        
        res.json({ status: 'received' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('UpSocial Proxy running on port ' + PORT);
});
                
