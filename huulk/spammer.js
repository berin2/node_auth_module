import http from "http";
import cluster from "cluster";
import os from "os"
import { request } from "https";
import { rmSync } from "fs";

const options = {
    host:"127.0.0.1",
    port:9999,
    method: 'POST',
    path: "/login",
    timeout:6000
  };

  let strings = []

  let json = {"user":"hi",val:45,"prop":45,"nest":{"nested":"something here"}}

  let res = http.request(options)
  
  res.on("data",()=>console.log(JSON.stringify(res)))
  res.on("connect",() => {console.log("TCP connection successfu,l")})
  res.on("error",() => console.log("error!!"))
res.on("socket",()=> console.log("on socket"))
res.on("timeout",()=>console.log("timeout reached."))
res.on("response",(nodeRes) => {
  console.log("response gotten")
  console.log(JSON.stringify(nodeRes.headers["access-control-allow-credentials"]))
})

res.end()

  
  
