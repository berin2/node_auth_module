import { CookieOptions, HuulkCacheOptions, HuulkOptions, HuulkSession, CacheManagerImplementation, UserObjectSessionDataTypeBase } from "../../../HuulkTypes.js";
import HuulkClientWrapper from "../HuulkClientWrapper.js";
import {createClient, RedisClientType} from "redis"
import { HuulkSessionMetadataRedis } from "./RedisTypes.js";
import {v4 as uuidv4} from "uuid";
import { isFalsy } from "../../../utils/Validation.js";
import { HuulkSessionMetadataBase } from "../../HuulkSessionManagerTypes.js";
import CredentialsBuilder from "../../../credentials/CredentialsBuilder.js";

const HULK_SESSION_METADATA_SPACE: string = "HUULK:SESSION:METADATA:";
const HULK_SESSION_SESSION_SPACE: string = "HUULK:SESSION:ID";
const HUULK_SESSIION_SESSIONID_USERSPACE: string = "HUULK:SESSION:SESSIONID:USERNAME:";

class RedisSessionClientFacade implements HuulkClientWrapper<HuulkSessionMetadataBase> {

    cookieOptions: CookieOptions
    cacheOptions: HuulkCacheOptions;
    client:RedisClientType;

    constructor(options: HuulkOptions){
        this.cookieOptions = options.cookieOptions;
        this.cacheOptions = options.cacheOptions;
        this.client = createClient({url: CredentialsBuilder.buildRedisCredentials(this.cacheOptions)});
        this.connectClient()
        if(options.sessionOptions.clearSessionStorageOnStart)
            this.deleteManyDevOnly();
    }

    async updateSession(sessionId:string, objectData: UserObjectSessionDataTypeBase) : Promise<boolean>
    {
        let sessionKey: string = this.buildSessionKey(sessionId,"");
        let sessionData: any = await this.client.get(sessionKey);
        let retVal: boolean = false;

        console.log("object data to update " + JSON.stringify(objectData))
        if(sessionData !== null)
        {
            let sessionBuffer = JSON.parse(sessionData)
            sessionBuffer.userData = objectData;
            console.log("Updated object " + JSON.stringify(sessionBuffer))
            await this.client.set(sessionKey, JSON.stringify(sessionBuffer));
        }

        return retVal;
    }

    buildCacheUrl(): string {
        let url: string = "";
        return "";
    }
    async disconnectClient(): Promise<void> {
        await this.client.quit();
    }
    protected async connectClient():Promise<void>
     {
        await this.client.connect()
    }

    protected buildSessionKey(id:string,username:  string) : string {
        return HULK_SESSION_SESSION_SPACE+id;
    }

    protected buildMetadataKey( username:string) : string {
        return HULK_SESSION_METADATA_SPACE+username;
    }

    protected unpackSessionObjectFromString(sessionString: string) : HuulkSession<UserObjectSessionDataTypeBase>
    {
        let data = JSON.parse(sessionString);
        let huulkSession: HuulkSession<UserObjectSessionDataTypeBase> = new HuulkSession(data);
        return huulkSession;
    }
    async getSession(id: string, username: string): Promise<HuulkSession<UserObjectSessionDataTypeBase> | null> {
        let sessionId: string = this.buildSessionKey(id,username);
        let sessionString: string | null = await this.client.get(sessionId); 
        let returnSession: HuulkSession<UserObjectSessionDataTypeBase>;

        if(sessionString != null)
            returnSession = JSON.parse(sessionString);
        else
            throw Error(`User ${username} requested session with id ${sessionId}, but this session was not found in the cache.`);


        return returnSession;    
    }
    async getSertMetadata(username: string): Promise<HuulkSessionMetadataRedis | null> {
        let redisMetadataMap: HuulkSessionMetadataRedis;

        let redisMetadataString:string | null = await this.client.get(HULK_SESSION_METADATA_SPACE+username);

        if(redisMetadataString !== null)
            redisMetadataMap  = JSON.parse(redisMetadataString)
        else 
        {
            //@ts-ignore LEAVE in place for now
            redisMetadataMap = {
                username: username,
                sessionCount: 0,
                sessionKeys:[]
            }
            await this.client.set(this.buildMetadataKey(username), JSON.stringify(redisMetadataMap));
         }  

        return redisMetadataMap;
    }

