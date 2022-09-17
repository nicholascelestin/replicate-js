// Default configuration
const BASE_URL = "https://api.replicate.com/v1";
const DEFAULT_POLLING_INTERVAL = 5000;
// Utility functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
export class Replicate {
    constructor({ token, proxyUrl, httpClient, pollingInterval } = {}) {
        this.token = token;
        this.baseUrl = proxyUrl ? `${proxyUrl}/${BASE_URL}` : BASE_URL;
        this.httpClient = httpClient;
        this.pollingInterval = pollingInterval;
        // Uses some lesser-known operators to make null-safety easy
        this.pollingInterval || (this.pollingInterval = DEFAULT_POLLING_INTERVAL);
        this.token || (this.token = isNode ? process?.env?.REPLICATE_API_TOKEN : null);
        if (!this.token && !proxyUrl)
            throw new Error("Missing Replicate token");
        if (!this.httpClient)
            this.httpClient = new DefaultFetchHTTPClient(this.token);
        this.models = {
            get: (path, version = null) => ReplicateModel.fetch({ path, version, replicate: this }),
        };
    }
    async getModel(path) {
        return await this.callHttpClient({
            url: `/models/${path}/versions`,
            method: "get",
            event: "getModel",
        });
    }
    async getPrediction(id) {
        return await this.callHttpClient({
            url: `/predictions/${id}`,
            method: "get",
            event: "getPrediction",
        });
    }
    async startPrediction(modelVersion, input, webhookCompleted=null) {
        return await this.callHttpClient({
            url: "/predictions",
            method: "post",
            event: "startPrediction",
            body: { version: modelVersion, input: input, webhook_completed: webhookCompleted },
        });
    }
    async callHttpClient({ url, method, event, body }) {
        return await this.httpClient[method]({
            url: `${this.baseUrl}${url}`,
            method,
            event,
            body,
            token: this.token,
        });
    }
}
export class ReplicateModel {
    static async fetch(options) {
        const model = new ReplicateModel(options);
        await model.getModelDetails();
        return model;
    }
    constructor({ path, version, replicate }) {
        this.path = path;
        this.version = version;
        this.replicate = replicate;
    }
    async getModelDetails() {
        const response = await this.replicate.getModel(this.path);
        const modelVersions = response.results;
        const mostRecentVersion = modelVersions[0];
        const explicitlySelectedVersion = modelVersions.find((m) => m.id == this.version);
        this.modelDetails = explicitlySelectedVersion ? explicitlySelectedVersion : mostRecentVersion;
        if (this.version && this.version !== this.modelDetails.id) {
            console.warn(`Model (version:${this.version}) not found, defaulting to ${mostRecentVersion.id}`);
        }
    }
    async *predictor(input) {
        const startResponse = await this.replicate.startPrediction(this.modelDetails.id, input);
        let predictionStatus;
        do {
            const checkResponse = await this.replicate.getPrediction(startResponse.id);
            predictionStatus = checkResponse.status;
            await sleep(this.replicate.pollingInterval);
            // TODO: only yield if there is a new prediction
            yield checkResponse.output;
        } while (["starting", "processing"].includes(predictionStatus));
    }
    async predict(input = "") {
        let prediction;
        for await (prediction of this.predictor(input)) {
            // console.log(prediction);
        }
        return prediction;
    }
}
// This class just makes it a bit easier to call fetch -- interface similar to the axios library
export class DefaultFetchHTTPClient {
    constructor(token) {
        this.headers = {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        };
    }
    // This class uses fetch, which is still experimental in Node 18, so we import a polyfill for Node if fetch is not defined
    async importFetch() {
        if (isNode && !globalThis.fetch)
            globalThis.fetch = (await import("node-fetch"))["default"];
    }
    async get({ url }) {
        await this.importFetch();
        const response = await fetch(url, { headers: this.headers });
        return await response.json();
    }
    async post({ url, body }) {
        await this.importFetch();
        const fetchOptions = {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        };
        const response = await fetch(url, fetchOptions);
        return await response.json();
    }
}
export default Replicate;
