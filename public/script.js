// ══════════════════════════════════════
// DONNÉES VÊTEMENTS
// ══════════════════════════════════════
// ── Grilles de tailles (poitrine / hanches en cm) ──
const GRILLE_TAILLES = {
  XS: { poitrine: [76, 82], hanches: [80, 86]  },
  S:  { poitrine: [82, 88], hanches: [86, 92]  },
  M:  { poitrine: [88, 94], hanches: [92, 98]  },
  L:  { poitrine: [94,102], hanches: [98,106]  },
  XL: { poitrine:[102,110], hanches:[106,114]  },
};
const ORDRE_TAILLES = ['XS','S','M','L','XL'];

const VETEMENTS = [
  {
    id: 1, nom: 'Robe midi', type: 'Robe', emoji: '👗', couleur: 0xE879F9,
    coupe: 'ajustée', matiere: 'Viscose', elasticite: 'faible',
    mesureCle: 'hanches',
    description: 'Coupe ajustée qui suit les courbes. Tombe sous le genou.',
  },
  {
    id: 2, nom: 'Blazer structuré', type: 'Veste', emoji: '🧥', couleur: 0x1D4ED8,
    coupe: 'droite', matiere: 'Polyester', elasticite: 'aucune',
    mesureCle: 'poitrine',
    description: 'Coupe droite et structurée. Épaules marquées, non extensible.',
  },
  {
    id: 3, nom: 'Jean slim', type: 'Pantalon', emoji: '👖', couleur: 0x1E3A5F,
    coupe: 'slim', matiere: 'Denim stretch', elasticite: 'moyenne',
    mesureCle: 'hanches',
    description: 'Coupe slim avec stretch pour le confort. Épouse les hanches.',
  },
  {
    id: 4, nom: 'Pull oversized', type: 'Haut', emoji: '🧶', couleur: 0xF59E0B,
    coupe: 'oversized', matiere: 'Laine mélangée', elasticite: 'élevée',
    mesureCle: 'poitrine',
    description: 'Coupe volontairement ample. Prévu pour être porté large.',
  },
  {
    id: 5, nom: 'Chemise blanche', type: 'Haut', emoji: '👔', couleur: 0xF8FAFC,
    coupe: 'regular', matiere: 'Coton', elasticite: 'faible',
    mesureCle: 'poitrine',
    description: 'Coupe régulière en coton non extensible. Col classique.',
  },
  {
    id: 6, nom: 'Jupe plissée', type: 'Jupe', emoji: '🩳', couleur: 0xFB7185,
    coupe: 'fluide', matiere: 'Satin', elasticite: 'nulle',
    mesureCle: 'hanches',
    description: 'Taille élastiquée, tombant fluide. Se porte sur les hanches.',
  },
];

// ══════════════════════════════════════
// NAVIGATION ENTRE ÉCRANS
// ══════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('exit', 'enter');
  });
  const target = document.getElementById(id);
  target.classList.remove('hidden');
  target.classList.add('enter');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => target.classList.remove('enter'));
  });
}

document.getElementById('btnStart').addEventListener('click', () => {
  const welcome = document.getElementById('screen-welcome');
  welcome.classList.add('exit');
  setTimeout(() => showScreen('screen-form'), 400);
});

// ══════════════════════════════════════
// RÉCAPITULATIF
// ══════════════════════════════════════
document.getElementById('btnRecap').addEventListener('click', () => {
  genererRecap();
  document.getElementById('screen-avatar').classList.add('exit');
  setTimeout(() => showScreen('screen-recap'), 400);
});

document.getElementById('recapBack').addEventListener('click', () => {
  document.getElementById('screen-recap').classList.add('exit');
  setTimeout(() => showScreen('screen-avatar'), 400);
});

// Détecte si Dressim tourne dans un iframe (intégré en boutique)
const estDansIframe = window.self !== window.top;

function envoyerRecommandationBoutique() {
  // Cherche le vetement mis en avant (id:1 robe midi par défaut si en iframe)
  const cible = VETEMENTS.find(v => v.id === 1) || VETEMENTS[0];
  const { taille } = recommanderTaille(cible);
  const targetOrigin = document.referrer ? new URL(document.referrer).origin : '*';
  window.parent.postMessage({ type: 'dressim:recommendation', taille }, targetOrigin);
}

