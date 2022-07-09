const BASE_URL = "https://api.replicate.com/v1"
const POLLING_INTERVAL = 5000

const sleep = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms))
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

class Replicate {
    constructor(options) {
        this.token = options?.token;
        this.proxyUrl = options?.proxyUrl ?? '';

        if (!this.token && isNode && process?.env?.REPLICATE_API_TOKEN)
            this.token = process.env.REPLICATE_API_TOKEN;
        if (!this.token && !this.proxyUrl)
            throw 'Missing Replicate token'

        // Syntax sugar to support replicate.models.get()
        this.models = { get: this.getModel.bind(this) }
    }

    async getModel(path, version) {
        // This code uses fetch, which is still experimental in Node 18, so we import a polyfill for Node
        if(isNode)
            await import('node-fetch'); 
        this.httpClient = new HTTPClient({proxyUrl: this.proxyUrl, token: this.token});
        return await Model.fetch({ path: path, version: version, httpClient: this.httpClient});
    }
}

class Model {
    static async fetch(options){
        const model = new Model(options);
        await model.getModelDetails();
        return model;
    }
    
    constructor(options) {
        this.path = options.path;
        this.version = options.version;
        this.httpClient = options.httpClient;
    }

    async getModelDetails() {
        const response = await this.httpClient.get(`/models/${this.path}/versions`);
        const modelVersions = response.results;
        const mostRecentVersion = modelVersions[0];
        const explicitlySelectedVersion = modelVersions.find((m) => m.id == this.version);
        this.modelDetails = explicitlySelectedVersion ? explicitlySelectedVersion : mostRecentVersion;
    }

    async *predictor(input) {
        if (!this.modelDetails)
            await this.getModelDetails()

        let predictionId = await this.startPrediction(input);
        let predictionStatus;
        do {
            let checkResponse = await this.httpClient.get(`/predictions/${predictionId}`)
            predictionStatus = checkResponse.status;
            let latestPrediction = checkResponse.output;
            await sleep(POLLING_INTERVAL);
            yield latestPrediction;

        } while (['starting', 'processing'].includes(predictionStatus))
    }

    async startPrediction(input) {
        let startRequest = { "version": this.modelDetails.id, "input": input };
        let startResponse = await this.httpClient.post(`/predictions`, startRequest);
        let predictionId = startResponse.id;
        return predictionId;
    }

    async predict(input) {
        let predictor = this.predictor(input);
        let prediction;
        for await (prediction of predictor) {
            // console.log(prediction);
        }
        return prediction;
    }
}

// This class just makes it a bit easier to call fetch -- interface similar to the axios library
class HTTPClient{
    constructor(options){
        this.baseUrl = options.proxyUrl ? `${options.proxyUrl}/${BASE_URL}` : BASE_URL;
        this.headers = {
            'Authorization': `Token ${options.token}`,
            'Content-Type': 'application/json', 
            'Accept': 'application/json' 
        }
    }
    async get(url) {
        let response = await fetch(`${this.baseUrl}${url}`, { headers: this.headers });
        return await response.json();
    }
    async post(url, body){
        let fetchOptions = { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
        let response = await fetch(`${this.baseUrl}${url}`, fetchOptions);
        return await response.json();
    }
}

export default Replicate