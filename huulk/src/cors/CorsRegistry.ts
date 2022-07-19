

// Cors
    // Allowed Hosts
    // Allowed methods
    // Allowed Credentials 
    // Max Cache Age

import { HuulkCorsOptions, HuulkHttpHeaders, HuulkHttpMethods, NodeRequest, NodeResponse, UserObjectSessionDataTypeBase } from "../HuulkTypes.js";



class HuulkCorsRegistry  {
    protected allowedHosts: Set<string>;
    protected allowedMethods: string [];
    protected allowedHeaders: string [];
    protected exposeHeaders: string [];
    protected withCredentials: boolean;
    protected maxAgeMs: number;

    constructor(options:HuulkCorsOptions)
    {
        this.allowedHosts = new Set<string>();
        this.allowedMethods = [];
        this.allowedHeaders = [];
        this.exposeHeaders = [];
        this.withCredentials = true;
        this.maxAgeMs = 4000000000;

        for(let host of options.allowedOrigins)
            this.allowedHosts.add(host);
        this.allowedMethods = options.allowedMethods;
        this.allowedHeaders = options.allowedHeaders;
        this.exposeHeaders = options.allowedHeaders;


    }
    processRequest(req: NodeRequest<UserObjectSessionDataTypeBase>, res: NodeResponse, next: any): void {
        
        let origin = this.allowedHosts.has(req.headers["origin"]) ? req.headers["origin"] : "";
        console.log("Method " + req.method + "method constant " + HuulkHttpMethods.OPTIONS)
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, this.exposeHeaders)
        res.setHeader(HuulkHttpHeaders.VARY, HuulkHttpHeaders.ORIGIN);
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000")
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, this.allowedMethods);
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_MAX_AGE,this.maxAgeMs)
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS,this.withCredentials);
        res.setHeader(HuulkHttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,this.allowedHeaders)
        console.log("WROTE TO RES END");

        if(next !== undefined)
            next()

    }

}




// good stuff
// https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
//HTTP/1.1 204 No Content
//Date: Mon, 01 Dec 2008 01:15:39 GMT
//Server: Apache/2
//Access-Control-Allow-Origin: https://foo.example
//Access-Control-Allow-Methods: POST, GET, OPTIONS
//Access-Control-Allow-Headers: X-PINGOTHER, Content-Type
//Access-Control-Expose-Headers: Content-Type, Custom-Header
//Access-Control-Max-Age: 86400
//Access-Control-Allow-Credentials: true | false

//When Access-Control-Allow-Credentials: true 
// cannot use wildcards in Access-Control-Allowed-Headers, Access-Control-Allow-Methods, and Access-Control-Allow-Origin
// if any contain *, browser will simply not send cookies or throw 400(ish) request to user

//Access-Control-Allow-Origin: https://mozilla.org
//Vary: Origin
// If there is a list of allowed origins, we need to send Vary: Origin back to the browser which will let the browser know that we will

//Access-Control-Expose-Headers: headerOne | header1,header2,and etc.
//Access-Control-Max-Age: miliseconds -> Specifies how long a request can be cached.

export {HuulkCorsRegistry}