function genererRecap() {
  const { prenom, taille, poitrine, hanches, morpho } = profilClient;
  const morphoLabel = MORPHO_INFO[morpho]?.label || '—';

  // Titre
  document.getElementById('recapTitle').textContent = `Votre récapitulatif, ${prenom} !`;

  // Profil estimé
  const profileEl = document.getElementById('recapProfile');
  profileEl.innerHTML = '';
  [
    { label: 'Taille',     value: taille + ' cm' },
    { label: 'Poitrine',   value: poitrine + ' cm' },
    { label: 'Hanches',    value: hanches + ' cm' },
    { label: 'Silhouette', value: morphoLabel },
  ].forEach(item => {
    const div = document.createElement('div');
    div.className = 'recap-profile__item';
    const lbl = document.createElement('span');
    lbl.className = 'recap-profile__label';
    lbl.textContent = item.label;
    const val = document.createElement('span');
    val.className = 'recap-profile__value';
    val.textContent = item.value;
    div.append(lbl, val);
    profileEl.appendChild(div);
  });

  // Vêtements triés par score
  const listEl = document.getElementById('recapList');
  listEl.innerHTML = '';
  const tries = [...VETEMENTS].sort((a, b) => calculerScore(b) - calculerScore(a));

  tries.forEach((v, i) => {
    const { taille: tailleReco } = recommanderTaille(v);
    const score = calculerScore(v);
    const couleurScore = scoreCouleur(score);

    const item = document.createElement('div');
    item.className = 'recap-item';
    item.style.animationDelay = `${i * 0.07}s`;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'recap-item__emoji';
    emojiEl.textContent = v.emoji;

    const infoEl = document.createElement('div');
    infoEl.className = 'recap-item__info';

    const nameEl = document.createElement('div');
    nameEl.className = 'recap-item__name';
    nameEl.textContent = v.nom;

    const metaEl = document.createElement('div');
    metaEl.className = 'recap-item__meta';

    const sizeEl = document.createElement('span');
    sizeEl.className = 'recap-item__size';
    sizeEl.textContent = 'Taille ' + tailleReco;

    const scoreEl = document.createElement('span');
    scoreEl.className = 'recap-item__score';
    scoreEl.style.color = couleurScore;
    scoreEl.textContent = score + '% compatible';

    metaEl.append(sizeEl, scoreEl);
    infoEl.append(nameEl, metaEl);

    const cartBtn = document.createElement('button');
    cartBtn.className = 'recap-item__cart';
    cartBtn.textContent = '+ Panier';
    cartBtn.addEventListener('click', () => {
      cartBtn.textContent = '✓ Ajouté';
      cartBtn.classList.add('added');
      cartBtn.disabled = true;
    });

    item.append(emojiEl, infoEl, cartBtn);
    listEl.appendChild(item);
  });
}

// Bouton "Appliquer ma taille à la boutique" (iframe seulement)
const btnApply = document.getElementById('btnApplyBoutique');
if (estDansIframe) btnApply.classList.remove('hidden');
btnApply.addEventListener('click', envoyerRecommandationBoutique);

// Bouton "tout ajouter"
document.getElementById('btnCartAll').addEventListener('click', () => {
  document.querySelectorAll('.recap-item__cart').forEach(btn => {
    if (!btn.disabled) {
      btn.textContent = '✓ Ajouté';
      btn.classList.add('added');
      btn.disabled = true;
    }
  });
  const btn = document.getElementById('btnCartAll');
  btn.querySelector('span').textContent = '✓ Tout ajouté au panier !';
  btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
});

// ══════════════════════════════════════
// TOGGLE GENRE
// ══════════════════════════════════════
let genre = 'femme';
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    genre = btn.dataset.value;
  });
});

