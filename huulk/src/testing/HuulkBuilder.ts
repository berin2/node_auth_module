import { CookieOptions, CSRF_HEADER, HuulkCacheOptions, HuulkCorsOptions, HuulkCSRFOptions, HuulkEnvironment, HuulkHttpHeaders, HuulkHttpMethods, HuulkOptions, HuulkSession, HuulkSessionOptions, HuulkThrottleOptons, CacheManagerImplementation } from "../HuulkTypes.js";
const  INVALID_SESSION_STATUS_CODE: number = 444;




class HuulkCookieBuilder {

    constructor(public huulkOptionsBuilder:HuulkOptionsBuilder){}
    public buildLocalTestingCookieOptions(): HuulkSessionBuilder {
        let localTestingOptions: CookieOptions = {
            secure: false,
            httpOnly: false,
            maxAge: 10000000000,
            clearCookieAfterMaxAge: true
        }
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
    public buildCookieOptions(secure:boolean, httpOnly:boolean, maxAge: number, clearCookieAfterMaxAge: boolean): HuulkSessionBuilder {

        let localTestingOptions: CookieOptions = {
            secure: secure,
            httpOnly: httpOnly,
            maxAge: maxAge,
            clearCookieAfterMaxAge: clearCookieAfterMaxAge
        }

        this.huulkOptionsBuilder.cookieOptions  = localTestingOptions;
        return this.huulkOptionsBuilder.huulkSession;
    }

}
class HuulkSessionBuilder {

    constructor(public parentBuilder: HuulkOptionsBuilder){}
    public buildLocalTestingSessions(clearSessionsOnAppStart: boolean = false): HuulkOptionsBuilder {
        let sessionOptions: HuulkSessionOptions = {
            clearSessionStorageOnStart: clearSessionsOnAppStart,
            deleteSessionIdOnLogout: true,
            maximumSessionsAllowed: 10,
            maximumSessionPreventsLogin: false,
            sessionManagerImplementation: CacheManagerImplementation.HUULK_REDIS,
            disableSessionValidation: true
        }
        this.parentBuilder.sessionOptions = sessionOptions;
        return this.parentBuilder;
    }

    public buildSessions(
        clearSessionStorageOnStart:boolean,deleteSessionIdOnLogout:boolean,
        maximumSessionsAllowed:number,maximumSessionPreventsLogin:boolean, 
        sessionManagerImplementation: CacheManagerImplementation,
        disableSessionValidation: boolean): HuulkConfigurerFacade
    {

        this.parentBuilder.sessionOptions = {
            clearSessionStorageOnStart: clearSessionStorageOnStart,
            deleteSessionIdOnLogout: deleteSessionIdOnLogout,
            maximumSessionPreventsLogin: maximumSessionPreventsLogin,
            maximumSessionsAllowed: maximumSessionsAllowed,
            sessionManagerImplementation: sessionManagerImplementation,
            disableSessionValidation: disableSessionValidation
        }

        return this.parentBuilder.configurer;

    }
}
class HuulkCSRFBuilders {

    constructor(public huulkOptionsBuilder: HuulkOptionsBuilder){}
    /**
     * 
     * @param enableCsrf if true csrf enabled. false no csrf checks are done
     * @returns 
     */
    public buildCSRF(enableCsrf: boolean): HuulkCorsBuilder {
        let csrfOptions: HuulkCSRFOptions = {
            enableCSRF: enableCsrf,
            tokenGenerator: function (): string {
                throw new Error("Function not implemented.");
            }
        }

        this.huulkOptionsBuilder.csrfOptions = csrfOptions;
        this.huulkOptionsBuilder.huulkCors.setCSRF(enableCsrf)
        return this.huulkOptionsBuilder.huulkCors;

    }

}
class HuulkCorsBuilder {

    constructor(public huulkBuilder: HuulkOptionsBuilder){}
    //@ts-ignore
    protected csrfEnabled:boolean;

    public setCSRF(enabled:boolean): void {
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
    public buildCors(allowedOrigins: string [], allowedHeaders: string [], exposeHeaders: string [], allowedMethods: string [] ,withCredentials:boolean,): HuulkCookieBuilder {
        
        this.huulkBuilder.corsOptions = {
            corsEnabled: true,
            allowedOrigins: allowedOrigins,
            allowedMethods: allowedMethods,
            withCredentials: withCredentials,
            allowedHeaders: allowedHeaders,
            exposeHeaders: exposeHeaders
        }

        if(this.csrfEnabled && allowedHeaders.indexOf(CSRF_HEADER) == -1)
            this.huulkBuilder.corsOptions.allowedHeaders.push(CSRF_HEADER)

        return this.huulkBuilder.huulkCookieBuilder;
    }




}

class HuulkThrottleOptionsBuilder {
    constructor(public huulkOptionsBuilder: HuulkOptionsBuilder){}

    public buildThrottleOptions(enableThrottling: boolean,maximumRequestLimit: number, resetMsIncrement: number, statusCodeOnThrottleLimit: number): HuulkCSRFBuilders {
        let throttleOptions: HuulkThrottleOptons = {
            enableThrottling: enableThrottling,
            maximumLimit: maximumRequestLimit,
            resetMsIncrement: resetMsIncrement,
            statusCodeOnThrottleLimit: statusCodeOnThrottleLimit,
            //@ts-ignore
            cacheOptions: this.huulkOptionsBuilder.cacheOptions,
            throttleManagerType: this.huulkOptionsBuilder.cacheOptions.cacheImplementation
        }

        this.huulkOptionsBuilder.throttleOptions = throttleOptions

        return new HuulkCSRFBuilders(this.huulkOptionsBuilder)
    }
}
class HuulkCacheOptionsBuilder {

