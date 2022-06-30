import express from 'express'
import {createProxyMiddleware}  from 'http-proxy-middleware';
// NEVER commit your Replicate token to any repositories
const REPLICATE_TOKEN = 'YOUR TOKEN HERE'

// Configuration
const API_SERVICE_URL = "/api";

const appendAuthHeaders = (proxyReq) => {
    proxyReq.setHeader('Authorization', `Token ${REPLICATE_TOKEN}`)
}

function onProxyRes(proxyRes) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Headers'] = '*';
    delete proxyRes.headers['content-type']; 
}

const app = express();

app.use(
    '/',
    createProxyMiddleware({
        target: API_SERVICE_URL,
        pathRewrite: {'^/' : ''},
        changeOrigin: true,
        onProxyReq: appendAuthHeaders,
        onProxyRes: onProxyRes
    })
);

app.listen(3000);
