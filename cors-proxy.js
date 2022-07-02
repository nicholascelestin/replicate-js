import express from 'express'
import  {createProxyMiddleware}  from 'http-proxy-middleware';
// import {REPLICATE_TOKEN} from './auth.js'

// Configuration
const API_SERVICE_URL = "https://api.replicate.com";

const appendAuthHeaders = (proxyReq) => {
    proxyReq.setHeader('Authorization', `Token ${YOUR_TOKEN}`)
}

const onProxyRes = (proxyRes) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Headers'] = '*';
    delete proxyRes.headers['content-type']; 
}

const app = express();
app.use(
    '/',
    createProxyMiddleware({
        router: (req) => req.originalUrl.replace('/', ''),
        changeOrigin: true,
        pathRewrite: {'.*' : ''},
        onProxyReq: appendAuthHeaders,
        onProxyRes: onProxyRes
    })
);
app.listen(3000);
