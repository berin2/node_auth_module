let types;
class HuulkSessionMetadataRedis {
    constructor(redisData) {
        this.username = redisData["username"];
        this.sessionCount = redisData["sessionCount"];
        this.sessionKeys = redisData["sessionKeys"];
    }
}
export { HuulkSessionMetadataRedis };
