import { HuulkCorsRegistry } from "./cors/CorsRegistry.js";
import { HuulkEnvironment, SESSION_COOKIE_NAME, CacheManagerImplementation, CSRF_HEADER } from "./HuulkTypes.js";
import { HuulkSessionManager } from "./SessionManager/HuulkSessionManager.js";
import HuulkThrottleManager from "./throttling/ThrottleManager.js";
"strictt";
"lax";
"none; secure";
let huulkYumYumOptions;
let options;
let manager;
function sessionFetchErrorDefaultResponse(res, nextFn) {
    if (options.clearCookiesOnSessionNotFound) {
        res.cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, httpOnly: options.cookieOptions.httpOnly, secure: options.cookieOptions.secure, clearCookieAfterMaxAge: true });
        res.cookie(CSRF_HEADER, "", { maxAge: 0, httpOnly: options.cookieOptions.httpOnly, secure: options.cookieOptions.secure, clearCookieAfterMaxAge: true });
    }
    res
        .status(options.statusCodeOnInvalidSession)
        .end();
}
function buildAndAssignManager(managerOption) {
    switch (managerOption.sessionOptions.sessionManagerImplementation) {
        case CacheManagerImplementation.HUULK_REDIS:
            manager = new HuulkSessionManager(managerOption);
            break;
        case CacheManagerImplementation.CUSTOM_SESSION_MANAGER:
            if (managerOption.sessionOptions.customSessionManager != null || managerOption.sessionOptions.customSessionManager !== undefined)
                manager = manager;
            else
                throw Error("Custom HuulkManager manager option selected but the custom Manager implemntation is null or undefined at the time of this error. Please supply a non falsy CustomHuulkSessionManager impl.");
            break;
    }
}
/**
 * Used to create a login
 * @param principalUsername the principal used to login. usually passed under the username field of the body JSON
 * @param objectData  the object data you'd like to save in the session. Minimally, a {username: "loginusername"}  is required
 * @param req the node.js request to modify with the request info
 *
 * @returns boolean indicating true for session creation success. False, for failure. it is up to the user of the function to respond to false.
 * For example, on true you can redirect or on false, you can throw Error and so on and so forth.
 */
async function createLoginSession(principalUsername, objectData, req, res, nextCb, successCallback, errorCallback) {
    let createdSession = manager.createSession(principalUsername, huulkYumYumOptions, objectData);
    createdSession.then((responseSession) => {
        if (responseSession !== null) {
            res.cookie(SESSION_COOKIE_NAME, responseSession.id.toString(), manager.options.cookieOptions);
            manager.imbueRequestWithSessionObject(req, responseSession);
            manager.setCSRFHeaderOnResponse(res, responseSession.csrfToken);
        }
        if (successCallback !== undefined)
            successCallback(req, res);
        else
            res.end();
    }).catch((error) => {
        console.log(error);
        if (errorCallback !== undefined)
            errorCallback(req, res, nextCb);
        else {
            res.status(500);
            res.end();
        }
    });
    return createdSession == null;
}
/**
 *
 * @param id
 * @returns
 */
async function deleteLoginSession(req, res, successCallback, deleteCallback) {
    let deleteSuccess = false;
    let sessionId = manager.unPackSessionIdFromRequest(req);
    if (sessionId !== null && sessionId !== undefined && sessionId !== "")
        manager.deleteSession(sessionId, req.huulkSession.sessionUser.valueOf()).then((responseSuccess) => {
            if (res.cookie !== undefined) //clear session cookie since now user is logged out.
                res.cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, secure: true, httpOnly: true, clearCookieAfterMaxAge: true });
            if (successCallback !== undefined)
                successCallback(req, res);
            else
                res.end();
        })
            .catch((error) => {
            console.log(error);
            if (deleteCallback !== undefined)
                deleteCallback(req, res);
            else
                res
                    .status(500)
                    .cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, secure: true, httpOnly: true, clearCookieAfterMaxAge: true })
                    .end();
        });
    else
        res
            .status(200)
            .end();
    return deleteSuccess;
}
/**
 * Class which contains basic functionality of Huulk packed in one.
 * As of now, it contains the CORS middleware and the  Auth middleware for authenticating sessions stored in cookies
 * and for validating CSRF if it is enabled.
 * It also has helper login and logout  functions.
 */
class Huulk {
    constructor(options) {
        this.options = options;
        this.manager = new HuulkSessionManager(options);
        this.registry = new HuulkCorsRegistry(options.corsOptions);
        if (options.throttleOptions.enableThrottling)
            this.throttleManager = new HuulkThrottleManager(options.throttleOptions);
    }
    getCorsRegistry() {
        return this.registry;
    }
    getThrottleMiddleWare() {
        const closure = async (req, res, next) => { await this.throttleManager.processRequest(req, res, next); };
        return closure;
    }
    getCorsMiddleWare() {
        const closure = (req, res, next) => { this.registry.processRequest(req, res, next); };
        return closure;
    }
    /**
     *
     * @returns middleware which calls next function if and only if the sessionCookie is valid and does throw an error.
     */
    getAuthMiddleWare() {
        let closure = async (req) => {
            await this.manager.processRequest(req);
        };
        return closure;
    }
    /**
     * createSessionLogin will log a user in. Don't call this function unless the username and password(pref password hash) match.
     * @param authenticatedUser The user who predented matching username/password combo.
     * @param req The request sent from the front end
     * @param res The response
     * @param objectData  Data you would like to associate with the session.
     * @returns a promise that resolves to  a HuulkSession object.
     */
    async createSessionLogin(authenticatedUser, req, res, objectData) {
        let createdSession = await this.manager.createSession(authenticatedUser, this.options.cookieOptions, objectData);
        if (createdSession !== null) {
            res.cookie(SESSION_COOKIE_NAME, createdSession.id.toString(), this.manager.options.cookieOptions);
            this.manager.imbueRequestWithSessionObject(req, createdSession);
            this.manager.setCSRFHeaderOnResponse(res, createdSession.csrfToken);
        }
        return createdSession;
    }
    /**
     * logs a user out and deletes their session from the session cache.
     * @param req  the request carrying a HuulKSession you would like to delete.
     * @returns Promise<boolean> which indicates if a promise is resolved or not.
     */
    async deleteSessionLogout(req) {
        let returnPromise = new Promise(() => false);
        if (req.huulkSession && req.huulkSession.sessionUser.valueOf())
            returnPromise = this.manager.deleteSession(req.huulkSession.id.valueOf(), req.huulkSession.sessionUser.valueOf());
        return returnPromise;
    }
    async updateAllUserSessionUserDataObjects(username, userData) {
        return this.manager.updateAllSessionsForUser(username, userData);
    }
}
export { HuulkEnvironment, createLoginSession, deleteLoginSession, Huulk };
