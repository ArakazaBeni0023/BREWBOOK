// === PWA Manifest inline ===
const manifest = {
    name: "Gestionnaire Commandes Boissons",
    short_name: "Boissons Pro",
    start_url: ".",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [{ src: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/cup-straw.svg", sizes: "512x512", type: "image/svg+xml" }]
};
const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
document.getElementById('manifest').href = URL.createObjectURL(blob);

// === Service Worker simple pour offline ===
if ('serviceWorker' in navigator) {
    const swCode = `self.addEventListener('install', e=>{self.skipWaiting();}); self.addEventListener('activate', e=>{self.clients.claim();});`;
    const swBlob = new Blob([swCode], { type: 'text/javascript' });
    navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(() => { });
}

const STORAGE_KEY = 'barDataMobile';
const defaultDrinks = [
    {
        "id": 1,
        "name": "Primus",
        "cost": 36200,
        "bottlesPerCrate": 12,
        "sellPrice": 4000,
        "qty": 0
    },
    {
        "id": 2,
        "name": "Petit Primus",
        "cost": 41750,
        "bottlesPerCrate": 20,
        "sellPrice": 2500,
        "qty": 0
    },
    {
        "id": 3,
        "name": "Primus Star",
        "cost": 49350,
        "bottlesPerCrate": 12,
        "sellPrice": 5000,
        "qty": 0
    },
    {
        "id": 4,
        "name": "Petit Primus Star",
        "cost": 54450,
        "bottlesPerCrate": 20,
        "sellPrice": 3500,
        "qty": 0
    },
    {
        "id": 5,
        "name": "Amstel Brond",
        "cost": 63450,
        "bottlesPerCrate": 12,
        "sellPrice": 6500,
        "qty": 0
    },
    {
        "id": 6,
        "name": "Petit Amstel Brond",
        "cost": 89300,
        "bottlesPerCrate": 20,
        "sellPrice": 5500,
        "qty": 0
    },
    {
        "id": 7,
        "name": "Amstel Bright",
        "cost": 52850,
        "bottlesPerCrate": 12,
        "sellPrice": 5500,
        "qty": 0
    },
    {
        "id": 8,
        "name": "Petit Amstel Bright",
        "cost": 71450,
        "bottlesPerCrate": 20,
        "sellPrice": 4500,
        "qty": 0
    },
    {
        "id": 9,
        "name": "Royal",
        "cost": 98200,
        "bottlesPerCrate": 20,
        "sellPrice": 6500,
        "qty": 0
    },
    {
        "id": 10,
        "name": "Fanta",
        "cost": 40850,
        "bottlesPerCrate": 24,
        "sellPrice": 2500,
        "qty": 0
    },
    {
        "id": 11,
        "name": "Vitalo",
        "cost": 25800,
        "bottlesPerCrate": 24,
        "sellPrice": 1500,
        "qty": 0
    },
    {
        "id": 12,
        "name": "Amstel Bock",
        "cost": 107450,
        "bottlesPerCrate": 24,
        "sellPrice": 5500,
        "qty": 0
    },
    {
        "id": 13,
        "name": "Heineken",
        "cost": 260000,
        "bottlesPerCrate": 24,
        "sellPrice": 13000,
        "qty": 0
    }
];

let drinks = [];
let editingId = null;

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) { drinks = parsed; return; }
        }
    } catch { }
    drinks = structuredClone(defaultDrinks);
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(drinks)); }

function profitPerCrate(d) { return (d.sellPrice * d.bottlesPerCrate) - d.cost; }

// Formatage corrigé : espace comme séparateur milliers -> "36 200 Fbu" et non "36 /200"
function formatFbu(n) {
    const v = Math.round(n || 0);
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Fbu";
}

