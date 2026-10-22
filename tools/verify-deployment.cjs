'use strict';
// Public HTTPS verification, with no Cloudflare credentials or local auth files.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const local=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/release.json'),'utf8'));
const base=new URL(process.argv[2]||'https://mumu-crayon.reinhardt7177.workers.dev/');
assert.equal(base.protocol,'https:');
const expected=process.env.GITHUB_SHA||local.commit;
assert.ok(expected&&/^[a-f0-9]{40}$/.test(expected),'A built commit is required.');
assert.equal(local.commit,expected,'Build and workflow revisions differ.');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function url(file){const target=new URL(file,base);target.searchParams.set('revision',expected);return target;}
async function get(file){
  const response=await fetch(url(file),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,'Missing deployed file: '+file);
  return response;
}
async function main(){
  let published,error;
  for(let attempt=0;attempt<12;attempt++){
    try{published=await(await get('release.json')).json();assert.equal(published.commit,expected);error=null;break;}
    catch(e){error=e;if(attempt<11)await pause(5000);}
  }
  if(error)throw error;
  assert.deepEqual(published,local,'Published manifest must match the verified build.');
  const pending=[...published.files];
  await Promise.all(Array.from({length:4},async()=>{
    while(pending.length){
      const file=pending.shift(),data=Buffer.from(await(await get(file.path)).arrayBuffer());
      assert.equal(data.length,file.bytes,file.path+' size');
      assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.path+' hash');
    }
  }));
  for(const file of ['qa/campaign-solutions.json','assets/original/readme.html','tools/verify_campaign.cjs']){
    const response=await fetch(url(file),{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,404,'Development file must not be served: '+file);
  }
  console.log(JSON.stringify({verified:true,url:base.href,commit:expected,files:published.files.length}));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Cloudflare deployment verified\n\n[Play Mumu Crayon](${base.href})\n\nCommit: \`${expected}\` · ${published.files.length} runtime files verified over public HTTPS.\n`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
