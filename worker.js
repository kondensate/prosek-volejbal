// Cloudflare Worker: proxy official ČVS iCalendar feeds to the PWA.
// Deploy this file as a Worker and set the PWA API URL to the Worker URL.
const FEEDS = {
  U18: "https://cvf.cz/souteze/celostatni-souteze?clubDetailWidget-competitionId=18670&clubDetailWidget-teamId=93471&competitionId=18670&do=clubDetailWidget-ical&filteredGroupId=29231&mode=clubs&teamId=93471",
  U20: "https://www.cvf.cz/souteze/celostatni-souteze?clubDetailWidget-competitionId=18666&clubDetailWidget-teamId=93392&competitionId=18666&do=clubDetailWidget-ical&filteredGroupId=29228&mode=clubs&teamId=93392",
  U22: "https://cvf.cz/souteze/celostatni-souteze?clubDetailWidget-competitionId=18662&clubDetailWidget-teamId=93313&competitionId=18662&do=clubDetailWidget-ical&mode=clubs&teamId=93313",
  MEN: "https://cvf.cz/souteze/celostatni-souteze?clubDetailWidget-competitionId=18660&clubDetailWidget-teamId=93264&competitionId=18660&do=clubDetailWidget-ical&filteredGroupId=29153&mode=clubs&teamId=93264"
};
function unescapeICS(s){return s.replace(/\\n/g,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\")}
function parseICS(text, cat){
  const lines=text.replace(/\r\n/g,"\n").replace(/\n[ \t]/g,"").split("\n");
  const out=[]; let e=null;
  for(const line of lines){
    if(line==="BEGIN:VEVENT"){e={category:cat};continue}
    if(line==="END:VEVENT"){if(e?.start) out.push(e); e=null; continue}
    if(!e) continue;
    const i=line.indexOf(":"); if(i<0) continue;
    const k=line.slice(0,i).split(";")[0], v=unescapeICS(line.slice(i+1));
    if(k==="DTSTART") e.start=v;
    if(k==="DTEND") e.end=v;
    if(k==="SUMMARY") e.summary=v;
    if(k==="LOCATION") e.location=v;
    if(k==="UID") e.uid=v;
  }
  return out;
}
export default {
  async fetch(req) {
    const url=new URL(req.url);
    if(url.pathname!=="/events") return new Response("Prosek Volejbal API",{status:200});
    const all=[];
    await Promise.all(Object.entries(FEEDS).map(async ([cat,u])=>{
      try{
        const r=await fetch(u,{headers:{"User-Agent":"ProsekVolejbal/1.0"}});
        const text=await r.text();
        all.push(...parseICS(text,cat==="MEN"?"Muži":cat));
      }catch(e){}
    }));
    all.sort((a,b)=>(a.start||"").localeCompare(b.start||""));
    return new Response(JSON.stringify({updatedAt:new Date().toISOString(),events:all}),{
      headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"public, max-age=300"}
    });
  }
}
