import { NO_CSRF } from "../HuulkTypes.js";
function isFalsy(arg) {
    return arg === undefined || arg === null || arg <= 0 || arg == "";
}
function isEmptyArray(arg) {
    return !isFalsy(arg) && arg.length != 0;
}
/**
 * baseValidator Checks if a session is not falsy and it is not expired.
 * @param loadedSession the session to validate
 * @returns true if the session structure is  valid or the session is not falsy.
 */
function baseValidator(loadedSession) {
    let sessionObjectExists = !isFalsy(loadedSession);
    let isNotExpired = false;
    let usernameExists = false;
    if (sessionObjectExists) {
        isNotExpired = loadedSession.maxAge.getMilliseconds() === 0 || loadedSession.maxAge.getMilliseconds() > Date.now().valueOf();
        usernameExists = !isFalsy(loadedSession.sessionUser);
    }
    return sessionObjectExists && isNotExpired && usernameExists;
}
/**
 *  checks if a CSRF token is valid. If it
 * @param req  the node request coming into the application with the cookie
 * @param loadedSession the HuulkSession session object loaded from the db
 * @param csrfEnabled  the boolean csrfEnabled option of Huulk
 * @returns true if csrf is valid or false if it is. If csrf is not enabled, then true is returned by default.
 */
function csrfValidator(csrfToken, loadedSession) {
    let validCSRF = false;
    if (csrfToken !== undefined && loadedSession !== null && !isFalsy(loadedSession.csrfToken) && csrfToken !== NO_CSRF)
        validCSRF = !isFalsy(csrfToken) && loadedSession.csrfToken === csrfToken;
    return validCSRF;
}
function structureValidator(loadedSession) { return true; }
function maxAgeUserValidator(loadedSession) { return true; }
class HuulkSessionValidatorChain {
    constructor(options) {
        this.validationChain = [];
        this.csrfEnabled = options.csrfOptions.enableCSRF;
        if (!options.sessionOptions.disableSessionValidation) {
            this.validationChain.push(structureValidator);
            this.validationChain.push(maxAgeUserValidator);
            if (options.cookieOptions.maxAge > 0)
                this.validationChain.push(maxAgeUserValidator);
        }
    }
    executeChain(csrfTokenheader, session) {
        let isValid = true; // if csrfIsNotenabled this function will return true always
        if (this.csrfEnabled) {
            isValid = csrfValidator(csrfTokenheader, session);
        }
        //iterate through every validator function supplied and set isValid. If a falsy valid value is detected this loop stop and fn returns false.
        for (let validatorFnIter = 0; validatorFnIter < this.validationChain.length && isValid; validatorFnIter++) {
            if (!isFalsy(this.validationChain[validatorFnIter]))
                isValid = this.validationChain[validatorFnIter](session);
            else
                throw Error("FALSY validator function supplied. Critical App error. Falsy validation functions cannot be passed to the validation chain.");
        }
        return isValid;
    }
}
class CookieValidationChain {
    constructor(options) {
    }
}
export { isFalsy, isEmptyArray, HuulkSessionValidatorChain };
