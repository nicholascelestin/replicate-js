import test, { ExecutionContext as _ExecutionContext } from "ava";
import HeadlessBrowser from "./lib/headless-browser.js";
import { fork } from "child_process";

interface ExecutionContext extends _ExecutionContext {
  context: any;
}

test.before("start proxy server", async (t: ExecutionContext) => {
  const process = fork("cors-proxy.js", { silent: true });
  t.context.proxy = await new Promise((resolve, reject) => {
    process.on("message", (message) =>
      message == "ready" ? resolve(process) : reject("failed to start")
    );
  });
});
test.before(
  "start browser",
  async (t: ExecutionContext) =>
    (t.context.browser = await HeadlessBrowser.startBrowser())
);

const browser = test.macro(async (t: ExecutionContext, testFunction) => {
  const browser = t.context.browser;
  browser.serveJavascriptFile("replicate.js");
  return await browser.runScript(testFunction, t);
});

test("calls the hello world model", browser, async (t: ExecutionContext) => {
  // @ts-ignore
  const Replicate = (await import("http://replicate.js"))["default"];
  const replicate = new Replicate({
    proxyUrl: "http://localhost:3000/api",
    pollingInterval: 1000,
  });
  const model = await replicate.models.get("replicate/hello-world");
  const prediction = await model.predict({ text: "test" });
  t.log("hello world prediction:", prediction);
  t.is(prediction, "hello test");
});

test.after.always("stop proxy server", async (t: ExecutionContext) =>
  t.context.proxy.kill()
);
test.after.always("stop browser", async (t: ExecutionContext) =>
  t.context.browser.close()
);