// ══════════════════════════════════════
// ESTIMATION DES MENSURATIONS
// depuis taille + poids + morphologie
// ══════════════════════════════════════
function estimerMensurations(taille, poids, morpho, genre) {
  // Formule calibrée : taille*0.34 + poids*0.5 ≈ 88cm pour 168cm/62kg (femme)
  const basePoitrine = genre === 'femme'
    ? taille * 0.34 + poids * 0.50
    : taille * 0.36 + poids * 0.52;

  // Ajustements morphologiques (redistribution du volume)
  const delta = {
    poire:     { poitrine: -4, hanches: +7,  ventre: -2 },
    sablier:   { poitrine: +2, hanches: +3,  ventre: -4 },
    rectangle: { poitrine:  0, hanches:  0,  ventre: +1 },
    pomme:     { poitrine: +4, hanches: -4,  ventre: +7 },
  }[morpho] || { poitrine: 0, hanches: 0, ventre: 0 };

  // Les hanches sont naturellement ~6cm plus grandes que la poitrine (femme)
  const offsetHanches = genre === 'femme' ? 6 : 2;

  const poitrine = Math.round(basePoitrine + delta.poitrine);
  const hanches  = Math.round(basePoitrine + offsetHanches + delta.hanches);
  const ventre   = Math.round(basePoitrine * 0.83 + delta.ventre);

  return { poitrine, hanches, ventre };
}

// ══════════════════════════════════════
// ÉTAPE A — infos de base
// ══════════════════════════════════════
let infosBase = {};

document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  infosBase = {
    prenom: document.getElementById('inputPrenom').value || 'Vous',
    taille: parseFloat(document.getElementById('inputTaille').value) || 168,
    poids:  parseFloat(document.getElementById('inputPoids').value)  || 62,
    genre,
  };
  // Passer à l'étape morphologie
  document.getElementById('stepA').classList.add('hidden');
  const stepB = document.getElementById('stepB');
  stepB.classList.remove('hidden');
  stepB.style.animation = 'fadeSlideIn 0.35s ease forwards';
});

// ══════════════════════════════════════
// ÉTAPE B — arbre de questions
// ══════════════════════════════════════
let morphoChoisie = null;
let q1rep = null;

const MORPHO_INFO = {
  sablier:   { icon: '✦', label: 'Silhouette équilibrée',    desc: 'Épaules et hanches symétriques, taille marquée' },
  poire:     { icon: '◈', label: 'Silhouette en V inversé',  desc: 'Hanches plus larges, épaules plus étroites' },
  pomme:     { icon: '◉', label: 'Silhouette ronde',         desc: 'Volume concentré au centre, hanches discrètes' },
  rectangle: { icon: '▭', label: 'Silhouette droite',        desc: 'Proportions similaires du haut en bas' },
};

function afficherQuestion(id) {
  document.querySelectorAll('.question-block').forEach(b => b.classList.remove('active'));
  const bloc = document.getElementById(id);
  if (bloc) bloc.classList.add('active');
}

function validerMorpho(morpho) {
  morphoChoisie = morpho;
  const info = MORPHO_INFO[morpho];

  document.querySelectorAll('.question-block').forEach(b => b.classList.remove('active'));

  const result = document.getElementById('morphoResult');
  result.classList.remove('hidden');
  document.getElementById('morphoIcon').textContent  = info.icon;
  document.getElementById('morphoLabel').textContent = info.label;
  document.getElementById('morphoDesc').textContent  = info.desc;

  document.getElementById('btnGenerate').classList.remove('hidden');
}

document.getElementById('questionsFlow').addEventListener('click', (e) => {
  const btn = e.target.closest('.q-btn');
  if (!btn) return;

  const q   = btn.dataset.q;
  const val = btn.dataset.val;

  if (q === 'q1') {
    q1rep = val;
    if (val === 'oui') afficherQuestion('q2');
    else               afficherQuestion('q3');

  } else if (q === 'q2') {
    validerMorpho(val === 'oui' ? 'sablier' : 'poire');

  } else if (q === 'q3') {
    validerMorpho(val === 'oui' ? 'pomme' : 'rectangle');
  }
});

document.getElementById('morphoChange').addEventListener('click', () => {
  morphoChoisie = null;
  q1rep = null;
  document.getElementById('morphoResult').classList.add('hidden');
  document.getElementById('btnGenerate').classList.add('hidden');
  afficherQuestion('q1');
});

document.getElementById('btnGenerate').addEventListener('click', () => {
  if (!morphoChoisie) return;

  const { prenom, taille, poids } = infosBase;
  const { poitrine, hanches, ventre } = estimerMensurations(taille, poids, morphoChoisie, genre);

  // Animation bouton
  const btn = document.getElementById('btnGenerate');
  btn.querySelector('span').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');

  // Sauvegarder le profil complet
  profilClient = { prenom, taille, poids, poitrine, hanches, ventre, morpho: morphoChoisie, genre };

  setTimeout(() => {
    document.getElementById('screen-form').classList.add('exit');
    setTimeout(() => {
      showScreen('screen-avatar');
      document.getElementById('welcomeUser').textContent = `Bonjour, ${prenom} !`;
      initAvatar({ taille, poids, poitrine, hanches, genre });
      renderClothes();
    }, 400);
  }, 1600);
});

