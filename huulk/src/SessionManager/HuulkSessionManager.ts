import { CookieOptions } from "express";
import {  HuulkOptions, NodeResponse, NodeRequest, UserObjectSessionDataTypeBase, CSRF_HEADER, HuulkSession, SESSION_COOKIE_NAME, CacheManagerImplementation, IHuulkSessionManager, HuulkSessionMetaData } from "../HuulkTypes.js";
import { HuulkSessionValidatorChain, isFalsy } from "../utils/Validation.js";
import { HuulkSessionMetadataBase, HuulkSessionMetadatConcrete } from "./HuulkSessionManagerTypes.js";
import HuulkClientWrapper from "./SessionClients/HuulkClientWrapper.js";
import { RedisSessionClientWrapper } from "./SessionClients/Redis/RedisSessionClientWrapper.js";


class HuulkSessionManager implements IHuulkSessionManager
{

    public options: HuulkOptions
    public validationChain: HuulkSessionValidatorChain;
    public client: HuulkClientWrapper<HuulkSessionMetadataBase>;

    constructor(options:HuulkOptions)
    {
        this.options = options;
        this.validationChain = new HuulkSessionValidatorChain(options);
        this.client = this.getClient();
        if(options.sessionOptions.clearSessionStorageOnStart)
            this.deleteAllSessionsLocalTestingOnly();

    }
    async updateAllSessionsForUser(principalUser: string, sessionData: UserObjectSessionDataTypeBase): Promise<boolean> 
    {
            let metaData: HuulkSessionMetadataBase | null = await this.client.getSertMetadata(principalUser);
            let retVal: boolean = false;
            let promises:Promise<any> [] = [];

            if(metaData !== null)
            {
                let sessionKeys: string [] = metaData.sessionKeys;
                console.log("-------- SESSION KEYS TO UPDATE ------ " + JSON.stringify(sessionKeys))
                for(let sessionIdKey of sessionKeys)
                {
                    promises.push(this.client.updateSession(sessionIdKey,sessionData));
                }

            }
            await Promise.all(promises)
                  .then((resp) => retVal = true)
                  .catch((err) => retVal = false);

            return retVal;
    }

    async processRequest(req: NodeRequest<UserObjectSessionDataTypeBase>): Promise<void> {

        //@ts-ignore
        if(req.cookies !== undefined && req.cookies.huulkSessionId !== undefined)
        {
            await this.processSession(req,req.cookies.huulkSessionId)
        }
    }
    sessionFetchErrorDefaultResponse(res: NodeResponse, next: any) {
        if(this.options.clearCookiesOnSessionNotFound)
        {
            res.cookie(
                SESSION_COOKIE_NAME,
                "",
                {
                    maxAge:0,
                    httpOnly:this.options.cookieOptions.httpOnly,
                    secure: this.options.cookieOptions.secure,
                    clearCookieAfterMaxAge: true
                });
        }
        if(this.options.statusCodeOnInvalidSession !==  undefined)
            res.status(this.options.statusCodeOnInvalidSession)
    }
    async disconnect(): Promise<boolean> {
        return true;
    }
    async getSertMetadata(username: string): Promise<HuulkSessionMetadataBase | null> {
       let createdObject: HuulkSessionMetaData |  null = await this.client.getSertMetadata(username);
       let huulkMetadata: HuulkSessionMetadatConcrete | null = new HuulkSessionMetadatConcrete(createdObject);
       return huulkMetadata;
    }

