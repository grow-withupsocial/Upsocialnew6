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

        if (auth === 'query') {
            const separator = url.includes('?') ? '&' : '?';
            targetUrl = url + separator + 'api_key=' + encodeURIComponent(key);
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

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('UpSocial Proxy running on port ' + PORT);
});