// ══════════════════════════════════════
// THREE.JS — AVATAR 3D
// ══════════════════════════════════════
let scene, camera, renderer, avatarGroup;
let isDragging = false, prevMouseX = 0;
let selectedVetement = null;
let clothMesh = null;

function initAvatar({ taille, poids, poitrine, hanches, genre }) {
  const canvas    = document.getElementById('avatarCanvas');
  const container = document.getElementById('avatarViewport');
  const W = container.clientWidth;
  const H = container.clientHeight;

  // Scène
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080810, 8, 20);

  // Caméra
  camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(0, 1.2, 4.5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // Lumières
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0x7C3AED, 1.5);
  keyLight.position.set(3, 5, 3);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x2563EB, 0.8);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(0, 8, -5);
  scene.add(rimLight);

  // Sol réfléchissant
  const floorGeo  = new THREE.CircleGeometry(2, 64);
  const floorMat  = new THREE.MeshStandardMaterial({
    color: 0x080810,
    metalness: 0.8,
    roughness: 0.3,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.65;
  floor.receiveShadow = true;
  scene.add(floor);

  // Particules de fond
  addParticles();

  // Construire l'avatar selon les mensurations
  buildAvatar({ taille, poids, poitrine, hanches, genre });

  // Resize
  window.addEventListener('resize', () => {
    const W2 = container.clientWidth;
    const H2 = container.clientHeight;
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
    renderer.setSize(W2, H2);
  });

  // Drag to rotate
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouseX = e.clientX; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const delta = e.clientX - prevMouseX;
    avatarGroup.rotation.y += delta * 0.012;
    prevMouseX = e.clientX;
  });
  canvas.addEventListener('mouseup', () => isDragging = false);
  canvas.addEventListener('touchstart', e => { isDragging = true; prevMouseX = e.touches[0].clientX; });
  canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - prevMouseX;
    avatarGroup.rotation.y += delta * 0.012;
    prevMouseX = e.touches[0].clientX;
  });
  canvas.addEventListener('touchend', () => isDragging = false);

  // Boucle de rendu
  animate();
}

