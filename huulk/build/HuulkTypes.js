const SESSION_COOKIE_NAME = "huulkSessionId";
const SESSION_DATA_NAME = "userData";
const UNLIMITED_SESSIONS = 0;
const NO_CSRF = "_";
const THROTTLE_DB_NUM = 0;
const SESSION_DB_NUM = 1;
const SET_COOKIE = "Set-Cookie";
const MAX_AGE = "Max-Age";
const HTTP_ONLY = "HttpOnly";
const SECURE = "Secure";
const SAME_SITE = "SameSite";
const CSRF_HEADER = "x-xsrf-token";
const ONE_DAY_IN_MS = 86400000;
"strictt";
"lax";
"none; secure";
/**
 * HuulkHttpHeaders contains the http headers supported by the http protocol
 */
class HuulkHttpMethods {
    static allMethods() {
        return [
            this.GET, this.PUT, this.POST, this.PATCH, this.OPTIONS, this.DELETE
        ];
    }
}
HuulkHttpMethods.GET = "GET";
HuulkHttpMethods.PUT = "PUT";
HuulkHttpMethods.POST = "POST";
HuulkHttpMethods.DELETE = "DELETE";
HuulkHttpMethods.PATCH = "PATCH";
HuulkHttpMethods.OPTIONS = "OPTIONS";
/**
 * HuulkCorsHeaders holds the set of headers used to configure the CORS response created by Huulk.
 *  If Access-Control-Allow-Credentials is true,
 *              then you may not set Access-Control-Allow-Methods, * but must use specific methods or method List: GET,PUT,POST and so on.
 *              then you may not set Access-Control-Allow-Origin, * but must use specific methods or method List: http:localhost:PORT_NUMBER
 *

 * @param ACCESS_CONTROL_ALLOW_ORIGIN Header returns whether or not the origin is allowed in the cors registry.
 * @param ACCESS_CONTROL_ALLOW_METHODS Header returns a list HTTP methods which are permitted by cors to be sent to the app.
 * @param ACCESS_CONTROL_ALLOW_HEADERS  Headerr returns a list of HTTP headers which the browser can send with a CORS request
 * @param ACCESS_CONTROL_MAX_AGE Header returns in MS the maximum caching age of a Preflight cors request.
 * @param ACCESS_CONTROL_ALLOW_CREDENTIALS Header which specifies whether or not credentials can be sent along with Http Request.
 */
class HuulkHttpHeaders {
}
HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN = "Access-Control-Allow-Origin";
HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_METHODS = "Access-Control-Allow-Methods";
HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS = "Access-Control-Allow-Headers";
HuulkHttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS = "Access-Control-Expose-Headers";
HuulkHttpHeaders.ACCESS_CONTROL_MAX_AGE = "Access-Control-Max-Age";
HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";
HuulkHttpHeaders.AUTHORIZATION = "Authorization";
HuulkHttpHeaders.ORIGIN = "origin";
HuulkHttpHeaders.VARY = "vary";
var HuulkEnvironment;
(function (HuulkEnvironment) {
    HuulkEnvironment[HuulkEnvironment["PRISMA_TESTING"] = 0] = "PRISMA_TESTING";
    HuulkEnvironment[HuulkEnvironment["LOCAL_TESTING"] = 1] = "LOCAL_TESTING";
    HuulkEnvironment[HuulkEnvironment["PROD_SMASH"] = 2] = "PROD_SMASH";
})(HuulkEnvironment || (HuulkEnvironment = {}));
/**
 * Used to configure which SessionManager you would like to use with Huulk
 * @param SQL_LITE_PRISMA_LOCAL Useful for local testing only. Will use prisma+SqlLite to manager your sessions.
 * @param HUULK_REDIS Uses a single redis instance to manage your sessions/
 * @param CUSTOM_SESSION_MANAGER You provide your own custom CustomHuulkSessionManager implementation and Huulk will use it.
 */
var CacheManagerImplementation;
(function (CacheManagerImplementation) {
    CacheManagerImplementation[CacheManagerImplementation["HUULK_REDIS"] = 0] = "HUULK_REDIS";
    CacheManagerImplementation[CacheManagerImplementation["CUSTOM_SESSION_MANAGER"] = 1] = "CUSTOM_SESSION_MANAGER";
})(CacheManagerImplementation || (CacheManagerImplementation = {}));
"{\"username\":\"test\",\"sessionCount\":2,\"sessionKeys\":[\"9c8927e9-0c04-44ef-8964-201a0f30a046\",\"2597697e-511e-4125-a2ba-eb8467767168\"]}";
class HuulkSession {
    constructor(storeData) {
        this.id = storeData["id"];
        this.sessionUser = storeData["sessionUser"];
        this.maxAge = storeData["maxAge"];
        this.csrfToken = storeData["csrfToken"];
        this.createdAt = new Date(storeData["createdAt"]);
        //@ts-ignore
        this.userData = storeData["userData"];
    }
}
//classes and interfaces
export { HuulkSession, HuulkEnvironment, HuulkHttpHeaders, HuulkHttpMethods };
//enums
export { CacheManagerImplementation };
//consts
export { SESSION_COOKIE_NAME, CSRF_HEADER, UNLIMITED_SESSIONS, NO_CSRF, ONE_DAY_IN_MS };
//type declarations
