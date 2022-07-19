import { HuulkCorsRegistry } from "../cors/CorsRegistry";
import { CSRF_HEADER, HuulkHttpMethods, ONE_DAY_IN_MS, CacheManagerImplementation } from "../HuulkTypes";
import { HuulkConfigurerFacade } from "./HuulkBuilder";
import { mockEmptyNodeRequest, mockEmptyNodeResponse } from "./TestSetup.js";
//@ts-ignore
let testOptions = new HuulkConfigurerFacade()
    .startConfiguration()
    .buildCacheCredentials("localhost", "", "", 6379, "", CacheManagerImplementation.HUULK_REDIS)
    .buildThrottleOptions(true, 7000, ONE_DAY_IN_MS, 429)
    .buildCSRF(false)
    .buildCors(["http://test:4000", "http://test:2000"], ["custom-header-1", CSRF_HEADER], ["set-cookie"], [HuulkHttpMethods.GET, HuulkHttpMethods.DELETE], true)
    .buildCookieOptions(true, true, 400000, true)
    .buildSessions(true, true, 10, true, CacheManagerImplementation.HUULK_REDIS, true)
    .endConfiguration(400, true);
let corsManager;
let mockedRequest;
let mockedResponse = mockEmptyNodeResponse();
beforeEach(() => {
    corsManager = new HuulkCorsRegistry(testOptions.corsOptions);
    mockedRequest = mockEmptyNodeRequest();
});
test("Check that corsEnabled is set to true", () => {
    expect(testOptions.corsOptions.corsEnabled).toBe(true);
});
test("Check that allowed origins contain only the origins defined in the test options and no additional origins", () => {
    expect(testOptions.corsOptions.allowedOrigins.length).toBe(2);
    expect(testOptions.corsOptions.allowedOrigins[0]).toBe("http://test:4000");
    expect(testOptions.corsOptions.allowedOrigins[1]).toBe("http://test:2000");
});
test("Check that allow-header only contains the custom headers defined in the test object", () => {
    expect(testOptions.corsOptions.allowedHeaders.length).toBe(2);
    expect(testOptions.corsOptions.allowedHeaders[0]).toBe("custom-header-1");
    expect(testOptions.corsOptions.allowedHeaders[1]).toBe(CSRF_HEADER);
});
test("Check that expose headers only contains one header and it is the CSRF header", () => {
    expect(testOptions.corsOptions.exposeHeaders.length).toBe(1);
    expect(testOptions.corsOptions.exposeHeaders[0]).toBe("set-cookie");
});
test("Check that the access-control-allow-methods contains only the methods configured in the testoptions", () => {
    expect(testOptions.corsOptions.allowedMethods.length).toBe(2);
    expect(testOptions.corsOptions.allowedMethods[0]).toBe(HuulkHttpMethods.GET);
    expect(testOptions.corsOptions.allowedMethods[1]).toBe(HuulkHttpMethods.DELETE);
});
test("Ensure CSRF enabled is set to false", () => {
    expect(testOptions.csrfOptions.enableCSRF).toBe(false);
});
test("Ensure that cookieOptions are configured according to the cookieOptions builder function", () => {
    expect(testOptions.cookieOptions.httpOnly).toBe(true);
    expect(testOptions.cookieOptions.secure).toBe(true);
    expect(testOptions.cookieOptions.clearCookieAfterMaxAge).toBe(true);
    expect(testOptions.cookieOptions.maxAge).toBe(400000);
});
test("Ensure that sessionOptions are configured according to the session options test object ", () => {
    expect(testOptions.sessionOptions.clearSessionStorageOnStart).toBe(true);
    expect(testOptions.sessionOptions.deleteSessionIdOnLogout).toBe(true);
    expect(testOptions.sessionOptions.disableSessionValidation).toBe(true);
    expect(testOptions.sessionOptions.maximumSessionsAllowed).toBe(10);
    expect(testOptions.sessionOptions.sessionManagerImplementation).toBe(CacheManagerImplementation.HUULK_REDIS);
});
