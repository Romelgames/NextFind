
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const c=window.NEXTFIND_CONFIG;
const configured=c?.supabaseUrl?.startsWith('https://') &&
  !c.supabaseKey.includes('VUL_HIER');

const client=configured?createClient(c.supabaseUrl,c.supabaseKey):null;
const grid=document.querySelector('#products');
const message=document.querySelector('#message');

const money=n=>new Intl.NumberFormat('nl-NL',{
  style:'currency',currency:'EUR'
}).format(n);

let items=[];

function render(){
  const q=document.querySelector('#search').value.toLocaleLowerCase('nl');
  const cat=document.querySelector('#category').value;
  const sort=document.querySelector('#sort').value;

  let arr=items.filter(p=>
    (cat==='Alles'||p.category===cat) &&
    [p.name,p.description,p.category].join(' ')
      .toLocaleLowerCase('nl').includes(q)
  );

  arr.sort((a,b)=>
    sort==='low'?a.price-b.price:
    sort==='high'?b.price-a.price:
    new Date(b.created_at)-new Date(a.created_at)
  );

  grid.replaceChildren();
  message.textContent=arr.length?
    `${arr.length} producten gevonden`:
    'Nog geen producten gevonden.';

  for(const p of arr){
    const card=document.createElement('article');
    card.className='product';

    if(p.image_url){
      const img=document.createElement('img');
      img.className='photo';
      img.src=p.image_url;
      img.alt=p.name;
      img.loading='lazy';
      card.append(img);
    }else{
      const ph=document.createElement('div');
      ph.className='photo placeholder';
      ph.textContent='Geen foto';
      card.append(ph);
    }

    const body=document.createElement('div');
    body.className='product-body';

    const tag=document.createElement('div');
    tag.className='tag'+(p.available?'':' sold');
    tag.textContent=p.available?p.category:'VERKOCHT';

    const h=document.createElement('h3');
    h.textContent=p.name;

    const desc=document.createElement('p');
    desc.className='muted';
    desc.textContent=p.description||p.condition;

    const price=document.createElement('div');
    price.className='price';
    price.textContent=money(p.price);

    body.append(tag,h,desc,price);

    if(p.available){
      const a=document.createElement('a');
      a.className='btn';
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.textContent='INFORMEER VIA WHATSAPP ↗';
      a.href=`https://wa.me/${c.whatsapp}?text=${
        encodeURIComponent(
          `Hallo NextFind! Is ${p.name} (${money(p.price)}) nog beschikbaar?`
        )
      }`;
      body.append(a);
    }

    card.append(body);
    grid.append(card);
  }
}

for(const id of ['search','category','sort']){
  document.getElementById(id).addEventListener(
    id==='search'?'input':'change',render
  );
}

document.getElementById('year').textContent=new Date().getFullYear();

if(!configured){
  message.textContent='De webshop is nog niet gekoppeld. Vul config.js in om producten te tonen.';
}else{
  const {data,error}=await client.from('products')
    .select('*').order('created_at',{ascending:false});

  if(error){
    message.textContent='Producten konden niet worden geladen. Controleer de Supabase-instellingen.';
    console.error(error);
  }else{
    items=data||[];
    render();
  }
}
