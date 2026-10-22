import {validateConfig,menu} from './model.mjs';
export function knowledgeBase(input){
 const c=validateConfig(input),day=d=>{const [,m,n]=d.split('-').map(Number);return `day(${n},${m})`;};
 return {config:c,days:'['+c.days.map(d=>day(d.date)).join(',')+']',source:[
  ...c.groups.map(g=>`group(${g.name},${g.size},${g.time}).`),
  ...c.days.map(d=>`staff(${day(d.date)},${d.staff}).`),
  `tables([${c.tables.map(t=>`t(${t.name},${t.capacity})`).join(',')}]).`,
  ...Object.entries(menu).map(([name,items])=>`recipe(${name},[${items.join(',')}]).`),
  ...c.groups.map(g=>`order(${g.name},[${g.dishes.join(',')}]).`)
 ].join('\n')};
}
export function runPlanner(swipl,input){
 const kb=knowledgeBase(input);
 swipl.FS.writeFile('/demo-kb.pl',kb.source);
 const load=swipl.prolog.query("consult('/demo-kb.pl').").once();
 if(load?.error)throw Error(load.message);
 const query=`call_with_inference_limit(once(schedule_all_reservations(${kb.days},Schedule)),300000,Limit), (Limit == inference_limit_exceeded -> Result=limit ; needed_ingredients(Schedule,Ingredients), findall(_{day:D,month:M,time:T,group:G,table:B},member(res(day(D,M),T,G,B),Schedule),Rows), findall(_{day:D,month:M,items:I},member((day(D,M),I),Ingredients),Lists), atom_json_dict(Result,_{rows:Rows,ingredients:Lists},[]), write_reservations_to_csv('/reservations.csv',Schedule), write_ingredients_to_csv('/shopping.csv',Ingredients)).`;
 const result=swipl.prolog.query(query).once();
 if(result?.error)throw Error(result.message);
 if(!result?.success)return {feasible:false};
 if(result.Result==='limit')throw Error('This combination needs a longer search. Try fewer groups or add table and staff capacity.');
 return {feasible:true,...JSON.parse(result.Result),reservationsCSV:swipl.FS.readFile('/reservations.csv',{encoding:'utf8'}),shoppingCSV:swipl.FS.readFile('/shopping.csv',{encoding:'utf8'})};
}
