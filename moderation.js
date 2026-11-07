
import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2';

const config = window.NEXTFIND_CONFIG;
const db = createClient(config.supabaseUrl, config.supabaseKey);

const dashboard = document.getElementById('dashboard');

if (dashboard) {
  const root = document.createElement('section');
  root.className = 'panel';

  root.innerHTML = `
    <h2>Ingezonden advertenties</h2>
    <p class="muted">
      Controleer de advertentie en foto.
      Bij goedkeuren verschijnt het product op NextFind.
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

  root.querySelector('#refreshSubmissions').onclick = refresh;

  async function refresh() {
    const { data: authData } = await db.auth.getUser();

    if (!authData.user) {
      root.classList.add('hidden');
      return;
    }

    root.classList.remove('hidden');
    message.textContent = 'Advertenties laden...';

    const { data, error } = await db
      .from('community_submissions')
      .select('*')
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

      const description = document.createElement('p');
      description.style.whiteSpace = 'pre-wrap';
      description.textContent =
        `${item.description}
Categorie: ${item.category}
Staat: ${item.condition}
Contact: ${item.contact_email}`;

      const photo = document.createElement('img');
      photo.style.cssText =
        'max-width:220px;max-height:180px;object-fit:contain;display:block;margin:12px 0';

      const { data: photoData } = await db.storage
        .from('community-photos')
        .createSignedUrl(item.photo_path, 120);

      if (photoData) {
        photo.src = photoData.signedUrl;
        photo.alt = item.name;
      }

      const approve = document.createElement('button');
      approve.className = 'btn';
      approve.textContent = 'Goedkeuren';

      const reject = document.createElement('button');
      reject.className = 'btn secondary';
      reject.textContent = 'Afwijzen';

      approve.onclick = () =>
        decide(item, 'approved', approve, reject);

      reject.onclick = () =>
        decide(item, 'rejected', approve, reject);

      el.append(
        title, description, photo,
        approve, ' ', reject
      );

      list.append(el);
    }

    if (!data.length) {
      list.textContent = 'Geen advertenties ter beoordeling.';
    }
  }

  async function decide(item, decision, approve, reject) {
    approve.disabled = true;
    reject.disabled = true;
    message.textContent = 'Verwerken...';

    try {
      if (decision === 'approved') {
        const { data: photoData } = db.storage
          .from('community-photos')
          .getPublicUrl(item.photo_path);

        const { error: productError } = await db
          .from('products')
          .insert({
            name: item.name,
            description:
              item.description +
              '\nAangeboden door een externe verkoper. Contact via NextFind.',
            category: item.category,
            condition: item.condition,
            price: item.price,
            image_url: photoData.publicUrl,
            available: true
          });

        if (productError) throw productError;
      }

      const { error } = await db
        .from('community_submissions')
        .update({ status: decision })
        .eq('id', item.id)
        .eq('status', 'pending');

      if (error) throw error;

      message.textContent =
        decision === 'approved'
          ? 'Advertentie goedgekeurd.'
          : 'Advertentie afgewezen.';

      await refresh();

    } catch (error) {
      message.textContent = 'Fout: ' + error.message;
    } finally {
      approve.disabled = false;
      reject.disabled = false;
    }
  }

  db.auth.onAuthStateChange(() => {
    setTimeout(refresh, 0);
  });

  refresh();
}