    constructor(public huulkOptionsBuilder:HuulkOptionsBuilder){}

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
    public buildCacheCredentials(hostname:string, username: string, password: string, port: number, dbName: string, cacheManager: CacheManagerImplementation): HuulkThrottleOptionsBuilder
    {
        let options: HuulkCacheOptions = {
            cacheImplementation: cacheManager,
            hostname: hostname,
            username: username,
            password: password,
            port: port,
            dbName: dbName
        }

        this.huulkOptionsBuilder = this.huulkOptionsBuilder;
        this.huulkOptionsBuilder.cacheOptions = options;

        return new HuulkThrottleOptionsBuilder(this.huulkOptionsBuilder);
    }
}

class HuulkOptionsBuilder {

    sessionOptions!: HuulkSessionOptions;
    csrfOptions!: HuulkCSRFOptions;
    cookieOptions!: CookieOptions ;
    corsOptions!: HuulkCorsOptions;
    throttleOptions!: HuulkThrottleOptons;
    cacheOptions!: HuulkCacheOptions;

    huulkCacheOptionsBuilder: HuulkCacheOptionsBuilder;
    huulkThrottleOptionsBuilder: HuulkThrottleOptionsBuilder;
    huulkCors:HuulkCorsBuilder;
    huulkSession: HuulkSessionBuilder;
    huulkCookieBuilder: HuulkCookieBuilder;
    huulkCSRF: HuulkCSRFBuilders;
    configurer: HuulkConfigurerFacade;




    constructor(configurer: HuulkConfigurerFacade){
        this.huulkCacheOptionsBuilder = new HuulkCacheOptionsBuilder(this);
        this.huulkThrottleOptionsBuilder = new HuulkThrottleOptionsBuilder(this);
        this.huulkCSRF = new HuulkCSRFBuilders(this);
        this.huulkSession = new HuulkSessionBuilder(this);
        this.huulkCSRF = new HuulkCSRFBuilders(this);
        this.huulkCors = new HuulkCorsBuilder(this);
        this.huulkCookieBuilder = new HuulkCookieBuilder(this);
        this.configurer = configurer;
    }

    startHuulkOptionConfiguration() : HuulkCacheOptionsBuilder
    {
        return this.huulkCacheOptionsBuilder;
    }

    /**
     * Returns HuulkOptions to confiugure Huulk middle ware with using the arguments provided to the chain of builders proceeding this one;
     * @param statusCodeToSendOnInvalidSession When an invalid session is discovered, what status code to send back to the user.
     * @param clearClientSessionCookieIfNotFound If a requested session cookie is not found in cache, set this true to clear it from the client. False if you want it to remain.
     * @returns HuulkOptions to configure  your huulk middleware with.
     */
    endHuulkOptionConfiguration (statusCodeToSendOnInvalidSession: number, clearClientSessionCookieIfNotFound:boolean): HuulkOptions 
    {
        if(this.sessionOptions === undefined)
            throw Error("Attempted to build Huulk but the session options object is undefined. You must call the session  builder in the session chain.");
        if(this.csrfOptions === undefined)
            throw Error("Attempted to build Huulk but the csrfOptions options object is undefined. You must call the csrfOptions  builder in the session chain.");
        if(this.cookieOptions === undefined)
            throw Error("Attempted to build Huulk but the cookieOptions options object is undefined. You must call the cookieOptions  builder in the session chain.");    
        if(this.corsOptions === undefined)
            throw Error("Attempted to build Huulk but the corsOptions options object is undefined. You must call the corsOptions  builder in the session chain.");        
            
        let returnOptions: HuulkOptions =  {
            sessionOptions: this.sessionOptions,
            cookieOptions: this.cookieOptions,
            throttleOptions: this.throttleOptions,
            cacheOptions: this.cacheOptions,
            statusCodeOnInvalidSession: statusCodeToSendOnInvalidSession,
            clearCookiesOnSessionNotFound: clearClientSessionCookieIfNotFound,
            environment: HuulkEnvironment.PRISMA_TESTING,
            csrfOptions: this.csrfOptions,
            corsOptions: this.corsOptions
        }

        console.log(JSON.stringify(returnOptions))
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
class HuulkConfigurerFacade 
{
    protected internalBuilder: HuulkOptionsBuilder;

    constructor(){
        this.internalBuilder = new HuulkOptionsBuilder(this);
    }
    public  startConfiguration() : HuulkCacheOptionsBuilder
    {
        return this.internalBuilder.startHuulkOptionConfiguration();
    }
    public endConfiguration(statusCodeOnInvalidSession:number, clearClientSessionCookieIfNotFound: boolean): HuulkOptions
    {
        return this.internalBuilder.endHuulkOptionConfiguration(statusCodeOnInvalidSession,clearClientSessionCookieIfNotFound);
    }
}
export {HuulkOptionsBuilder, HuulkConfigurerFacade}