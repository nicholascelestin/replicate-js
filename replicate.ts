const BASE_URL: string = "https://api.replicate.com/v1";
const DEFAULT_POLLING_INTERVAL: number = 5000;

const sleep: (ms: number) => Promise<void> = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
const isNode: boolean =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

export interface ReplicateProps {
  token?: string;
  baseUrl?: string;
  proxyUrl?: string;
  httpClient?: DefaultFetchHTTPClient;
  pollingInterval?: number;
  models?: {
    get: (path: string, version?: string) => Promise<Model>;
  };
}

export interface CustomRequest {
  url?: string;
  method?: "get" | "post";
  token?: string;
  event?: string;
  body?: Record<string, any>;
}

export class Replicate {
  public token: ReplicateProps["token"];
  public baseUrl: ReplicateProps["baseUrl"];
  public httpClient: ReplicateProps["httpClient"];
  public pollingInterval: ReplicateProps["pollingInterval"];
  public models: ReplicateProps["models"];

  constructor({
    token,
    proxyUrl,
    httpClient,
    pollingInterval,
  }: ReplicateProps = {}) {
    this.token = token;
    this.baseUrl = proxyUrl ? `${proxyUrl}/${BASE_URL}` : BASE_URL;
    this.httpClient = httpClient;
    this.pollingInterval = pollingInterval;

    // Uses some lesser-known operators to make null-safety easy
    this.pollingInterval ||= DEFAULT_POLLING_INTERVAL;
    this.token ||= isNode ? process?.env?.REPLICATE_API_TOKEN : null;

    if (!this.token && !proxyUrl) throw new Error("Missing Replicate token");

    if (!this.httpClient)
      this.httpClient = new DefaultFetchHTTPClient(this.token);

    // Syntax sugar to support replicate.models.get()
    this.models = {
      get: (path, version = null) =>
        Model.fetch({ path, version, replicate: this }),
    };
  }

  async callHttpClient({ url, method, event, body }: CustomRequest) {
    url = `${this.baseUrl}${url}`;
    return await this.httpClient[method]({
      url,
      event,
      body,
      token: this.token,
    });
  }

  async getModel(path: string) {
    const request: CustomRequest = {
      url: `/models/${path}/versions`,
      method: "get",
      event: "getModelDetails",
    };
    return await this.callHttpClient(request);
  }

  async getPrediction(id: string): Promise<any> {
    const request: CustomRequest = {
      url: `/predictions/${id}`,
      method: "get",
      event: "getPrediction",
    };
    return await this.callHttpClient(request);
  }

  async startPrediction(
    modelVersion: string,
    input: string | Record<string, any> | any[]
  ) {
    const body = { version: modelVersion, input: input };
    const request: CustomRequest = {
      url: "/predictions",
      method: "post",
      event: "startPrediction",
      body,
    };
    return await this.callHttpClient(request);
  }
}

export interface ModelProps {
  path: string;
  version: string;
  replicate?: any;
  modelDetails?: any;
}

export type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export class Model {
  public path: ModelProps["path"];
  public version: ModelProps["version"];
  public replicate: ModelProps["replicate"];
  public modelDetails: ModelProps["modelDetails"];

  static async fetch(options: ModelProps): Promise<Model> {
    const model = new Model(options);
    await model.getModelDetails();
    return model;
  }

  constructor({ path, version, replicate }: ModelProps) {
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
    this.modelDetails = explicitlySelectedVersion
      ? explicitlySelectedVersion
      : mostRecentVersion;
    if (this.version && this.version !== this.modelDetails.id) {
      console.warn(
        `Model (version:${this.version}) not found, defaulting to ${mostRecentVersion.id}`
      );
    }
  }

  async *predictor(input: string | Record<string, any> | any[]) {
    const startResponse = await this.replicate.startPrediction(
      this.modelDetails.id,
      input
    );
    let predictionStatus: PredictionStatus;
    do {
      const checkResponse = await this.replicate.getPrediction(
        startResponse.id
      );
      predictionStatus = checkResponse.status;
      await sleep(this.replicate.pollingInterval);
      // TODO: only yield if there is a new prediction
      yield checkResponse.output;
    } while (["starting", "processing"].includes(predictionStatus));
  }

  async predict(
    input: string | Record<string, any> | any[] = ""
  ): Promise<any> {
    let prediction: PredictionStatus;
    for await (prediction of this.predictor(input)) {
      // console.log(prediction);
    }
    return prediction;
  }
}

// This class just makes it a bit easier to call fetch -- interface similar to the axios library
export class DefaultFetchHTTPClient {
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

  async get({ url }: CustomRequest): Promise<any> {
    await this.importFetch();
    const response = await fetch(url, { headers: this.headers });
    return await response.json();
  }

  async post({ url, body }: CustomRequest): Promise<any> {
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
