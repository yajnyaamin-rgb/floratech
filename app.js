

const API = "http://127.0.0.1:5000/api";

let ME        = null;   
let cart      = {};     
let adminTab  = 'users';
let pendingProductImage = null;
let pendingAdminImage   = null;


let SHOP_ITEMS   = [];
let ALL_USERS    = [];
let PLANTATIONS  = [];
let ALL_ORDERS   = [];
let FEEDBACK     = [];
let EVENTS       = [];
let WEATHER      = {};


/*UTILITIES */
const $ = id => document.getElementById(id);
function openM(id)  { $(id).classList.add('open'); }
function closeM(id) { $(id).classList.remove('open'); }

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

const condIco   = {sunny:'☀️',cloudy:'⛅',rain:'🌧️',thunder:'⛈️',windy:'💨',haze:'🌫️'};
const condLbl   = {sunny:'Sunny',cloudy:'Partly Cloudy',rain:'Rainy',thunder:'Thunderstorm',windy:'Windy',haze:'Hazy'};
const stIco     = {planted:'🌱',growing:'🌿',mature:'🌳'};
const stBadge   = {planted:'badge-gold',growing:'badge-green',mature:'badge-blue'};

// Generic API helper
async function api(path, method='GET', body=null) {
  const opts = { method, headers: {'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(API + path, opts);
    return await res.json();
  } catch(e) {
    toast('❌ Server error. Is Flask running?');
    return null;
  }
}


/* ════════════════════════════════
   PAGE 1 — AUTH / LOGIN
════════════════════════════════ */
function switchTab(tab) {
  $('form-login').style.display    = tab==='login'    ? 'block' : 'none';
  $('form-register').style.display = tab==='register' ? 'block' : 'none';
  $('tab-login').classList.toggle('active',    tab==='login');
  $('tab-register').classList.toggle('active', tab==='register');
}

async function doLogin() {
  const u = $('l-user').value.trim();
  const p = $('l-pass').value;
  const r = $('l-role').value;
  const err = $('login-err');
  err.style.display = 'none';
  if (!u||!p||!r) { err.textContent='Fill all fields'; err.style.display='block'; return; }

  const data = await api('/login', 'POST', { username:u, password:p, role:r });
  if (!data) return;
  if (data.success) {
    ME = data.user;
    $('s-auth').classList.remove('on');
    $('s-dash').classList.add('on');
    initDash();
  } else {
    err.textContent = data.message || 'Invalid credentials';
    err.style.display = 'block';
  }
}

async function doRegister() {
  const name  = $('r-name').value.trim();
  const user  = $('r-user').value.trim();
  const email = $('r-email').value.trim();
  const pass  = $('r-pass').value;
  const addr  = $('r-addr').value;
  const phone = $('r-phone').value.trim();
  const err   = $('reg-err'), ok = $('reg-ok');
  err.style.display='none'; ok.style.display='none';

  if(!name||!user||!email||!pass||!addr||!phone) { err.textContent='Fill all fields'; err.style.display='block'; return; }
  if(pass.length<6) { err.textContent='Password must be at least 6 characters'; err.style.display='block'; return; }

 const data = await api('/register', 'POST', { 
  name, 
  username: user, 
  password: pass, 
  role: 'citizen',   
  email, 
  address: addr, 
  phone 
});
  if (!data) return;
  if (data.success) {
    ok.textContent = 'Account created! You can now sign in.';
    ok.style.display = 'block';
    $('r-name').value=$('r-user').value=$('r-email').value=$('r-pass').value=$('r-phone').value='';
    $('r-addr').value='';
  } else {
    err.textContent = data.message || 'Registration failed';
    err.style.display = 'block';
  }
}

function doLogout() {
  ME=null; cart={};
  SHOP_ITEMS=[]; ALL_USERS=[]; PLANTATIONS=[]; ALL_ORDERS=[]; FEEDBACK=[]; EVENTS=[]; WEATHER={};
  $('s-dash').classList.remove('on');
  $('s-auth').classList.add('on');
  $('l-user').value=''; $('l-pass').value=''; $('l-role').value='';
  $('login-err').style.display='none';
}

document.addEventListener('keydown', e => { if(e.key==='Enter' && $('s-auth').classList.contains('on')) doLogin(); });


/* ════════════════════════════════
   PAGE 2 — DASHBOARD INIT & NAVIGATION
════════════════════════════════ */
function initDash() {
  const citizenNav = [
    { ico:'🏠', lbl:'Dashboard',       sec:'home' },
    { ico:'☁️', lbl:'Carbon Dashboard', sec:'carbon' },
    { ico:'📅', lbl:'Green Events',     sec:'events' },
    { ico:'🛒', lbl:'Shop',             sec:'shop' },
    { ico:'📦', lbl:'My Orders',        sec:'orders' },
  ];
  const adminNav = [
    { ico:'🏠', lbl:'Dashboard',       sec:'home' },
    { ico:'☁️', lbl:'Carbon Dashboard', sec:'carbon' },
    { ico:'📅', lbl:'Green Events',     sec:'events' },
    { ico:'🛒', lbl:'Shop',             sec:'shop' },
    { ico:'📦', lbl:'All Orders',       sec:'orders' },
    { ico:'🛡️', lbl:'Admin Panel',      sec:'admin' },
  ];
  const navItems = ME.role==='admin' ? adminNav : citizenNav;
  $('sb-nav').innerHTML = navItems.map(n =>
    `<div class="nav-link" data-sec="${n.sec}" onclick="goSec('${n.sec}')">
      <span class="ni">${n.ico}</span><span>${n.lbl}</span>
    </div>`
  ).join('');

  $('sb-name').textContent = ME.name;
  $('sb-role').textContent = ME.role;
  $('sb-av').textContent   = ME.name[0].toUpperCase();
  $('sb-av').className     = 'user-av' + (ME.role==='admin'?' admin-av':'');

  goSec('home');
}

function goSec(s) {
  document.querySelectorAll('.section').forEach(x => x.classList.remove('on'));
  const el = $('sec-'+s);
  if(el) el.classList.add('on');
  document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.sec===s));
  $('pg-title').textContent = { home:'Dashboard', carbon:'Carbon Dashboard', events:'Green Events', shop:'Plant Shopping Mart', orders:'My Orders', admin:'Admin Panel' }[s] || 'FloraTech';
  $('pg-sub').textContent   = ME.role==='admin' ? 'Admin Control Panel – Mumbai' : 'Welcome, '+ME.name.split(' ')[0]+'!';
  renderSection(s);
}

