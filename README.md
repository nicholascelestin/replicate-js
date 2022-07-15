# Replicate Javascript client

This is a Javacript client for Replicate. It lets you run models from your browser or node. It is promise-based and designed with async / await in mind.

# Getting Started

You can run a model and get its output:

## From A Browser

```html
<script type="module">
// replace @0.0.4 with @branch-name or @commit-sha for more specific version
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@0.0.4/replicate.js"

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

Depends on node-fetch.

Uses ES6-style module imports. Either set `type` to `module` in your package.json file or use a `.mjs` file extension

```javascript
import Replicate from 'replicate-js'

const replicate = new Replicate({token: 'YOUR_TOKEN'});

// If you set the REPLICATE_API_TOKEN environment variable, you do not need to provide a token to the constructor.
// const replicate = new Replicate();

const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction);
```

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

# Installation

## For Node

`npm install github:nicholascelestin/replicate-js`

`npm install node-fetch`

## For A Browser

```html
<script type="module">
// replace @main with @branch-name or @commit-sha for more specific version
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@0.0.4/replicate.js"
</script>
```

## Authentication

## For Node

In a Node.js environment, you can set the `REPLICATE_API_TOKEN` environment variable to your API token. 
For example, by running this before any Javascript that uses the API: `export REPLICATE_API_TOKEN=<your token>`.

You can also pass your API token directly to the Replicate constructor.

```javascript
const replicate = new Replicate({token: 'YOUR_TOKEN'});
```

## For A Browser

This library will work in a browser, but:

* You should NEVER expose your API token in any publically accessible client-side Javascript.
* You should NEVER use the unmodified proxy in this repo in a public environment, and certainly not a production environment.

If you do so, you run the risk of your API token being stolen or being charged for unauthorized usage.

However, for private development and testing, you can use the lightweight proxy bundled in this repository.

`export REPLICATE_API_TOKEN=<your token>`

`node ./cors-proxy.js`

```html
<script type="module">
    import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@0.0.4/replicate.js"
    let replicate = new Replicate({proxyUrl: 'http://localhost:3000/api'});
</script>
```
