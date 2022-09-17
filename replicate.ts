// Default configuration
const BASE_URL = "https://api.replicate.com/v1";
const DEFAULT_POLLING_INTERVAL = 5000;

// Utility functions
const sleep: (ms: number) => Promise<void> = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
const isNode: boolean =
  typeof process !== "undefined" && process.versions != null && process.versions.node != null;

// Replicate class
export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";
export type PredictionInput = string | Record<string, any> | any[];
export type PredictionOutput = PredictionInput;
export interface ReplicateInputProps {
  token?: string;
  baseUrl?: string;
  proxyUrl?: string;
  httpClient?: HTTPClient;
  pollingInterval?: number;
}
export interface Replicate extends ReplicateInputProps {}

export class Replicate {
  models: {
    get: (path: string, version?: string) => Promise<ReplicateModel>;
  };
  constructor({ token, proxyUrl, httpClient, pollingInterval }: ReplicateInputProps = {}) {
    this.token = token;
    this.baseUrl = proxyUrl ? `${proxyUrl}/${BASE_URL}` : BASE_URL;
    this.httpClient = httpClient;
    this.pollingInterval = pollingInterval;

    // Uses some lesser-known operators to make null-safety easy
    this.pollingInterval ||= DEFAULT_POLLING_INTERVAL;
    this.token ||= isNode ? process?.env?.REPLICATE_API_TOKEN : null;

    if (!this.token && !proxyUrl) throw new Error("Missing Replicate token");

    if (!this.httpClient) this.httpClient = new DefaultFetchHTTPClient(this.token);

    this.models = {
      get: (path, version = null) => ReplicateModel.fetch({ path, version, replicate: this }),
    };
  }

  async getModel(path: string) {
    return await this.callHttpClient({
      url: `/models/${path}/versions`,
      method: "get",
      event: "getModel",
    });
  }

  async getPrediction(id: string) {
    return await this.callHttpClient({
      url: `/predictions/${id}`,
      method: "get",
      event: "getPrediction",
    });
  }

  async startPrediction(modelVersion: string, input: PredictionInput, webhookCompleted: string = null) {
    return await this.callHttpClient({
      url: "/predictions",
      method: "post",
      event: "startPrediction",
      body: { version: modelVersion, input: input, webhook_completed: webhookCompleted },
    });
  }

  protected async callHttpClient({ url, method, event, body }: HTTPClientRequest) {
    return await this.httpClient[method]({
      url: `${this.baseUrl}${url}`,
      method,
      event,
      body,
      token: this.token,
    });
  }
}

// Model class
export interface ReplicateModelInputs {
  path: string;
  version: string;
  replicate?: any;
  modelDetails?: any;
}
export interface ReplicateModel extends ReplicateModelInputs {}
export class ReplicateModel {
  static async fetch(options: ReplicateModelInputs): Promise<ReplicateModel> {
    const model = new ReplicateModel(options);
    await model.getModelDetails();
    return model;
  }

  constructor({ path, version, replicate }: ReplicateModelInputs) {
    this.path = path;
    this.version = version;
    this.replicate = replicate;
  }

  async getModelDetails() {
    const response = await this.replicate.getModel(this.path);
    const modelVersions = response.results;
    const mostRecentVersion = modelVersions[0];
    const explicitlySelectedVersion = modelVersions.find(
      (m: { id: string }) => m.id == this.version
    );
    this.modelDetails = explicitlySelectedVersion ? explicitlySelectedVersion : mostRecentVersion;
    if (this.version && this.version !== this.modelDetails.id) {
      console.warn(
        `Model (version:${this.version}) not found, defaulting to ${mostRecentVersion.id}`
      );
    }
  }

  async *predictor(input: PredictionInput) {
    const startResponse = await this.replicate.startPrediction(this.modelDetails.id, input);
    let predictionStatus: PredictionStatus;
    do {
      const checkResponse = await this.replicate.getPrediction(startResponse.id);
      predictionStatus = checkResponse.status;
      await sleep(this.replicate.pollingInterval);
      // TODO: only yield if there is a new prediction
      yield checkResponse.output;
    } while (["starting", "processing"].includes(predictionStatus));
  }

  async predict(input: PredictionInput = "") {
    let prediction;
    for await (prediction of this.predictor(input)) {
      // console.log(prediction);
    }
    return prediction;
  }
}

// HTTP CLIENT
export interface HTTPClientRequest {
  url: string;
  method: "get" | "post";
  event: "getModel" | "startPrediction" | "getPrediction";
  body?: Record<string, any>;
}
interface HTTPClientAuthenticatedRequest extends HTTPClientRequest {
  token: string;
}
export interface HTTPClient {
  get: (request: HTTPClientAuthenticatedRequest) => Promise<any>;
  post: (request: HTTPClientAuthenticatedRequest) => Promise<any>;
}
// This class just makes it a bit easier to call fetch -- interface similar to the axios library
export class DefaultFetchHTTPClient implements HTTPClient {
  public headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  // This class uses fetch, which is still experimental in Node 18, so we import a polyfill for Node if fetch is not defined
  async importFetch() {
    if (isNode && !globalThis.fetch)
      globalThis.fetch = (await import("node-fetch"))["default"] as any;
  }

  async get({ url }: HTTPClientAuthenticatedRequest): Promise<any> {
    await this.importFetch();
    const response = await fetch(url, { headers: this.headers });
    return await response.json();
  }

  async post({ url, body }: HTTPClientAuthenticatedRequest): Promise<any> {
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
