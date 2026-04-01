require('dotenv').config();
const axios = require('axios');

async function testApi() {
    const api = axios.create({
        baseURL: process.env.DAFTARNAMA_BASE_URL,
        headers: {
            'x-api-key': process.env.DAFTARNAMA_API_KEY,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    const endpointsToTest = [
        { method: 'GET', url: '/customers' },
        { method: 'POST', url: '/domains/search', data: {} },
        { method: 'GET', url: '/domains', params: {} }
    ];

    for (let ep of endpointsToTest) {
        try {
            console.log(`Testing ${ep.method} ${ep.url}...`);
            let res;
            if (ep.method === 'GET') {
                res = await api.get(ep.url, { params: ep.params });
            } else {
                res = await api.post(ep.url, ep.data);
            }
            console.log(`Success ${ep.url}:`, res.data);
        } catch (err) {
            console.error(`Failed ${ep.url}:`, err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message);
        }
    }
}

testApi();