    protected getClient(): HuulkClientWrapper<HuulkSessionMetadataBase> {
        let returnClient: HuulkClientWrapper<HuulkSessionMetadataBase>;

        switch(this.options.sessionOptions.sessionManagerImplementation)
        {
            case CacheManagerImplementation.HUULK_REDIS:
                returnClient =  new RedisSessionClientWrapper(this.options);
                break;
        }

        //@ts-ignore
        return returnClient;
    }
    async canCreateSession(principalUser: string): Promise<boolean> {
        let retVal: boolean = true
        if(this.options.sessionOptions.maximumSessionsAllowed > 0)
        {
            let sessionMetadata: HuulkSessionMetaData |  null = await this.client.getSertMetadata(principalUser);
            if(sessionMetadata == null)
                sessionMetadata = await this.client.createMetadata(principalUser);
            if(sessionMetadata != null && sessionMetadata.sessionCount + 1  > this.options.sessionOptions.maximumSessionsAllowed)
                retVal = false;
        }
        return retVal; 
    }
    setCSRFHeaderOnResponse(res: NodeResponse, tokenValue: string): void {
        if(this.options.csrfOptions.enableCSRF)
            //@ts-ignore
            res.cookie(CSRF_HEADER,tokenValue,this.options.cookieOptions);
    }
    getCSRFHeaderFromRequest(req: NodeRequest<UserObjectSessionDataTypeBase>): string {
        let returnHeader:string = ""
        if(req.headers  && req.headers[CSRF_HEADER] !== undefined)
            returnHeader = req.headers[CSRF_HEADER];
        return returnHeader;    
    }
    public async deleteAllSessionsLocalTestingOnly(): Promise<void> {
            await this.client.deleteManyDevOnly();
    }

    public async getSession(sessionMapIdCookie: string) : Promise<HuulkSession<UserObjectSessionDataTypeBase> | null>
    {
        return await this.client.getSession(sessionMapIdCookie,"");
    }

    /**
     * 
     * @param principalUsername the principal username for which to create the session for
     * @param options the Cookie options which the user configured the middleware with
     * @param objectData the object data which the user wish to save to the session.
     * @returns the newly created HuulkSession or null indicating session creation failed. It's up to the user 
     * how to respond to failure  to create.
     */
    public async createSession(principalUsername:string, options:CookieOptions, objectData:UserObjectSessionDataTypeBase): Promise<HuulkSession<UserObjectSessionDataTypeBase>> {
        
        let metaData:HuulkSessionMetaData | null;
        let maxSessions: number = this.options.sessionOptions.maximumSessionsAllowed;
        let returnData:HuulkSession<UserObjectSessionDataTypeBase>;        
        //if session cresation restrictions are enabled
        if(maxSessions > 0)
        {
            metaData = await this.getSertMetadata(principalUsername);
            //@ts-ignore
            let maximumSessionsExceeded: boolean = metaData.sessionCount  >= maxSessions;

            if(maximumSessionsExceeded)
            {
                //if max session exceeded, examine max session preventslogin, throw error and let error CB handle response.
                if(this.options.sessionOptions.maximumSessionPreventsLogin)
                    throw Error(`User ${principalUsername} attempted to login and create a session, but their session creation  limit has been exceeded.`);
                else // delete oldest session and create newest session
                {
                    let  oldestSessionId: string | null = await this.client.deleteOldestSession("",principalUsername)
                    if(!isFalsy(oldestSessionId)) //BUG  here not deleting sessionId
                    {
                        //@ts-ignore
                        if(await this.client.updateMetadata(principalUsername,oldestSessionId,false))
                        {
                            returnData = await this.client.createSession(principalUsername,objectData);
                            await this.client.updateMetadata(principalUsername,returnData.id.valueOf(),true);
                        }
                        else
                            throw Error(`Metadata update error encountered. Unable to  session for user ${principalUsername}, so a new Session could not be created.`);    
     
                    }
                    else
                        throw Error(`Session deletion error encountered. Unable to delete session for user ${principalUsername}, so a new Session could not be created.`);    
                }
            }
            else {
                returnData = await this.client.createSession(principalUsername,objectData);
                await this.client.updateMetadata(principalUsername,returnData.id.valueOf(),true);
            }
        }
        //session limits not required. Just create a new session no questions asked.
        else {
            returnData = await this.client.createSession(principalUsername,objectData);
            await this.client.updateMetadata(principalUsername,returnData.id.valueOf(),true);
        }

        //@ts-ignore
        return returnData;
    }

    

