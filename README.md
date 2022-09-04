# Replicate Javascript client

This is a Javacript client for Replicate, written in TypeScript. It lets you run models from your browser, from node, or from a web worker. It is promise-based and designed with async / await in mind.

# Getting Started

You can run a model and get its output:

## From A Browser

```html
<script type="module">
// You can specify a specific version, branch, or sha: e.g. "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@0.0.6/replicate.js"
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js/replicate.js"

// NEVER put your token in any publically accessible client-side Javascript
// Instead, use a proxy-- see Authentication section below
const replicate = new Replicate({proxyUrl: 'http://localhost:3000/api'});

const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction);
</script>
```

## From Node

`npm install github:nicholascelestin/replicate-js`

`npm install node-fetch`

Works with Node v16 and up.

Depends on node-fetch.

Uses ES6-style module imports. Either set `type` to `module` in your package.json file or use a `.mjs` file extension.

```javascript
import Replicate from 'replicate-js'

const replicate = new Replicate({token: 'YOUR_TOKEN'});

// If you set the REPLICATE_API_TOKEN environment variable, you do not need to provide a token to the constructor.
// const replicate = new Replicate();

const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction);
```

# Usage

You can run a model and feed the output into another model:

```javascript
const dalleMiniModel = await replicate.models.get('kuprel/min-dalle')
const dalleMiniImage = await dalleMiniModel.predict({text: "avocado armchair", grid_size: 1});
const upscaledImage = await swinModel.predict({image: dalleMiniImage.pop()})
console.log(upscaledImage);
```

Run a model and get its output while it's running:

```javascript
const erlichModel = await replicate.models.get('laion-ai/erlich');
const erlichPredictor = erlichModel.predictor({ prompt: "test", steps: 50, intermediate_outputs: true, batch_size:2});
for await(let prediction of erlichPredictor){
    console.log(prediction);
}
```

By default, `model.predict()` uses the latest version. If you want to pin to a particular version, you can get a version with its ID:

```javascript
const model = await replicate.models.get("replicate/hello-world")
const versionedModel = await replicate.models.get("replicate/hello-world","5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa");
```

By default,`new Replicate()` sets a polling interval of 5s. If you want it to poll at a diferent rate, you can set that option:

```javascript
const replicate = new Replicate({pollingInterval: 1000});
const model = await replicate.models.get("replicate/hello-world")
// Until finished, checks for new predictions every 1 second
const prediction = await replicate.predict({ text: "test"});
```

# Advanced Usage

If you want to fetch a model's details directly, you can do so and handle the response data from the Replicate HTTP API yourself:

```javascript
const modelName = 'replicate/hello-world'
const response = await replicate.getModel(modelName);
const mostRecentVersion = response.results[0].id;
```

If you know the specific version of the model you want to call, you can start a prediction directly and handle the response yourself:

```javascript
const mostRecentVersion = '5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa'
const response = await replicate.startPrediction(modelVersion, {text: "avocado armchair"});
const predictionId = response.id;
```

If you know the id of a prediction you want to get the status of, you can do so directly and handle the response yourself:

```javascript
const predictionId = 'n5eiqe47djb5bg53f35tsyzls5';
const response = replicate.getPrediction(predictionId);
```

By default, this library uses fetch (polyfilled with node-fetch in node < 18), but you can override this behavior and use your own HTTP client by defining your own get and post methods.

These methods are called whenever an HTTP request (get or post) would be made, assuming that you will make the actual request yourself with the provided `url` and `body` (for post requests). Methods must be asynchronous and must return the JSON response body.

`token` is available for use in headers. `event` is is a string specifying the context under which an HTTP request is made. Possible values are: 

* getModel - When fetching model details.
* startPrediction - When starting a new prediction.
* getPrediction - When checking the status of a prediction (ocurrs regularly due to polling)

```javascript
// Example using axios instead of fetch
import axios from 'axios';

const httpClient = {
    // Method arguments use object destructuring
    // All arguments are optional, can be in any order, but cannot be renamed
    get: async ({url, token, event}) => {
        const response = await axios.get(url, {headers: {'Authorization': `Token ${token}`}})
        console.log(`Handling ${event} event`); // Possible values: getModel, getPrediction
        return response.data;
    },
    post: async ({url, body, token, event}) => {
        const response = await axios.post(url, body, {headers: {'Authorization': `Token ${token}`}})
        console.log(`Handling ${event} event`); // Possible values: startPrediction
        return response.data;
    }
}
const replicateAxios = new Replicate({pollingInterval:5000, httpClient: httpClient});
const model = await replicateAxios.models.get("replicate/hello-world") // getModel event
const prediction = await model.predict({ text: "test"});// startPrediction, getPrediction events

```

# Installation

## For Node

`npm install github:nicholascelestin/replicate-js`

`npm install node-fetch`

## For A Browser

```html
<script type="module">
// You can specify a specific version, branch, or sha: e.g. "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@0.0.6/replicate.js"
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js/replicate.js"
</script>
```

## Authentication

## For Node

In a Node.js environment, you can set the `REPLICATE_API_TOKEN` environment variable to your API token. 
For example, by running this before any Javascript that uses the API: `export REPLICATE_API_TOKEN=<your token>`.

Alternatively, you can pass your API token directly to the Replicate constructor. This takes precendence over the environment variable.

```javascript
const replicate = new Replicate({token: 'YOUR_TOKEN'});
```

## For A Browser

This library will work in a browser, but:

* You should NEVER expose your API token in any publically accessible client-side Javascript.
* You should NEVER use the unmodified proxy in this repo in a public environment, and certainly not a production environment.

If you do so, you run the risk of your API token being stolen or being charged for unauthorized usage.

However, for private development and testing, you can use the lightweight proxy bundled in this repository. A proxy is necessary to avoid CORS issues with the Replicate HTTP API.

`export REPLICATE_API_TOKEN=<your token>`

`node ./cors-proxy.js`

```html
<script type="module">
    import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js/replicate.js"
    let replicate = new Replicate({proxyUrl: 'http://localhost:3000/api'});
</script>
```
