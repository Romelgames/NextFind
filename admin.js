
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const c=window.NEXTFIND_CONFIG;
const $=id=>document.getElementById(id);
const status=s=>$('status').textContent=s;

const configured=c?.supabaseUrl?.startsWith('https://') &&
  !c.supabaseKey.includes('VUL_HIER');

const client=configured?createClient(c.supabaseUrl,c.supabaseKey):null;

let products=[];
let editing=null;

function clearForm(){
  editing=null;
  $('productForm').reset();
  $('formTitle').textContent='Nieuw product';
  $('condition').value='Gebruikt — goede staat';
}

function showLogin(logged){
  $('loginPanel').classList.toggle('hidden',logged);
  $('dashboard').classList.toggle('hidden',!logged);
}

async function load(){
  const {data,error}=await client.from('products')
    .select('*').order('created_at',{ascending:false});

  if(error){
    status('Laden mislukt: '+error.message);
    return;
  }

  products=data||[];
  const list=$('list');
  list.replaceChildren();

  for(const p of products){
    const row=document.createElement('div');
    row.className='admin-row';

    const info=document.createElement('div');
    info.textContent=`${p.name} — €${Number(p.price).toFixed(2)} — ${
      p.available?'Te koop':'Verkocht'
    }`;

    const actions=document.createElement('div');

    for(const [label,fn] of [
      ['Bewerken',()=>edit(p)],
      ['Verkocht / te koop',()=>toggle(p)],
      ['Verwijderen',()=>remove(p)]
    ]){
      const b=document.createElement('button');
      b.className='btn secondary';
      b.textContent=label;
      b.addEventListener('click',fn);
      actions.append(b);
    }

    row.append(info,actions);
    list.append(row);
  }

  if(!products.length){
    list.textContent='Nog geen producten toegevoegd.';
  }
}

function edit(p){
  editing=p.id;
  $('formTitle').textContent='Product bewerken';

  for(const k of [
    'name','price','category','condition','description'
  ]){
    $(k).value=p[k];
  }

  $('available').value=String(p.available);
  $('image').value='';
  window.scrollTo({top:0,behavior:'smooth'});
}

async function toggle(p){
  const {error}=await client.from('products')
    .update({available:!p.available}).eq('id',p.id);

  if(error){
    status('Wijzigen mislukt: '+error.message);
  }else{
    status('Beschikbaarheid bijgewerkt.');
    await load();
  }
}

async function remove(p){
  if(!confirm(`Weet je zeker dat je ${p.name} wilt verwijderen?`)){
    return;
  }

  const {error}=await client.from('products')
    .delete().eq('id',p.id);

  if(error){
    status('Verwijderen mislukt: '+error.message);
  }else{
    status('Product verwijderd.');
    await load();
  }
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!client)return;

  status('Inloggen...');

  const {error}=await client.auth.signInWithPassword({
    email:$('email').value,
    password:$('password').value
  });

  if(error){
    status('Inloggen mislukt: '+error.message);
    return;
  }

  showLogin(true);
  $('password').value='';
  status('Ingelogd.');
  await load();
});

$('logout').addEventListener('click',async()=>{
  await client.auth.signOut();
  showLogin(false);
  clearForm();
  status('Uitgelogd.');
});

$('cancel').addEventListener('click',clearForm);

$('productForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!client)return;

  const btn=$('save');
  btn.disabled=true;
  status('Product opslaan...');

  try{
    let image_url=products.find(p=>p.id===editing)?.image_url||null;
    const file=$('image').files[0];

    if(file){
      if(file.size>5*1024*1024){
        throw Error('Foto is groter dan 5 MB.');
      }

      if(![
        'image/jpeg','image/png','image/webp'
      ].includes(file.type)){
        throw Error('Gebruik JPG, PNG of WebP.');
      }

      const ext=({
        'image/jpeg':'jpg',
        'image/png':'png',
        'image/webp':'webp'
      })[file.type];

      const path=`${crypto.randomUUID()}.${ext}`;

      const {error}=await client.storage
        .from('product-images')
        .upload(path,file,{contentType:file.type});

      if(error)throw error;

      image_url=client.storage
        .from('product-images')
        .getPublicUrl(path).data.publicUrl;
    }

    const data={
      name:$('name').value.trim(),
      price:Number($('price').value),
      category:$('category').value,
      condition:$('condition').value.trim(),
      description:$('description').value.trim(),
      available:$('available').value==='true',
      image_url
    };

    if(
      !data.name||
      !data.description||
      !Number.isFinite(data.price)||
      data.price<0
    ){
      throw Error('Controleer de productgegevens.');
    }

    const result=editing?
      await client.from('products').update(data).eq('id',editing):
      await client.from('products').insert(data);

    if(result.error)throw result.error;

    clearForm();
    status('Product opgeslagen en zichtbaar op de webshop.');
    await load();

  }catch(err){
    status('Opslaan mislukt: '+err.message);
  }finally{
    btn.disabled=false;
  }
});

if(!configured){
  status('Vul eerst je Supabase URL en publishable key in config.js in.');
}else{
  const {data}=await client.auth.getSession();
  showLogin(Boolean(data.session));
  if(data.session)await load();
}
