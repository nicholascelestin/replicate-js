import test from 'ava';
import Replicate from './replicate.js'

// Set REPLICATE_API_TOKEN environment variable before running.
const replicate = new Replicate({pollingInterval: 5000});

test('calls the hello world model', async t => {
    const helloWorldModel = await replicate.models.get('replicate/hello-world');
    const helloWorldPrediction = await helloWorldModel.predict({ text: "test"});
    t.log('Result', helloWorldPrediction);
    t.is(helloWorldPrediction, 'hello test');
})

test('calls the min-dalle model', async t => {
    const dalleMiniModel = await replicate.models.get('kuprel/min-dalle')
    const dalleMiniImage = await dalleMiniModel.predict({text: "avocado armchair", grid_size: 1});
    t.log('Result', dalleMiniImage);
    t.assert(dalleMiniImage.length > 0);
})

test('calls the laion erlich model iteratively', async t => {
    const erlichModel = await replicate.models.get('laion-ai/erlich');
    const erlichPredictor = erlichModel.predictor({ prompt: "test", steps: 25, intermediate_outputs: true, batch_size:2});
    let i = 1;
    for await(var prediction of erlichPredictor){
        let numPredictions = prediction instanceof Array ? prediction.length : 0;
        t.log(`Prediction sets at polling step ${i++}: ${numPredictions}`);
    }
    t.log('Result', prediction);
    t.assert(prediction.length > 0);
})
