/* Tout tient dans ce fichier. Pas de framework : GitHub Pages n'a pas besoin de build. */
const $ = (s, r = document) => r.querySelector(s);
const e = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.sort(() => Math.random() - .5);
const uid = () => Math.random().toString(36).slice(2, 10);

/* Données : Supabase (comptes + base). Les valeurs viennent de js/config.js */
const sb = supabase.createClient(CONFIG.url, CONFIG.cle);
const S = { moi: null, user: null, pseudo: '', lessons: [], cats: [], pubs: [], xp: 0, streak: 0, last: '', lang: localStorage.getItem('lexibox-lang') || 'en' };
let vue = 'mes', filtre = '*', recherche = '';
const save = () => localStorage.setItem('lexibox-lang', S.lang); // seule la langue reste en local
const publiques = () => S.pubs;
const pasConnecte = () => '<p class="vide">Il faut un compte pour ça.<br><br><button class="on" data-act="connexion">Se connecter ou créer un compte</button></p>';

// la base parle en snake_case, le reste du code garde ses habitudes
const lire = r => ({ id: r.id, owner: r.owner, pseudo: r.pseudo, lang: r.lang, title: r.title, cat: r.cat, words: r.words, public: r.public, rev: r.rev, origin: r.origin_id ? { id: r.origin_id, rev: r.origin_rev } : null });
const ecrire = l => ({ lang: l.lang, title: l.title, cat: l.cat || null, words: l.words, public: l.public, pseudo: l.pseudo, origin_id: l.origin ? l.origin.id : null, origin_rev: l.origin ? l.origin.rev : null });

async function charger() {
  const pubs = await sb.from('lessons').select('*').eq('public', true);
  S.pubs = (pubs.data || []).map(lire);
  if (S.user) {
    const [l, c, p] = await Promise.all([
      sb.from('lessons').select('*').eq('owner', S.moi),
      sb.from('cats').select('*').order('created_at'),
      sb.from('profiles').select('*').eq('id', S.moi).maybeSingle()]);
    S.lessons = (l.data || []).map(lire); S.cats = c.data || [];
    const pr = p.data || {}; S.pseudo = pr.pseudo || ''; S.xp = pr.xp || 0; S.streak = pr.streak || 0; S.last = pr.last || '';
  } else { S.lessons = []; S.cats = []; S.xp = 0; S.streak = 0; S.pseudo = ''; }
  render();
}

async function demarrer() {
  const { data } = await sb.auth.getSession();
  S.user = data.session ? data.session.user : null; S.moi = S.user ? S.user.id : null;
  // on branche l'écoute après avoir posé l'état, sinon le premier évènement recharge tout pour rien
  sb.auth.onAuthStateChange((_ev, ses) => {
    const id = ses && ses.user ? ses.user.id : null;
    if (id !== S.moi) { S.user = ses ? ses.user : null; S.moi = id; charger(); }
  });
  if (!S.user && !sessionStorage.getItem('invite')) accueil();
  charger();
}

function accueil() {
  let d = $('#accueil'); if (!d) { d = document.createElement('div'); d.id = 'accueil'; document.body.append(d); }
  d.hidden = false;
  d.innerHTML = `<form class="jeu-boite" id="fauth"><h1 class="logo">lexi<b>box</b></h1>
    <p class="meta" style="margin:14px 0">Tes listes de mots, un quiz qui ne te lâche pas.</p>
    <input id="aem" type="email" placeholder="email" required><input id="amd" type="password" placeholder="mot de passe (6 caractères min.)" minlength="6" required>
    <input id="aps" placeholder="pseudo (à remplir pour créer un compte)"><p id="aerr"></p>
    <button class="gros" value="in">Se connecter</button><br><br>
    <button value="up">Créer un compte</button> <button type="button" data-act="invite">Essayer sans compte</button></form>`;
  $('#fauth').onsubmit = async ev => {
    ev.preventDefault();
    const up = ev.submitter.value === 'up', email = $('#aem').value, password = $('#amd').value;
    const r = up ? await sb.auth.signUp({ email, password, options: { data: { pseudo: $('#aps').value.trim() || 'Anonyme' } } })
                 : await sb.auth.signInWithPassword({ email, password });
    if (r.error) return void ($('#aerr').textContent = r.error.message);
    if (up && !r.data.session) return void ($('#aerr').textContent = 'Compte créé. Clique sur le lien reçu par email, puis connecte-toi.');
    d.hidden = true; sfx.win(); confettis(80);
  };
}