function renderSection(s) {
  if(s==='home')        renderHome();
  else if(s==='carbon') renderCarbon();
  else if(s==='events') renderEvents();
  else if(s==='shop')   renderShop();
  else if(s==='orders') renderOrders();
  else if(s==='admin')  renderAdmin();
}


/* ════════════════════════════════
   SECTION: HOME (Dashboard)
════════════════════════════════ */
async function renderHome() {
  // Load data in parallel
  const [plantsRes, weatherRes, feedbackRes, ordersRes, eventsRes, usersRes, shopRes] = await Promise.all([
    api(ME.role==='admin' ? '/plantations/all' : `/plantations/${ME.id}`),
    api('/weather'),
    api('/feedback'),
    api('/orders'),
    api('/events'),
    ME.role==='admin' ? api('/users') : Promise.resolve([]),
    api('/shop'),
  ]);

  PLANTATIONS = plantsRes  || [];
  WEATHER     = weatherRes || {};
  FEEDBACK    = feedbackRes|| [];
  ALL_ORDERS  = ordersRes  || [];
  EVENTS      = eventsRes  || [];
  ALL_USERS   = usersRes   || [];
  SHOP_ITEMS  = shopRes    || [];

  const myP      = PLANTATIONS;
  const totalCO2 = myP.reduce((s,p)=>s+(p.co2||0), 0);
  const isAdmin  = ME.role==='admin';

  // Stats
  const stats = isAdmin ? [
    {ico:'👥', val:ALL_USERS.filter(u=>u.role==='citizen').length, lbl:'Registered Citizens', c:'c1'},
    {ico:'🌳', val:myP.length, lbl:'Trees Tracked', c:'c2'},
    {ico:'🏪', val:SHOP_ITEMS.length, lbl:'Shop Products', c:'c3'},
    {ico:'☁️', val:totalCO2+' kg', lbl:'Total CO₂ Offset', c:'c4'},
  ] : [
    {ico:'🌳', val:myP.length, lbl:'Trees Planted', c:'c1'},
    {ico:'☁️', val:totalCO2+' kg', lbl:'CO₂ Offset', c:'c2'},
    {ico:'🛒', val:ALL_ORDERS.filter(o=>o.user_id===ME.id).length, lbl:'Orders Placed', c:'c3'},
    {ico:'📅', val:EVENTS.filter(e=>e.registrations&&e.registrations.some(r=>r.user_id===ME.id)).length, lbl:'Events Joined', c:'c4'},
  ];
  $('home-stats').innerHTML = stats.map(s =>
    `<div class="stat ${s.c}"><div class="stat-ico">${s.ico}</div><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`
  ).join('');

  // Weather
  renderWeatherWidget();

  // Carbon overview
  $('home-carbon').innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <span style="font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:700;color:var(--g4)">${totalCO2}</span>
      <div style="color:var(--txt3);font-size:.78rem">kg CO₂ offset${isAdmin?' (platform-wide)':''}</div>
    </div>
    <div class="bar-row">
      <div class="bar-label"><span>Goal: 100 trees</span><span>${Math.min(myP.length,100)}/100</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min((myP.length/100)*100,100)}%"></div></div>
    </div>`;

  // Plantations inline
  const plantEl = $('home-plant-list');
  if(plantEl) plantEl.innerHTML = myP.length
    ? myP.slice(-5).reverse().map(p => plantRowHtml(p, true)).join('')
    : '<div class="empty"><div class="eico">🌱</div><p>No plantations yet. Log your first tree!</p></div>';

  // Feedback
  $('feedback-write-box').style.display = ME.role==='citizen' ? 'block' : 'none';
  renderFeedbackList();
}

function renderWeatherWidget() {
  const wx = WEATHER;
  if(!wx || !wx.temp) return;
  $('wx-temp').textContent = wx.temp+'°C';
  $('wx-desc').textContent = condLbl[wx.cond] || wx.cond;
  $('wx-city').textContent = '📍 Mumbai, Maharashtra';
  $('wx-ico').textContent  = condIco[wx.cond] || '🌤️';
  $('wx-hum').textContent  = wx.humidity+'%';
  $('wx-wind').textContent = wx.wind+' km/h';
  $('wx-uv').textContent   = wx.uv+' UV';
  const aqi      = wx.aqi;
  const aqiColor = aqi<50?'#4caf50':aqi<100?'#ff9800':aqi<200?'#ff5722':'#f44336';
  const aqiLbl   = aqi<50?'Good – Great day to plant!':aqi<100?'Moderate – Use precaution':aqi<200?'Unhealthy – Wear mask outdoors':'Very Poor – Stay indoors';
  $('aqi-dot').style.background = aqiColor;
  $('aqi-txt').textContent = `AQI ${aqi} – ${aqiLbl}`;
}


/* ════════════════════════════════
   SECTION: PLANTATIONS
════════════════════════════════ */
function plantRowHtml(p, mini) {
  const ownerName = p.owner_name || ME.name;
  const ownerStr  = ME.role==='admin' ? `<span style="color:var(--g4);font-weight:600">${ownerName}</span> · ` : '';
  return `<div class="plant-row">
    <div class="plant-emo">${stIco[p.status]||'🌱'}</div>
    <div class="plant-body">
      <div class="plant-name">${p.name}</div>
      <div class="plant-meta">${ownerStr}📍 ${p.location}, Mumbai &nbsp;|&nbsp; 📅 ${p.date} &nbsp;|&nbsp; ☁️ ${p.co2||0} kg CO₂${p.note?' &nbsp;|&nbsp; 📝 '+p.note:''}</div>
      <span class="badge ${stBadge[p.status]||'badge-gray'}" style="margin-top:4px;display:inline-block">${p.status}</span>
    </div>
    ${!mini ? `<div class="plant-actions"><button class="btn btn-sm btn-danger" onclick="deletePlant(${p.id})">Remove</button></div>` : ''}
  </div>`;
}

async function savePlant() {
  const name   = $('mp-name').value.trim();
  const loc    = $('mp-loc').value;
  const date   = $('mp-date').value;
  const status = $('mp-status').value;
  const note   = $('mp-note').value.trim();
  if(!name||!loc||!date) { toast('⚠️ Fill all required fields'); return; }

  const data = await api('/plantations', 'POST', { userId:ME.id, name, location:loc, date, status, note });
  if (!data) return;
  if (data.success) {
    closeM('m-plant');
    $('mp-name').value=''; $('mp-loc').value=''; $('mp-date').value=''; $('mp-note').value='';
    toast('🌳 Tree logged successfully!');
    renderHome();
  }
}

async function deletePlant(id) {
  const data = await api(`/plantations/${id}`, 'DELETE');
  if (data && data.success) { toast('🗑️ Plantation removed'); renderHome(); }
}


/* ════════════════════════════════
   SECTION: FEEDBACK
════════════════════════════════ */
function renderFeedbackList() {
  const el = $('feedback-list');
  if(!el) return;
  el.innerHTML = FEEDBACK.length
    ? FEEDBACK.map(feedbackCardHtml).join('')
    : '<div class="empty"><div class="eico">💬</div><p>No feedback yet. Be the first!</p></div>';
}

function feedbackCardHtml(p) {
  const isAdm = p.role==='admin';
  return `<div class="feedback-card">
    <div class="fb-hd">
      <div class="fb-av ${isAdm?'admin-av':''}">${p.name[0].toUpperCase()}</div>
      <div>
        <div class="fb-uname">${p.name} ${isAdm?'<span class="badge badge-gold" style="font-size:.6rem">Admin</span>':''}</div>
        <div class="fb-time">@${p.username} · ${p.time}</div>
      </div>
    </div>
    <div class="fb-body">${p.text}</div>
  </div>`;
}

async function addFeedback() {
  const txt = $('fb-txt')?.value.trim();
  if(!txt) { toast('⚠️ Write something first'); return; }

  const data = await api('/feedback', 'POST', { userId:ME.id, username:ME.username, name:ME.name, role:ME.role, text:txt });
  if (data && data.success) {
    $('fb-txt').value = '';
    // Refresh feedback
    const updated = await api('/feedback');
    if (updated) FEEDBACK = updated;
    renderFeedbackList();
    toast('🌿 Feedback posted!');
  }
}


/* ════════════════════════════════
   SECTION: CARBON DASHBOARD
════════════════════════════════ */
async function renderCarbon() {
  const [plantsRes, usersRes] = await Promise.all([
    api(ME.role==='admin' ? '/plantations/all' : `/plantations/${ME.id}`),
    api('/users'),
  ]);
  PLANTATIONS = plantsRes || [];
  ALL_USERS   = usersRes  || [];

  const myP      = PLANTATIONS;
  const treeCO2  = myP.reduce((s,p)=>s+(p.co2||0), 0);

  $('co2-big').textContent = treeCO2;
  const equiv = (treeCO2/21).toFixed(1);
  const meals = Math.round(treeCO2/2.5);
  $('carbon-mini-stats').innerHTML = `<div class="grid2" style="gap:7px;margin:14px 0">
    ${[['📅',equiv+' yrs','CO₂ Equiv.'],['🍽️',meals,'Meals Offset'],['🌳',myP.length,'Trees Logged'],['🏙️','Mumbai','City']].map(([ico,val,lbl])=>
    `<div style="background:var(--g8);border-radius:9px;padding:12px;text-align:center"><div style="font-size:1.3rem">${ico}</div><div style="font-weight:700;font-size:1rem;color:var(--g2)">${val}</div><div style="font-size:.7rem;color:var(--txt3)">${lbl}</div></div>`
    ).join('')}</div>`;

  if(ME.role==='admin') $('cf-form').style.display='none';

  const mature  = myP.filter(p=>p.status==='mature').length;
  const growing = myP.filter(p=>p.status==='growing').length;
  const planted = myP.filter(p=>p.status==='planted').length;
  const bars = [
    {lbl:'Mature Trees 🌳',  pct:Math.min((mature /Math.max(myP.length,1))*100,100), val:mature},
    {lbl:'Growing Trees 🌿', pct:Math.min((growing/Math.max(myP.length,1))*100,100), val:growing},
    {lbl:'Newly Planted 🌱', pct:Math.min((planted/Math.max(myP.length,1))*100,100), val:planted},
    {lbl:'Goal: 50 Trees',   pct:Math.min((myP.length/50)*100,100), val:myP.length+'/50'},
    {lbl:'CO₂ Goal: 200 kg', pct:Math.min((treeCO2/200)*100,100),   val:treeCO2+'kg'},
  ];
  $('carbon-bars').innerHTML = bars.map(b =>
    `<div class="bar-row"><div class="bar-label"><span>${b.lbl}</span><span>${b.val} (${Math.round(b.pct)}%)</span></div><div class="bar-track"><div class="bar-fill" style="width:${b.pct}%"></div></div></div>`
  ).join('');

  // Leaderboard from all users + their plantations
  const citizens = ALL_USERS.filter(u=>u.role==='citizen');
  const lb = citizens.map(u => {
    const up  = (plantsRes||[]).filter(p=>p.user_id===u.id);
    const co2 = up.reduce((s,p)=>s+(p.co2||0),0);
    return {name:u.name, trees:up.length, co2};
  }).sort((a,b)=>b.co2-a.co2);

  $('co2-leaderboard').innerHTML = lb.map((u,i) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(0,0,0,.05)">
      <span style="font-size:.83rem;color:var(--txt2)">${['🥇','🥈','🥉'][i]||'🌱'} ${u.name}</span>
      <span style="font-size:.78rem;color:var(--g4);font-weight:700">☁️ ${u.co2} kg | 🌳 ${u.trees}</span>
    </div>`
  ).join('');
}

