// Browser adaptation of the Haskell milestone. The original 48.hs is preserved.
export const ingredientInfo = [
 ['rice',20,1.2],['apples',5,5],['flour',1,.5],['eggs',1,2],['butter',3,12],
 ['garlic',11,4.5],['salt',0,.25],['pepper',66,.75],['sugar',7,6],['goat_meat',20,1.2]
];
export const recipes = {dough:['flour','eggs'],pastry:['dough','butter']};
// An illustrative menu using the ingredient names from the Haskell starter data.
export const menu = {
 rice_bowl:['rice','garlic','salt'], apple_cake:['apples','flour','eggs','butter','sugar'],
 garlic_bread:['flour','butter','garlic','salt'], omelette:['eggs','salt','pepper']
};
export const defaultConfig = () => ({
 groups:[{name:'a',size:1,time:'morning',dishes:['rice_bowl']},{name:'b',size:4,time:'evening',dishes:['apple_cake']},{name:'c',size:3,time:'morning',dishes:['garlic_bread']},{name:'d',size:2,time:'evening',dishes:['omelette']}],
 tables:[{name:'t1',capacity:2},{name:'t2',capacity:4},{name:'t3',capacity:1}],
 days:[{date:'2026-02-15',staff:1},{date:'2026-02-17',staff:2}]
});
export const defaultShopping = '2026-02-15 | flour, eggs, rice\n2026-02-17 | sugar, butter, flour, flour, dough\n2026-03-05 | salt, pepper, garlic';
export function integer(value,min,max,label){const n=Number(value);if(String(value).trim()===''||!Number.isInteger(n)||n<min||n>max)throw Error(`${label} must be a whole number from ${min} to ${max}.`);return n;}
export function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Use a date in YYYY-MM-DD format.');
 const d=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value||+value.slice(0,4)<2020||+value.slice(0,4)>2035)throw Error('Use a valid date between 2020 and 2035.');
 return value;
}
export function validateConfig(input){
 const atom=(v,label)=>{if(!/^[a-z][a-z0-9_]{0,23}$/.test(v))throw Error(`${label}: use lowercase letters, digits, and underscores, starting with a letter.`);return v;};
 if(!input.groups.length||input.groups.length>8||!input.tables.length||input.tables.length>6||!input.days.length||input.days.length>4)throw Error('Use 1–8 groups, 1–6 tables, and 1–4 dates.');
 const groups=input.groups.map(g=>({name:atom(g.name,'Group name'),size:integer(g.size,1,30,'Group size'),time:g.time,dishes:g.dishes}));
 groups.forEach(g=>{if(!['morning','evening'].includes(g.time))throw Error('Select morning or evening.');if(!g.dishes.length||g.dishes.length>12||g.dishes.some(d=>!Object.hasOwn(menu,d)))throw Error('Choose dishes from the example menu (up to 12 per group).');});
 const tables=input.tables.map(t=>({name:atom(t.name,'Table name'),capacity:integer(t.capacity,1,30,'Table capacity')}));
 const days=input.days.map(d=>({date:validDate(d.date),staff:integer(d.staff,0,12,'Staff count')}));
 if(days.some(d=>!d.date.startsWith('2026-')))throw Error('Reservation dates must be in 2026: the Prolog date format stores day and month only.');
 for(const [items,key,label] of [[groups,'name','Group names'],[tables,'name','Table names'],[days,'date','Dates']])if(new Set(items.map(x=>x[key])).size!==items.length)throw Error(label+' must be unique.');
 return {groups,tables,days};
}
export function flattenIngredients(list,depth=0){
 if(depth>10)throw Error('Recipes are nested too deeply.');
 return list.flatMap(item=>typeof item==='string'?(Object.hasOwn(recipes,item)?flattenIngredients(recipes[item],depth+1):[item]):flattenIngredients(item.ingredients,depth+1));
}
export function parseShopping(text){
 const lines=text.trim().split(/\r?\n/).filter(x=>x.trim());
 if(!lines.length||lines.length>20)throw Error('Enter between 1 and 20 shopping-list rows.');
 const rows=lines.map(line=>{const parts=line.split('|');if(parts.length!==2)throw Error('Each row should be: YYYY-MM-DD | ingredient, ingredient');const date=validDate(parts[0].trim());const items=parts[1].split(',').map(s=>s.trim()).filter(Boolean);if(!items.length||items.length>100)throw Error('Each date needs between 1 and 100 ingredients.');return {date,items};});
 if(new Set(rows.map(r=>r.date)).size!==rows.length)throw Error('Combine ingredients for the same date into a single row.');
 return rows;
}
export function validateCatalog(rows){
 return rows.map(([name,days,price])=>{const lead=integer(days,0,90,'Lead time');const p=Number(price);if(String(price).trim()===''||!Number.isFinite(p)||p<0||p>100000)throw Error('Unit prices must be between 0 and 100,000.');return [name,lead,p];});
}
export function calculateDeliveryDates(date,items,catalog=ingredientInfo){
 validDate(date);const info=new Map(catalog.map(([name,days,price])=>[name,{days,price}]));
 return flattenIngredients(items).map(name=>{const item=info.get(name);if(!item)throw Error(`Unknown ingredient: ${name}. Use the names listed in the supplier table.`);const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-item.days);return {date:d.toISOString().slice(0,10),name,price:item.price};});
}
export function summarizeAllDeliveries(shopping,catalog=ingredientInfo){
 const groups=new Map();
 for(const row of shopping)for(const item of calculateDeliveryDates(row.date,row.items,catalog)){
  const key=item.date+'|'+item.name;if(!groups.has(key))groups.set(key,{...item,quantity:0,total:0});const v=groups.get(key);v.quantity++;v.total+=item.price;
 }
 return [...groups.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
export function getDeliveryExpenses(rows){return {name:'Food Supplies',children:rows.map(r=>({name:r.name,price:r.total,date:r.date}))};}
export function calculateTotalExpenses(expense){return expense.children?expense.children.reduce((sum,e)=>sum+calculateTotalExpenses(e),0):expense.price;}
export function countCategoryItems(target,expense){
 const leaves=node=>node.children?node.children.reduce((n,c)=>n+leaves(c),0):1;
 if(!expense.children)return 0;
 return expense.name===target?leaves(expense):expense.children.reduce((n,c)=>n+countCategoryItems(target,c),0);
}
export function mostPopularDish(items){
 const counts=new Map();items.forEach(i=>counts.set(i,(counts.get(i)||0)+1));const max=Math.max(0,...counts.values());
 return [...counts].filter(([,n])=>n===max).map(([name])=>name).reverse();
}
export function expenseTree(deliveries,text){
 const root={name:'Restaurant Expenses',children:[getDeliveryExpenses(deliveries)]};
 for(const line of text.split(/\r?\n/).filter(l=>l.trim())){
  const parts=line.split('|').map(s=>s.trim());if(parts.length!==4)throw Error('Extra expenses: use Category / Subcategory | Item | Price | YYYY-MM-DD.');
  const [path,name,rawPrice,date]=parts,price=Number(rawPrice),segments=path.split('/').map(x=>x.trim());
  if(!name||!segments.every(Boolean)||segments.length>5||!Number.isFinite(price)||price<0||price>1000000)throw Error('Use valid category names, an item name, and a non-negative expense.');
  validDate(date);let parent=root;
  for(const segment of segments){let node=parent.children.find(x=>x.name===segment&&x.children);if(!node){node={name:segment,children:[]};parent.children.push(node);}parent=node;}
  parent.children.push({name,price,date});
 }
 return root;
}
export function csv(headers,rows){const cell=value=>{const s=String(value);return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};return [headers,...rows].map(row=>row.map(cell).join(',')).join('\n')+'\n';}