/* ---------- sons : fabriqués à la volée, aucun fichier audio à héberger ---------- */
let ac;
function bip(f, d = .12, t = 'sine', v = .15, at = 0) {
  ac = ac || new AudioContext();
  const o = ac.createOscillator(), g = ac.createGain(), T = ac.currentTime + at;
  o.type = t; o.frequency.value = f;
  g.gain.setValueAtTime(v, T); g.gain.exponentialRampToValueAtTime(.001, T + d);
  o.connect(g).connect(ac.destination); o.start(T); o.stop(T + d);
}
const sfx = {
  ok: () => { bip(660, .1, 'triangle'); bip(880, .18, 'triangle', .15, .09); },
  ko: () => { bip(200, .12, 'sawtooth', .1); bip(140, .25, 'sawtooth', .1, .1); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => bip(f, .25, 'triangle', .15, i * .1)),
  clic: () => bip(500, .05, 'square', .05)
};

/* ---------- confettis ---------- */
function confettis(n = 140) {
  const c = $('#confettis'), x = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const cols = ['#ff6b4a', '#f2b705', '#2fb86b', '#3b5bff', '#e83e8c'];
  const p = Array.from({ length: n }, () => ({
    x: innerWidth / 2, y: innerHeight * .6, vx: (Math.random() - .5) * 18, vy: -Math.random() * 18 - 6,
    r: Math.random() * 7 + 4, c: pick(cols), a: Math.random() * 6
  }));
  (function tour() {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach(q => { q.x += q.vx; q.y += q.vy; q.vy += .45; q.a += .2; x.fillStyle = q.c; x.save(); x.translate(q.x, q.y); x.rotate(q.a); x.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); x.restore(); });
    if (p.some(q => q.y < innerHeight + 20)) requestAnimationFrame(tour); else x.clearRect(0, 0, c.width, c.height);
  })();
}

/* ---------- affichage ---------- */
function render() {
  document.body.dataset.lang = S.lang;
  $('#xp').textContent = S.xp; $('#flamme').textContent = S.streak;
  $('#compte').innerHTML = S.user ? `<button data-act="deco">${e(S.pseudo || 'Moi')} · quitter</button>` : '<button class="on" data-act="connexion">Connexion</button>';
  document.querySelectorAll('[data-vue]').forEach(b => b.classList.toggle('on', b.dataset.vue === vue));
  document.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === S.lang));
  $('#scene').innerHTML = ({ mes: vMes, com: vCom, cat: vCat })[vue]();
}
const cat = id => S.cats.find(c => c.id === id);
const nomLang = l => l === 'en' ? 'Anglais' : 'Espagnol';

function aMaj(l) { // la leçon d'origine a bougé depuis que je l'ai copiée ?
  if (!l.origin) return null;
  const p = publiques().find(x => x.id === l.origin.id);
  return p && p.rev > l.origin.rev ? p : null;
}

