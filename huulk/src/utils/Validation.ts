import { SessionOptions } from "http2";
import { CSRF_HEADER, HuulkCSRFOptions, HuulkOptions, HuulkSession, HuulkSessionOptions, NodeRequest, NO_CSRF, UserObjectSessionDataTypeBase } from "../HuulkTypes.js";




function isFalsy(arg:any) : boolean {
    return arg === undefined || arg===null || arg <=0 || arg == "";
}
function isEmptyArray(arg: any [])
{
    return !isFalsy(arg) && arg.length != 0;
}



/**
 * baseValidator Checks if a session is not falsy and it is not expired.
 * @param loadedSession the session to validate
 * @returns true if the session structure is  valid or the session is not falsy.
 */
function baseValidator(loadedSession: HuulkSession<UserObjectSessionDataTypeBase>): boolean {
    let sessionObjectExists: boolean = !isFalsy(loadedSession);
    let isNotExpired:boolean = false;
    let usernameExists: boolean = false;

    if(sessionObjectExists)
    {
        isNotExpired = loadedSession.maxAge.getMilliseconds() === 0 ||loadedSession.maxAge.getMilliseconds() > Date.now().valueOf();
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
function csrfValidator(csrfToken: string | undefined,loadedSession: HuulkSession<UserObjectSessionDataTypeBase> | null): boolean {
    let validCSRF: boolean = false;

    if(csrfToken !== undefined && loadedSession !== null && !isFalsy(loadedSession.csrfToken) && csrfToken !== NO_CSRF)
        validCSRF =  !isFalsy(csrfToken) && loadedSession.csrfToken === csrfToken;

    return validCSRF;
}

function structureValidator(loadedSession: HuulkSession<UserObjectSessionDataTypeBase> | null): boolean {return true;}
function maxAgeUserValidator(loadedSession: HuulkSession<UserObjectSessionDataTypeBase> | null): boolean {return true;}

type HuulkSessionValidatorChainFunction = (session:HuulkSession<UserObjectSessionDataTypeBase>) => boolean;
class HuulkSessionValidatorChain {
    private validationChain:  { (data: HuulkSession<UserObjectSessionDataTypeBase> | null): boolean;} [] ;
    csrfEnabled: boolean;

    constructor(options: HuulkOptions){
        this.validationChain = [];
        this.csrfEnabled = options.csrfOptions.enableCSRF;

        if(!options.sessionOptions.disableSessionValidation)
        {
            this.validationChain.push(structureValidator);
            this.validationChain.push(maxAgeUserValidator);
            if(options.cookieOptions.maxAge > 0) this.validationChain.push(maxAgeUserValidator)
        }
    }

    public executeChain(csrfTokenheader: string | undefined, session:HuulkSession<UserObjectSessionDataTypeBase> | null): boolean {
        let isValid: boolean = true; // if csrfIsNotenabled this function will return true always

        if(this.csrfEnabled)
        {
            isValid = csrfValidator(csrfTokenheader,session);
        }
        //iterate through every validator function supplied and set isValid. If a falsy valid value is detected this loop stop and fn returns false.
        for(let validatorFnIter=0; validatorFnIter < this.validationChain.length && isValid; validatorFnIter++)
        {
            if(!isFalsy(this.validationChain[validatorFnIter]))
                isValid = this.validationChain[validatorFnIter](session);
            else
                throw Error("FALSY validator function supplied. Critical App error. Falsy validation functions cannot be passed to the validation chain.");

        }

        return isValid;
    }
}




class CookieValidationChain {
    constructor(options:HuulkOptions) {

    }


}
export {isFalsy,isEmptyArray,HuulkSessionValidatorChain}