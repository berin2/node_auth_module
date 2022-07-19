import { type } from "os";
import { HuulkSession, UserObjectSessionDataTypeBase } from "../../../HuulkTypes";
import { HuulkSessionMetadataBase } from "../../HuulkSessionManagerTypes";

let types: Map<string,HuulkSession<UserObjectSessionDataTypeBase>>;





class HuulkSessionMetadataRedis implements HuulkSessionMetadataBase {
    username: string
    sessionCount: number
    sessionKeys: string []

    constructor(redisData: any)
    {
        this.username = redisData["username"];
        this.sessionCount = redisData["sessionCount"]
        this.sessionKeys = redisData["sessionKeys"]
    }
}

export {HuulkSessionMetadataRedis};