function vMes() {
  if (!S.user) return pasConnecte();
  const ls = S.lessons.filter(l => l.lang === S.lang && (filtre === '*' || l.cat === filtre));
  const pastilles = `<div class="pastilles"><button data-act="filtre" data-id="*" class="${filtre === '*' ? 'on' : ''}">Tout</button>` +
    S.cats.map(c => `<button data-act="filtre" data-id="${c.id}" style="--c:${c.color}" class="${filtre === c.id ? 'on' : ''}">${e(c.name)}</button>`).join('') + '</div>';
  const cartes = ls.map(l => {
    const c = cat(l.cat), p = aMaj(l);
    return `<article class="carte" style="--c:${c ? c.color : '#ccc'}">
      <h3>${e(l.title)}</h3>
      <p class="meta">${l.words.length} mots</p>
      <span class="tag">${c ? e(c.name) : 'Sans catégorie'}</span><span class="tag" style="--c:#fff">${l.public ? '🌍 publique' : '🔒 privée'}</span>
      ${l.origin ? '<span class="tag" style="--c:#fff">copie</span>' : ''}
      <div class="actions">
        <button class="jouer" data-act="jouer" data-id="${l.id}">▶ Jouer</button>
        <button data-act="editer" data-id="${l.id}">Modifier</button>
        ${p ? `<button class="maj" data-act="voirmaj" data-id="${l.id}">Mettre à jour</button>` : ''}
        <button data-act="suppr" data-id="${l.id}">🗑</button>
      </div></article>`;
  }).join('');
  return `<div class="barre-outils"><button class="on" data-act="nouvelle">+ Nouvelle leçon</button></div>` + pastilles +
    `<div class="grille">${cartes || '<p class="vide">Aucune leçon ici pour le moment.<br>Crée-en une, ou pioche dans la communauté.</p>'}</div>`;
}

function vCom() {
  const q = recherche.toLowerCase();
  const ls = publiques().filter(l => l.lang === S.lang && (!q || (l.title + ' ' + l.words.map(w => w.fr + w.tr).join(' ')).toLowerCase().includes(q)));
  const cartes = ls.map(l => {
    const mienne = l.owner === S.moi, deja = S.lessons.some(x => x.origin && x.origin.id === l.id);
    return `<article class="carte">
      <h3>${e(l.title)}</h3>
      <p class="meta">par ${e(l.pseudo || 'Anonyme')} · ${l.words.length} mots · v${l.rev}</p>
      <p class="meta">${l.words.slice(0, 4).map(w => e(w.fr)).join(', ')}…</p>
      <div class="actions">${mienne ? '<span class="tag">À toi</span>' :
        deja ? '<span class="tag">Déjà ajoutée</span>' : `<button class="jouer" data-act="ajouter" data-id="${l.id}">+ Ajouter</button>`}</div></article>`;
  }).join('');
  return `<div class="barre-outils"><input id="chercher" placeholder="Chercher un mot ou un titre…" value="${e(recherche)}">
    </div>
    <div class="grille">${cartes || '<p class="vide">Rien trouvé dans cette langue.</p>'}</div>`;
}

function vCat() {
  if (!S.user) return pasConnecte();
  return `<div class="barre-outils"><input id="ncat" placeholder="Nom de la catégorie"><input type="color" id="ccol" value="#3b5bff"><button class="on" data-act="addcat">Créer</button></div>` +
    S.cats.map(c => `<div class="cat-ligne"><i style="background:${c.color}"></i><span>${e(c.name)}</span>
      <input type="color" value="${c.color}" data-act="colcat" data-id="${c.id}"><button data-act="supprcat" data-id="${c.id}">🗑</button></div>`).join('');
}

