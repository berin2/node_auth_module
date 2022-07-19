import { HuulkCorsRegistry } from "./cors/CorsRegistry.js";
import { CookieOptions, HuulkEnvironment, HuulkOptions, HuulkSession, NodeRequest, NodeResponse, SESSION_COOKIE_NAME, UserObjectSessionDataTypeBase, CacheManagerImplementation, CSRF_HEADER, HuulkHttpMethods, IHuulkSessionManager } from "./HuulkTypes.js";
import { HuulkSessionManager } from "./SessionManager/HuulkSessionManager.js";
import HuulkThrottleManager from "./throttling/ThrottleManager.js";



"strictt"
"lax"
"none; secure"


let huulkYumYumOptions: CookieOptions;
let options: HuulkOptions;
let manager: IHuulkSessionManager;


function sessionFetchErrorDefaultResponse(res:NodeResponse, nextFn: any) : void {

    if(options.clearCookiesOnSessionNotFound)
    {
        res.cookie(SESSION_COOKIE_NAME, "",{maxAge:0,httpOnly: options.cookieOptions.httpOnly, secure: options.cookieOptions.secure, clearCookieAfterMaxAge:true});
        res.cookie(CSRF_HEADER,"",{maxAge:0,httpOnly: options.cookieOptions.httpOnly, secure: options.cookieOptions.secure, clearCookieAfterMaxAge:true});
    }

    res
    .status(options.statusCodeOnInvalidSession)
    .end();
}


function buildAndAssignManager(managerOption:HuulkOptions){
    switch(managerOption.sessionOptions.sessionManagerImplementation)
    {
        case CacheManagerImplementation.HUULK_REDIS:
            manager = new HuulkSessionManager(managerOption);
            break;
        case CacheManagerImplementation.CUSTOM_SESSION_MANAGER:
            if(managerOption.sessionOptions.customSessionManager != null || managerOption.sessionOptions.customSessionManager !== undefined)
                manager = manager;
            else
                throw Error("Custom HuulkManager manager option selected but the custom Manager implemntation is null or undefined at the time of this error. Please supply a non falsy CustomHuulkSessionManager impl.")    
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
async function createLoginSession(principalUsername: string, objectData: UserObjectSessionDataTypeBase, req: NodeRequest<UserObjectSessionDataTypeBase>, res: NodeResponse, nextCb:any, successCallback?:(req:any,res:any)=>void, errorCallback?:(req:any,res:any,next:any)=>void) :Promise<boolean> {
   let createdSession: Promise<HuulkSession<UserObjectSessionDataTypeBase>> =  manager.createSession(principalUsername,huulkYumYumOptions,objectData);

    createdSession.then((responseSession) => {
        if(responseSession !== null)
        {
             res.cookie(SESSION_COOKIE_NAME,responseSession.id.toString(),manager.options.cookieOptions);
             
             manager.imbueRequestWithSessionObject(req,responseSession);
             manager.setCSRFHeaderOnResponse(res,responseSession.csrfToken);
        }
        
        if(successCallback !== undefined)
            successCallback(req,res)
        else 
            res.end();    

    }).catch((error) => {
        console.log(error);
        if(errorCallback !== undefined)
            errorCallback(req,res,nextCb);
        else{
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
async function deleteLoginSession(req:NodeRequest<UserObjectSessionDataTypeBase>, res: NodeResponse, successCallback?:(req:any,res:any) => void, deleteCallback?:(req:any,res:any) => void) : Promise<boolean> {
    let deleteSuccess: boolean = false;
    let sessionId: string | null = manager.unPackSessionIdFromRequest(req);

    if(sessionId !== null  && sessionId !== undefined && sessionId !== "")
        manager.deleteSession(sessionId, req.huulkSession.sessionUser.valueOf()).then((responseSuccess) => {
            if(res.cookie !== undefined) //clear session cookie since now user is logged out.
                res.cookie(SESSION_COOKIE_NAME,"",{maxAge:0,secure:true,httpOnly:true,clearCookieAfterMaxAge:true});
    
            if(successCallback !== undefined)
                successCallback(req,res)
            else 
                res.end()    
        })
        .catch((error) => {
            console.log(error);
            if(deleteCallback !== undefined)
                deleteCallback(req,res)
            else 
                res
                .status(500)
                .cookie(SESSION_COOKIE_NAME,"",{maxAge:0,secure:true,httpOnly:true,clearCookieAfterMaxAge:true})
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
class Huulk 
{
    protected  registry: HuulkCorsRegistry;
    //@ts-ignore
    protected  manager: CustomHuulkSessionManager;
    //@ts-ignore
    protected throttleManager: HuulkThrottleManager;

    constructor(public options: HuulkOptions)
    {
        this.manager =  new HuulkSessionManager(options);
        this.registry = new HuulkCorsRegistry(options.corsOptions)
        if(options.throttleOptions.enableThrottling)
            this.throttleManager = new HuulkThrottleManager(options.throttleOptions);
    }


    public getCorsRegistry(): HuulkCorsRegistry {
        return this.registry;
    }

    public getThrottleMiddleWare(): (req: any,res: any,next: any) => void 
    {
        const closure = async (req:any,res:any,next:any) : Promise<void> => 
        {await this.throttleManager.processRequest(req,res,next)}

        return closure;
    }
    
    public getCorsMiddleWare(): (req:any,res:any,next:any) => void {

         const closure = (req:any,res:any,next:any) : void => 
         { this.registry.processRequest(req,res,next)}

         return closure;
    }

    /**
     * 
     * @returns middleware which calls next function if and only if the sessionCookie is valid and does throw an error.
     */
    public getAuthMiddleWare(): (req:any) => Promise<void> {
        let closure = async (req:any) => { 
            await this.manager.processRequest(req)
        }

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
    public async createSessionLogin(authenticatedUser: string,req: NodeRequest<UserObjectSessionDataTypeBase>, res:NodeResponse,objectData:UserObjectSessionDataTypeBase) : Promise<HuulkSession<UserObjectSessionDataTypeBase>> 
    {
        let createdSession: HuulkSession<UserObjectSessionDataTypeBase> =  await this.manager.createSession(authenticatedUser,this.options.cookieOptions,objectData);

        if(createdSession !== null)
        {
                 res.cookie(SESSION_COOKIE_NAME,createdSession.id.toString(),this.manager.options.cookieOptions);
                 
                 this.manager.imbueRequestWithSessionObject(req,createdSession);
                 this.manager.setCSRFHeaderOnResponse(res,createdSession.csrfToken);
        }
    
       return createdSession;
    }

    /**
     * logs a user out and deletes their session from the session cache.
     * @param req  the request carrying a HuulKSession you would like to delete.
     * @returns Promise<boolean> which indicates if a promise is resolved or not.
     */
    public async deleteSessionLogout(req:NodeRequest<UserObjectSessionDataTypeBase>): Promise<boolean>
    {
        let returnPromise: Promise<boolean> = new Promise<boolean>(() => false);

        if(req.huulkSession && req.huulkSession.sessionUser.valueOf())
           returnPromise = this.manager.deleteSession(req.huulkSession.id.valueOf(),req.huulkSession.sessionUser.valueOf());
        return returnPromise;   
    }

    public async updateAllUserSessionUserDataObjects(username:string, userData:UserObjectSessionDataTypeBase) : Promise<boolean> 
    {
        return this.manager.updateAllSessionsForUser(username,userData);
    }
}



export {
    HuulkEnvironment,CookieOptions,NodeRequest,NodeResponse,createLoginSession,deleteLoginSession,Huulk
}