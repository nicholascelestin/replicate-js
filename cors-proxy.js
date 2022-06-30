import express from 'express'
import  {createProxyMiddleware}  from 'http-proxy-middleware';
import {REPLICATE_TOKEN} from './auth.js'

// Configuration
const API_SERVICE_URL = "https://api.replicate.com/v1/predictions";

const appendAuthHeaders = (proxyReq, req, res) => {
    console.log('appending auth');
    proxyReq.setHeader('Authorization', `Token ${REPLICATE_TOKEN}`)
}

function onProxyRes(proxyRes, req, res) {
    console.log('s auth');
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Headers'] = '*';
    delete proxyRes.headers['content-type']; 
}

const app = express();

app.use(
    '/api',
    createProxyMiddleware({
        target: API_SERVICE_URL,
        pathRewrite: {'^/api' : ''},
        changeOrigin: true,
        onProxyReq: appendAuthHeaders,
        onProxyRes: onProxyRes
    })
);

app.listen(3000);
