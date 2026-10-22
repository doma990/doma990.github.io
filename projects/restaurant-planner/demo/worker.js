/* Runs the unchanged Prolog submission away from the page's UI thread. */
let enginePromise;
async function engine(){
 if(!enginePromise)enginePromise=(async()=>{
  importScripts('https://cdn.jsdelivr.net/npm/swipl-wasm@8.1.4/dist/swipl/swipl-bundle.js');
  const swipl=await SWIPL({arguments:['-q'],print:()=>{},printErr:()=>{}});
  const response=await fetch(new URL('original/48.pl',self.location.href));
  if(!response.ok)throw Error('The original Prolog source could not be loaded.');
  swipl.FS.writeFile('/project.pl',await response.text());
  const result=swipl.prolog.query("consult('/project.pl').").once();
  if(result?.error)throw Error(result.message);
  return swipl;
 })();
 return enginePromise;
}
self.onmessage=async event=>{
 const {id,config}=event.data;
 try{const [{runPlanner},swipl]=await Promise.all([import('./prolog.mjs'),engine()]);self.postMessage({id,result:runPlanner(swipl,config)});}
 catch(error){self.postMessage({id,error:error.message||'The Prolog engine could not load. Check your connection and retry.'});}
};
