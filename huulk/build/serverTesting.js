import express from "express";
import { Huulk } from "./Huulk.js";
//@ts-ignore
import parser from "cookie-parser";
import { CSRF_HEADER, HuulkHttpMethods, CacheManagerImplementation } from "./index.js";
import { createClient } from "redis";
import { HuulkConfigurerFacade } from "./testing/HuulkBuilder.js";
function startExpress() {
    let TEST_TERM = undefined;
    let app = express();
    let options = new HuulkConfigurerFacade()
        .startConfiguration()
        .buildCacheCredentials("localhost", "", "", 6379, "", CacheManagerImplementation.HUULK_REDIS)
        //@ts-ignore
        .buildThrottleOptions(true, 4, 30000, 429, undefined)
        .buildCSRF(false)
        .buildCors(["http://localhost:3000"], ["content-type", CSRF_HEADER], ["set-cookie", "content-type"], [HuulkHttpMethods.DELETE, HuulkHttpMethods.POST, HuulkHttpMethods.OPTIONS], true)
        .buildCookieOptions(false, true, 4000000, true)
        .buildSessions(true, true, 5, false, CacheManagerImplementation.HUULK_REDIS, true)
        .endConfiguration(400, true);
    let huulk = new Huulk(options);
    app.use(parser());
    //@ts-ignore
    app.use("/auth/*", huulk.getAuthMiddleWare());
    //@ts-ignore
    app.use("*", huulk.getCorsMiddleWare());
    app.use("*", huulk.getThrottleMiddleWare());
    app.post("/login", async (req, res) => {
        //@ts-ignore
        await huulk.createSessionLogin("test", req, res, { authorities: {} });
        res.end();
    });
    app.delete("/login", (req, res) => {
        //@ts-ignore
        huulk.deleteSessionLogout(req, res);
        res.end();
    });
    app.post("/auth", (req, res) => {
        //@ts-ignore
        res.end("You are authhed");
    });
    //@ts-ignore
    app.post("/auth/sessionUpdate", async (req, res) => {
        let session = req.huulkSession;
        let testSet = [0, 1];
        console.log("TESTSET UPDATE ---" + JSON.stringify(testSet));
        let ret = await huulk.updateAllUserSessionUserDataObjects(session.sessionUser.valueOf(), { userData: { authorities: testSet } });
        res.end(JSON.stringify(ret));
    });
    app.delete("/end", (req, res) => {
        if (TEST_TERM !== undefined) {
            res.end("Terminating application.");
            TEST_TERM();
        }
    });
    app.post("/headers", (req, res) => {
        let headers = req.headers;
        res.setHeader("Access-Control-Allow-Methods", ["GET", "POST", "PUT"]);
        res.end(JSON.stringify(headers));
    });
    app.get("/login", (req, res) => { res.end("hi"); });
    TEST_TERM = app.listen(9999, () => console.log("app listening on 9999")).close;
}
async function redisTesting() {
    let options = {};
    let client = createClient({
        url: 'redis://localhost:6379'
    });
    let sessionJson = {};
    await client.connect();
    console.log("connect finished");
    client.hSet("berin", "json", JSON.stringify(sessionJson)).then(async (resp) => {
        console.log(await client.hGet("berin", "json"));
    });
    //@ts-ignore
    client.hGet('berin', 'session').then(resp => {
        console.log(resp);
    });
}
//redisTesting();
startExpress();
let myset = new Map();
let dict = {};
dict["hi"] = "hello";
// Append new elements to the
// set using add() method
let set = new Set();
set.add(45);
myset = myset.set(23, 23);
myset = myset.set(23, 23);
console.log("TEST SET IN MAIN -------> " + JSON.stringify(set));
