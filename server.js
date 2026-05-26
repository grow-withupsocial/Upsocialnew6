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

app.get('/', (req, res) => {
    res.json({ 
        status: 'UpSocial Proxy Server is running',
        endpoints: {
            proxy: 'POST /api/proxy',
            health: 'GET /health'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

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

        // Add auth
        if (auth === 'query') {
            const separator = url.includes('?') ? '&' : '?';
            targetUrl = url + separator + 'key=' + encodeURIComponent(key) + '&action=services';
        } else if (auth === 'header') {
            headers['Authorization'] = 'Bearer ' + key;
        } else if (auth === 'header-key') {
            headers['X-API-Key'] = key;
        }

        console.log('Fetching:', targetUrl);
        
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: headers,
            timeout: 30000
        });

        const text = await response.text();
        console.log('Response length:', text.length);
        console.log('First 200 chars:', text.substring(0, 200));
        
        // Try to parse as JSON
        try {
            const data = JSON.parse(text);
            res.json(data); // Send as proper JSON
        } catch (e) {
            // If not valid JSON, send error
            res.status(500).json({ 
                error: 'Invalid JSON from panel', 
                raw: text.substring(0, 500) 
            });
        }
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('UpSocial Proxy running on port ' + PORT);
});

// Korapay API configuration
const KORAPAY_SECRET = process.env.KORAPAY_SECRET_KEY || 'your_secret_key_here';
const KORAPAY_BASE_URL = 'https://api.korapay.com/merchant/api/v1';

// Initialize payment
app.post('/api/korapay/initialize', async (req, res) => {
    try {
        const { amount, email, reference } = req.body;
        
        if (!amount || !email) {
            return res.status(400).json({ error: 'Amount and email required' });
        }

        const response = await fetch(KORAPAY_BASE_URL + '/charges/initialize', {
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
                redirect_url: req.body.redirect_url || 'https://grow-withupsocial.github.io/Upsocialnew6/dashboard.html'
            })
        });

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify payment
app.post('/api/korapay/verify', async (req, res) => {
    try {
        const { reference } = req.body;
        
        const response = await fetch(KORAPAY_BASE_URL + '/charges/' + reference, {
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

// Webhook handler (Korapay calls this when payment completes)
app.post('/api/korapay/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('Korapay webhook:', event);
        
        // Verify it's a successful payment
        if (event.event === 'charge.success' || event.data?.status === 'success') {
            const amount = event.data?.amount || event.data?.amount_paid;
            const email = event.data?.customer?.email;
            const reference = event.data?.reference;
            
            // Here you would update the user's wallet
            // Since we don't have a database, we'll store in a simple cache
            // or you can send it back to the frontend via polling
            
            console.log(`Payment success: ${email} - ₦${amount} - Ref: ${reference}`);
        }
        
        res.json({ status: 'received' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

