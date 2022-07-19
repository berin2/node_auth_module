import { CacheManagerImplementation } from "../HuulkTypes.js";
import HuulkRedisThrottleClientFacade from "./ThrottleClients/Redis/HuulkRedisThrottleClient.js";
/**
 * ThrottleManager class is used to provide User based request throttling based on some kind of variable daily limit.
 * The limit could be 1 day, 2day, 3day, and X days.
 *
 */
class HuulkThrottleManager {
    constructor(options) {
        this.options = options;
        this.options = options;
        switch (options.throttleManagerType) {
            case CacheManagerImplementation.HUULK_REDIS:
                this.client = new HuulkRedisThrottleClientFacade(options);
                break;
        }
    }
    async processRequest(req, res, next) {
        if (this.options.enableThrottling && req.huulkSession) {
            if (!await this.client.incrementCounter(req.huulkSession.sessionUser.valueOf(), this.options.maximumLimit))
                this.options.statusCodeOnThrottleLimit ? res.status(this.options.statusCodeOnThrottleLimit) : res.status(429).end();
        }
        if (next !== undefined)
            next();
    }
}
export default HuulkThrottleManager;
