import express from "express";
//@ts-ignore
import parser from "cookie-parser";
import { CSRF_HEADER, HuulkHttpMethods, ONE_DAY_IN_MS, CacheManagerImplementation } from "../HuulkTypes";
import { HuulkConfigurerFacade } from "./HuulkBuilder";
import { Huulk } from "../Huulk";
const ORIGIN_ONE = "http://localhost:7777";
const ORIGIN_TWO = "http://localhost:8888";
const INVALID_SESSION_STATUS_CODE = 777;
const TEST_API_PORT = 8765;
let TERMINATE = undefined;
beforeAll(() => {
    let testApi = express();
    let options = new HuulkConfigurerFacade()
        .startConfiguration()
        .buildCacheCredentials("localhost", "", "", 6379, "", CacheManagerImplementation.HUULK_REDIS)
        //@ts-ignore
        .buildThrottleOptions(true, 7000, ONE_DAY_IN_MS, 429, undefined)
        .buildCSRF(true)
        .buildCors([ORIGIN_ONE, ORIGIN_TWO], ["content-type", CSRF_HEADER], ["set-cookie", "content-type", CSRF_HEADER], HuulkHttpMethods.allMethods(), true)
        .buildCookieOptions(false, false, 50000, true)
        .buildSessions(true, true, 10, false, CacheManagerImplementation.HUULK_REDIS, true)
        .endConfiguration(INVALID_SESSION_STATUS_CODE, true);
    let testHuulk = new Huulk(options);
    testApi.use(parser);
    testApi.use(testHuulk.getCorsMiddleWare());
    testApi.use("/auth/*", testHuulk.getAuthMiddleWare());
    testApi.delete("/end", (req, res) => {
        if (TERMINATE !== undefined)
            TERMINATE();
    });
    let testApiServer = testApi.listen(TEST_API_PORT, () => console.log(`Test Api listening on port ${TEST_API_PORT}`));
    TERMINATE = testApiServer.close;
});
