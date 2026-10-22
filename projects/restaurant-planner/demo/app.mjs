import {defaultConfig,defaultShopping,ingredientInfo,parseShopping,validateConfig,validateCatalog,summarizeAllDeliveries,getDeliveryExpenses,calculateTotalExpenses,countCategoryItems,mostPopularDish,expenseTree,csv} from './model.mjs';
const $=id=>document.getElementById(id);
function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
const money=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateText=s=>new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const isoDate=r=>`2026-${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`;
let config=defaultConfig(),worker,pending,lastReservation,lastDeliveries=[];
const originalExtras=$('extra-expenses').value,originalDishOrders=$('dish-input').value,originalCategory=$('category-input').value;
const tabs=[$('tab-reservations'),$('tab-supplies')];
function selectTab(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;$(tab.getAttribute('aria-controls')).hidden=i!==index;});if(focus)tabs[index].focus();}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(i));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%2;if(e.key==='ArrowLeft')next=(i+1)%2;if(e.key==='Home')next=0;if(e.key==='End')next=1;if(next!==undefined){e.preventDefault();selectTab(next,true);}});});
function input(field,value,label,type='text'){const el=node('input',undefined,{'data-field':field,'aria-label':label,type,required:''});el.value=value;if(type==='number'){el.min=['size','capacity'].includes(field)?'1':'0';el.max='30';el.step='1';}return el;}
function editor(kind,items){
 const body=$(kind+'-input');body.replaceChildren();
 items.forEach((item,index)=>{
  const tr=node('tr',undefined,{'data-row':kind});const add=el=>tr.appendChild(node('td')).appendChild(el);
  if(kind==='groups'){
   add(input('name',item.name,`Group ${index+1} name`));add(input('size',item.size,`Group ${index+1} guests`,'number'));
   const select=node('select',undefined,{'data-field':'time','aria-label':`Group ${index+1} time`});for(const value of ['morning','evening'])select.append(node('option',value,{value}));select.value=item.time;add(select);
   add(input('dishes',item.dishes.join(', '),`Group ${index+1} dishes`));
  }else if(kind==='tables'){add(input('name',item.name,`Table ${index+1} name`));add(input('capacity',item.capacity,`Table ${index+1} seats`,'number'));}
  else {const date=input('date',item.date,`Date ${index+1}`,'date');date.min='2026-01-01';date.max='2026-12-31';add(date);add(input('staff',item.staff,`Date ${index+1} staff`,'number'));}
  const remove=node('button','×',{type:'button',class:'remove','aria-label':`Remove ${kind==='days'?'date':kind.slice(0,-1)} ${index+1}`});
  remove.addEventListener('click',()=>{config=readConfig();config[kind].splice(index,1);renderConfig();dirtyReservations();});add(remove);body.append(tr);
 });
}
function renderConfig(){editor('groups',config.groups);editor('tables',config.tables);editor('days',config.days);$('add-group').disabled=config.groups.length>=8;$('add-table').disabled=config.tables.length>=6;$('add-day').disabled=config.days.length>=4;}
function readConfig(){
 const read=kind=>[...$(kind+'-input').children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value])));
 return {groups:read('groups').map(g=>({...g,dishes:g.dishes.split(',').map(s=>s.trim()).filter(Boolean)})),tables:read('tables'),days:read('days')};
}
function dirtyReservations(){lastReservation=undefined;$('reservation-result').hidden=true;$('reservation-error').hidden=true;$('reservation-status').textContent='Inputs changed. Generate a new schedule.';}
$('reservation-form').addEventListener('input',dirtyReservations);
for(const kind of ['group','table','day'])$('add-'+kind).addEventListener('click',()=>{
 config=readConfig();
 if(kind==='group'){const used=new Set(config.groups.map(g=>g.name));const name=[...'abcdefghijklmno'].find(x=>!used.has(x));config.groups.push({name,size:2,time:'morning',dishes:['rice_bowl']});}
 if(kind==='table'){let n=1;while(config.tables.some(t=>t.name==='t'+n))n++;config.tables.push({name:'t'+n,capacity:4});}
 if(kind==='day'){let next='2026-02-15';const raw=config.days.at(-1)?.date;const d=new Date((raw||'2026-02-14')+'T00:00:00Z');if(Number.isFinite(+d)){d.setUTCDate(d.getUTCDate()+1);next=d.toISOString().slice(0,10);}config.days.push({date:next,staff:2});}
 renderConfig();dirtyReservations();
});
function requestSchedule(c){
 return new Promise((resolve,reject)=>{
  if(!worker){worker=new Worker(new URL('./worker.js',import.meta.url));worker.onmessage=event=>{if(!pending||event.data.id!==pending.id)return;const current=pending;pending=undefined;clearTimeout(current.timer);if(event.data.error){worker.terminate();worker=undefined;current.reject(Error(event.data.error));}else current.resolve(event.data.result);};worker.onerror=()=>{if(pending){clearTimeout(pending.timer);pending.reject(Error('The Prolog engine could not load. Check your connection and try again.'));pending=undefined;}worker?.terminate();worker=undefined;};}
  const id=Date.now();const timer=setTimeout(()=>{worker?.terminate();worker=undefined;pending=undefined;reject(Error('The engine took too long. Check your connection, or try a smaller restaurant configuration.'));},30000);
  pending={id,resolve,reject,timer};worker.postMessage({id,config:c});
 });
}
function rowsToTable(body,rows){body.replaceChildren();for(const cells of rows){const tr=node('tr');for(const text of cells)tr.append(node('td',String(text)));body.append(tr);}}
async function runReservations(event){
 event?.preventDefault();$('reservation-error').hidden=true;$('reservation-result').hidden=true;lastReservation=undefined;
 try{
  const snapshot=validateConfig(readConfig());$('reservation-inputs').disabled=true;$('reservation-status').textContent=worker?'Searching for a valid schedule…':'Loading Prolog and searching for a valid schedule…';
  const result=await requestSchedule(snapshot);
  if(!result.feasible){$('reservation-status').textContent='No valid schedule exists for these inputs. Try another date, a larger table, or more staff.';return;}
  lastReservation={...result,config:snapshot};
  const sorted=[...result.rows].sort((a,b)=>isoDate(a).localeCompare(isoDate(b))||(a.time==='morning'?-1:1)-(b.time==='morning'?-1:1)||a.group.localeCompare(b.group));
  rowsToTable($('schedule-output'),sorted.map(r=>[dateText(isoDate(r)),r.time,r.group,r.table]));
  $('schedule-count').textContent=`${result.rows.length} groups assigned`;$('ingredients-output').replaceChildren();
  for(const row of [...result.ingredients].sort((a,b)=>isoDate(a).localeCompare(isoDate(b)))){
   const counts=new Map();row.items.forEach(item=>counts.set(item,(counts.get(item)||0)+1));const div=node('div',undefined,{class:'ingredient-day'});div.append(node('strong',dateText(isoDate(row))),node('p',[...counts].map(([name,count])=>`${name} × ${count}`).join(' · ')));$('ingredients-output').append(div);
  }
  $('reservation-result').hidden=false;$('reservation-status').textContent='Schedule found. All groups have a table at their preferred time.';
 }catch(error){$('reservation-status').textContent='';$('reservation-error').textContent=error.message;$('reservation-error').hidden=false;}
 finally{$('reservation-inputs').disabled=false;}
}
$('reservation-form').addEventListener('submit',runReservations);
$('reset-reservations').addEventListener('click',()=>{config=defaultConfig();renderConfig();runReservations();});
function download(name,content){const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=node('a',undefined,{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download-reservations').addEventListener('click',()=>{if(lastReservation)download('reservations.csv',lastReservation.reservationsCSV);});
$('download-shopping').addEventListener('click',()=>{if(lastReservation)download('shopping-list.csv',lastReservation.shoppingCSV);});
$('send-to-supplies').addEventListener('click',()=>{
 if(!lastReservation)return;
 $('shopping-input').value=[...lastReservation.ingredients].sort((a,b)=>isoDate(a).localeCompare(isoDate(b))).map(r=>isoDate(r)+' | '+r.items.join(', ')).join('\n');
 $('dish-input').value=lastReservation.config.groups.flatMap(g=>g.dishes).join(', ');
 selectTab(1,true);calculateSupplies();$('supply-status').textContent='Ingredient list transferred from your Prolog schedule. Supplies calculated below.';
});
function renderCatalog(){
 $('catalog-input').replaceChildren();ingredientInfo.forEach(([name,days,price])=>{
  const row=node('tr',undefined,{'data-name':name});row.append(node('td',name));const lead=input('lead',days,`${name} lead time`,'number');lead.max='90';const cost=input('price',price,`${name} unit price`,'number');cost.step='.01';cost.max='100000';row.appendChild(node('td')).append(lead);row.appendChild(node('td')).append(cost);$('catalog-input').append(row);
 });
}
function treeView(tree){const ul=node('ul',undefined,{class:'expense-node'});for(const child of tree.children||[]){const li=node('li');if(child.children){li.append(node('strong',child.name),treeView(child));}else li.append(node('span',`${child.name} · ${dateText(child.date)} · ${money(child.price)}`));ul.append(li);}return ul;}
function calculateSupplies(event){
 event?.preventDefault();$('supply-error').hidden=true;$('supply-result').hidden=true;
 try{
  const shopping=parseShopping($('shopping-input').value),catalog=validateCatalog([...$('catalog-input').children].map(row=>[row.dataset.name,row.querySelector('[data-field=lead]').value,row.querySelector('[data-field=price]').value]));
  const deliveries=summarizeAllDeliveries(shopping,catalog),tree=expenseTree(deliveries,$('extra-expenses').value),category=$('category-input').value.trim();
  if(!category)throw Error('Enter a category name to count its items.');
  lastDeliveries=deliveries;rowsToTable($('supply-output'),deliveries.map(r=>[dateText(r.date),r.name,r.quantity,money(r.total)]));
  $('supply-total').textContent=money(calculateTotalExpenses(getDeliveryExpenses(deliveries)));$('expense-total').textContent=money(calculateTotalExpenses(tree));$('category-label').textContent=category+' · items';$('category-total').textContent=countCategoryItems(category,tree);
  $('popular-output').textContent=mostPopularDish($('dish-input').value.split(',').map(x=>x.trim()).filter(Boolean)).join(', ')||'No dish orders';$('expense-output').replaceChildren(treeView(tree));
  $('supply-result').hidden=false;$('supply-status').textContent=`${deliveries.length} ingredient orders across ${new Set(deliveries.map(d=>d.date)).size} dates.`;
 }catch(error){lastDeliveries=[];$('supply-status').textContent='';$('supply-error').textContent=error.message;$('supply-error').hidden=false;}
}
$('supply-form').addEventListener('submit',calculateSupplies);
$('reset-supplies').addEventListener('click',()=>{$('shopping-input').value=defaultShopping;$('extra-expenses').value=originalExtras;$('dish-input').value=originalDishOrders;$('category-input').value=originalCategory;renderCatalog();calculateSupplies();});
$('supply-form').addEventListener('input',()=>{$('supply-result').hidden=true;$('supply-error').hidden=true;$('supply-status').textContent='Inputs changed. Calculate supplies to update the plan.';lastDeliveries=[];});
$('download-supplies').addEventListener('click',()=>{if(lastDeliveries.length)download('supply-plan.csv',csv(['Order by','Ingredient','Quantity','Total cost'],lastDeliveries.map(r=>[r.date,r.name,r.quantity,r.total.toFixed(2)])));});
renderConfig();renderCatalog();$('shopping-input').value=defaultShopping;calculateSupplies();runReservations();
