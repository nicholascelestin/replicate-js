const BASE_URL = "https://api.replicate.com/v1"
const DEFAULT_POLLING_INTERVAL = 5000

const sleep = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms))
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

// This code uses fetch, which is still experimental in Node 18, so we import a polyfill for Node
if(isNode)
    globalThis.fetch = (await import('node-fetch'))['default'];

class Replicate {

    constructor({token, proxyUrl, httpClient, pollingInterval} = {}) {
        this.token = token;
        this.proxyUrl = proxyUrl;
        this.httpClient = httpClient;
        this.pollingInterval = pollingInterval;
        
         // Uses some lesser-known operators to make null-safety easy
        this.pollingInterval ||= DEFAULT_POLLING_INTERVAL;
        this.token ||= (isNode) ? process?.env?.REPLICATE_API_TOKEN : null;
        if (!this.token && !this.proxyUrl)
            throw new Error('Missing Replicate token')

        // Depedency injection for tests
        if(!this.httpClient)
            this.httpClient = new HTTPClient({proxyUrl: this.proxyUrl, token: this.token});
        
        // Syntax sugar to support replicate.models.get()
        this.models = { get: this.getModel.bind(this) }
    }

    async getModel(path, version) {
        return await Model.fetch({ path: path, version: version, replicate: this});
    }
}

class Model {
    
    static async fetch(options){
        const model = new Model(options);
        await model.getModelDetails();
        return model;
    }
    
    constructor({path, version, replicate}) {
        this.path = path;
        this.version = version;
        this.httpClient = replicate.httpClient;
        this.pollingInterval = replicate.pollingInterval;
    }

    async getModelDetails() {
        const response = await this.httpClient.get(`/models/${this.path}/versions`);
        const modelVersions = response.results;
        const mostRecentVersion = modelVersions[0];
        const explicitlySelectedVersion = modelVersions.find((m) => m.id == this.version);
        this.modelDetails = explicitlySelectedVersion ? explicitlySelectedVersion : mostRecentVersion;
        if(this.version && this.version !== this.modelDetails.id){
            console.warn(`Model (version:${this.version}) not found, defaulting to ${mostRecentVersion.id}`);
        }
    }

    async *predictor(input) {
        const predictionId = await this.startPrediction(input);
        let predictionStatus;
        do {
            const checkResponse = await this.httpClient.get(`/predictions/${predictionId}`)
            predictionStatus = checkResponse.status;
            await sleep(this.pollingInterval);
            // TODO: only yield if there is a new prediction
            yield checkResponse.output;
        } while (['starting', 'processing'].includes(predictionStatus))
    }

    async startPrediction(input) {
        const startRequest = { "version": this.modelDetails.id, "input": input };
        const prediction = await this.httpClient.post(`/predictions`, startRequest);
        return prediction.id;
    }

    async predict(input) {
        let prediction;
        for await (prediction of this.predictor(input)) {
            // console.log(prediction);
        }
        return prediction;
    }
}

// This class just makes it a bit easier to call fetch -- interface similar to the axios library
export class HTTPClient{

    constructor({proxyUrl, token}){
        this.baseUrl = proxyUrl ? `${proxyUrl}/${BASE_URL}` : BASE_URL;
        this.headers = {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json', 
            'Accept': 'application/json' 
        }
    }

    async get(url){
        const response = await fetch(`${this.baseUrl}${url}`, { headers: this.headers });
        return await response.json();
    }

    async post(url, body){
        const fetchOptions = { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
        const response = await fetch(`${this.baseUrl}${url}`, fetchOptions);
        return await response.json();
    }
}

export default Replicate