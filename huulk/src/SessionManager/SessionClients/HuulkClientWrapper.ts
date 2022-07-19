import { HuulkSession, UserObjectSessionDataTypeBase } from "../../HuulkTypes"

/**
 * Wrapper around node redis to perform crud operations on redis data.
 */
abstract class  HuulkClientWrapper<HulkMetadataType> {
    /** getSession returns a session or null if none is found */
    abstract getSession(id: string, username: string): Promise<HuulkSession<UserObjectSessionDataTypeBase>|null>
    /**getSertMetadata gets a metadata object or creates one if it doesnt exist and then returns it */
    abstract getSertMetadata(username: string): Promise<HulkMetadataType|null>
    /**
     * deletes the oldest session belonging to the username 
     * @returns sessionId string if delete is succesful or null if delete was not succesful
    */
    abstract deleteOldestSession(id: string, username: string): Promise<string|null>;
    /**deletes one session and removes it from the users metadata objeect */
    abstract deleteOne(id: string, username: string): Promise<boolean>
    /** deletes all entries in the cache for local testing only */
    abstract deleteManyDevOnly(): Promise<void>  
    /**checks  if the session exists with id  and username */
    abstract sessionExist(id:string,username: string): Promise<boolean>
    /** creates a session. Does not create metadata*/
    abstract createSession(username:string, data:any): Promise<HuulkSession<UserObjectSessionDataTypeBase>>
    /** creates a meetadata */
    abstract createMetadata(username:string): Promise<HulkMetadataType|null>
    /**updates metadata. increments and decrements data at this point */
    abstract updateMetadata(username: string, sessionId: string, increment: boolean): Promise<boolean>
    //**Disconnects a client from the db. */
    abstract disconnectClient(): void

    /**
     * updateSession updates existing session object with userData. It is useful when for example users rights and privligaes have changed, 
     * and you'd like to update all of their logged in sessions with the newly updated priviliges object.
     * @param sessionId The session Id of the user to update.
     * @param userData The newly updated userData object to serialize.
     */
    abstract updateSession(sessionId: string, userData:UserObjectSessionDataTypeBase) : Promise<boolean>;

    /**
     * builds the url to connect to the cache based off of the cache options passed to the huulk builder.
     */
    abstract buildCacheUrl(): string;
}

export default HuulkClientWrapper;