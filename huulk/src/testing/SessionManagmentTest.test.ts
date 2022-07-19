import { CacheManagerImplementation, HuulkHttpMethods, HuulkOptions, HuulkSession, ONE_DAY_IN_MS, UserObjectSessionDataTypeBase } from "../HuulkTypes";
import { HuulkSessionManager } from "../SessionManager/HuulkSessionManager";
import { HuulkSessionMetadataBase, HuulkSessionMetadatConcrete } from "../SessionManager/HuulkSessionManagerTypes";
import {mockNodeRequest,mockEmptyNodeRequest, mockEmptyNodeResponse} from "./TestSetup";
import process from "process";
import { HuulkConfigurerFacade, HuulkOptionsBuilder } from "./HuulkBuilder";

const HULK_SESSION_SIZE: number = 7;
let huulkRedisOptions: HuulkOptions = new HuulkConfigurerFacade()
                                            .startConfiguration()
                                             .buildCacheCredentials("localhost","","",6379,"",CacheManagerImplementation.HUULK_REDIS)
                                             .buildThrottleOptions(true,7000,ONE_DAY_IN_MS,429)
                                             .buildCSRF(false)
                                             .buildCors(["*"],["*"],["*"],HuulkHttpMethods.allMethods(),true)
                                             .buildCookieOptions(true,false,400000,true)
                                             .buildSessions(true,true,HULK_SESSION_SIZE,false,CacheManagerImplementation.HUULK_REDIS,true)
                                            .endConfiguration(400,true);
let metaData: HuulkSessionMetadatConcrete |  null;
let redisManager: HuulkSessionManager;
let testSession: HuulkSession<UserObjectSessionDataTypeBase> | null;
let testAuthorities: UserObjectSessionDataTypeBase;

beforeAll(()=>{
    redisManager = new HuulkSessionManager(huulkRedisOptions);
});

beforeEach( async ()=>{
    await redisManager.deleteAllSessionsLocalTestingOnly();
})

test("Testing login creates new session and new session is inside redis/prisma", async ()=>{
    testSession = await redisManager.createSession("loginTest",huulkRedisOptions.cookieOptions,{userData:{authorities: [0]}});
    expect(testSession).toBeTruthy();
    testSession = await redisManager.getSession(testSession.id.valueOf())
    expect(testSession).toBeTruthy();
})

test("Testing logging out deletes session from db",async () => {
    testSession = await redisManager.createSession("loginTest",huulkRedisOptions.cookieOptions,testAuthorities);
    expect(testSession).toBeTruthy();
    testSession = await redisManager.getSession(testSession.id.valueOf())
    expect(testSession).toBeTruthy();
    //@ts-ignore
    let deleteSuccess: boolean = await redisManager.deleteSession(testSession.id.valueOf(),"loginTest");
    expect(deleteSuccess).toBeTruthy();
    expect(testSession).toBeTruthy();
})

test("logging in once creates a metadata object with 1 session count and correct sessionId",async ()=> {
    let keys: string [] = [];
    testSession = await redisManager.createSession("loginTest",huulkRedisOptions.cookieOptions,testAuthorities);
    keys.push(testSession.id.toString());
    metaData = await redisManager.getSertMetadata("loginTest")
    expect(metaData?.sessionCount).toEqual(1);
    expect(metaData?.sessionKeys[0]).toEqual(testSession.id.toString());
});

test("Test logging twice creates two sessions with correct keys metadata", async () => {
    let keys: string [] = [];

    testSession = await redisManager.createSession("loginTest",huulkRedisOptions.cookieOptions,testAuthorities);
    keys.push(testSession.id.toString());
    testSession = await redisManager.createSession("loginTest",huulkRedisOptions.cookieOptions,testAuthorities);
    keys.push(testSession.id.toString());
    let metaData: HuulkSessionMetadatConcrete|null = await redisManager.getSertMetadata("loginTest");
    //@ts-ignore
    expect(metaData).toBeTruthy();
    //@ts-ignore
    expect(metaData.sessionCount).toEqual(2);
    //@ts-ignore
    expect(metaData.username).toEqual("loginTest");

    for(let i = 0; i < keys.length; i++)
    {
        testSession = await redisManager.getSession(keys[i]);
    }

})

test("Test that meta data session keys session exist in the session space and ensure that usernames match", async ()=>{
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
 
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);
    testSession = await redisManager.createSession("metadatatest",huulkRedisOptions.cookieOptions,testAuthorities);


    metaData = await redisManager.getSertMetadata("metadatatest");
    expect(metaData?.sessionCount).toBe(HULK_SESSION_SIZE);
    
});

test("Test that creating 5 login sessions increments metadata sessioncount to 5 and that all 5 session keys are mapped to existing sessions",async () => {
    
    let createdSessions: [] = [];
    for(let i = 0; i < 5; i++)
    {
        testSession = await redisManager.createSession("testmetadatacounts",huulkRedisOptions.cookieOptions,testAuthorities);
        //@ts-ignore
        createdSessions.push(testSession.id.valueOf());
    }

    metaData =  await redisManager.getSertMetadata("testmetadatacounts");

    expect(metaData?.sessionCount).toBe(5);

    for(let i = 0; i < 5; i++)
    {
        expect(await redisManager.getSession(createdSessions[i])).toBeTruthy();
    }
        

});

test("Creating four sessions and then deleting one of the sessions removes it from the metadata object while the other objects still exist", async () => {
    let sessionIdentifiers: string [] = []

    for(let i = 0; i < 4; i++)
    {
        testSession = await redisManager.createSession("redisCreation",huulkRedisOptions.cookieOptions,testAuthorities);
        sessionIdentifiers.push(testSession.id.valueOf());
    }

    await redisManager.deleteSession(sessionIdentifiers[3],"redisCreation");

    for(let i = 0; i < sessionIdentifiers.length; i++)
    {
        if(i !== 3)
            expect(await redisManager.getSession(sessionIdentifiers[i])).toBeTruthy()
        else 
            expect(async () => {await redisManager.getSession(sessionIdentifiers[i])}).rejects.toThrow()
    }
})

test("creating the session limit then deleting all sessions removes all sessions and the metadata object for the user session count is zero asnd the session key array is empty ",async () => {
    let sessions: string [] = [];

    for(let i = 0; i < HULK_SESSION_SIZE; i++)
    {
        testSession = await redisManager.createSession("creationClearTest", huulkRedisOptions.cookieOptions,testAuthorities);
        sessions.push(testSession.id.valueOf());
    }

    metaData = await redisManager.getSertMetadata("creationClearTest")   
    expect(metaData?.sessionCount).toBe(HULK_SESSION_SIZE);

    for(let i = 0; i < HULK_SESSION_SIZE; i++ )
        expect(await redisManager.deleteSession(sessions[i],"creationClearTest")).toBe(true);

    metaData = await redisManager.getSertMetadata("creationClearTest")    
    expect(metaData?.sessionCount).toBe(0);


})




beforeEach(async ()=>{
    await redisManager.deleteAllSessionsLocalTestingOnly();
})

afterAll(async () => {
    await redisManager.disconnect();
    console.log("Exiting tests.")
    setTimeout(() => process.exit(),1)
})