function buildAvatar({ taille, poids, poitrine, hanches, genre }) {
  if (avatarGroup) scene.remove(avatarGroup);
  avatarGroup = new THREE.Group();

  // Normalise les proportions (taille de référence: 170cm)
  const scale     = taille / 170;
  const corpulence = poids / (taille * taille / 10000); // IMC simplifié
  const largeur   = Math.min(Math.max(corpulence / 22, 0.85), 1.4);
  const largHanche = hanches / 90;
  const largPoitrine = poitrine / 88;

  const skinColor  = 0xC68642;
  const hairColor  = genre === 'femme' ? 0x2C1810 : 0x1A0F0A;
  const bodyColor  = 0xD4956A;

  const mat = (color, rough = 0.6, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

  // ── Tête ──
  const headGeo  = new THREE.SphereGeometry(0.18, 32, 32);
  const head     = new THREE.Mesh(headGeo, mat(skinColor));
  head.position.y = 1.42 * scale;
  head.castShadow = true;
  avatarGroup.add(head);

  // Cheveux
  if (genre === 'femme') {
    const hairGeo = new THREE.SphereGeometry(0.195, 32, 32);
    const hair    = new THREE.Mesh(hairGeo, mat(hairColor, 0.9));
    hair.position.copy(head.position);
    hair.position.y += 0.04;
    hair.scale.y = 1.3;
    avatarGroup.add(hair);
    // Chignon ou queue
    const bunGeo  = new THREE.SphereGeometry(0.09, 16, 16);
    const bun     = new THREE.Mesh(bunGeo, mat(hairColor, 0.9));
    bun.position.set(0, 1.58 * scale, -0.14);
    avatarGroup.add(bun);
  } else {
    const hairGeo = new THREE.SphereGeometry(0.185, 32, 32);
    const hair    = new THREE.Mesh(hairGeo, mat(hairColor, 0.9));
    hair.position.copy(head.position);
    hair.position.y += 0.02;
    avatarGroup.add(hair);
  }

  // Cou
  const neckGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.15, 16);
  const neck    = new THREE.Mesh(neckGeo, mat(skinColor));
  neck.position.y = 1.26 * scale;
  avatarGroup.add(neck);

  // ── Torse ──
  const torsoGeo = new THREE.CapsuleGeometry(0.18 * largeur, 0.5 * scale, 8, 16);
  const torso    = new THREE.Mesh(torsoGeo, mat(bodyColor));
  torso.position.y = 0.82 * scale;
  torso.scale.x    = largPoitrine * largeur;
  torso.castShadow = true;
  avatarGroup.add(torso);

  // ── Hanches ──
  const hipGeo = new THREE.CapsuleGeometry(0.16 * largHanche, 0.22 * scale, 8, 16);
  const hips   = new THREE.Mesh(hipGeo, mat(bodyColor));
  hips.position.y = 0.45 * scale;
  hips.scale.x    = largHanche;
  hips.castShadow = true;
  avatarGroup.add(hips);

  // ── Bras ──
  [-1, 1].forEach(side => {
    const upperGeo = new THREE.CapsuleGeometry(0.065, 0.32 * scale, 8, 16);
    const upper    = new THREE.Mesh(upperGeo, mat(skinColor));
    upper.position.set(side * 0.27 * largPoitrine, 0.88 * scale, 0);
    upper.rotation.z = side * 0.25;
    upper.castShadow = true;
    avatarGroup.add(upper);

    const foreGeo = new THREE.CapsuleGeometry(0.055, 0.28 * scale, 8, 16);
    const fore    = new THREE.Mesh(foreGeo, mat(skinColor));
    fore.position.set(side * 0.35 * largPoitrine, 0.58 * scale, 0);
    fore.rotation.z = side * 0.15;
    avatarGroup.add(fore);

    // Main
    const handGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const hand    = new THREE.Mesh(handGeo, mat(skinColor));
    hand.position.set(side * 0.39 * largPoitrine, 0.38 * scale, 0);
    avatarGroup.add(hand);
  });

  // ── Jambes ──
  [-1, 1].forEach(side => {
    const thighGeo = new THREE.CapsuleGeometry(0.085 * largHanche, 0.4 * scale, 8, 16);
    const thigh    = new THREE.Mesh(thighGeo, mat(bodyColor));
    thigh.position.set(side * 0.1 * largHanche, 0.15 * scale, 0);
    thigh.castShadow = true;
    avatarGroup.add(thigh);

    const calfGeo = new THREE.CapsuleGeometry(0.065, 0.38 * scale, 8, 16);
    const calf    = new THREE.Mesh(calfGeo, mat(skinColor));
    calf.position.set(side * 0.1 * largHanche, -0.32 * scale, 0);
    avatarGroup.add(calf);

    // Pied
    const footGeo = new THREE.CapsuleGeometry(0.055, 0.12, 8, 8);
    const foot    = new THREE.Mesh(footGeo, mat(0x1A1A2E));
    foot.rotation.z = Math.PI / 2;
    foot.position.set(side * 0.1 * largHanche, -0.62 * scale, 0.04);
    avatarGroup.add(foot);
  });

  // Animation d'apparition
  avatarGroup.scale.set(0.01, 0.01, 0.01);
  avatarGroup.position.y = -0.2;
  scene.add(avatarGroup);

  let t = 0;
  const appear = () => {
    t += 0.06;
    const s = Math.min(1, t);
    avatarGroup.scale.set(s, s, s);
    avatarGroup.position.y = -0.2 + 0.2 * s;
    if (s < 1) requestAnimationFrame(appear);
  };
  requestAnimationFrame(appear);
}

function addParticles() {
  const geo = new THREE.BufferGeometry();
  const count = 120;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    pos[i] = (Math.random() - 0.5) * 14;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x7C3AED, size: 0.04, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));
}

function animate() {
  requestAnimationFrame(animate);
  if (avatarGroup && !isDragging) avatarGroup.rotation.y += 0.003;
  if (vetementGroup && avatarGroup) vetementGroup.rotation.y = avatarGroup.rotation.y;
  renderer.render(scene, camera);
}

