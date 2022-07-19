/**
 * Singular utitlity class for building redis credentials
 *
 */
class CredentialsBuilder {
    static buildRedisCredentials(options) {
        let usernamePassword = options.username ?
            `${options.username}:${options.password}@` :
            ``;
        let dbname = options.dbName >= 0 ? '/' + options.dbName : '';
        return `redis://${usernamePassword}${options.hostname}:${options.port}${dbname}`;
    }
}
export default CredentialsBuilder;
