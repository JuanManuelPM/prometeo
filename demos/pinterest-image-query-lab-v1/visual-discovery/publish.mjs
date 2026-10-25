// Publishes only the collector output to the isolated GitHub Pages corpus path.
import fs from "node:fs";
const file="demos/pinterest-image-query-lab-v1/visual-discovery/data/seed-50.json";
const url="https://api.github.com/repos/JuanManuelPM/prometeo/contents/"+file;
const token=process.env.GITHUB_TOKEN;
if(!token)throw Error("Missing GitHub Actions token");
const headers={"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
const current=await fetch(url+"?ref=gh-pages",{headers});
const previous=await current.json().catch(()=>({}));
const body={message:"data(pinterest): publish actual 50-query papercraft evidence",branch:"gh-pages",content:fs.readFileSync("seed-50.json").toString("base64")};
if(current.ok&&previous.sha)body.sha=previous.sha;
const put=await fetch(url,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(body)});
const result=await put.json();
if(!put.ok)throw Error("GitHub Pages corpus write failed "+put.status+" "+JSON.stringify(result).slice(0,350));
console.log("PUBLISHED_CORPUS",result.commit.sha,body.sha?"updated":"created");
