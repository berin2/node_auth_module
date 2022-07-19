import { HuulkCacheOptions } from "../HuulkTypes";


/**
 * Singular utitlity class for building redis credentials
 * 
 */
abstract class CredentialsBuilder
{
    public static buildRedisCredentials(options: HuulkCacheOptions): string
    {
        let usernamePassword: string = options.username ?  
        `${options.username}:${options.password}@`:
        ``;
        let dbname: string | number = options.dbName >= 0 ? '/' + options.dbName : '';
        return `redis://${usernamePassword}${options.hostname}:${options.port}${dbname}`;
    }
}

export default CredentialsBuilder;