// Conversion nombre -> lettres en français (pour TOTAL EN MOTS)
function convertBelow100(n) {
    const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    if (n < 20) return units[n];
    if (n < 70) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
        if (u === 0) return tens[t];
        if (u === 1) return tens[t] + ' et un';
        return tens[t] + '-' + units[u];
    }
    if (n < 80) {
        if (n === 71) return 'soixante et onze';
        return 'soixante-' + convertBelow100(n - 60);
    }
    if (n < 100) {
        if (n === 80) return 'quatre-vingts';
        if (n === 81) return 'quatre-vingt-un';
        if (n < 90) return 'quatre-vingt-' + convertBelow100(n - 80);
        // 90-99
        if (n === 91) return 'quatre-vingt-onze';
        return 'quatre-vingt-' + convertBelow100(n - 80);
    }
    return '';
}
function convertBelow1000(n) {
    if (n < 100) return convertBelow100(n);
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    let base = '';
    if (hundreds === 1) base = 'cent';
    else base = units[hundreds] + ' cent';
    if (rest === 0) {
        return hundreds > 1 ? base + 's' : base;
    }
    // si cent suivi de quelque chose, pas de s
    return base + ' ' + convertBelow100(rest);
}
function nombreEnLettres(n) {
    n = Math.round(n || 0);
    if (n === 0) return 'zéro';
    let parts = [];
    if (n >= 1000000000) {
        const b = Math.floor(n / 1000000000);
        parts.push((b === 1 ? 'un milliard' : convertBelow1000(b) + ' milliards'));
        n %= 1000000000;
    }
    if (n >= 1000000) {
        const m = Math.floor(n / 1000000);
        parts.push(m === 1 ? 'un million' : convertBelow1000(m) + ' millions');
        n %= 1000000;
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000);
        if (k === 1) parts.push('mille');
        else parts.push(convertBelow1000(k) + ' mille');
        n %= 1000;
    }
    if (n > 0) parts.push(convertBelow1000(n));
    let txt = parts.join(' ');
    // nettoie les "quatre-vingts" au milieu (pas de s)
    txt = txt.replace(/quatre-vingts(?=\s)/g, 'quatre-vingt');
    txt = txt.replace(/cent(s)(?=\s)/g, 'cent');
    return txt;
}
function totalEnMots(n) {
    if (!n) return 'zéro Fbu';
    const lettres = nombreEnLettres(n);
    return lettres + ' Fbu';
}

const listEl = document.getElementById('list');
const totalCostEl = document.getElementById('totalCost');
const totalRevenueEl = document.getElementById('totalRevenue');
const totalProfitEl = document.getElementById('totalProfit');

function renderList() {
    save();
    const q = (document.getElementById('searchInput').value || '').toLowerCase();
    const filtered = drinks.filter(d => d.name.toLowerCase().includes(q));
    if (!filtered.length) {
        listEl.innerHTML = `<div class="empty"><i class="bi bi-search" style="font-size:28px"></i><br><br>Aucune boisson trouvée.<br><small>Essaie un autre nom ou ajoute une nouvelle boisson.</small></div>`;
    } else {
        listEl.innerHTML = filtered.map(d => {
            const profit = profitPerCrate(d);
            const profitColor = profit >= 0 ? 'profit' : '';
            const totalItemCost = d.cost * d.qty;
            const totalItemRev = d.sellPrice * d.bottlesPerCrate * d.qty;
            return `
  <div class="card-drink" data-id="${d.id}">
    <div class="card-top">
      <div>
        <div class="name">${d.name} <span class="badge ${profitColor}">${profit >= 0 ? '+' : ''}${formatFbu(profit)} / casier</span></div>
        <div class="meta">
          <span><i class="bi bi-box-seam"></i> Achat: <b>${formatFbu(d.cost)}</b></span>
          <span><i class="bi bi-cup-straw"></i> ${d.bottlesPerCrate} × <b>${formatFbu(d.sellPrice)}</b></span>
          <span><i class="bi bi-graph-up-arrow"></i> CA casier: <b>${formatFbu(d.sellPrice * d.bottlesPerCrate)}</b></span>
        </div>
      </div>
      <button class="menu-btn" onclick="toggleMenu(${d.id})"><i class="bi bi-three-dots-vertical"></i></button>
      <div class="menu" id="menu-${d.id}">
        <button onclick="editDrink(${d.id})"><i class="bi bi-pencil"></i> Modifier</button>
        <button class="danger" onclick="deleteDrink(${d.id})"><i class="bi bi-trash"></i> Supprimer</button>
      </div>
    </div>
    <div class="qty-row">
      <div class="qty-controls">
        <button class="qty-btn" onclick="updateQty(${d.id}, -1)"><i class="bi bi-dash"></i></button>
        <div class="qty-value">${d.qty}</div>
        <button class="qty-btn plus" onclick="updateQty(${d.id}, 1)"><i class="bi bi-plus"></i></button>
      </div>
      <div class="qty-total">
        <small style="color:var(--muted)">Sous-total</small>
        <b>${formatFbu(totalItemCost)}</b>
        <small style="color:var(--success); font-weight:700">+${formatFbu(totalItemRev - totalItemCost)} bénéf</small>
      </div>
    </div>
  </div>`;
        }).join('');
    }
    // totals
    let totalCost = 0, totalRev = 0;
    drinks.forEach(d => { totalCost += d.cost * d.qty; totalRev += d.sellPrice * d.bottlesPerCrate * d.qty; });
    const totalProfit = totalRev - totalCost;
    totalCostEl.textContent = formatFbu(totalCost);
    totalRevenueEl.textContent = formatFbu(totalRev);
    totalProfitEl.textContent = formatFbu(totalProfit);
    const wordsEl = document.getElementById('totalWords');
    if (wordsEl) {
        wordsEl.textContent = totalEnMots(totalCost);
    }
    document.getElementById('pdfBtn').disabled = drinks.every(d => d.qty <= 0);
    // ajuster padding bottom dynamique
    document.body.style.paddingBottom = (document.querySelector('.bottom-bar').offsetHeight + 20) + 'px';
}

