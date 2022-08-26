import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';

const puppeteerLaunchArgs = ["--disable-web-security", '--no-sandbox', '--disable-setuid-sandbox'];

export default class HeadlessBrowser {
    puppeteer;
    page;

    static async startBrowser() {
        const browser = new HeadlessBrowser();
        browser.puppeteer = await puppeteer.launch({ args:  puppeteerLaunchArgs});
        browser.page = await browser.puppeteer.newPage();
        await browser.page.setRequestInterception(true)
        browser.page.setDefaultNavigationTimeout(0);
        browser.onConsoleLog((message, type) => console.log(`(${type}): ${message}`))
        return browser;
    }

    async serveJavascriptFile(fileName, filePath = null){
        const javascriptFile = await fs.readFile(filePath ?? fileName, { encoding: 'utf-8' });
        this.addRequestInterceptor(fileName, { contentType: 'application/javascript', body: javascriptFile })
    }

    addRequestInterceptor(urlSearchString, newResponse) {
        this.page.on('request', req => {
            if (req.url().includes(urlSearchString))
                return req.respond(newResponse)
            req.continue()
        })
    }

    onConsoleLog(callback) { this.page.on('console', consoleObj => callback(consoleObj.text(), consoleObj.type())) }

    async runScript(fnToRun, context) {
        let serializedFunction;
        if(context) {
            await this.#exposeContextToBrowser(context)
            serializedFunction = new Function('context', `const fn = ${fnToRun.toString()}; return fn(window['context'])`)
        } else {
            serializedFunction = new Function('noop', `const fn = ${fnToRun.toString()}; return fn()`)
        }
        await this.page.evaluate(serializedFunction);
    }

    close() { this.puppeteer.close() }

    async #exposeContextToBrowser(context){
        await this.page.evaluate(() => {window['context'] = {}}, )
        for (const [key, val] of Object.entries(context)){
            if(typeof val !== 'function'){
                await this.page.evaluate((key, val) => {window['context'][key] = val}, key, val)
                continue;
            }
            const safeFnName = `_exposedFunction_${key}`;
            await this.page.exposeFunction(safeFnName, val)
            await this.page.evaluate((safeFnName, key) => {window['context'][key] = window[safeFnName]}, safeFnName, key)
        }
    }
}