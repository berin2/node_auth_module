import { RedisClientType } from "@redis/client";
import { createClient } from "redis";
import CredentialsBuilder from "../../../credentials/CredentialsBuilder.js";
import { HuulkCacheOptions, HuulkThrottleOptons } from "../../../HuulkTypes.js";
import HuulkUserThrottleData from "../../dto/HuulkUserThrottleData.js";
import ThrottleClient from "../ThrottleClient.js";

const MILISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const  HULK_THROTTLE_METADATA_SPACE: string = "HUULK:THROTTLE:USER";
const HUULK_THROTTLE_DATA: string = "HUULK:THROTTLE:DATA";




/**
 * e above code connects to localhost on port 6379. To connect to a different host or port, use a connection string in the format redis[s]://[[username][:password]@][host][:port][/db-number]:

createClient({
  url: 'redis://alice:foobared@awesome.redis.server:6380'
});
 */
class HuulkRedisThrottleClientFacade implements ThrottleClient 
{
    public client: RedisClientType;

    constructor(public throttleOptions: HuulkThrottleOptons) 
    {

            this.client = createClient({url: CredentialsBuilder.buildRedisCredentials(throttleOptions.cacheOptions)});
            this.connectClient();
            this.deleteAllThrottleCacheData();
    }

    /**
     * USES WORKER THREADS HERE POTENTIALLY LONG RUNNING TASK
     */
    private async deleteAllThrottleCacheData():Promise<void> {
        let throttleStamp: string | null = await this.client.get(HUULK_THROTTLE_DATA);

        console.log("Delete all callback reached")
        //A time stamp was discovered
        if(throttleStamp !== null)
        {
            //parse the ms data
            let dateToDelete: number  = Number.parseInt(throttleStamp);
            if(dateToDelete <= Date.now())
            {
                //if date is less than now delete all keys to reset operation
                let keysToDel: string []  = await this.client.keys(HULK_THROTTLE_METADATA_SPACE + "*");
                let promises: Promise<any> [] = [];
                this.client.set(HUULK_THROTTLE_DATA, Date.now() + this.throttleOptions.resetMsIncrement);

                for( let key of keysToDel)
                {
                    console.log("KEY to delete " + key)
                    promises.push(this.client.del(key))
                }
                await Promise.all(promises);
            }
        }
        else 
                this.client.set(HUULK_THROTTLE_DATA, Date.now() + this.throttleOptions.resetMsIncrement)
        setTimeout(() => this.deleteAllThrottleCacheData(),this.throttleOptions.resetMsIncrement); //set timeout to delete all throttle data before attempting current delete operation.
    }

    buildUrl(): string {


        let usernamePassword: string = this.throttleOptions.cacheOptions.username ?  
            `${this.throttleOptions.cacheOptions.username}:${this.throttleOptions.cacheOptions}@`:
            ``;
        let dbname: string = this.throttleOptions.cacheOptions.dbName ? '/' + this.throttleOptions.cacheOptions.dbName : '';

        return `redis://${usernamePassword}${this.throttleOptions.cacheOptions.hostname}:${this.throttleOptions.cacheOptions.port}${dbname}`;
    }
    async incrementCounter(username: string, throttleLimit: number): Promise<boolean> {
        let counterData: string | null = await this.client.get(HULK_THROTTLE_METADATA_SPACE+username);
        let userData : HuulkUserThrottleData = counterData !== null ? JSON.parse(counterData) : new HuulkUserThrottleData({"username":username, requestCount: 1});
        let operationSuccess: boolean = false;

        console.log("User throttle data " + JSON.stringify(userData))
        if(counterData == null)
        {
            operationSuccess = await this.client.set(HULK_THROTTLE_METADATA_SPACE+username, JSON.stringify(userData)) != null;
        }
        else 
        {
            if(userData.requestCount < this.throttleOptions.maximumLimit)
            {
                userData.requestCount = userData.requestCount + 1;
                operationSuccess = await this.client.set(this.buildSessionKey(username),JSON.stringify(userData)) !== "" ;
                console.log("User throttle data " + JSON.stringify(userData))

            }
            else 
                operationSuccess = false;
        }


        return operationSuccess;
    }
    
    buildSessionKey(username:string) : string {
        return HULK_THROTTLE_METADATA_SPACE + username;
    }
    async connectClient(): Promise<void>
    {
        await this.client.connect()
    }

    protected deleteAllThrottleData(): void {

    }
}

export default HuulkRedisThrottleClientFacade