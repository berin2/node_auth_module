import { CSRF_HEADER, HuulkEnvironment, CacheManagerImplementation } from "../HuulkTypes.js";
const INVALID_SESSION_STATUS_CODE = 444;
class HuulkCookieBuilder {
    constructor(huulkOptionsBuilder) {
        this.huulkOptionsBuilder = huulkOptionsBuilder;
    }
    buildLocalTestingCookieOptions() {
        let localTestingOptions = {
            secure: false,
            httpOnly: false,
            maxAge: 10000000000,
            clearCookieAfterMaxAge: true
        };
        this.huulkOptionsBuilder.cookieOptions = localTestingOptions;
        return this.huulkOptionsBuilder.huulkSession;
    }
    /**
     * Used to build the options for configuring every cookie sent back to the client.
     * @param secure  If True if this cookie can only be transmitted over Https. If False, it can be transmitted over https or http.
     * @param httpOnly If true, this cookie cannot be accessed by javascript on the browser.
     * @param maxAge  Age until the cookie expires
     * @param clearCookieAfterMaxAge  If true, tells browser to delete all expired cookies on the client.
     */
    buildCookieOptions(secure, httpOnly, maxAge, clearCookieAfterMaxAge) {
        let localTestingOptions = {
            secure: secure,
            httpOnly: httpOnly,
            maxAge: maxAge,
            clearCookieAfterMaxAge: clearCookieAfterMaxAge
        };
        this.huulkOptionsBuilder.cookieOptions = localTestingOptions;
        return this.huulkOptionsBuilder.huulkSession;
    }
}
class HuulkSessionBuilder {
    constructor(parentBuilder) {
        this.parentBuilder = parentBuilder;
    }
    buildLocalTestingSessions(clearSessionsOnAppStart = false) {
        let sessionOptions = {
            clearSessionStorageOnStart: clearSessionsOnAppStart,
            deleteSessionIdOnLogout: true,
            maximumSessionsAllowed: 10,
            maximumSessionPreventsLogin: false,
            sessionManagerImplementation: CacheManagerImplementation.HUULK_REDIS,
            disableSessionValidation: true
        };
        this.parentBuilder.sessionOptions = sessionOptions;
        return this.parentBuilder;
    }
    buildSessions(clearSessionStorageOnStart, deleteSessionIdOnLogout, maximumSessionsAllowed, maximumSessionPreventsLogin, sessionManagerImplementation, disableSessionValidation) {
        this.parentBuilder.sessionOptions = {
            clearSessionStorageOnStart: clearSessionStorageOnStart,
            deleteSessionIdOnLogout: deleteSessionIdOnLogout,
            maximumSessionPreventsLogin: maximumSessionPreventsLogin,
            maximumSessionsAllowed: maximumSessionsAllowed,
            sessionManagerImplementation: sessionManagerImplementation,
            disableSessionValidation: disableSessionValidation
        };
        return this.parentBuilder.configurer;
    }
}
class HuulkCSRFBuilders {
    constructor(huulkOptionsBuilder) {
        this.huulkOptionsBuilder = huulkOptionsBuilder;
    }
    /**
     *
     * @param enableCsrf if true csrf enabled. false no csrf checks are done
     * @returns
     */
    buildCSRF(enableCsrf) {
        let csrfOptions = {
            enableCSRF: enableCsrf,
            tokenGenerator: function () {
                throw new Error("Function not implemented.");
            }
        };
        this.huulkOptionsBuilder.csrfOptions = csrfOptions;
        this.huulkOptionsBuilder.huulkCors.setCSRF(enableCsrf);
        return this.huulkOptionsBuilder.huulkCors;
    }
}
class HuulkCorsBuilder {
    constructor(huulkBuilder) {
        this.huulkBuilder = huulkBuilder;
    }
    setCSRF(enabled) {
        this.csrfEnabled = enabled;
    }
    /**
     *
     * @param allowedOrigins array of allowed origins in the format protocol://hostname:port, i.e, http://localhost:7777
     * @param allowedMethods  array of Http method strings. ['get','put','post'] and etc
     * @param withCredentials true to read cross origin requests with credentials. set to false if reading is not allowed
     * @param allowedHeaders the array of headers which to allow in the incoming cors request. ["content-type",'x-csrf-token','accepts'] and etc
     * @param exposeHeaders the response headers which to expose to the client js code in the response
     * @returns HuulkCSRFBuilders to build CSRF options.
     */
    buildCors(allowedOrigins, allowedHeaders, exposeHeaders, allowedMethods, withCredentials) {
        this.huulkBuilder.corsOptions = {
            corsEnabled: true,
            allowedOrigins: allowedOrigins,
            allowedMethods: allowedMethods,
            withCredentials: withCredentials,
            allowedHeaders: allowedHeaders,
            exposeHeaders: exposeHeaders
        };
        if (this.csrfEnabled && allowedHeaders.indexOf(CSRF_HEADER) == -1)
            this.huulkBuilder.corsOptions.allowedHeaders.push(CSRF_HEADER);
        return this.huulkBuilder.huulkCookieBuilder;
    }
}
class HuulkThrottleOptionsBuilder {
    constructor(huulkOptionsBuilder) {
        this.huulkOptionsBuilder = huulkOptionsBuilder;
    }
    buildThrottleOptions(enableThrottling, maximumRequestLimit, resetMsIncrement, statusCodeOnThrottleLimit) {
        let throttleOptions = {
            enableThrottling: enableThrottling,
            maximumLimit: maximumRequestLimit,
            resetMsIncrement: resetMsIncrement,
            statusCodeOnThrottleLimit: statusCodeOnThrottleLimit,
            //@ts-ignore
            cacheOptions: this.huulkOptionsBuilder.cacheOptions,
            throttleManagerType: this.huulkOptionsBuilder.cacheOptions.cacheImplementation
        };
        this.huulkOptionsBuilder.throttleOptions = throttleOptions;
        return new HuulkCSRFBuilders(this.huulkOptionsBuilder);
    }
}
class HuulkCacheOptionsBuilder {
    constructor(huulkOptionsBuilder) {
        this.huulkOptionsBuilder = huulkOptionsBuilder;
    }
    /**
     * buildCacheCredentials builts the cache credentials of the redis instance.
     * If an empty string is provided for the username, then the username/password portion of the db url will not be built for redis
     * If the dbName portion of the url is empty, then the dbName section of the url will be completely ommited for redis credentials.
     * @param hostname the hostname to connect to.
     * @param username the username of the redis user.
     * @param password the password of the redis user to authenticate.
     * @param port the port number of the server.
     * @param dbName the database name.
     */
    buildCacheCredentials(hostname, username, password, port, dbName, cacheManager) {
        let options = {
            cacheImplementation: cacheManager,
            hostname: hostname,
            username: username,
            password: password,
            port: port,
            dbName: dbName
        };
        this.huulkOptionsBuilder = this.huulkOptionsBuilder;
        this.huulkOptionsBuilder.cacheOptions = options;
        return new HuulkThrottleOptionsBuilder(this.huulkOptionsBuilder);
    }
}
class HuulkOptionsBuilder {
    constructor(configurer) {
        this.huulkCacheOptionsBuilder = new HuulkCacheOptionsBuilder(this);
        this.huulkThrottleOptionsBuilder = new HuulkThrottleOptionsBuilder(this);
        this.huulkCSRF = new HuulkCSRFBuilders(this);
        this.huulkSession = new HuulkSessionBuilder(this);
        this.huulkCSRF = new HuulkCSRFBuilders(this);
        this.huulkCors = new HuulkCorsBuilder(this);
        this.huulkCookieBuilder = new HuulkCookieBuilder(this);
        this.configurer = configurer;
    }
    startHuulkOptionConfiguration() {
        return this.huulkCacheOptionsBuilder;
    }
    /**
     * Returns HuulkOptions to confiugure Huulk middle ware with using the arguments provided to the chain of builders proceeding this one;
     * @param statusCodeToSendOnInvalidSession When an invalid session is discovered, what status code to send back to the user.
     * @param clearClientSessionCookieIfNotFound If a requested session cookie is not found in cache, set this true to clear it from the client. False if you want it to remain.
     * @returns HuulkOptions to configure  your huulk middleware with.
     */
    endHuulkOptionConfiguration(statusCodeToSendOnInvalidSession, clearClientSessionCookieIfNotFound) {
        if (this.sessionOptions === undefined)
            throw Error("Attempted to build Huulk but the session options object is undefined. You must call the session  builder in the session chain.");
        if (this.csrfOptions === undefined)
            throw Error("Attempted to build Huulk but the csrfOptions options object is undefined. You must call the csrfOptions  builder in the session chain.");
        if (this.cookieOptions === undefined)
            throw Error("Attempted to build Huulk but the cookieOptions options object is undefined. You must call the cookieOptions  builder in the session chain.");
        if (this.corsOptions === undefined)
            throw Error("Attempted to build Huulk but the corsOptions options object is undefined. You must call the corsOptions  builder in the session chain.");
        let returnOptions = {
            sessionOptions: this.sessionOptions,
            cookieOptions: this.cookieOptions,
            throttleOptions: this.throttleOptions,
            cacheOptions: this.cacheOptions,
            statusCodeOnInvalidSession: statusCodeToSendOnInvalidSession,
            clearCookiesOnSessionNotFound: clearClientSessionCookieIfNotFound,
            environment: HuulkEnvironment.PRISMA_TESTING,
            csrfOptions: this.csrfOptions,
            corsOptions: this.corsOptions
        };
        console.log(JSON.stringify(returnOptions));
        return returnOptions;
    }
}
/**
 *  Use this class to configure you huulk options and pass the result to configHulk(options:HuulkOptions)
 *  @property startConfiguration starts build your huulkOptions. From this point you will be given a linear chain of builders to build huulk.
 *  @property endConfiguration  ends the build of your huulkOptions. After  calling startConfiguration, you will execute a chain of builders like a builder
 * for cors, csrf, and etc.
 *  The next time you see endConfiguration method call, it means you have built your huulkOptions in their entirety . If you prematurely call this method,
 *  the app will throw an error as Huulk is not completely configured and therefore cannot perform authentication correctly.
 */
class HuulkConfigurerFacade {
    constructor() {
        this.internalBuilder = new HuulkOptionsBuilder(this);
    }
    startConfiguration() {
        return this.internalBuilder.startHuulkOptionConfiguration();
    }
    endConfiguration(statusCodeOnInvalidSession, clearClientSessionCookieIfNotFound) {
        return this.internalBuilder.endHuulkOptionConfiguration(statusCodeOnInvalidSession, clearClientSessionCookieIfNotFound);
    }
}
export { HuulkOptionsBuilder, HuulkConfigurerFacade };
