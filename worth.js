import fetch from 'node-fetch';
import { config } from './config.js';
import {
    AssetError,
    throwProperly,
    UpstreamError
} from './errors.js';
import logger from './logger.cjs';

const NOW_NODES = config.NOW_NODES;
const NN_URL = config.NN_URL;
const NN_SUFFIX = config.NN_SUFFIX;
const BOOKS = config.BOOKS;
const BA_PREFIX = config.BA_PREFIX;
const COIN_NAMES = config.COIN_NAMES;
const SCALE = config.SCALE;

// Iterate over address map to find amounts owned
export async function getAmounts(addresses) {
    try {
        if (!addresses) throw new ArgError();
        const amounts = new Map();

        logger.info("Getting amounts owned for all addresses...");
        for (const [key, val] of addresses) {
            if (!BOOKS[key]) continue;
            const fullURL = `${BOOKS[key]}${NN_URL}${val}${NN_SUFFIX}`;

            const response = await fetch(fullURL, {
                method: 'GET',
                headers: {
                    'api-key': NOW_NODES,
                },
            }).catch(e => { throw new UpstreamError });
            const responseBody = await response.json();

            try {
                if (!COIN_NAMES.includes(key)) {
                    logger.info(`getAmounts: Asset ${key} is not supported`);
                    continue;
                }
                const parsedBalance = Number(responseBody.balance);
                const formattedBalance = parsedBalance / Math.pow(10, SCALE[key]);
                logger.info(`${key} balance: ${formattedBalance}`);
                const balance = String(formattedBalance);
                amounts.set(key, balance);
            } catch { throw new UpstreamError() }
        }
        if (amounts.size === 0) throw new AssetError(amounts.values().next().value);
        logger.info("Finished getting amounts owned");
        return amounts;
    } catch(e) { throwProperly(e) }
}

// Get amount owned by an address for a specified asset
export async function getSingleAmount(asset, address) {
    try {
        if (arguments.length !== 2) throw new ArgError();
        let apiResponse = {};
        let amount = "";

        logger.info(`Getting amount of ${asset} owned by address ${address}`);
        if (!BOOKS[asset]) throw new AssetError(asset);
        const fullURL = `${BOOKS[asset]}${NN_URL}${address}${NN_SUFFIX}`;
        const response = await fetch(fullURL, {
            method: 'GET',
            headers: {
                'api-key': NOW_NODES,
            },
        }).catch(e => { throw new UpstreamError() });
        const responseBody = await response.json();

        try {
            if (!COIN_NAMES.includes(asset)) throw new AssetError(asset);
            const parsedBalance = Number(responseBody.balance);
            const formattedBalance = parsedBalance / Math.pow(10, SCALE[asset]);
            amount = String(formattedBalance);
        } catch { throw new UpstreamError() }

        apiResponse["balance"] = amount;
        logger.info(`Found amount owned: ${amount}`);
        return apiResponse;
    } catch(e) { throwProperly(e) }
}

// Convert asset balance to USD
export async function toFiat(asset, balance) {
    try {
        if (arguments.length !== 2) throw new ArgError();
        let fiatAmount = {};
        const ast = asset.toUpperCase();
        let bal = Number(balance);
        
        const fullURL = `${BA_PREFIX}${ast}-USD`;
        logger.info(`Converting ${balance} ${asset} to usd...`);
        const response = await fetch(fullURL, {
            method: 'GET',
        }).catch(e => {
            throw new UpstreamError();
        });

        if (response.status === 400) throw new AssetError(asset);

        const responseBody = await response.json();
        try {
            const price = responseBody.last_trade_price;
            const fiatBalance = bal * price;

            fiatAmount["usd"] = String(fiatBalance);
            logger.info(`Converted to ${fiatBalance} usd`);
            return fiatAmount;
        } catch {
            throw new UpstreamError();
        }
    } catch(e) { throwProperly(e) }
}

// Return the sum of all retrieved amounts in USD
export async function netWorth(balances) {
    try {
        if (!balances) throw new ArgError();
        let response = {};
        let net = 0.0;

        logger.info("Calculating net worth from passed amounts...");
        for (const [asset, balance] of balances) {
            const fiat = await toFiat(asset, balance);
            if (!fiat) throw new UpstreamError();
            Object.values(fiat).forEach(value => {
                let num = Number(value);
                net += num;
            });
        }

        response["net"] = String(net);
        logger.info(`Net worth is ${net} usd`);
        return response;
    } catch(e) { throwProperly(e) }
}