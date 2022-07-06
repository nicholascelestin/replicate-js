# Replicate Javascript client

This is a Javacript client for Replicate. It lets you run models from your browser or node. It is promise-based and designed with async / await in mind.

You can run a model and get its output:

**From The Browser**
```html
<script type="module">
// replace @v0.0.2 with @branch-name or @commit-sha for more specific version
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@v0.0.2/replicate.js"

// NEVER put your token in any publically accessible client-side Javascript
// Instead, use a proxy-- see Authentication section below
const replicate = new Replicate({proxyUrl: 'http://localhost:3000/api'});

const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction);
</script>
```

**From Node**
`npm install github:nicholascelestin/replicate-js --save`

Uses ES6-style module imports. Either set `type` to `module` in your package.json file or use a `.mjs` file extension

```javascript
import Replicate from 'replicate-js'
// Set REPLICATE_API_TOKEN environment variable before running.
const replicate = new Replicate({token: 'YOUR_TOKEN'});

const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction);
```

You can run a model and feed the output into another model:

```javascript
const model1 = await replicate.models.get('kuprel/min-dalle')
const image = await model1.predict({text: "avocado armchair", grid_size: 1});
const model2 = await replicate.models.get("jingyunliang/swinir");
const upscaledImage = await model2.predict({image: image})
console.log(upscaledImage);
```

Run a model and get its output while it's running:

```javascript
const erlichModel = await replicate.models.get('laion-ai/erlich');
const erlichPredictor = erlichModel.predictor({ prompt: "test", steps: 50, intermediate_outputs: true, batch_size:2});
for await(const prediction of erlichPredictor){
    console.log(prediction);
}
```

By default, `model.predict()` uses the latest version. If you want to pin to a particular version, you can get a version with its ID:

```javascript
const model = await replicate.models.get("replicate/hello-world")
const versionedModel = await replicate.models.get("replicate/hello-world","5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa");
```

## Installation

**Node**
`npm install github:nicholascelestin/replicate-js --save`

**Browser**
```html
<script type="module">
// replace @main with @branch-name or @commit-sha for more specific version
import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@v0.0.2/replicate.js"
</script>
```

## Authentication

**Node**
In a Node.js environment, you can set the `REPLICATE_API_TOKEN` environment variable to your API token. For example, by running this before any Javascript that uses the API: `export REPLICATE_API_TOKEN=<your token>`.

You can also pass your API token directly to the Replicate constructor.

```javascript
const replicate = new Replicate({token: 'YOUR_TOKEN'});
```

**Browser**
Never expose your API token in any publicly accessible client-side Javascript. Instead, use a lightweight proxy server.

`export REPLICATE_API_TOKEN=<your token>`

`node ./cors-proxy.js`

```html
<script type="module">
    import Replicate from "https://cdn.jsdelivr.net/gh/nicholascelestin/replicate-js@main/replicate.js"
    const replicate = new Replicate({proxyUrl: 'http://localhost:3000/api'});
</script>
```
