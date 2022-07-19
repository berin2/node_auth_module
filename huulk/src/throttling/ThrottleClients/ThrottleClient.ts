import { HuulkCacheOptions } from "../../HuulkTypes";

interface ThrottleClient {

    /**
     * incrementCounter increments users maximum request counter, if it will not exceed the limit. 
     * 
     * @param username 
     * @param throttleLimit 
     * @returns true if successful and the limit has not been exceeded. False if the limit has been exceeded. 
     */
    incrementCounter(username: string, throttleLimit: number) : Promise<boolean>;
    /**
     * buildUrl builds the url which the underlying cache client uses to create connections to the specified cache server.
     * @param options the options object which contains essential configuration like hostname port and etc.
     * @returns string which contains the cache url.
     */
    buildUrl(options:HuulkCacheOptions) : string
    
}

export default ThrottleClient