/* ---------- éditeur ---------- */
function ouvrirEditeur(id) {
  const l = S.lessons.find(x => x.id === id) || { title: '', words: [], cat: S.cats[0]?.id, public: false };
  const copie = l.origin ? '<p class="meta">Copie perso : tes changements restent chez toi, la version publique ne bouge pas.</p>' : '';
  $('#ed').innerHTML = `<form method="dialog" id="fed"><h2>${id ? 'Modifier' : 'Nouvelle leçon'}</h2>${copie}
    <label>Titre</label><input id="et" value="${e(l.title)}" required>
    <label>Catégorie</label><select id="ec">${S.cats.map(c => `<option value="${c.id}" ${c.id === l.cat ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select>
    <label>Mots (un par ligne : français = ${nomLang(S.lang).toLowerCase()})</label>
    <textarea id="ew" placeholder="chat = cat&#10;maison = house">${l.words.map(w => w.fr + ' = ' + w.tr).join('\n')}</textarea>
    ${l.origin ? '' : `<label><input type="checkbox" id="ep" ${l.public ? 'checked' : ''} style="width:auto"> Publique (visible dans la communauté)</label>`}
    <div class="actions"><button class="jouer" value="ok">Enregistrer</button><button value="x" formnovalidate>Annuler</button></div></form>`;
  $('#ed').showModal();
  $('#fed').onsubmit = async ev => {
    if (ev.submitter.value !== 'ok') return;
    const words = $('#ew').value.split('\n').map(r => r.split(/\s*[=;\t]\s*/)).filter(r => r[0].trim() && r[1]).map(r => ({ fr: r[0].trim(), tr: r.slice(1).join('=').trim() }));
    const nl = { ...l, title: $('#et').value.trim(), cat: $('#ec').value, words, public: l.origin ? false : $('#ep').checked, lang: l.lang || S.lang, pseudo: S.pseudo };
    // la version d'une leçon publique monte toute seule côté base (trigger), pas besoin de la gérer ici
    const r = id ? await sb.from('lessons').update(ecrire(nl)).eq('id', id) : await sb.from('lessons').insert(ecrire(nl));
    if (r.error) alert(r.error.message);
    sfx.ok(); charger();
  };
}

/* ---------- mise à jour d'une copie ---------- */
function voirMaj(id) {
  const l = S.lessons.find(x => x.id === id), p = aMaj(l); if (!p) return;
  const cle = w => w.fr + '=' + w.tr, avant = new Set(l.words.map(cle)), apres = new Set(p.words.map(cle));
  const plus = p.words.filter(w => !avant.has(cle(w))), moins = l.words.filter(w => !apres.has(cle(w)));
  $('#maj').innerHTML = `<h2>${e(p.title)} · v${l.origin.rev} → v${p.rev}</h2><div class="diff">
    ${p.title !== l.title ? `<p class="moins">${e(l.title)}</p><p class="plus">${e(p.title)}</p>` : ''}
    ${plus.map(w => `<p class="plus">+ ${e(w.fr)} = ${e(w.tr)}</p>`).join('')}
    ${moins.map(w => `<p class="moins">${e(w.fr)} = ${e(w.tr)}</p>`).join('')}
    ${!plus.length && !moins.length ? '<p>Seul le contenu interne a changé.</p>' : ''}</div>
    <div class="actions"><button class="jouer" id="okmaj">Appliquer</button><button onclick="$('#maj').close()">Plus tard</button></div>`;
  $('#maj').showModal();
  $('#okmaj').onclick = async () => { await sb.from('lessons').update({ title: p.title, words: p.words, origin_rev: p.rev }).eq('id', id); sfx.win(); $('#maj').close(); charger(); };
}

/* ---------- quiz ---------- */
let Q = null;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

function jouer(id) {
  const l = S.lessons.find(x => x.id === id); if (!l || !l.words.length) return;
  Q = { l, file: shuffle([...l.words]), total: l.words.length, ok: 0, combo: 0, gain: 0, etat: 'q' };
  question();
}
function question() {
  const j = $('#jeu'); j.hidden = false;
  if (!Q.file.length) return bilan();
  const w = Q.file[0];
  j.innerHTML = `<div class="jeu-boite"><div class="barre"><i style="width:${Q.ok / Q.total * 100}%"></i></div>
    <button class="x" data-act="quitter">✕</button>
    <p class="combo">${Q.combo > 1 ? '🔥 série de ' + Q.combo : ''}</p>
    <p class="etiq">En ${nomLang(Q.l.lang).toLowerCase()}, ça donne quoi ?</p>
    <h2 class="mot">${e(w.fr)}</h2>
    <input id="rep" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ta réponse">
    <p id="retour"></p><button class="gros" data-act="valider">Valider</button></div>`;
  Q.etat = 'q'; $('#rep').focus();
}
function valider() {
  if (Q.etat === 'n') return question();
  const v = $('#rep'), w = Q.file[0]; if (!v.value.trim()) return;
  const bon = w.tr.split('/').some(x => norm(x) === norm(v.value));
  const r = $('#retour');
  if (bon) {
    Q.file.shift(); Q.ok++; Q.combo++; const g = 10 + Math.min(Q.combo, 5) * 2; Q.gain += g;
    sfx.ok(); r.textContent = pick(['Yes.', 'Propre.', 'Boum.', 'Exact.', 'Tranquille.']); r.className = 'bon'; pop('+' + g);
    $('.barre i').style.width = Q.ok / Q.total * 100 + '%';
    if (Q.combo === 5) confettis(60);
  } else {
    Q.combo = 0; Q.file.push(Q.file.shift()); sfx.ko();
    r.textContent = 'C\'était : ' + w.tr; r.className = 'mauvais';
    const b = $('.jeu-boite'); b.classList.remove('tremble'); void b.offsetWidth; b.classList.add('tremble');
  }
  v.disabled = true; Q.etat = 'n'; const b = $('.gros'); b.textContent = 'Suivant'; b.focus();
}
function pop(t) {
  const d = document.createElement('div'); d.className = 'pop'; d.textContent = t;
  d.style.left = innerWidth / 2 - 20 + 'px'; d.style.top = innerHeight / 2 + 'px';
  document.body.append(d); setTimeout(() => d.remove(), 1000);
}
function bilan() {
  const aujourdhui = new Date().toISOString().slice(0, 10), hier = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (S.last !== aujourdhui) { S.streak = S.last === hier ? S.streak + 1 : 1; S.last = aujourdhui; }
  S.xp += Q.gain; sfx.win(); confettis();
  if (S.user) sb.from('profiles').update({ xp: S.xp, streak: S.streak, last: S.last || null }).eq('id', S.moi).then(() => {});
  $('#jeu').innerHTML = `<div class="jeu-boite bilan"><h2>Leçon finie 🎉</h2><p class="gain">+${Q.gain}</p><p>points · série de ${S.streak} jour${S.streak > 1 ? 's' : ''} 🔥</p>
    <br><button class="gros" data-act="quitter">Continuer</button></div>`;
}

/* ---------- clics ---------- */
const actions = {
  vue: b => { vue = b.dataset.vue; },
  langue: b => { S.lang = b.dataset.l; filtre = '*'; save(); },
  filtre: b => { filtre = b.dataset.id; },
  nouvelle: () => { if (!S.user) accueil(); else ouvrirEditeur(); return 1; },
  editer: b => { ouvrirEditeur(b.dataset.id); return 1; },
  voirmaj: b => { voirMaj(b.dataset.id); return 1; },
  jouer: b => { jouer(b.dataset.id); return 1; },
  valider, quitter: () => { $('#jeu').hidden = true; Q = null; },
  connexion: () => { accueil(); return 1; },
  invite: () => { sessionStorage.setItem('invite', 1); $('#accueil').hidden = true; return 1; },
  deco: async () => { await sb.auth.signOut(); sessionStorage.removeItem('invite'); accueil(); return 1; },
  suppr: async b => { if (confirm('Supprimer cette leçon ?')) { await sb.from('lessons').delete().eq('id', b.dataset.id); await charger(); } return 1; },
  ajouter: async b => { // copie perso : l'original public reste intact
    if (!S.user) { accueil(); return 1; }
    const p = S.pubs.find(x => x.id === b.dataset.id);
    await sb.from('lessons').insert(ecrire({ ...p, public: false, pseudo: S.pseudo, origin: { id: p.id, rev: p.rev }, cat: S.cats[0] && S.cats[0].id }));
    sfx.win(); confettis(50); await charger(); return 1;
  },
  addcat: async () => { const n = $('#ncat').value.trim(); if (n) { await sb.from('cats').insert({ name: n, color: $('#ccol').value }); await charger(); } return 1; },
  supprcat: async b => { await sb.from('cats').delete().eq('id', b.dataset.id); await charger(); return 1; }
};
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
  sfx.clic();
  if (!actions[b.dataset.act](b)) render();
});
document.addEventListener('change', ev => {
  if (ev.target.dataset.act === 'colcat') { sb.from('cats').update({ color: ev.target.value }).eq('id', ev.target.dataset.id).then(charger); }
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'chercher') { recherche = ev.target.value; const p = ev.target.selectionStart; render(); const c = $('#chercher'); c.focus(); c.setSelectionRange(p, p); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'rep') valider(); });

demarrer();
