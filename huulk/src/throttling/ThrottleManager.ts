import { HuulkThrottleOptons, NodeRequest, NodeResponse, CacheManagerImplementation, UserObjectSessionDataTypeBase } from "../HuulkTypes.js";
import HuulkRedisThrottleClientFacade from "./ThrottleClients/Redis/HuulkRedisThrottleClient.js";
import ThrottleClient from "./ThrottleClients/ThrottleClient.js";

/**
 * ThrottleManager class is used to provide User based request throttling based on some kind of variable daily limit. 
 * The limit could be 1 day, 2day, 3day, and X days. 
 * 
 */
class HuulkThrottleManager {

    //@ts-ignore
    client:ThrottleClient;

    constructor(public options: HuulkThrottleOptons) {
        this.options = options;

        switch(options.throttleManagerType)
        {
            case CacheManagerImplementation.HUULK_REDIS:
                this.client = new HuulkRedisThrottleClientFacade(options);
                break;
        }

    }

    public async processRequest(req: NodeRequest<UserObjectSessionDataTypeBase>, res: NodeResponse, next: () => void | any ) : Promise<void> 
    {

        if(this.options.enableThrottling && req.huulkSession)
        {
            if(!await this.client.incrementCounter(req.huulkSession.sessionUser.valueOf(), this.options.maximumLimit))
                this.options.statusCodeOnThrottleLimit ? res.status(this.options.statusCodeOnThrottleLimit) : res.status(429).end();
        } 

        if(next !== undefined)
           next()    
    }


}

export default HuulkThrottleManager;