function calcCarbon() {
  const trees = parseInt($('cf-trees').value)||0;
  const veh   = $('cf-veh').value;
  const km    = parseInt($('cf-km').value)||0;
  const lpg   = parseInt($('cf-lpg').value)||0;
  const vehFactor  = {walk:0,local:0.01,bus:0.03,bike:0.06,car:0.14,ev:0.02};
  const travelEmit = km*vehFactor[veh]*30;
  const lpgEmit    = lpg*2.9;
  const totalEmit  = Math.round(travelEmit+lpgEmit);
  const treeOffset = trees*8;
  const net        = Math.max(treeOffset-totalEmit, 0);

  const cfRes = $('cf-result');
  if(cfRes) {
    const status = net>0 ? '✅ Carbon Positive!' : '⚠️ You are emitting more than you offset.';
    cfRes.innerHTML = `<div style="background:${net>0?'#e4f4eb':'#fef8e7'};border-radius:9px;padding:13px">
      <div style="font-weight:700;font-size:.92rem;color:var(--g2);margin-bottom:5px">${status}</div>
      <div style="font-size:.8rem;color:var(--txt2);line-height:1.8">
        🌿 Tree offset: <strong>${treeOffset} kg CO₂</strong><br>
        🚗 Travel: <strong>${Math.round(travelEmit)} kg CO₂</strong><br>
        🍳 LPG: <strong>${Math.round(lpgEmit)} kg CO₂</strong><br>
        🌍 Net offset: <strong style="color:var(--g4)">${net} kg CO₂</strong>
      </div>
    </div>`;
  }
  toast(`♻️ Net offset: ${net} kg CO₂/month`);
}


