import { HuulkSessionMetaData } from "../HuulkTypes.js";
import { HuulkSessionMetadataRedis } from "./SessionClients/Redis/RedisTypes.js";

interface HuulkSessionMetadataBase {
    username: string
    sessionCount: number
    sessionKeys: string [];
}

class HuulkSessionMetadatConcrete  implements HuulkSessionMetadataBase {
    username: string;
    sessionCount: number;
    sessionKeys: string[];

    constructor(sessionData: HuulkSessionMetaData | HuulkSessionMetadataRedis  | any) {


        if(sessionData instanceof HuulkSessionMetadataRedis || (sessionData.hasOwnProperty("username") && sessionData.hasOwnProperty("sessionCount")))
        {
            this.username = sessionData.username.valueOf();
            this.sessionCount = sessionData.sessionCount;
        }
        else
            throw Error(`Application requested to make a metadata session object which was missing required properties. Object definition: ` + JSON.stringify(sessionData));
        
        if(sessionData.hasOwnProperty("sessionKeys"))
            this.sessionKeys  =  sessionData.sessionKeys;
        else
            this.sessionKeys = [];    

    }

}
export {HuulkSessionMetadataBase,HuulkSessionMetadatConcrete};