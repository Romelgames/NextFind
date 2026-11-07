
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.NEXTFIND_CONFIG;
const db = createClient(config.supabaseUrl, config.supabaseKey);
const dashboard = document.getElementById('dashboard');

if (dashboard) {
  const root = document.createElement('section');
  root.className = 'panel';

  root.innerHTML = `
    <h2>Ingezonden advertenties</h2>
    <p class="muted">
      Controleer iedere advertentie voordat je deze publiceert.
    </p>
    <button type="button" class="btn secondary"
            id="refreshSubmissions">
      Advertenties vernieuwen
    </button>
    <div id="moderationList"></div>
    <p id="moderationStatus" role="status"></p>
  `;

  dashboard.append(root);

  const list = root.querySelector('#moderationList');
  const message = root.querySelector('#moderationStatus');

  root.querySelector('#refreshSubmissions')
    .addEventListener('click', refresh);

  async function refresh() {
    const { data: authData } = await db.auth.getUser();

    const isAdmin =
      authData.user?.email?.toLowerCase() ===
      'rensheijkamp2007@gmail.com';

    root.classList.toggle('hidden', !isAdmin);

    if (!isAdmin) return;

    message.textContent = 'Advertenties laden...';

    const { data, error } = await db
      .from('community_submissions')
      .select(
        'id,name,description,price,category,condition,contact_email,photo_path,status'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      message.textContent = 'Laadfout: ' + error.message;
      return;
    }

    message.textContent = '';
    list.replaceChildren();

    for (const item of data) {
      const el = document.createElement('div');
      el.className = 'admin-row';
      el.style.display = 'block';

      const title = document.createElement('h3');
      title.textContent =
        `${item.name} — €${Number(item.price).toFixed(2)}`;

      const desc = document.createElement('p');
      desc.style.whiteSpace = 'pre-wrap';

      desc.textContent = `
${item.description}
Categorie: ${item.category}
Staat: ${item.condition}
Contact: ${item.contact_email}
      `.trim();

      const photo = document.createElement('img');

      photo.style.cssText =
        'max-width:220px;max-height:180px;object-fit:contain;display:block;margin:12px 0';

      photo.alt = item.name;

      const { data: photoData } = await db.storage
        .from('community-photos')
        .createSignedUrl(item.photo_path, 120);

      if (photoData?.signedUrl) {
        photo.src = photoData.signedUrl;
      }

      const approve = document.createElement('button');
      approve.className = 'btn';
      approve.textContent = 'Goedkeuren';

      const reject = document.createElement('button');
      reject.className = 'btn secondary';
      reject.textContent = 'Afwijzen';

      approve.addEventListener('click', () =>
        decide(item.id, 'approved', approve, reject)
      );

      reject.addEventListener('click', () =>
        decide(item.id, 'rejected', approve, reject)
      );

      el.append(
        title,
        desc,
        photo,
        approve,
        ' ',
        reject
      );

      list.append(el);
    }

    if (!data.length) {
      list.textContent = 'Geen advertenties ter beoordeling.';
    }
  }

  async function decide(id, decision, approve, reject) {
    approve.disabled = true;
    reject.disabled = true;

    message.textContent = 'Verwerken...';

    const { data, error } = await db.rpc(
      'review_nextfind_submission',
      {
        p_id: id,
        p_decision: decision
      }
    );

    if (error) {
      message.textContent = 'Fout: ' + error.message;

      approve.disabled = false;
      reject.disabled = false;
      return;
    }

    await refresh();

    message.textContent = data || 'Verwerkt.';
  }

  db.auth.onAuthStateChange(() => {
    setTimeout(refresh, 0);
  });

  refresh();
}
