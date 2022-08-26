import test from "ava";
import Replicate, { DefaultFetchHTTPClient } from "./replicate.js";
import axios from "axios";

// Set REPLICATE_API_TOKEN environment variable before running.
const replicate = new Replicate({ pollingInterval: 5000 });

test("calls the hello world model", async (t) => {
  const helloWorldModel = await replicate.models.get("replicate/hello-world");
  const helloWorldPrediction = await helloWorldModel.predict({ text: "test" });
  t.log("Result", helloWorldPrediction);
  t.is(helloWorldPrediction, "hello test");
});

test("calls the hello world model with axios", async (t) => {
  const httpClient: DefaultFetchHTTPClient = {
    // Method arguments use object destructuring
    // All arguments are optional, can be in any order, but cannot be renamed
    get: async ({ url, token, event }) => {
      const response = await axios.get(url, {
        headers: { Authorization: `Token ${token}` },
      });
      t.log(`Handling ${event} event`); // Possible values: getModel, getPrediction
      return response.data;
    },
    post: async ({ url, body, token, event }) => {
      const response = await axios.post(url, body, {
        headers: { Authorization: `Token ${token}` },
      });
      t.log(`Handling ${event} event`); // Possible values: startPrediction
      return response.data;
    },
  } as any;
  const replicateAxios = new Replicate({
    pollingInterval: 5000,
    httpClient: httpClient,
  });
  const model = await replicateAxios.models.get("replicate/hello-world"); // getModel event
  const prediction = await model.predict({ text: "test" }); // startPrediction, getPrediction events
  t.log("Result", prediction);
  t.is(prediction, "hello test");
});

test("calls the min-dalle model", async (t) => {
  const dalleMiniModel = await replicate.models.get("kuprel/min-dalle");
  const dalleMiniImage = await dalleMiniModel.predict({
    text: "avocado armchair",
    grid_size: 1,
  });
  t.log("Result", dalleMiniImage);
  t.assert(dalleMiniImage.length > 0);
});

test("calls the laion erlich model iteratively", async (t) => {
  const erlichModel = await replicate.models.get("laion-ai/erlich");
  const erlichPredictor = erlichModel.predictor({
    prompt: "test",
    steps: 25,
    intermediate_outputs: true,
    batch_size: 2,
  });
  let i = 1;
  for await (var prediction of erlichPredictor) {
    let numPredictions = prediction instanceof Array ? prediction.length : 0;
    t.log(`Prediction sets at polling step ${i++}: ${numPredictions}`);
  }
  t.log("Result", prediction);
  t.assert(prediction.length > 0);
});

let mostRecentModelVersion, predictionId;
test.serial("fetches details for the hello world model directly", async (t) => {
  const modelName = "replicate/hello-world";
  const response = await replicate.getModel(modelName);
  mostRecentModelVersion = response.results[0].id;
  t.log(
    `Fetched details for model ${modelName}, most recent version: ${mostRecentModelVersion}`
  );
  t.assert(mostRecentModelVersion.length > 0);
});

test.serial("starts a hello world prediction directly", async (t) => {
  const response = await replicate.startPrediction(mostRecentModelVersion, {
    text: "directly",
  });
  predictionId = response.id;
  t.log(
    `Started prediction for ${mostRecentModelVersion}, prediction id: ${predictionId}`
  );
  t.assert(predictionId.length > 0);
});

test.serial("gets a hello world prediction directly", async (t) => {
  const response = await replicate.getPrediction(predictionId);
  t.log(
    `Got details for prediction ${predictionId}, status: ${response.status}`
  );
  t.assert(response.status.length > 0);
});
