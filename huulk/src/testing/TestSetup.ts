import { CookieOptions, CSRF_HEADER, HuulkSession, NodeRequest, NodeResponse, SESSION_COOKIE_NAME, UserObjectSessionDataTypeBase } from "../HuulkTypes";
import { HuulkSessionManager } from "../SessionManager/HuulkSessionManager";
const  INVALID_SESSION_STATUS_CODE: number = 444;
let huulkPrisma: HuulkSessionManager;
let huulkRedis: HuulkSessionManager;



function mockEmptyNodeRequest(): NodeRequest<UserObjectSessionDataTypeBase> {
    let req: NodeRequest<UserObjectSessionDataTypeBase> = {
        headers: {},
        cookies: {},
        body: undefined,
        //@ts-ignore
        huulkSession: undefined
    }

    return req;
}

function mockNodeRequest(csrfToken:string | undefined, sessionId: string | undefined, huulkSession: HuulkSession<UserObjectSessionDataTypeBase>|undefined): NodeRequest<UserObjectSessionDataTypeBase> {
    let req: NodeRequest<UserObjectSessionDataTypeBase> = {
        headers: {},
        cookies: {},
        body: undefined,
        //@ts-ignore
        huulkSession: huulkSession
    }

    if(csrfToken !== undefined)
       req.headers[CSRF_HEADER] = csrfToken;
    if(sessionId!== undefined)
        req.cookies[SESSION_COOKIE_NAME] = sessionId;
    if(huulkSession !== undefined)
        req.huulkSession  = huulkSession;    

    return req;
}
function mockEmptyNodeResponse(): NodeResponse {

    let res: NodeResponse = {
        //@ts-ignore
        headers : {},
        statusCode: 0,
        cookie: function (cookieName: string, cookieValue: string, cookieOptions: CookieOptions) {
        },
        end: function (arg?: string | undefined) {
        },
        clearCookie: function () {
        },
        status: function (statuCode: number): NodeResponse {
            return this;
        },
        setHeader(headerName: string, headerValue: any) {
            if(this.getHeaders()[headerName] !== undefined)
            {
                this.getHeaders()[headerName].push(headerValue)
            }
            else 
            {
                
            }
        },
        getHeaders: function () {
            
        }
    }
    return res;
}
export {mockNodeRequest,mockEmptyNodeRequest, mockEmptyNodeResponse}