// ══════════════════════════════════════
// VÊTEMENTS — RENDU + SÉLECTION
// ══════════════════════════════════════
// ══════════════════════════════════════
// SCORE DE COMPATIBILITÉ
// ══════════════════════════════════════
function calculerScore(vetement) {
  const { poitrine, hanches } = profilClient;
  const mesure = vetement.mesureCle === 'hanches' ? hanches : poitrine;
  const grilleCle = vetement.mesureCle === 'hanches' ? 'hanches' : 'poitrine';

  // 1. Proximité au centre de la taille idéale (0-50 pts)
  let scoreEcart = 35;
  for (const t of ORDRE_TAILLES) {
    const [min, max] = GRILLE_TAILLES[t][grilleCle];
    const centre = (min + max) / 2;
    if (mesure >= min && mesure < max) {
      const ecartPct = Math.abs(mesure - centre) / ((max - min) / 2);
      scoreEcart = Math.round(50 - ecartPct * 15);
      break;
    }
  }

  // 2. Bonus extensibilité (0-30 pts)
  const bonusElasticite = { 'élevée': 30, 'moyenne': 20, 'faible': 10, 'aucune': 5, 'nulle': 5 };
  const scoreElasticite = bonusElasticite[vetement.elasticite] ?? 15;

  // 3. Bonus coupe (0-20 pts)
  const bonusCoupe = { 'oversized': 20, 'fluide': 18, 'regular': 15, 'ajustée': 12, 'droite': 8, 'slim': 6 };
  const scoreCoupe = bonusCoupe[vetement.coupe] ?? 12;

  return Math.min(99, Math.max(60, scoreEcart + scoreElasticite + scoreCoupe));
}

function scoreCouleur(score) {
  if (score >= 90) return '#4ADE80';
  if (score >= 75) return '#FACC15';
  return '#F87171';
}

function renderClothes() {
  const list = document.getElementById('clothesList');
  list.innerHTML = '';

  const vetementsTries = [...VETEMENTS].sort((a, b) => calculerScore(b) - calculerScore(a));

  vetementsTries.forEach((v, i) => {
    const score = calculerScore(v);
    const card = document.createElement('div');
    card.className = 'clothes-card';
    card.style.animationDelay = `${i * 0.1}s`;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'clothes-card__emoji';
    emojiEl.textContent = v.emoji;

    const infoEl = document.createElement('div');
    infoEl.className = 'clothes-card__info';
    const nameEl = document.createElement('div');
    nameEl.className = 'clothes-card__name';
    nameEl.textContent = v.nom;
    const typeEl = document.createElement('div');
    typeEl.className = 'clothes-card__type';
    typeEl.textContent = v.type;
    infoEl.append(nameEl, typeEl);

    // Score de compatibilité
    const scoreEl = document.createElement('div');
    scoreEl.className = 'clothes-card__score';

    const scoreNum = document.createElement('span');
    scoreNum.className = 'score-num';
    scoreNum.textContent = score + '%';
    scoreNum.style.color = scoreCouleur(score);

    const scoreBar = document.createElement('div');
    scoreBar.className = 'score-bar';
    const scoreFill = document.createElement('div');
    scoreFill.className = 'score-fill';
    scoreFill.style.width = '0%';
    scoreFill.style.background = scoreCouleur(score);
    scoreBar.appendChild(scoreFill);

    scoreEl.append(scoreNum, scoreBar);
    card.append(emojiEl, infoEl, scoreEl);

    setTimeout(() => { scoreFill.style.width = score + '%'; }, 300 + i * 100);

    card.addEventListener('click', () => selectVetement(v, card));
    list.appendChild(card);
  });
}

// ══════════════════════════════════════
// ALGORITHME DE RECOMMANDATION DE TAILLE
// ══════════════════════════════════════
let profilClient = {};