    async getOldestSession(sessionIds:string [], username: string) :Promise<HuulkSession<UserObjectSessionDataTypeBase> | null> {
        let oldestSession: HuulkSession<UserObjectSessionDataTypeBase> | null = null;
        let sessionIterator: HuulkSession<UserObjectSessionDataTypeBase> | null  = null
        let sessionStringIterator: string|null;

        for(let i = 0 ; i < sessionIds.length;i++)
        {
            sessionStringIterator = await this.client.get(this.buildSessionKey(sessionIds[i],username));
            if(!isFalsy(sessionStringIterator))
            {
                //@ts-ignore
                sessionIterator = this.unpackSessionObjectFromString(sessionStringIterator);
                if(oldestSession === null || sessionIterator.createdAt.getMilliseconds() <= oldestSession.createdAt.getMilliseconds())
                    oldestSession = sessionIterator;
            }
        }

        return oldestSession;
    }
    async deleteOldestSession(id: string, username: string): Promise<string|null> {
        //@ts-ignore
        let metaData: HuulkSessionMetadataRedis = await this.getSertMetadata(username);
        let metadataSessionKeys: string [] = metaData.sessionKeys;
        let deleteSuccesful: boolean = false;
        let returnSessionId: string | null = null;

        let oldestSession: HuulkSession<UserObjectSessionDataTypeBase> | null = await this.getOldestSession(metadataSessionKeys,username);
        
        if(oldestSession !== null)
        {
            deleteSuccesful  = await this.deleteOne(oldestSession.id.valueOf(),username);
            returnSessionId = oldestSession.id.valueOf();
        }
    
        return returnSessionId;    
    }


    async deleteOne(id: string, username: string): Promise<boolean> {
        let sessionId: string = this.buildSessionKey(id,username);
        let deleteSuccesful: boolean =  await this.client.del(sessionId) == 1;

        return deleteSuccesful;
    }
    async deleteManyDevOnly(): Promise<void> {
        await this.client.flushAll();
    }
    async sessionExist(id: string, username: string): Promise<boolean> {

        let sessionId: string = this.buildSessionKey(id,username);
        let exists: boolean = await this.client.exists(sessionId) > 0;
        return exists;
    }

    /* creates the session JSON to be serialized to Redis
     * @param username owning user of session
     * @param data any data the user would like to store in th session
     * @param cookieOptions  the cookie options huulk is configured with
     * @returns the JSON representation of the passed params
     */
    createSessionObject(username:string,data:any, cookieOptions: CookieOptions): HuulkSession<UserObjectSessionDataTypeBase> {

        let expires: Date = new Date(Date.now().valueOf() + cookieOptions.maxAge);
        return {
            id: uuidv4(),
            sessionUser: username,
            maxAge: expires,
            //@ts-ignore
            userData:{
                //@ts-ignore
                authorities: []
            },
            csrfToken: uuidv4(),
            createdAt: new Date()
        }
    }
    async createSession(username: string, data: any): Promise<HuulkSession<UserObjectSessionDataTypeBase>> {

        let sessionIdentifier: string;
        //getSERT the metadata to make sure it exists
        let generatedSessionObject: any = this.createSessionObject(username,data, this.cookieOptions)
        let session: HuulkSession<UserObjectSessionDataTypeBase> = new HuulkSession(generatedSessionObject);
        sessionIdentifier = HULK_SESSION_SESSION_SPACE + session.id;
        await this.client.set(sessionIdentifier, JSON.stringify(session));

        return session;
    }

    async createMetadata(username: string): Promise<HuulkSessionMetadataRedis | null> {
        let redisMetadataMap: HuulkSessionMetadataRedis;

        let redisMetadataString:string | null = await this.client.get(HULK_SESSION_METADATA_SPACE+username);

        if(redisMetadataString !== null)
            redisMetadataMap  = JSON.parse(redisMetadataString);
        else 
        {
            //@ts-ignore 
            redisMetadataMap = {
                username: username,
                sessionCount: 0,
                sessionKeys:[]
            };
            await this.client.set(this.buildMetadataKey(username), JSON.stringify(redisMetadataMap));
         }  

        return redisMetadataMap;    
    }
    async updateMetadata(username: string, sessionId: string, increment: boolean): Promise<boolean> {
        let metadataId: string = this.buildMetadataKey(username);
        //@ts-ignore
        let metadata: HuulkSessionMetadataRedis  = await this.getSertMetadata(username);

        if(isFalsy(metadata))
            throw Error(`Expected to find a non falsy Metadata object requested by username ${username}, but the metadata object in the cache is null.`);
            //@ts-ignore
        metadata.sessionCount = increment ?
                                    metadata.sessionCount + 1 :  
                                    (
                                        metadata.sessionCount == 0 ? 0 :
                                        metadata.sessionCount - 1
            
                                );


       if(increment)       //if incrementing add session id                             
            metadata.sessionKeys.push(sessionId);
       else //remove the  session key from keys array. if it does not exist throw error
       {
        let deletionIndex = metadata.sessionKeys.indexOf(sessionId);
        if(deletionIndex >= 0)
            metadata.sessionKeys.splice(deletionIndex,1);
        else 
            throw Error(`User ${username} requested to delete a session with ${sessionId}, but the given sessionId was not discovered in the metadata keys object.`)    

       }
       return await this.client.set(metadataId,JSON.stringify(metadata)) !== "";
    }
}

export {RedisSessionClientFacade as RedisSessionClientWrapper};