window.updateQty = (id, delta) => {
    const d = drinks.find(x => x.id === id);
    if (!d) return;
    d.qty = Math.max(0, d.qty + delta);
    // haptic
    if (navigator.vibrate) navigator.vibrate(20);
    renderList();
}
window.toggleMenu = (id) => {
    const el = document.getElementById('menu-' + id);
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-drink')) document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));
});
window.deleteDrink = (id) => {
    if (!confirm('Supprimer cette boisson ?')) return;
    drinks = drinks.filter(d => d.id !== id);
    renderList();
}
window.editDrink = (id) => {
    const d = drinks.find(x => x.id === id);
    if (!d) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier ' + d.name;
    document.getElementById('fName').value = d.name;
    document.getElementById('fCost').value = d.cost;
    document.getElementById('fBottles').value = d.bottlesPerCrate;
    document.getElementById('fSell').value = d.sellPrice;
    document.getElementById('modal').classList.add('open');
    document.querySelectorAll('.menu').forEach(m => m.classList.remove('open'));
}

// Modal logic
const modal = document.getElementById('modal');
document.getElementById('addBtn').onclick = () => {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Ajouter une boisson';
    document.getElementById('fName').value = ''; document.getElementById('fCost').value = ''; document.getElementById('fBottles').value = '24'; document.getElementById('fSell').value = '';
    modal.classList.add('open');
}
document.getElementById('cancelModal').onclick = () => modal.classList.remove('open');
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
document.getElementById('saveModal').onclick = () => {
    const name = document.getElementById('fName').value.trim();
    const cost = parseInt(document.getElementById('fCost').value) || 0;
    const bottles = parseInt(document.getElementById('fBottles').value) || 24;
    const sell = parseInt(document.getElementById('fSell').value) || 0;
    if (!name || cost <= 0 || sell <= 0) { alert('Remplis tous les champs correctement.'); return; }
    if (editingId) {
        const d = drinks.find(x => x.id === editingId);
        if (d) { d.name = name; d.cost = cost; d.bottlesPerCrate = bottles; d.sellPrice = sell; }
    } else {
        drinks.push({ id: Date.now(), name, cost, bottlesPerCrate: bottles, sellPrice: sell, qty: 0 });
    }
    modal.classList.remove('open');
    renderList();
}

// Search
document.getElementById('searchInput').addEventListener('input', renderList);

// Reset
document.getElementById('resetBtn').onclick = () => {
    if (!confirm('Remettre toutes les quantités à 0 ?')) return;
    drinks.forEach(d => d.qty = 0);
    renderList();
}

// PDF Export
document.getElementById('pdfBtn').onclick = () => {
    const { jsPDF } = window.jspdf;
    const filtered = drinks.filter(d => d.qty > 0);
    if (!filtered.length) return;
    const doc = new jsPDF();
    const now = new Date();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('BON DE COMMANDE - BOISSONS', 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Date: ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR')}`, 14, 24);
    doc.setDrawColor(200); doc.line(14, 26, 196, 26);

    const head = [['Boisson', 'Qte Casiers', 'Px Achat / Casier', 'Bouteilles', 'Px Vente / Btlle', 'Total Achat', 'CA Prevu', 'Benefice']];
    let totalCost = 0, totalRev = 0;
    const body = filtered.map(d => {
        const tc = d.cost * d.qty;
        const rev = d.sellPrice * d.bottlesPerCrate * d.qty;
        const prof = rev - tc;
        totalCost += tc; totalRev += rev;
        return [d.name, d.qty.toString(), formatFbu(d.cost), d.bottlesPerCrate.toString(), formatFbu(d.sellPrice), formatFbu(tc), formatFbu(rev), formatFbu(prof)];
    });
    doc.autoTable({
        head, body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        foot: [['', '', '', '', 'TOTAUX', formatFbu(totalCost), formatFbu(totalRev), formatFbu(totalRev - totalCost)]],
        footStyles: { fillColor: [245, 158, 11], textColor: 0, fontStyle: 'bold' },
        margin: { left: 10, right: 10 }
    });
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL COMMANDE : ${formatFbu(totalCost)}`, 14, finalY);
    finalY += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setTextColor(60);
    const mots = totalEnMots(totalCost);
    const motsMaj = mots.charAt(0).toUpperCase() + mots.slice(1);
    const splitMots = doc.splitTextToSize(`${motsMaj}.`, 182);
    doc.text(splitMots, 14, finalY);
    finalY += splitMots.length * 5 + 5;
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Formule benefice: (Prix vente x Nb bouteilles) - Prix achat casier. ${filtered.length} reference(s) commandees.`, 14, finalY);
    doc.save(`Bon_Commande_${now.toISOString().slice(0, 10)}.pdf`);
}

// Theme
const themeBtn = document.getElementById('themeBtn');
function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    themeBtn.innerHTML = t === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
}
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeBtn.onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

load();
renderList();