function recommanderTaille(vetement) {
  const { poitrine, hanches } = profilClient;
  const mesure = vetement.mesureCle === 'hanches' ? hanches : poitrine;
  const grilleCle = vetement.mesureCle === 'hanches' ? 'hanches' : 'poitrine';

  // 1. Trouver la taille de base selon la mesure clé
  let tailleBase = 'M';
  for (const t of ORDRE_TAILLES) {
    const [min, max] = GRILLE_TAILLES[t][grilleCle];
    if (mesure >= min && mesure < max) { tailleBase = t; break; }
  }
  if (mesure >= GRILLE_TAILLES['XL'][grilleCle][1]) tailleBase = 'XL';
  if (mesure <  GRILLE_TAILLES['XS'][grilleCle][0]) tailleBase = 'XS';

  // 2. Ajuster selon la coupe
  let ajustement = 0;
  let raisonCoupe = '';
  if (vetement.coupe === 'slim') {
    ajustement = +1;
    raisonCoupe = 'La coupe slim est près du corps — on monte d\'une taille pour le confort.';
  } else if (vetement.coupe === 'oversized') {
    ajustement = -1;
    raisonCoupe = 'La coupe oversized est volontairement ample — on descend d\'une taille pour éviter l\'effet sac.';
  } else if (vetement.coupe === 'ajustée') {
    raisonCoupe = 'La coupe ajustée suit vos courbes sans serrer — votre taille naturelle convient.';
  } else if (vetement.coupe === 'droite') {
    raisonCoupe = 'La coupe droite non extensible demande de respecter la grille exacte.';
  } else if (vetement.coupe === 'regular') {
    raisonCoupe = 'La coupe regular offre de l\'aisance — votre taille standard est parfaite.';
  } else if (vetement.coupe === 'fluide') {
    raisonCoupe = 'Taille élastiquée — la mesure des hanches suffit à déterminer votre taille.';
  }

  // 3. Ajuster selon l'extensibilité
  let raisonElasticite = '';
  if (vetement.elasticite === 'aucune' || vetement.elasticite === 'nulle') {
    if (ajustement === 0) ajustement = +1;
    raisonElasticite = `La matière (${vetement.matiere}) n'a aucun stretch — on prévoit une taille au-dessus pour le mouvement.`;
  } else if (vetement.elasticite === 'élevée') {
    if (ajustement === 0) ajustement = -1;
    raisonElasticite = `La matière (${vetement.matiere}) est très extensible — on peut descendre d'une taille en toute sécurité.`;
  } else {
    raisonElasticite = `La matière (${vetement.matiere}) offre un stretch modéré — confortable dans votre taille habituelle.`;
  }

  // 4. Appliquer l'ajustement
  const idxBase   = ORDRE_TAILLES.indexOf(tailleBase);
  const idxFinal  = Math.max(0, Math.min(ORDRE_TAILLES.length - 1, idxBase + ajustement));
  const tailleFin = ORDRE_TAILLES[idxFinal];

  // 5. Construire l'explication
  const mesureLabel = vetement.mesureCle === 'hanches'
    ? `hanches (${hanches} cm)`
    : `poitrine (${poitrine} cm)`;

  const explication = [
    `📐 Vos ${mesureLabel} correspondent à une taille ${tailleBase} sur la grille standard.`,
    `✂️ ${raisonCoupe}`,
    `🧵 ${raisonElasticite}`,
  ];

  if (tailleBase !== tailleFin) {
    explication.push(`✅ Taille finale recommandée : **${tailleFin}** (ajustée depuis ${tailleBase}).`);
  } else {
    explication.push(`✅ Votre taille ${tailleFin} est la bonne — pas d'ajustement nécessaire.`);
  }

  return { taille: tailleFin, explication };
}

// ══════════════════════════════════════
// VÊTEMENTS 3D SUR L'AVATAR
// ══════════════════════════════════════
let vetementGroup = null;

function retirerVetement3D() {
  if (vetementGroup) {
    scene.remove(vetementGroup);
    vetementGroup = null;
  }
}

