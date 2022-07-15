import Replicate from '../replicate.js'

// Set REPLICATE_API_TOKEN environment variable before running.
const replicate = new Replicate({pollingInterval: 1000});

// Hello World - Sanity Test
const helloWorldModel = await replicate.models.get('replicate/hello-world');
const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
console.log(helloWorldPrediction); // 'hello test'

// Laion Erlich - Generate Logo From Prompt
const erlichModel = await replicate.models.get('laion-ai/erlich');
const erlichPredictor = erlichModel.predictor({ prompt: "test", steps: 50, intermediate_outputs: true, batch_size:2});
let erlichPrediction;
for await(let prediction of erlichPredictor){
    console.log(prediction);// null, [['https://replicate.com/api/models/laion-ai/erlich/files/c5a555c9-5dbc-42eb-a378-b67f80011ac6/current_0.png','https://replicate.com/api/models/laion-ai/erlich/files/2fba769b-1ecc-4be3-a0fb-864c8d659f6c/current_1.png'], ['https://replicate.com/api/models/laion-ai/erlich/files/0f921335-fe50-4d31-a612-ecffd19c08e5/current_0.png','https://replicate.com/api/models/laion-ai/erlich/files/2f593a06-3f29-4986-b0ef-c3b533e87ad1/current_1.png']]
    
    erlichPrediction = prediction? prediction[0] : null;
}

// SwinIR - Upscale Generated Image
const swinModel = await replicate.models.get('jingyunliang/swinir');
const swinPrediction = await swinModel.predict({ image: erlichPrediction[0]});
console.log(swinPrediction); // {file: 'https://replicate.com/api/models/jingyunliang/swinir/files/0d95b680-b8c4-4cf0-a590-8f1f01dfda72/out.png'}

// DALLE MINI + SWIN IR
const dalleMiniModel = await replicate.models.get('kuprel/min-dalle')
const dalleMiniImage = await dalleMiniModel.predict({text: "avocado armchair", grid_size: 1});
const upscaledImage = await swinModel.predict({image: dalleMiniImage.pop()})
console.log(upscaledImage); //0: {file: 'https://replicate.com/api/models/jingyunliang/…/721dffa9-6914-4dbc-935a-6118d9b98788/out.png'}