    /**
     * 
     * @param id the session id to delete from the datastore
     * @returns true if delete operation succeeded. False if delete operation failed. It is up to the user 
     * on how to respond to true or false returns.
     */
    public async deleteSession(id: string, username:string): Promise<boolean>  {
        let retVal:boolean  = false;

        //@ts-ignore if in this block, id is guaranteed not to be null or falsy
        retVal = await this.client.deleteOne(id,"");

        if(retVal === true)
            await this.client.updateMetadata(username,id,false);

        return retVal
    }

    /**
     * 
     * @param session the Huulk session to unpack the userDataObject from.
     * @returns UserObjectSessionDataTypeBase saved to the request. Returning, at minimal {username:"savedUsernameValueExample"} 
     */
    public unPackObjectFromSession(session: HuulkSession<UserObjectSessionDataTypeBase>): UserObjectSessionDataTypeBase {

        let userData: UserObjectSessionDataTypeBase | undefined = session.userData;
        return userData;
    }

    /**
     * 
     * @param req the node request to search for the session id imbued by the Huulk middleware
     * @returns a sessionId string if the session id is discovered and at the very least not falsy. null if no sessionId is found or the supplied sessionId is invalid.
     */
    public unPackSessionIdFromRequest(req:NodeRequest<UserObjectSessionDataTypeBase>) : string | null{
        let returnSessionId: string|null = null;

        if(req.cookies !== undefined && req.cookies.huulkSessionId !== undefined && (req.cookies.huulkSessionId !== "" || req.cookies.huulkSessionId !== undefined)) 
            returnSessionId = req.cookies.huulkSessionId;
        
        return returnSessionId;    
    }

    /**
     * Returns whether or not a sessionm is active or inactive.
     * @param session the hulk session to check for expiry
     * @returns true if the session has not expired, or false if the session is expired.
     */
    public validateSessionAndCookies(csrfHeaderCookie: string | undefined, session: HuulkSession<UserObjectSessionDataTypeBase> | null) : boolean {

        let isValidSession: boolean = this.validationChain.executeChain(csrfHeaderCookie ,session);
        return isValidSession;
    }


    /**
     *  This function searches your session store for a session with the given sessionId and if found, imbues the request with the session object and userData.
     * @param req The Node.js request to imbue with the session object belonging to the sessionId
     * @param sessionId The value of the hulksession cookie object to perform store look and request imbue with.
     */
    public async processSession(req:NodeRequest<UserObjectSessionDataTypeBase>, sessionId: string) : Promise<HuulkSession<UserObjectSessionDataTypeBase> | null>
    {
        //@ts-ignore no idea why TS is bugging here
        let sessionPromise: HuulkSession<UserObjectSessionDataTypeBase> | null = await this.getSession(sessionId);
            
        let csrfToken: string |  undefined  = req.headers && req.headers[CSRF_HEADER] ? req.headers[CSRF_HEADER] : undefined;
        if(this.validationChain.executeChain(csrfToken,sessionPromise) || this.options.sessionOptions.disableSessionValidation)
        {
        //@ts-ignore sessionObject will not be null as validation chain is executing or user has disabled validation so no null check required.
            req.huulkSession = sessionPromise;  
        }

                    
 
        return sessionPromise;  
    }

    /**
     * This function is used inside the login function since we have an incoming request which has not been processed yet, we must 
     * imbue the request with the HuulkSession Object.
     * @param req the node request to serve
     * @param session the huuulksession to imbue the request with
     */
    public imbueRequestWithSessionObject(req: NodeRequest<UserObjectSessionDataTypeBase>, session: HuulkSession<UserObjectSessionDataTypeBase>) : void {
        let csrfToken: string = req.headers && req.headers[CSRF_HEADER] ? req.headers[CSRF_HEADER] : undefined;
        if(this.options.sessionOptions.disableSessionValidation ||  this.validateSessionAndCookies(csrfToken,session) )
            req.huulkSession = session;
        else
            console.log("Session validation failed callback placeholder.")
    }

    /**
     * 
     * @param sessionId the sessionId to perform basic validation checks
     * @returns true if the session Id is at least truthy and false if it is falsy.
     */
    public isValidSessionId(sessionId: any) : boolean {
        return !isFalsy(sessionId);
    }

}

export {HuulkSessionManager}
