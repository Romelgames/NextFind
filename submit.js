
import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2';

const config = window.NEXTFIND_CONFIG;
const db = createClient(config.supabaseUrl, config.supabaseKey);

const $ = id => document.getElementById(id);

function showStatus(message) {
  $('status').textContent = message;
}

function display(user) {
  $('authPanel').classList.toggle('hidden', !!user);
  $('editor').classList.toggle('hidden', !user);

  if (user) loadMine();
}

async function loadMine() {
  const { data, error } = await db
    .from('community_submissions')
    .select('name,status,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    showStatus(error.message);
    return;
  }

  const box = $('mine');
  box.replaceChildren();

  const labels = {
    pending: 'Wacht op goedkeuring',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen'
  };

  for (const item of data) {
    const el = document.createElement('div');
    el.className = 'admin-row';
    el.textContent =
      `${item.name} — ${labels[item.status] || item.status}`;
    box.append(el);
  }

  if (!data.length) {
    box.textContent = 'Nog geen inzendingen.';
  }
}

$('authForm').onsubmit = async event => {
  event.preventDefault();

  const { error } = await db.auth.signInWithPassword({
    email: $('email').value,
    password: $('password').value
  });

  if (error) {
    showStatus(error.message);
    return;
  }

  const { data } = await db.auth.getUser();
  showStatus('Je bent ingelogd.');
  display(data.user);
};

$('signup').onclick = async () => {
  const email = $('email').value;
  const password = $('password').value;

  if (!email || password.length < 8) {
    showStatus('Vul een e-mail en wachtwoord van minimaal 8 tekens in.');
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password
  });

  showStatus(
    error
      ? error.message
      : 'Account aangevraagd. Bevestig eventueel je e-mail en log in.'
  );
};

$('logout').onclick = async () => {
  await db.auth.signOut();
  display(null);
  showStatus('Uitgelogd.');
};

$('listingForm').onsubmit = async event => {
  event.preventDefault();

  const button = $('send');
  button.disabled = true;
  showStatus('Advertentie wordt ingestuurd...');

  try {
    const { data, error: authError } =
      await db.auth.getUser();

    if (authError || !data.user) {
      throw new Error('Log opnieuw in.');
    }

    const user = data.user;
    const file = $('photo').files[0];

    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !extensions[file.type]
    ) {
      throw new Error(
        'Kies een JPG, PNG of WebP van maximaal 5 MB.'
      );
    }

    const path =
      `${user.id}/${crypto.randomUUID()}.${extensions[file.type]}`;

    const { error: uploadError } = await db.storage
      .from('community-photos')
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const submission = {
      owner_id: user.id,
      name: $('name').value.trim(),
      price: Number($('price').value),
      category: $('category').value,
      condition: $('condition').value.trim(),
      description: $('description').value.trim(),
      contact_email: $('contact').value.trim(),
      photo_path: path
    };

    const { error } = await db
      .from('community_submissions')
      .insert(submission);

    if (error) throw error;

    $('listingForm').reset();
    showStatus(
      'Gelukt! Je advertentie wacht op goedkeuring.'
    );

    await loadMine();

  } catch (error) {
    showStatus('Niet gelukt: ' + error.message);
  } finally {
    button.disabled = false;
  }
};

const { data: sessionData } = await db.auth.getSession();
display(sessionData.session?.user || null);