/* ════════════════════════════════
   SECTION: GREEN EVENTS
════════════════════════════════ */
async function renderEvents() {
  const addBtn = $('event-add-btn');
  if(addBtn) addBtn.innerHTML = ME.role==='admin'
    ? `<button class="btn btn-sm btn-primary" onclick="openM('m-event')">+ Add Event</button>` : '';

  const el = $('events-list');
  if(!el) return;

  EVENTS = await api('/events') || [];
  if(!EVENTS.length) { el.innerHTML='<div class="empty"><div class="eico">📅</div><p>No events scheduled yet.</p></div>'; return; }

  el.innerHTML = EVENTS.map(ev => {
    const regCount    = ev.registrations ? ev.registrations.length : 0;
    const isRegistered= ev.registrations && ev.registrations.some(r=>r.user_id===ME.id);
    const isFull      = regCount >= ev.max_reg;
    const regBtn = ME.role==='citizen'
      ? (isRegistered
          ? `<span class="badge badge-green">✅ Registered</span>`
          : (isFull
              ? `<span class="badge badge-gray">Full</span>`
              : `<button class="btn btn-sm btn-primary" onclick="registerEvent(${ev.id})">Register Now</button>`))
      : '';
    return `<div class="event-card">
      <div class="ev-top">
        <div><div class="ev-title">${ev.title}</div><div class="ev-date">📅 ${ev.date} &nbsp;|&nbsp; ⏰ ${ev.time}</div></div>
        ${ME.role==='admin'?`<button class="btn btn-sm btn-danger" onclick="deleteEvent(${ev.id})">Remove</button>`:''}
      </div>
      <div class="ev-desc">${ev.description}</div>
      <div class="ev-meta"><span>📍 ${ev.location}, Mumbai</span><span>👥 ${regCount}/${ev.max_reg} registered</span></div>
      <div class="ev-foot">
        <div class="ev-reg-count">${isFull?'🔴 Fully Booked':'🟢 Spots Available'}</div>
        ${regBtn}
      </div>
    </div>`;
  }).join('');
}

async function registerEvent(evId) {
  const data = await api(`/events/${evId}/register`, 'POST', {
    userId:ME.id, name:ME.name, username:ME.username, phone:ME.phone
  });
  if (!data) return;
  if (data.success) { toast('🎉 Registered! Admin has been notified.'); renderEvents(); }
  else toast('⚠️ ' + (data.message || 'Registration failed'));
}

async function saveEvent() {
  const title = $('ev-title').value.trim();
  const desc  = $('ev-desc').value.trim();
  const date  = $('ev-date').value;
  const time  = $('ev-time').value;
  const loc   = $('ev-loc').value;
  const max   = parseInt($('ev-max').value);
  if(!title||!desc||!date||!time||!max) { toast('⚠️ Fill all event fields'); return; }

  const data = await api('/events', 'POST', { title, desc, date, time, location:loc, maxReg:max });
  if (data && data.success) {
    closeM('m-event');
    $('ev-title').value=$('ev-desc').value=$('ev-date').value=$('ev-time').value=$('ev-max').value='';
    toast('📅 Event created!'); renderEvents();
  }
}

async function deleteEvent(id) {
  const data = await api(`/events/${id}`, 'DELETE');
  if (data && data.success) { toast('🗑️ Event removed'); renderEvents(); }
}


