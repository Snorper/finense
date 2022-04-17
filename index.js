import express from 'express'
import 'dotenv/config';
import * as resolve from './resolve.js';
import * as worth from './worth.js';

const PORT = process.env.PORT;

const app = express();

// Return all supported address records for a given domain
app.get('/domain/:domain/addrs', async (req, res) => {
    let domain = req.params.domain;
    const resolver = await resolve.init(domain);
    const coinTypes = await resolve.getCoinTypes(domain);
    const addrs = await resolve.resolveAddrs(coinTypes, resolver);
    res.json(Object.fromEntries(addrs));
});

// Return amounts owned for all supported address records
app.get('/domain/:domain/amounts', async (req, res) => {
    let domain = req.params.domain;
    const resolver = await resolve.init(domain);
    const coinTypes = await resolve.getCoinTypes(domain);
    const addrs = await resolve.resolveAddrs(coinTypes, resolver);
    const amounts = await worth.getAmounts(addrs);
    res.json(Object.fromEntries(amounts));
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));