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

        // Standard SMM panel auth format
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
        console.log('Response:', text.substring(0, 500));
        
        try {
            const data = JSON.parse(text);
            res.json(data);
        } catch (e) {
            res.json({ error: 'Invalid JSON', raw: text.substring(0, 200) });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('UpSocial Proxy running on port ' + PORT);
});

