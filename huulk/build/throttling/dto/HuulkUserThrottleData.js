/**
 * ThrottleDto represents DTO used to transmit throttle data from the client to the ThrottleManager.
 */
class HuulkUserThrottleData {
    constructor(data) {
        if (data["username"] !== undefined)
            this.username = data["username"];
        if (data["requestCount"] !== undefined)
            this.requestCount = data["requestCount"];
    }
}
export default HuulkUserThrottleData;