function porterVetement3D(vetement) {
  retirerVetement3D();
  vetementGroup = new THREE.Group();

  const scale  = (profilClient.taille || 168) / 170;
  const couleur = vetement.couleur;
  const ample   = vetement.coupe === 'oversized' ? 1.18 : vetement.coupe === 'slim' ? 1.02 : 1.08;

  const mat = new THREE.MeshStandardMaterial({
    color: couleur,
    roughness: 0.65,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
  });

  const pieces = [];

  if (['Haut', 'Veste', 'Robe'].includes(vetement.type)) {
    // Torse du vêtement
    const torsoGeo = new THREE.CapsuleGeometry(0.21 * ample, 0.52 * scale, 8, 16);
    const torso    = new THREE.Mesh(torsoGeo, mat.clone());
    torso.position.y = 0.82 * scale;
    torso.scale.x    = ample;
    pieces.push(torso);

    // Manches
    [-1, 1].forEach(side => {
      const mancheGeo = new THREE.CapsuleGeometry(0.075 * ample, 0.34 * scale, 8, 16);
      const manche    = new THREE.Mesh(mancheGeo, mat.clone());
      manche.position.set(side * 0.30 * ample, 0.82 * scale, 0);
      manche.rotation.z = side * 0.28;
      pieces.push(manche);
    });
  }

  if (['Robe', 'Jupe'].includes(vetement.type)) {
    // Jupe/robe : cône évasé sous les hanches
    const hauteurJupe = vetement.type === 'Robe' ? 0.7 * scale : 0.45 * scale;
    const jupeGeo = new THREE.CylinderGeometry(
      0.22 * ample,   // haut
      0.28 * ample,   // bas (évasé)
      hauteurJupe, 24
    );
    const jupe = new THREE.Mesh(jupeGeo, mat.clone());
    jupe.position.y = vetement.type === 'Robe' ? 0.1 * scale : 0.22 * scale;
    pieces.push(jupe);
  }

  if (['Pantalon'].includes(vetement.type)) {
    // Hanches du pantalon
    const hipGeo = new THREE.CapsuleGeometry(0.18 * ample, 0.18 * scale, 8, 16);
    const hip    = new THREE.Mesh(hipGeo, mat.clone());
    hip.position.y = 0.44 * scale;
    pieces.push(hip);

    // Jambes
    [-1, 1].forEach(side => {
      const jambeGeo = new THREE.CapsuleGeometry(0.09 * ample, 0.72 * scale, 8, 16);
      const jambe    = new THREE.Mesh(jambeGeo, mat.clone());
      jambe.position.set(side * 0.1, -0.08 * scale, 0);
      pieces.push(jambe);
    });
  }

  pieces.forEach(p => vetementGroup.add(p));

  // Copier position/rotation de l'avatarGroup
  vetementGroup.position.copy(avatarGroup.position);
  vetementGroup.rotation.copy(avatarGroup.rotation);
  scene.add(vetementGroup);

  // Animation d'apparition : fade in + léger scale
  let t = 0;
  const fadeIn = () => {
    t += 0.06;
    const progress = Math.min(1, t);
    pieces.forEach(p => { p.material.opacity = progress * 0.92; });
    vetementGroup.scale.set(
      0.9 + 0.1 * progress,
      0.9 + 0.1 * progress,
      0.9 + 0.1 * progress
    );
    if (progress < 1) requestAnimationFrame(fadeIn);
  };
  requestAnimationFrame(fadeIn);
}

function selectVetement(vetement, cardEl) {
  document.querySelectorAll('.clothes-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');

  const { taille, explication } = recommanderTaille(vetement);
  document.getElementById('sizeValue').textContent = taille;
  afficherExplication(vetement, taille, explication);

  // Vêtement 3D sur l'avatar
  if (avatarGroup) porterVetement3D(vetement);
}

function afficherExplication(vetement, taille, lignes) {
  // Supprimer l'ancien panneau s'il existe
  const ancien = document.getElementById('explPanel');
  if (ancien) ancien.remove();

  const panel = document.createElement('div');
  panel.id = 'explPanel';
  panel.className = 'expl-panel';

  const header = document.createElement('div');
  header.className = 'expl-panel__header';

  const titleEl = document.createElement('div');
  titleEl.className = 'expl-panel__title';
  titleEl.textContent = `Pourquoi un ${taille} ?`;

  const subEl = document.createElement('div');
  subEl.className = 'expl-panel__sub';
  subEl.textContent = vetement.description;

  header.append(titleEl, subEl);
  panel.appendChild(header);

  const listEl = document.createElement('ul');
  listEl.className = 'expl-panel__list';
  lignes.forEach(ligne => {
    const li = document.createElement('li');
    // Gras sur **texte**
    li.innerHTML = ligne.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    listEl.appendChild(li);
  });
  panel.appendChild(listEl);

  document.getElementById('avatarViewport').appendChild(panel);

  // Animation entrée
  requestAnimationFrame(() => panel.classList.add('visible'));
}
