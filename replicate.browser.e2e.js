import test from 'ava';
import HeadlessBrowser from './lib/headless-browser.js';
import {fork} from 'child_process'

test.before('start proxy server', async (t) => {
    const process = fork('cors-proxy.js', { silent: true });
    t.context.proxy = await new Promise((resolve, reject) => {
        process.on('message', (message) => message == 'ready' ? resolve(process) : reject('failed to start'))
    });

});
test.before('start browser', async(t) => t.context.browser = await HeadlessBrowser.startBrowser())

const browser = test.macro(async (t, testFunction) => {
    const browser = t.context.browser;
    browser.serveJavascriptFile('replicate.js')
    return await browser.runScript(testFunction, t);
})

test('calls the hello world model', browser, async (t) => {
    const Replicate = (await import("http://replicate.js"))['default'];
    const replicate = new Replicate({ proxyUrl: 'http://localhost:3000/api', pollingInterval: 1000 });
    const model = await replicate.models.get('replicate/hello-world');
    const prediction = await model.predict({ text: "test" });
    t.log('hello world prediction:', prediction);
    t.is(prediction, 'hello test');
})

test.after.always('stop proxy server', async (t) => t.context.proxy.kill())
test.after.always('stop browser', async(t) => t.context.browser.close())


