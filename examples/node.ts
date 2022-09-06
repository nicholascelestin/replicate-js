// @ts-nocheck

import Replicate from "../replicate.js";

// Set REPLICATE_API_TOKEN environment variable before running.
let replicate = new Replicate();

// Hello World - Sanity Test
let helloWorldModel = await replicate.models.get("replicate/hello-world");
let helloWorldPrediction = await helloWorldModel.predict({ text: "test" });
console.log(helloWorldPrediction); // 'hello test'

// Laion Erlich - Generate Logo From Prompt
let erlichModel = await replicate.models.get("laion-ai/erlich");
let erlichPredictor = erlichModel.predictor({
  prompt: "test",
  steps: 50,
  intermediate_outputs: true,
  batch_size: 2,
});
let erlichPrediction;
for await (let prediction of erlichPredictor) {
  console.log(prediction); // null, [['https://replicate.com/api/models/laion-ai/erlich/files/c5a555c9-5dbc-42eb-a378-b67f80011ac6/current_0.png','https://replicate.com/api/models/laion-ai/erlich/files/2fba769b-1ecc-4be3-a0fb-864c8d659f6c/current_1.png'], ['https://replicate.com/api/models/laion-ai/erlich/files/0f921335-fe50-4d31-a612-ecffd19c08e5/current_0.png','https://replicate.com/api/models/laion-ai/erlich/files/2f593a06-3f29-4986-b0ef-c3b533e87ad1/current_1.png']]

  erlichPrediction = prediction ? prediction[0] : null;
}

// SwinIR - Upscale Generated Image
let swinModel = await replicate.models.get("jingyunliang/swinir");
let swinPrediction = await swinModel.predict({ image: erlichPrediction[0] });
console.log(swinPrediction); // {file: 'https://replicate.com/api/models/jingyunliang/swinir/files/0d95b680-b8c4-4cf0-a590-8f1f01dfda72/out.png'}

// DALLE MINI + SWIN IR
let dalleMiniModel = await replicate.models.get("kuprel/min-dalle");
let dalleMiniImage = await dalleMiniModel.predict({
  text: "avocado armchair",
  grid_size: 1,
});
let upscaledImage = await swinModel.predict({ image: dalleMiniImage.pop() });
console.log(upscaledImage); //0: {file: 'https://replicate.com/api/models/jingyunliang/…/721dffa9-6914-4dbc-935a-6118d9b98788/out.png'}
