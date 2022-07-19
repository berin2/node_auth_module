import { CSRF_HEADER, SESSION_COOKIE_NAME } from "../HuulkTypes";
const INVALID_SESSION_STATUS_CODE = 444;
let huulkPrisma;
let huulkRedis;
function mockEmptyNodeRequest() {
    let req = {
        headers: {},
        cookies: {},
        body: undefined,
        //@ts-ignore
        huulkSession: undefined
    };
    return req;
}
function mockNodeRequest(csrfToken, sessionId, huulkSession) {
    let req = {
        headers: {},
        cookies: {},
        body: undefined,
        //@ts-ignore
        huulkSession: huulkSession
    };
    if (csrfToken !== undefined)
        req.headers[CSRF_HEADER] = csrfToken;
    if (sessionId !== undefined)
        req.cookies[SESSION_COOKIE_NAME] = sessionId;
    if (huulkSession !== undefined)
        req.huulkSession = huulkSession;
    return req;
}
function mockEmptyNodeResponse() {
    let res = {
        //@ts-ignore
        headers: {},
        statusCode: 0,
        cookie: function (cookieName, cookieValue, cookieOptions) {
        },
        end: function (arg) {
        },
        clearCookie: function () {
        },
        status: function (statuCode) {
            return this;
        },
        setHeader(headerName, headerValue) {
            if (this.getHeaders()[headerName] !== undefined) {
                this.getHeaders()[headerName].push(headerValue);
            }
            else {
            }
        },
        getHeaders: function () {
        }
    };
    return res;
}
export { mockNodeRequest, mockEmptyNodeRequest, mockEmptyNodeResponse };
