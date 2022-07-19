import { HuulkSession } from "../../../HuulkTypes.js";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";
import { isFalsy } from "../../../utils/Validation.js";
import CredentialsBuilder from "../../../credentials/CredentialsBuilder.js";
const HULK_SESSION_METADATA_SPACE = "HUULK:SESSION:METADATA:";
const HULK_SESSION_SESSION_SPACE = "HUULK:SESSION:ID";
const HUULK_SESSIION_SESSIONID_USERSPACE = "HUULK:SESSION:SESSIONID:USERNAME:";
class RedisSessionClientFacade {
    constructor(options) {
        this.cookieOptions = options.cookieOptions;
        this.cacheOptions = options.cacheOptions;
        this.client = createClient({ url: CredentialsBuilder.buildRedisCredentials(this.cacheOptions) });
        this.connectClient();
        if (options.sessionOptions.clearSessionStorageOnStart)
            this.deleteManyDevOnly();
    }
    async updateSession(sessionId, objectData) {
        let sessionKey = this.buildSessionKey(sessionId, "");
        let sessionData = await this.client.get(sessionKey);
        let retVal = false;
        console.log("object data to update " + JSON.stringify(objectData));
        if (sessionData !== null) {
            let sessionBuffer = JSON.parse(sessionData);
            sessionBuffer.userData = objectData;
            console.log("Updated object " + JSON.stringify(sessionBuffer));
            await this.client.set(sessionKey, JSON.stringify(sessionBuffer));
        }
        return retVal;
    }
    buildCacheUrl() {
        let url = "";
        return "";
    }
    async disconnectClient() {
        await this.client.quit();
    }
    async connectClient() {
        await this.client.connect();
    }
    buildSessionKey(id, username) {
        return HULK_SESSION_SESSION_SPACE + id;
    }
    buildMetadataKey(username) {
        return HULK_SESSION_METADATA_SPACE + username;
    }
    unpackSessionObjectFromString(sessionString) {
        let data = JSON.parse(sessionString);
        let huulkSession = new HuulkSession(data);
        return huulkSession;
    }
    async getSession(id, username) {
        let sessionId = this.buildSessionKey(id, username);
        let sessionString = await this.client.get(sessionId);
        let returnSession;
        if (sessionString != null)
            returnSession = JSON.parse(sessionString);
        else
            throw Error(`User ${username} requested session with id ${sessionId}, but this session was not found in the cache.`);
        return returnSession;
    }
    async getSertMetadata(username) {
        let redisMetadataMap;
        let redisMetadataString = await this.client.get(HULK_SESSION_METADATA_SPACE + username);
        if (redisMetadataString !== null)
            redisMetadataMap = JSON.parse(redisMetadataString);
        else {
            //@ts-ignore LEAVE in place for now
            redisMetadataMap = {
                username: username,
                sessionCount: 0,
                sessionKeys: []
            };
            await this.client.set(this.buildMetadataKey(username), JSON.stringify(redisMetadataMap));
        }
        return redisMetadataMap;
    }
    async getOldestSession(sessionIds, username) {
        let oldestSession = null;
        let sessionIterator = null;
        let sessionStringIterator;
        for (let i = 0; i < sessionIds.length; i++) {
            sessionStringIterator = await this.client.get(this.buildSessionKey(sessionIds[i], username));
            if (!isFalsy(sessionStringIterator)) {
                //@ts-ignore
                sessionIterator = this.unpackSessionObjectFromString(sessionStringIterator);
                if (oldestSession === null || sessionIterator.createdAt.getMilliseconds() <= oldestSession.createdAt.getMilliseconds())
                    oldestSession = sessionIterator;
            }
        }
        return oldestSession;
    }
    async deleteOldestSession(id, username) {
        //@ts-ignore
        let metaData = await this.getSertMetadata(username);
        let metadataSessionKeys = metaData.sessionKeys;
        let deleteSuccesful = false;
        let returnSessionId = null;
        let oldestSession = await this.getOldestSession(metadataSessionKeys, username);
        if (oldestSession !== null) {
            deleteSuccesful = await this.deleteOne(oldestSession.id.valueOf(), username);
            returnSessionId = oldestSession.id.valueOf();
        }
        return returnSessionId;
    }
    async deleteOne(id, username) {
        let sessionId = this.buildSessionKey(id, username);
        let deleteSuccesful = await this.client.del(sessionId) == 1;
        return deleteSuccesful;
    }
    async deleteManyDevOnly() {
        await this.client.flushAll();
    }
    async sessionExist(id, username) {
        let sessionId = this.buildSessionKey(id, username);
        let exists = await this.client.exists(sessionId) > 0;
        return exists;
    }
    /* creates the session JSON to be serialized to Redis
     * @param username owning user of session
     * @param data any data the user would like to store in th session
     * @param cookieOptions  the cookie options huulk is configured with
     * @returns the JSON representation of the passed params
     */
    createSessionObject(username, data, cookieOptions) {
        let expires = new Date(Date.now().valueOf() + cookieOptions.maxAge);
        return {
            id: uuidv4(),
            sessionUser: username,
            maxAge: expires,
            //@ts-ignore
            userData: {
                //@ts-ignore
                authorities: []
            },
            csrfToken: uuidv4(),
            createdAt: new Date()
        };
    }
    async createSession(username, data) {
        let sessionIdentifier;
        //getSERT the metadata to make sure it exists
        let generatedSessionObject = this.createSessionObject(username, data, this.cookieOptions);
        let session = new HuulkSession(generatedSessionObject);
        sessionIdentifier = HULK_SESSION_SESSION_SPACE + session.id;
        await this.client.set(sessionIdentifier, JSON.stringify(session));
        return session;
    }
    async createMetadata(username) {
        let redisMetadataMap;
        let redisMetadataString = await this.client.get(HULK_SESSION_METADATA_SPACE + username);
        if (redisMetadataString !== null)
            redisMetadataMap = JSON.parse(redisMetadataString);
        else {
            //@ts-ignore 
            redisMetadataMap = {
                username: username,
                sessionCount: 0,
                sessionKeys: []
            };
            await this.client.set(this.buildMetadataKey(username), JSON.stringify(redisMetadataMap));
        }
        return redisMetadataMap;
    }
    async updateMetadata(username, sessionId, increment) {
        let metadataId = this.buildMetadataKey(username);
        //@ts-ignore
        let metadata = await this.getSertMetadata(username);
        if (isFalsy(metadata))
            throw Error(`Expected to find a non falsy Metadata object requested by username ${username}, but the metadata object in the cache is null.`);
        //@ts-ignore
        metadata.sessionCount = increment ?
            metadata.sessionCount + 1 :
            (metadata.sessionCount == 0 ? 0 :
                metadata.sessionCount - 1);
        if (increment) //if incrementing add session id                             
            metadata.sessionKeys.push(sessionId);
        else //remove the  session key from keys array. if it does not exist throw error
         {
            let deletionIndex = metadata.sessionKeys.indexOf(sessionId);
            if (deletionIndex >= 0)
                metadata.sessionKeys.splice(deletionIndex, 1);
            else
                throw Error(`User ${username} requested to delete a session with ${sessionId}, but the given sessionId was not discovered in the metadata keys object.`);
        }
        return await this.client.set(metadataId, JSON.stringify(metadata)) !== "";
    }
}
export { RedisSessionClientFacade as RedisSessionClientWrapper };
