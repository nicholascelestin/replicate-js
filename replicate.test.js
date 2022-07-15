import test from 'ava';
import Replicate from './replicate.js';
import {HTTPClient} from './replicate.js'

// Takes an object of shape {httpVerb: [response1, response2], ...}
// And mocks a client with methods that returns responses in that order
class MockHttpClient {
    constructor(httpResponseMocks){
        for (const [httpVerb, mockedResponse] of Object.entries(httpResponseMocks)) {
            httpVerb
            mockedResponse
            let timelineOfResponses = mockedResponse instanceof Array ? mockedResponse : [mockedResponse];
            let currentResponseIndex = 0;
            let mockedHttpFunction = () => 
                this[`${httpVerb}Response`][this[`${httpVerb}Index`]++]
            this[httpVerb] = mockedHttpFunction;
            this[`${httpVerb}Index`] = currentResponseIndex;
            this[`${httpVerb}Response`] = timelineOfResponses;
          }
    }
}

test('complains if no token or proxy url provided', t => {
    let error = t.throws(noop => new Replicate());
    t.is(error.message, 'Missing Replicate token');
})

test('accepts a manual token', t => {
    t.truthy(new Replicate({ 'token': 'abctoken' }))
})

test('accepts an environment variable token', t => {
    globalThis.process.env.REPLICATE_API_TOKEN = 'abctoken'
    t.truthy(new Replicate())
    globalThis.process.env.REPLICATE_API_TOKEN = undefined;
})

test('accepts a proxy url in lieu of a token', t => {
    t.truthy(new Replicate({ 'proxyUrl': 'http://localhost.com:3000' }))
})

test('fetches details of a model', async t => {
    let client = new MockHttpClient({get: { results: [{ id: "1" }] }})
    let replicate = new Replicate({ httpClient: client, token: 'abctoken' })
    let model = await replicate.models.get('kuprel/min-dalle');
    t.is(model.modelDetails.id, "1")
})

test('fetches details of a model of a specific version', async t => {
    let client = new MockHttpClient({get: { results: [{ id: "1" }] }})
    let replicate = new Replicate({ httpClient: client, token: 'abctoken' })
    let model = await replicate.models.get('kuprel/min-dalle','1');
    t.is(model.modelDetails.id, "1")
})

test('makes a prediction', async t => {
    let client = new MockHttpClient({
        get: [
            { results: [{ id: "1" }] }, // response for /versions
            {status: 'succeeded', output: 'expectedoutput'} // for predictions/{id}
        ],
        post: { status: 'starting' }
    })
    let replicate = new Replicate({ httpClient: client, token: 'abctoken', pollingInterval: 1 })
    let model = await replicate.models.get('kuprel/min-dalle');
    let prediction = await model.predict();
    t.is(prediction, "expectedoutput")
})


test('built-in http client gets & posts', async t => {
    globalThis.fetch = (calledUrl, usedOptions) => Promise.resolve({json: ()=> [calledUrl, usedOptions]});
    let httpClient = new HTTPClient({proxyUrl: 'http://localhost:3000', token: 'abctoken'});

    var [calledUrl, usedOptions] = await httpClient.get('/versions');
    t.is(calledUrl,'http://localhost:3000/https://api.replicate.com/v1/versions')
    t.is(usedOptions.headers.Authorization, 'Token abctoken')

    var [calledUrl, usedOptions] = await httpClient.post('/predictions', {});
    t.is(usedOptions.body, '{}') //?
})