/* ════════════════════════════════
   SECTION: SHOP
════════════════════════════════ */
async function renderShop() {
  const adminAdd = $('shop-admin-add');
  if(adminAdd) adminAdd.style.display = ME.role==='admin' ? 'block' : 'none';

  SHOP_ITEMS = await api('/shop') || [];

  const sh  = $('sh-search')?.value.toLowerCase() || '';
  const cat = $('sh-cat')?.value || '';
  let items = SHOP_ITEMS.filter(p => {
    const tags = p.tags ? p.tags.split(',') : [];
    const ms   = !sh || p.name.toLowerCase().includes(sh) || (p.description||'').toLowerCase().includes(sh) || tags.some(t=>t.includes(sh));
    return ms && (!cat || p.category===cat);
  });

  const stars = r => r>0 ? '★'.repeat(Math.floor(r))+'☆'.repeat(5-Math.floor(r)) : 'No ratings';
  const grid  = $('products-grid');
  if(!grid) return;

  grid.innerHTML = items.length ? items.map(p => {
    const inCart = cart[p.id] > 0;
    const sticker = p.is_sale
      ? '<span class="p-card-sticker sticker-sale">Sale</span>'
      : p.is_new ? '<span class="p-card-sticker sticker-new">New</span>'
      : p.is_popular ? '<span class="p-card-sticker sticker-popular">Popular</span>' : '';
   const imgContent = p.image
  ? `<img src="http://127.0.0.1:5000/${p.image.startsWith('images') ? p.image : 'images/' + p.image.split('/').pop()}"" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
  : `<span style="font-size:3.5rem;">🌱</span>`;
    const tags = p.tags ? p.tags.split(',') : [];
    return `<div class="p-card">
      <div class="p-card-img">${sticker}${imgContent}</div>
      <div class="p-card-body">
        <div class="p-card-name">${p.name}</div>
        ${p.scientific?`<div class="p-card-sci">${p.scientific}</div>`:''}
        <div class="p-stars">${stars(p.rating)} ${p.reviews>0?`<span style="color:var(--txt3)">(${p.reviews})</span>`:''}</div>
        <div class="p-card-tags">${tags.map(t=>`<span class="p-tag">${t}</span>`).join('')}</div>
        <div class="p-card-desc">${p.description||''}</div>
        <div class="p-card-foot">
          <div>${p.old_price?`<span class="p-price-old">₹${p.old_price}</span>`:''}
            <span class="p-price">₹${p.price}</span></div>
          <button class="btn-addcart ${inCart?'incart':''}" onclick="addCart('${p.id}')">
            ${inCart?`✓ In Cart (${cart[p.id]})`:'+  Add'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('')
  : '<div class="empty" style="grid-column:1/-1"><div class="eico">🪴</div><p>No products found.</p></div>';

  updateCart();
}

// Admin image upload preview
function previewProductImage(input) {
  if(!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingProductImage = e.target.result;
    const box = $('sp-img-box');
    let preview = box.querySelector('.img-preview');
    if(!preview) { preview=document.createElement('img'); preview.className='img-preview'; box.appendChild(preview); }
    preview.src = pendingProductImage;
    const note = $('sp-upload-note'); if(note) note.textContent = '✅ Image ready';
  };
  reader.readAsDataURL(input.files[0]);
}
async function addShopItem() {
  console.log("BUTTON CLICKED");

  if (ME.role !== 'admin') {
    toast('❌ Only admin can add products');
    return;
  }

  const name   = $('sp-name').value.trim();
  const cat    = $('sp-cat').value;
  const price  = parseInt($('sp-price').value);
  const desc   = $('sp-desc').value.trim();
  let imgUrl = $('sp-img') ? $('sp-img').value.trim() : '';

if (imgUrl && !imgUrl.startsWith('http')) {
    imgUrl = '/' + imgUrl.replace(/\\/g, '/');
}

  console.log(name, cat, price, desc, imgUrl);

  if (!name || !price || !desc) {
    toast('⚠️ Fill all product fields');
    return;
  }

  const payload = {
    name: name,
    category: cat,
    price: price,
    desc: desc,
    image: imgUrl   // 👈 URL METHOD
  };

  console.log("SENDING:", payload);

  try {
    const res = await fetch("http://127.0.0.1:5000/api/shop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("RESPONSE:", data);

    if (data.success) {
      toast('🌱 Product added!');
      renderShop();
    } else {
      toast('❌ Failed to add');
    }

  } catch (err) {
    console.error(err);
    toast('❌ Server error');
  }
}

function addCart(id)      { cart[id]=(cart[id]||0)+1; updateCart(); renderShop(); toast('🌱 Added to cart!'); }
function changeQty(id,d)  { cart[id]=(cart[id]||0)+d; if(cart[id]<=0) delete cart[id]; updateCart(); renderShop(); }
function removeCart(id)   { delete cart[id]; updateCart(); renderShop(); toast('Removed'); }
function clearCart()      { cart={}; updateCart(); renderShop(); toast('Cart cleared'); }

function updateCart() {
  const cnt   = Object.values(cart).reduce((s,q)=>s+q, 0);
  const total = Object.entries(cart).reduce((s,[id,q]) => {
    const p = SHOP_ITEMS.find(x=>x.id===id); return s+(p?p.price*q:0);
  }, 0);
  const badge = $('cart-badge'); if(badge) badge.textContent = cnt;
  const body  = $('cart-body'), foot = $('cart-foot');
  if(!body) return;
  if(cnt===0) { body.innerHTML='<div class="cart-empty-msg">Your cart is empty 🌱</div>'; foot.style.display='none'; return; }
  foot.style.display = 'block';
  $('cart-total').textContent = '₹'+total;
  body.innerHTML = Object.entries(cart).map(([id,qty]) => {
    const p = SHOP_ITEMS.find(x=>x.id===id); if(!p) return '';
    const cartImg = p.image
    ? `<img src="http://127.0.0.1:5000${p.image}" style="width:30px;height:30px;object-fit:cover;border-radius:5px;">`
    : `<span style="font-size:1.3rem;">🌱</span>`;
    return `<div class="cart-item">
      <div class="cart-emo">${cartImg}</div>
      <div class="ci-info">
        <div class="ci-name">${p.name}</div>
        <div class="ci-price">₹${p.price} × ${qty} = ₹${p.price*qty}</div>
        <div class="ci-qty">
          <button class="qbtn" onclick="changeQty('${id}',-1)">−</button>
          <span class="qval">${qty}</span>
          <button class="qbtn" onclick="changeQty('${id}',1)">+</button>
        </div>
      </div>
      <span class="ci-del" onclick="removeCart('${id}')">✕</span>
    </div>`;
  }).join('');
}

function openCheckout() {
  if(!Object.keys(cart).length) { toast('⚠️ Cart is empty'); return; }
  $('co-name').value     = ME.name  || '';
  $('co-house').value    = '';
  $('co-area').value     = ME.address || '';
  $('co-landmark').value = '';
  $('co-phone').value    = ME.phone || '';
  const total = Object.entries(cart).reduce((s,[id,q])=>{ const p=SHOP_ITEMS.find(x=>x.id===id); return s+(p?p.price*q:0); }, 0);
  const del   = total>=500 ? 0 : 49;
  const rows  = Object.entries(cart).map(([id,qty])=>{ const p=SHOP_ITEMS.find(x=>x.id===id); return p?`<div style="display:flex;justify-content:space-between;font-size:.82rem;padding:4px 0"><span>🌱 ${p.name} ×${qty}</span><span>₹${p.price*qty}</span></div>`:''; }).join('');
  $('co-summary').innerHTML = `${rows}
    <div style="display:flex;justify-content:space-between;font-size:.82rem;padding:4px 0;color:var(--txt3)"><span>Delivery</span><span>${del===0?'<span style="color:var(--g4)">FREE</span>':'₹49'}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:.93rem;padding:7px 0 0;border-top:1px solid #ddd;margin-top:5px"><span>Total</span><span>₹${total+del}</span></div>
    ${total<500?`<div style="font-size:.7rem;color:var(--g4);margin-top:4px">Add ₹${500-total} more for free delivery!</div>`:''}`;
  openM('m-checkout');
}

async function placeOrder() {
  const name     = $('co-name').value.trim();
  const house    = $('co-house').value.trim();
  const area     = $('co-area').value.trim();
  const landmark = $('co-landmark').value.trim();
  const phone    = $('co-phone').value.trim();
  const pay      = $('co-pay').value;

  if(!name)  { toast('⚠️ Enter recipient name');      $('co-name').focus();  return; }
  if(!house) { toast('⚠️ Enter flat / house number'); $('co-house').focus(); return; }
  if(!area)  { toast('⚠️ Select your Mumbai area');   $('co-area').focus();  return; }
  if(!phone) { toast('⚠️ Enter contact phone');       $('co-phone').focus(); return; }
  if(phone.length!==10||isNaN(phone)) { toast('⚠️ Enter a valid 10-digit number'); $('co-phone').focus(); return; }

  const fullAddr = `${house}, ${area}, Mumbai${landmark?' (Near '+landmark+')':''}`;
  const items    = Object.entries(cart).map(([id,qty])=>{ const p=SHOP_ITEMS.find(x=>x.id===id); return p?{id,name:p.name,qty,price:p.price}:null; }).filter(Boolean);
  const total    = items.reduce((s,i)=>s+i.price*i.qty, 0);
  const del      = total>=500 ? 0 : 49;

  const data = await api('/orders', 'POST', { userId:ME.id, items, total:total+del, addr:fullAddr, pay });
  if (data && data.success) {
    cart = {};
    closeM('m-checkout');
    toast('🎉 Order placed! Delivery within Mumbai 3–5 days.');
    goSec('orders');
  }
}


/* ════════════════════════════════
   SECTION: MY ORDERS
════════════════════════════════ */
async function renderOrders() {
  const isAdmin = ME.role==='admin';
  ALL_ORDERS    = await api('/orders') || [];
  const myO     = isAdmin ? ALL_ORDERS : ALL_ORDERS.filter(o=>o.user_id===ME.id);
  const payIco  = {cod:'💵',upi:'📱',card:'💳',netbanking:'🏦'};

  $('orders-list').innerHTML = myO.length
    ? myO.map(o => {
        const items = typeof o.items==='string' ? JSON.parse(o.items) : o.items;
        return `<div class="order-card">
          <div class="order-hd">
            <div>
              <div class="order-id">${o.id} ${isAdmin?`<span class="badge badge-blue" style="font-size:.62rem">${o.buyer_name||'?'}</span>`:''}</div>
              <div class="order-date">📅 ${o.date} &nbsp;|&nbsp; ${payIco[o.pay]||'💵'} ${(o.pay||'cod').toUpperCase()}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="badge ${o.status==='delivered'?'badge-green':'badge-gold'}">${o.status==='delivered'?'✅ Delivered':'🚚 Processing'}</span>
              ${isAdmin && o.status!=='delivered' ? `<button class="btn btn-sm btn-ghost" onclick="markDelivered('${o.id}')">Mark Delivered</button>` : ''}
            </div>
          </div>
          <div class="order-pills">${items.map(i=>`<span class="order-pill">🌱 ${i.name} ×${i.qty}</span>`).join('')}</div>
          <div class="order-ft">
            <span style="font-weight:700;color:var(--g1)">Total: ₹${o.total}</span>
            <span style="font-size:.76rem;color:var(--txt3)">📍 ${o.addr}</span>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty"><div class="eico">📦</div><p>No orders yet. <a href="#" onclick="goSec(&quot;shop&quot;)" style="color:var(--g4)">Start shopping!</a></p></div>';
}

async function markDelivered(id) {
  const data = await api(`/orders/${id}/deliver`, 'PUT');
  if (data && data.success) { toast('✅ Marked as delivered'); renderOrders(); }
}


/* ════════════════════════════════
   SECTION: ADMIN PANEL
════════════════════════════════ */
async function renderAdmin() {
  const [usersRes, plantsRes, shopRes, eventsRes] = await Promise.all([
    api('/users'), api('/plantations/all'), api('/shop'), api('/events')
  ]);
  ALL_USERS   = usersRes  || [];
  PLANTATIONS = plantsRes || [];
  SHOP_ITEMS  = shopRes   || [];
  EVENTS      = eventsRes || [];

  const stats = [
    {ico:'👥', val:ALL_USERS.filter(u=>u.role==='citizen').length, lbl:'Citizens', c:'c1'},
    {ico:'🌳', val:PLANTATIONS.length, lbl:'Trees Logged', c:'c2'},
    {ico:'🏪', val:SHOP_ITEMS.length,  lbl:'Products', c:'c3'},
    {ico:'📅', val:EVENTS.length,      lbl:'Events', c:'c4'},
  ];
  $('admin-stats').innerHTML = stats.map(s =>
    `<div class="stat ${s.c}"><div class="stat-ico">${s.ico}</div><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`
  ).join('');

  const pending = EVENTS.reduce((s,e)=>s+(e.registrations||[]).filter(r=>!r.seen).length, 0);
  const regBadge = $('reg-count-badge');
  if(regBadge) regBadge.textContent = pending>0 ? pending : '';

  showAdminTab(adminTab);
}

async function showAdminTab(t) {
  adminTab = t;
  ['users','plants','products','weather','orders','events','registrations','feedback'].forEach(x => {
    $('at-'+x)?.classList.toggle('active', x===t);
  });
  let html = '';

  if(t==='users') {
    html=`<div class="card"><div class="card-hd"><span class="card-title">👥 User Management</span></div>
    <table><thead><tr><th>Name</th><th>Username</th><th>Area</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${ALL_USERS.map(u=>`<tr>
      <td><strong>${u.name}</strong><br><span style="font-size:.7rem;color:var(--txt3)">${u.role==='admin'?'🛡️ Admin':'🌱 Citizen'}</span></td>
      <td>@${u.username}</td><td>${u.address}</td>
      <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status}</span></td>
      <td>${u.id!==ME.id&&u.role!=='admin'
        ?`<button class="btn btn-sm ${u.status==='active'?'btn-danger':'btn-ghost'}" onclick="toggleUser(${u.id})">${u.status==='active'?'Deactivate':'Activate'}</button>`
        :'<span style="color:var(--txt3);font-size:.76rem">—</span>'}</td>
    </tr>`).join('')}
    </tbody></table></div>`;

  } else if(t==='plants') {
    html=`<div class="card"><div class="card-hd"><span class="card-title">🌳 All Mumbai Plantations</span></div>
    ${PLANTATIONS.map(p=>`<div class="plant-row">
      <div class="plant-emo">${stIco[p.status]||'🌱'}</div>
      <div class="plant-body">
        <div class="plant-name">${p.name} <span class="badge badge-green" style="font-size:.62rem">${p.owner_name||'?'}</span></div>
        <div class="plant-meta">📍 ${p.location}, Mumbai | 📅 ${p.date} | ☁️ ${p.co2} kg CO₂</div>
        <span class="badge ${stBadge[p.status]}">${p.status}</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="adminDeletePlant(${p.id})">Remove</button>
    </div>`).join('')}
    ${PLANTATIONS.length===0?'<div class="empty"><div class="eico">🌱</div><p>No plantations recorded.</p></div>':''}
    </div>`;

  } else if(t==='products') {
    html=`<div class="card"><div class="card-hd"><span class="card-title">🏪 Marketplace Products</span>
    <button class="btn btn-sm btn-primary" onclick="openAdminAddProduct()">+ Add Product</button></div>
    <div id="admin-add-product-form" style="display:none;background:var(--g8);border-radius:var(--r-sm);padding:16px;margin-bottom:14px">
      <div class="grid3">
        <div class="fgroup"><label>Product Name</label><input class="finput" id="ap-name" placeholder="e.g. Tulsi Plant"></div>
        <div class="fgroup"><label>Category</label><select class="finput" id="ap-cat">
          <option value="indoor">Indoor</option><option value="outdoor">Outdoor</option>
          <option value="medicinal">Medicinal</option><option value="fruit">Fruit</option>
          <option value="flowering">Flowering</option><option value="compost">Compost</option><option value="tools">Tools</option>
        </select></div>
        <div class="fgroup"><label>Price (₹)</label><input class="finput" type="number" id="ap-price" placeholder="e.g. 120"></div>
      </div>
      <div class="grid2">
        <div class="fgroup">
          <label>Product Image</label>
          <div class="img-upload-box" id="ap-img-box" style="height:90px">
            <input type="file" id="ap-img-file" accept="image/*" onchange="previewAdminImage(this)">
            <div class="upload-ico">📷</div>
            <div class="upload-txt">Upload from gallery</div>
          </div>
        </div>
        <div class="fgroup"><label>Description</label><input class="finput" id="ap-desc" placeholder="Brief description"></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="adminAddProduct()">✅ Add Product</button>
      <button class="btn btn-ghost btn-sm" onclick="$('admin-add-product-form').style.display='none'">Cancel</button>
    </div>
    <table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead><tbody>
    ${SHOP_ITEMS.map(p=>`<tr>
      <td>
  ${p.image?`<img src="http://127.0.0.1:5000/images/${p.image.split('/').pop()}" 
  style="width:32px;height:32px;object-fit:cover;border-radius:5px;vertical-align:middle;margin-right:6px">`
  :`<span style="font-size:1.2rem;margin-right:5px">🌱</span>`}
  <strong>${p.name}</strong>
      </td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td>₹${p.price}</td>
      <td><button class="btn btn-sm btn-danger" onclick="adminDelProduct('${p.id}')">Remove</button></td>
    </tr>`).join('')}
    </tbody></table></div>`;

  } else if(t==='weather') {
    const wx = await api('/weather') || {};
    WEATHER = wx;
    html=`<div class="card"><div class="card-hd"><span class="card-title">⛅ Mumbai Weather Control</span>
    <button class="btn btn-sm btn-primary" onclick="openAdminWeather()">✏️ Update</button></div>
    <div style="background:var(--g8);border-radius:var(--r);padding:18px;max-width:440px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:11px">
        <div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:700;color:var(--g2)">${wx.temp}°C</div>
          <div style="font-size:.88rem;color:var(--txt2)">${condLbl[wx.cond]||wx.cond}</div>
          <div style="font-size:.76rem;color:var(--txt3);margin-top:4px">📍 Mumbai, Maharashtra</div>
        </div>
        <div style="font-size:2.4rem">${condIco[wx.cond]||'🌤️'}</div>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        ${[['💧',wx.humidity+'%','Humidity'],['💨',wx.wind+' km/h','Wind'],['☀️',wx.uv+' UV','UV Index'],['🏭','AQI '+wx.aqi,wx.aqi<50?'Good':wx.aqi<100?'Moderate':wx.aqi<200?'Unhealthy':'Very Poor']].map(([ico,v,l])=>
        `<div style="background:#fff;border-radius:9px;padding:9px 13px;font-size:.76rem"><strong>${ico} ${v}</strong><br><span style="color:var(--txt3)">${l}</span></div>`).join('')}
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--txt3);margin-top:11px">As admin, you control the weather data shown to all Mumbai citizens.</p>
    </div>`;

  } else if(t==='orders') {
    ALL_ORDERS = await api('/orders') || [];
    html=`<div class="card"><div class="card-hd"><span class="card-title">📦 All Orders</span></div>
    ${ALL_ORDERS.length?ALL_ORDERS.map(o=>{
      const items = typeof o.items==='string' ? JSON.parse(o.items) : o.items;
      return `<div class="order-card"><div class="order-hd">
        <div><div class="order-id">${o.id} <span class="badge badge-blue" style="font-size:.62rem">${o.buyer_name||'?'}</span></div>
        <div class="order-date">📅 ${o.date}</div></div>
        <div style="display:flex;gap:6px">
          <span class="badge ${o.status==='delivered'?'badge-green':'badge-gold'}">${o.status}</span>
          ${o.status!=='delivered'?`<button class="btn btn-sm btn-ghost" onclick="markDelivered('${o.id}')">Mark Delivered</button>`:''}
        </div></div>
        <div class="order-pills">${items.map(i=>`<span class="order-pill">🌱 ${i.name} ×${i.qty}</span>`).join('')}</div>
        <div class="order-ft"><span style="font-weight:700">₹${o.total}</span><span style="font-size:.76rem;color:var(--txt3)">📍 ${o.addr}</span></div>
      </div>`;
    }).join(''):'<div class="empty"><div class="eico">📦</div><p>No orders yet.</p></div>'}
    </div>`;

  } else if(t==='events') {
    html=`<div class="card"><div class="card-hd"><span class="card-title">📅 Manage Events</span>
    <button class="btn btn-sm btn-primary" onclick="openM('m-event')">+ Add Event</button></div>
    ${EVENTS.length?EVENTS.map(ev=>`<div class="event-card">
      <div class="ev-top">
        <div><div class="ev-title">${ev.title}</div><div class="ev-date">📅 ${ev.date} ⏰ ${ev.time} | 📍 ${ev.location}</div></div>
        <button class="btn btn-sm btn-danger" onclick="deleteEvent(${ev.id});showAdminTab('events')">Remove</button>
      </div>
      <div class="ev-desc">${ev.description}</div>
      <div class="ev-meta"><span>👥 ${(ev.registrations||[]).length}/${ev.max_reg} registered</span></div>
    </div>`).join(''):'<div class="empty"><div class="eico">📅</div><p>No events created yet.</p></div>'}
    </div>`;

  } else if(t==='registrations') {
    const allRegs = [];
    EVENTS.forEach(ev=>(ev.registrations||[]).forEach(r=>allRegs.push({...r,eventTitle:ev.title,eventDate:ev.date,eventLoc:ev.location})));
    const regBadge=$('reg-count-badge'); if(regBadge) regBadge.textContent='';
    html=`<div class="card"><div class="card-hd"><span class="card-title">📋 Event Registrations</span>
    <span class="badge badge-green">${allRegs.length} total</span></div>
    ${allRegs.length?`<table><thead><tr><th>Citizen</th><th>Event</th><th>Location</th><th>Date</th><th>Registered At</th></tr></thead><tbody>
    ${allRegs.map(r=>`<tr>
      <td><strong>${r.name}</strong><br><span style="font-size:.7rem;color:var(--txt3)">@${r.username} | 📞 ${r.phone}</span></td>
      <td>${r.eventTitle}</td><td>📍 ${r.eventLoc}, Mumbai</td>
      <td>📅 ${r.eventDate}</td>
      <td style="font-size:.76rem;color:var(--txt3)">${r.reg_time||''}</td>
    </tr>`).join('')}
    </tbody></table>`:'<div class="empty"><div class="eico">📋</div><p>No registrations yet.</p></div>'}
    </div>`;

  } else if(t==='feedback') {
    FEEDBACK = await api('/feedback') || [];
    html=`<div class="card"><div class="card-hd"><span class="card-title">💬 Community Feedback</span>
    <span class="badge badge-blue">${FEEDBACK.length} posts</span></div>
    ${FEEDBACK.map(p=>
      feedbackCardHtml(p)+`<button class="btn btn-sm btn-danger" style="margin:0 0 9px 56px" onclick="adminDelFeedback(${p.id})">🗑️ Delete</button>`
    ).join('') || '<div class="empty"><div class="eico">💬</div><p>No feedback yet.</p></div>'}
    </div>`;
  }

  $('admin-tab-content').innerHTML = html;
}

// Admin product add panel
function openAdminAddProduct() {
  const form = $('admin-add-product-form');
  if(form) form.style.display = form.style.display==='none' ? 'block' : 'none';
}
function previewAdminImage(input) {
  if(!input.files||!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingAdminImage = e.target.result;
    const box = $('ap-img-box');
    let preview = box.querySelector('.img-preview');
    if(!preview) { preview=document.createElement('img'); preview.className='img-preview'; box.appendChild(preview); }
    preview.src = pendingAdminImage;
  };
  reader.readAsDataURL(input.files[0]);
}
async function adminAddProduct() {
  const name  = $('ap-name').value.trim();
  const cat   = $('ap-cat').value;
  const price = parseInt($('ap-price').value);
  const desc  = $('ap-desc').value.trim();
  if(!name||!price||!desc) { toast('⚠️ Fill all fields'); return; }
  const data = await api('/shop', 'POST', { name, category:cat, price, desc, image:pendingAdminImage||null, tags:[cat] });
  if (data && data.success) {
    pendingAdminImage = null;
    toast('🌱 Product added!'); showAdminTab('products');
  }
}

async function toggleUser(id) {
  const data = await api(`/users/${id}/toggle`, 'PUT');
  if (data && data.success) { toast(`✅ User ${data.status}`); showAdminTab('users'); }
}
async function adminDelProduct(id) {
  const data = await api(`/shop/${id}`, 'DELETE');
  if (data && data.success) { toast('🗑️ Product removed'); showAdminTab('products'); }
}
async function adminDeletePlant(id) {
  const data = await api(`/plantations/${id}`, 'DELETE');
  if (data && data.success) { toast('🗑️ Plantation removed'); showAdminTab('plants'); }
}
async function adminDelFeedback(id) {
  const data = await api(`/feedback/${id}`, 'DELETE');
  if (data && data.success) { toast('🗑️ Deleted'); showAdminTab('feedback'); }
}
async function openAdminWeather() {
  const wx = await api('/weather') || {};
  WEATHER = wx;
  $('wm-temp').value=wx.temp; $('wm-cond').value=wx.cond;
  $('wm-hum').value=wx.humidity; $('wm-wind').value=wx.wind;
  $('wm-aqi').value=wx.aqi; $('wm-uv').value=wx.uv;
  openM('m-weather');
}
async function saveWeather() {
  const temp=parseInt($('wm-temp').value), cond=$('wm-cond').value;
  const hum=parseInt($('wm-hum').value), wind=parseInt($('wm-wind').value);
  const aqi=parseInt($('wm-aqi').value), uv=parseInt($('wm-uv').value);
  if(isNaN(temp)||isNaN(hum)||isNaN(wind)||isNaN(aqi)||isNaN(uv)) { toast('⚠️ Fill all weather fields'); return; }
  const data = await api('/weather', 'PUT', { temp, cond, humidity:hum, wind, aqi, uv });
  if (data && data.success) {
    WEATHER = { temp, cond, humidity:hum, wind, aqi, uv };
    closeM('m-weather'); toast('⛅ Weather updated!'); showAdminTab('weather');
  }
}

// Close overlays on background click
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); }));