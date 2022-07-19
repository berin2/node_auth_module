
/**
 * ThrottleDto represents DTO used to transmit throttle data from the client to the ThrottleManager.
 */
class HuulkUserThrottleData {

    //@ts-ignore
    public username: string;
    //@ts-ignore
    public requestCount: number;

    constructor(data: any)
    {
        if(data["username"] !== undefined)
            this.username = data["username"];
        if(data["requestCount"] !==undefined)
            this.requestCount= data["requestCount"];     
    }
}

export default HuulkUserThrottleData;