// ================================================
// Smart Demand Forecast & Queue Optimization System
// Main Application Entry Point
// ================================================
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import menu from './routes/menu'
import orders from './routes/orders'
import queue from './routes/queue'
import forecast from './routes/forecast'
import notifications from './routes/notifications'
import { requireAuth, requireRole } from './middleware/auth'

type Bindings = { DB: D1Database; JWT_SECRET: string }

const app = new Hono<{ Bindings: Bindings }>()

// CORS for all API routes
app.use('/api/*', cors())

// ── Authentication middleware ────────────────────────────────────────────────
// /api/auth/login stays public; everything else requires a valid JWT.
app.use('/api/menu/*',          requireAuth)
app.use('/api/orders/*',        requireAuth)
app.use('/api/queue/*',         requireAuth)
app.use('/api/notifications/*', requireAuth)
app.use('/api/forecast/*',      requireAuth)
// /api/auth/users is additionally admin-only
app.use('/api/auth/users',      requireAuth, requireRole('admin'))

// Mount API routes
app.route('/api/auth', auth)
app.route('/api/menu', menu)
app.route('/api/orders', orders)
app.route('/api/queue', queue)
app.route('/api/forecast', forecast)
app.route('/api/notifications', notifications)

// Health check
app.get('/api/health', (c) => c.json({ 
  status: 'ok', 
  system: 'Smart Cafeteria System',
  version: '1.1.0',
  timestamp: new Date().toISOString() 
}))

// ============================================================
// STUDENT / STAFF DASHBOARD
// ============================================================
app.get('/', (c) => {
  return c.html(studentDashboardHTML())
})

// ============================================================
// KITCHEN STAFF DASHBOARD
// ============================================================
app.get('/kitchen', (c) => {
  return c.html(kitchenDashboardHTML())
})

// ============================================================
// ADMIN DASHBOARD
// ============================================================
app.get('/admin', (c) => {
  return c.html(adminDashboardHTML())
})

// ============================================================
// LOGIN PAGE
// ============================================================
app.get('/login', (c) => {
  return c.html(loginHTML())
})

export default app

// ============================================================
// HTML Pages
// ============================================================

function loginHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SmartCafé – Login</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
  .gradient-bg { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%); }
  .glass { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
  .input-focus:focus { border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,0.1); }
  .btn-primary { background: linear-gradient(135deg, #1d4ed8, #0ea5e9); transition: all 0.3s; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(29,78,216,0.4); }
  .float-anim { animation: float 6s ease-in-out infinite; }
  @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
</style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="float-anim inline-block mb-4">
        <div class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <i class="fas fa-utensils text-4xl text-blue-600"></i>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-white">SmartCafé</h1>
      <p class="text-blue-200 mt-1">Demand Forecast & Queue System</p>
    </div>

    <!-- Login Card -->
    <div class="glass rounded-2xl shadow-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Sign In</h2>
      
      <!-- Quick Access Buttons -->
      <div class="grid grid-cols-3 gap-2 mb-6">
        <button onclick="quickLogin('ahmad@student.edu')" class="flex flex-col items-center p-3 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
          <i class="fas fa-user-graduate text-blue-500 text-xl mb-1"></i>
          <span class="text-xs font-medium text-gray-600">Student</span>
        </button>
        <button onclick="quickLogin('kitchen@cafeteria.edu')" class="flex flex-col items-center p-3 border-2 border-green-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
          <i class="fas fa-hat-chef text-green-500 text-xl mb-1"></i>
          <span class="text-xs font-medium text-gray-600">Kitchen</span>
        </button>
        <button onclick="quickLogin('admin@cafeteria.edu')" class="flex flex-col items-center p-3 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
          <i class="fas fa-crown text-purple-500 text-xl mb-1"></i>
          <span class="text-xs font-medium text-gray-600">Admin</span>
        </button>
      </div>

      <div id="error-msg" class="hidden bg-red-50 text-red-600 rounded-lg p-3 text-sm mb-4 flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span id="error-text"></span>
      </div>

      <form id="loginForm" class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="email" id="email" placeholder="your@email.edu" required
              class="input-focus w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl outline-none transition-all text-gray-800">
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <div class="relative">
            <i class="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="password" id="password" placeholder="••••••••" required
              class="input-focus w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl outline-none transition-all text-gray-800">
            <button type="button" onclick="togglePass()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i class="fas fa-eye" id="eye-icon"></i>
            </button>
          </div>
        </div>
        <button type="submit" id="loginBtn" class="btn-primary w-full text-white font-bold py-3 rounded-xl text-base">
          <i class="fas fa-sign-in-alt mr-2"></i> Sign In
        </button>
      </form>

      <p class="text-center text-xs text-gray-500 mt-6">
        <i class="fas fa-info-circle mr-1"></i> Use quick access buttons above for demo
      </p>
    </div>
  </div>

<script>
function quickLogin(email) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = 'password123';
}
function togglePass() {
  const p = document.getElementById('password');
  const icon = document.getElementById('eye-icon');
  if (p.type === 'password') { p.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { p.type = 'password'; icon.className = 'fas fa-eye'; }
}
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('error-msg');
  const errTxt = document.getElementById('error-text');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing in...';
  btn.disabled = true;
  err.classList.add('hidden');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value })
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('token', data.token || '');
      const role = data.user.role;
      if (role === 'kitchen') window.location.href = '/kitchen';
      else if (role === 'admin') window.location.href = '/admin';
      else window.location.href = '/';
    } else {
      errTxt.textContent = data.error || 'Login failed';
      err.classList.remove('hidden');
      btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Sign In';
      btn.disabled = false;
    }
  } catch(ex) {
    errTxt.textContent = 'Connection error. Please try again.';
    err.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Sign In';
    btn.disabled = false;
  }
});
// Auto-check if already logged in
const storedUser = sessionStorage.getItem('user');
if (storedUser) {
  const u = JSON.parse(storedUser);
  if (u.role === 'kitchen') window.location.href = '/kitchen';
  else if (u.role === 'admin') window.location.href = '/admin';
  else window.location.href = '/';
}
</script>
</body>
</html>`
}

function studentDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SmartCafé – Student Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root { --primary: #1d4ed8; --secondary: #0ea5e9; }
  body { background: #f0f4ff; font-family: 'Segoe UI', sans-serif; }
  .sidebar { background: linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%); }
  .nav-link { transition: all 0.2s; border-radius: 12px; }
  .nav-link:hover, .nav-link.active { background: rgba(255,255,255,0.15); }
  .card { background: white; border-radius: 16px; box-shadow: 0 2px 15px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
  .badge-available { background: #dcfce7; color: #166534; }
  .badge-running_low { background: #fef9c3; color: #854d0e; }
  .badge-sold_out { background: #fee2e2; color: #991b1b; }
  .status-dot-available { background: #22c55e; }
  .status-dot-running_low { background: #eab308; }
  .status-dot-sold_out { background: #ef4444; }
  .btn-add { transition: all 0.2s; }
  .btn-add:hover { transform: scale(1.05); }
  .btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
  .cart-badge { background: #ef4444; border-radius: 50%; padding: 2px 6px; font-size: 10px; }
  .order-card { border-left: 4px solid #1d4ed8; }
  .order-card.ready { border-left-color: #22c55e; }
  .order-card.preparing { border-left-color: #f59e0b; }
  .toast { animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .queue-bar { transition: width 0.8s ease; }
  .slot-chip { transition: all 0.2s; }
  .slot-chip:hover { transform: translateY(-2px); }
  .tab-btn { transition: all 0.2s; }
  .tab-btn.active { background: #1d4ed8; color: white; box-shadow: 0 4px 12px rgba(29,78,216,0.3); }
  .notification-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; position: absolute; top: 2px; right: 2px; }
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .sidebar.open { display: flex !important; position: fixed; inset: 0; z-index: 50; width: 16rem; }
    .main-content { margin-left: 0 !important; }
  }
</style>
</head>
<body class="bg-gray-50">
<!-- Toast -->
<div id="toast" class="fixed top-4 right-4 z-50 hidden" role="status" aria-live="polite">
  <div class="toast bg-white rounded-xl shadow-2xl p-4 flex items-center gap-3 max-w-sm border-l-4 border-green-500">
    <i class="fas fa-check-circle text-green-500 text-xl"></i>
    <div>
      <p class="font-semibold text-gray-800" id="toast-title">Success</p>
      <p class="text-sm text-gray-600" id="toast-msg"></p>
    </div>
    <button onclick="document.getElementById('toast').classList.add('hidden')" class="ml-auto text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
  </div>
</div>

<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="sidebar w-64 flex-shrink-0 flex flex-col p-4 text-white">
    <div class="flex items-center gap-3 mb-8 p-2">
      <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
        <i class="fas fa-utensils text-blue-600 text-lg"></i>
      </div>
      <div>
        <h1 class="font-bold text-lg leading-tight">SmartCafé</h1>
        <p class="text-blue-200 text-xs">Queue & Forecast</p>
      </div>
    </div>

    <nav class="flex-1 space-y-1" aria-label="Main Navigation">
      <a href="#" onclick="showSection('order')" class="nav-link active flex items-center gap-3 px-4 py-3 text-sm font-medium" id="nav-order" aria-current="page">
        <i class="fas fa-shopping-cart w-5 text-center" aria-hidden="true"></i> Order Food
      </a>
      <a href="#" onclick="showSection('queue')" class="nav-link flex items-center gap-3 px-4 py-3 text-sm font-medium" id="nav-queue">
        <i class="fas fa-clock w-5 text-center" aria-hidden="true"></i> Queue Status
      </a>
      <a href="#" onclick="showSection('my-orders')" class="nav-link flex items-center gap-3 px-4 py-3 text-sm font-medium" id="nav-my-orders">
        <i class="fas fa-receipt w-5 text-center" aria-hidden="true"></i> My Orders
      </a>
      <a href="#" onclick="showSection('notifications')" class="nav-link flex items-center gap-3 px-4 py-3 text-sm font-medium relative" id="nav-notifications">
        <i class="fas fa-bell w-5 text-center" aria-hidden="true"></i> Notifications
        <span id="notif-badge" class="hidden ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">0</span>
      </a>
    </nav>

    <div class="mt-auto pt-4 border-t border-blue-700">
      <div id="user-info" class="flex items-center gap-3 p-2 rounded-xl bg-blue-800/50 mb-3">
        <div class="w-8 h-8 bg-blue-300 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-blue-800 text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate" id="sidebar-name">Student</p>
          <p class="text-xs text-blue-300" id="sidebar-id">--</p>
        </div>
      </div>
      <a href="#" onclick="logout(); return false;" class="nav-link flex items-center gap-3 px-4 py-2 text-sm text-blue-200 hover:text-white">
        <i class="fas fa-sign-out-alt w-5 text-center"></i> Logout
      </a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto main-content" id="main-scroll">
    <!-- Top Bar -->
    <div class="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <button onclick="toggleMobileSidebar()" class="md:hidden text-gray-700 hover:text-blue-600 text-xl focus:outline-none p-1" aria-label="Toggle navigation menu">
          <i class="fas fa-bars"></i>
        </button>
        <div>
          <h2 class="text-xl font-bold text-gray-800" id="page-title">Order Food</h2>
          <p class="text-sm text-gray-500" id="page-subtitle">Browse today's menu and place your order</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <!-- Time Slot Selector -->
        <div class="flex bg-gray-100 rounded-xl p-1 gap-1" role="tablist" aria-label="Select meal time slot">
          <button onclick="setSlot('breakfast')" role="tab" aria-selected="false" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400" id="tab-breakfast">🌅 Breakfast</button>
          <button onclick="setSlot('lunch')" role="tab" aria-selected="true" class="tab-btn active px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400" id="tab-lunch">☀️ Lunch</button>
          <button onclick="setSlot('dinner')" role="tab" aria-selected="false" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400" id="tab-dinner">🌙 Dinner</button>
        </div>
        <!-- Cart -->
        <button onclick="toggleCart()" class="relative bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-all">
          <i class="fas fa-shopping-cart mr-1"></i> Cart
          <span id="cart-count" class="cart-badge text-white ml-1">0</span>
        </button>
      </div>
    </div>

    <!-- ORDER SECTION -->
    <div id="section-order" class="p-6">
      <!-- Queue Banner -->
      <div id="queue-banner" class="card p-4 mb-6 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100">
        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas fa-users text-blue-600 text-xl"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <span class="font-semibold text-gray-800">Current Queue</span>
            <span id="banner-surge" class="hidden bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">🔥 Surge</span>
          </div>
          <div class="flex items-center gap-6 text-sm text-gray-600">
            <span><i class="fas fa-list-ol text-blue-500 mr-1"></i> <b id="banner-queue-len">--</b> in queue</span>
            <span><i class="fas fa-clock text-orange-500 mr-1"></i> Est. wait: <b id="banner-wait">--</b> min</span>
            <span><i class="fas fa-calendar-check text-green-500 mr-1"></i> Next slot: <b id="banner-next-slot">--</b></span>
          </div>
        </div>
        <button onclick="loadQueueStatus()" class="text-blue-500 hover:text-blue-700 transition-all">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>

      <!-- Menu -->
      <div id="menu-container">
        <div class="flex items-center justify-center py-16">
          <div class="text-center">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-3"></i>
            <p class="text-gray-500">Loading menu...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- QUEUE SECTION -->
    <div id="section-queue" class="p-6 hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card p-5 text-center">
          <div class="text-4xl font-bold text-blue-600" id="q-length">--</div>
          <div class="text-sm text-gray-500 mt-1">Orders in Queue</div>
        </div>
        <div class="card p-5 text-center">
          <div class="text-4xl font-bold text-orange-500" id="q-wait">--</div>
          <div class="text-sm text-gray-500 mt-1">Est. Wait (mins)</div>
        </div>
        <div class="card p-5 text-center">
          <div class="text-lg font-bold text-green-600" id="q-next-slot">--</div>
          <div class="text-sm text-gray-500 mt-1">Next Available Slot</div>
        </div>
      </div>

      <!-- Pickup Slots Grid -->
      <div class="card p-5 mb-6">
        <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-calendar-alt text-blue-500 mr-2"></i>Pickup Slots</h3>
        <div id="slots-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>
      </div>

      <!-- Queue Entries -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800"><i class="fas fa-list text-blue-500 mr-2"></i>Live Queue</h3>
          <button onclick="loadQueueSection()" class="text-sm text-blue-500 hover:underline"><i class="fas fa-sync-alt mr-1"></i>Refresh</button>
        </div>
        <div id="queue-list" class="space-y-2"></div>
      </div>
    </div>

    <!-- MY ORDERS SECTION -->
    <div id="section-my-orders" class="p-6 hidden">
      <div id="my-orders-list" class="space-y-4">
        <div class="flex items-center justify-center py-12">
          <i class="fas fa-spinner fa-spin text-2xl text-blue-400"></i>
        </div>
      </div>
    </div>

    <!-- NOTIFICATIONS SECTION -->
    <div id="section-notifications" class="p-6 hidden">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-800">Your Notifications</h3>
        <button onclick="markAllRead()" class="text-sm text-blue-500 hover:underline">Mark all read</button>
      </div>
      <div id="notif-list" class="space-y-3"></div>
    </div>
  </main>
</div>

<!-- Cart Drawer -->
<div id="cart-drawer" class="hidden fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
  <div class="flex items-center justify-between p-5 border-b">
    <h3 class="text-lg font-bold text-gray-800"><i class="fas fa-shopping-cart text-blue-600 mr-2"></i>Your Cart</h3>
    <button onclick="toggleCart()" class="text-gray-400 hover:text-gray-600 text-xl"><i class="fas fa-times"></i></button>
  </div>
  <div class="flex-1 overflow-y-auto p-5" id="cart-items-list">
    <div class="text-center py-12 text-gray-400">
      <i class="fas fa-shopping-cart text-5xl mb-3"></i>
      <p>Your cart is empty</p>
    </div>
  </div>
  <div class="p-5 border-t bg-gray-50">
    <div class="flex justify-between text-lg font-bold mb-4">
      <span>Total</span>
      <span class="text-blue-600">₹ <span id="cart-total">0.00</span></span>
    </div>
    <button onclick="placeOrder()" id="checkout-btn" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-40" disabled>
      <i class="fas fa-check mr-2"></i>Place Order
    </button>
  </div>
</div>
<div id="cart-overlay" class="hidden fixed inset-0 bg-black/30 z-40" onclick="toggleCart()"></div>

<script>
// ── Security helpers ────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function authFetch(url, options) {
  const token = sessionStorage.getItem('token') || '';
  const opts = options || {};
  return fetch(url, { ...opts, headers: { ...(opts.headers || {}), 'Authorization': 'Bearer ' + token } })
    .then(res => {
      if (res.status === 401) {
        // Unauthorized: clear session and redirect to login
        sessionStorage.clear();
        window.location.href = '/login';
      }
      return res;
    });
}
function logout() { sessionStorage.clear(); window.location.href = '/login'; }
// ────────────────────────────────────────────────────────────────────────────
let currentUser = null;
let currentSlot = 'lunch';
let cart = [];
let menuData = {};

// Init
window.addEventListener('load', () => {
  const stored = sessionStorage.getItem('user');
  if (!stored) { window.location.href = '/login'; return; }
  currentUser = JSON.parse(stored);
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-id').textContent = currentUser.studentId || currentUser.role;
  loadMenu();
  loadQueueStatus();
  loadNotifications();
  setInterval(loadQueueStatus, 30000); // Auto-refresh every 30s
});

function toggleMobileSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

function showSection(sec) {
  document.querySelector('.sidebar')?.classList.remove('open');
  ['order','queue','my-orders','notifications'].forEach(s => {
    document.getElementById('section-' + s)?.classList.add('hidden');
    const navEl = document.getElementById('nav-' + s);
    if (navEl) {
      navEl.classList.remove('active');
      navEl.removeAttribute('aria-current');
    }
  });
  document.getElementById('section-' + sec)?.classList.remove('hidden');
  const activeNav = document.getElementById('nav-' + sec);
  if (activeNav) {
    activeNav.classList.add('active');
    activeNav.setAttribute('aria-current', 'page');
  }
  const titles = { order: ['Order Food', "Browse today's menu"], queue: ['Queue Status','Live queue and pickup slots'], 'my-orders': ['My Orders','Your order history'], notifications: ['Notifications','Your alerts and updates'] };
  document.getElementById('page-title').textContent = titles[sec]?.[0] || '';
  document.getElementById('page-subtitle').textContent = titles[sec]?.[1] || '';
  if (sec === 'queue') loadQueueSection();
  if (sec === 'my-orders') loadMyOrders();
  if (sec === 'notifications') loadNotifications();
}

function setSlot(slot) {
  currentSlot = slot;
  ['breakfast','lunch','dinner'].forEach(s => {
    const el = document.getElementById('tab-' + s);
    if (el) {
      el.classList.remove('active');
      el.classList.add('text-gray-600');
      el.setAttribute('aria-selected', 'false');
    }
  });
  const activeEl = document.getElementById('tab-' + slot);
  if (activeEl) {
    activeEl.classList.add('active');
    activeEl.classList.remove('text-gray-600');
    activeEl.setAttribute('aria-selected', 'true');
  }
  loadMenu();
  loadQueueStatus();
}

async function loadMenu() {
  try {
    const res = await authFetch('/api/menu?slot=' + currentSlot);
    const data = await res.json();
    if (!data.categories) return;
    menuData = {};
    let html = '';
    for (const cat of data.categories) {
      html += '<div class="mb-8"><h3 class="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-tag text-blue-500"></i>' + escapeHtml(cat.name) + '</h3>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
      for (const item of cat.items) {
        menuData[item.id] = item;
        const isSoldOut = item.status === 'sold_out';
        const badge = { available: 'badge-available', running_low: 'badge-running_low', sold_out: 'badge-sold_out' }[item.status];
        const dot = { available: 'status-dot-available', running_low: 'status-dot-running_low', sold_out: 'status-dot-sold_out' }[item.status];
        html += '<div class="card p-4 ' + (isSoldOut ? 'opacity-60' : 'hover:shadow-md transition-shadow') + '">';
        html += '<div class="flex items-start justify-between mb-3">';
        html += '<div class="flex-1"><h4 class="font-bold text-gray-800">' + escapeHtml(item.name) + '</h4><p class="text-xs text-gray-500 mt-0.5 line-clamp-2">' + escapeHtml(item.description || '') + '</p></div>';
        html += '<span class="ml-2 text-xs px-2 py-1 rounded-full font-medium ' + badge + ' flex items-center gap-1 flex-shrink-0"><span class="w-1.5 h-1.5 rounded-full ' + dot + '"></span>' + escapeHtml(item.availability_badge) + '</span>';
        html += '</div>';
        html += '<div class="flex items-center justify-between">';
        html += '<div><span class="text-xl font-bold text-blue-600">&#x20B9; ' + item.price.toFixed(2) + '</span>';
        html += '<span class="text-xs text-gray-400 ml-2"><i class="fas fa-clock mr-1"></i>' + escapeHtml(String(item.preparation_time_minutes)) + ' min</span></div>';
        if (!isSoldOut) {
          html += '<div class="flex items-center gap-2">';
          html += '<button onclick="changeQty(' + item.id + ',-1)" aria-label="Decrease quantity for ' + escapeHtml(item.name) + '" class="btn-add w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 text-lg flex items-center justify-center">-</button>';
          html += '<span id="qty-' + item.id + '" class="w-6 text-center font-bold text-gray-800">0</span>';
          html += '<button onclick="changeQty(' + item.id + ',1)" aria-label="Increase quantity for ' + escapeHtml(item.name) + '" class="btn-add w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center">+</button>';
          html += '</div>';
        } else {
          html += '<span class="text-xs text-red-500 font-medium">Sold Out</span>';
        }
        html += '</div></div>';
      }
      html += '</div></div>';
    }
    document.getElementById('menu-container').innerHTML = html || '<p class="text-gray-400 text-center py-8">No items available</p>';
  } catch(e) {
    console.error('loadMenu error:', e);
    document.getElementById('menu-container').innerHTML = '<div class="flex flex-col items-center justify-center py-16 text-center"><i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i><p class="text-gray-600 font-medium">Failed to load menu</p><p class="text-sm text-gray-400 mb-4">Please check your connection and try again</p><button onclick="loadMenu()" class="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm"><i class="fas fa-redo mr-2"></i>Retry</button></div>';
  }
}

function changeQty(itemId, delta) {
  const el = document.getElementById('qty-' + itemId);
  let qty = parseInt(el?.textContent || '0') + delta;
  if (qty < 0) qty = 0;
  if (el) el.textContent = qty;
  updateCart(itemId, qty);
}

function updateCart(itemId, qty) {
  cart = cart.filter(c => c.menuItemId !== itemId);
  if (qty > 0 && menuData[itemId]) cart.push({ menuItemId: itemId, quantity: qty, name: menuData[itemId].name, price: menuData[itemId].price });
  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = total.toFixed(2);
  document.getElementById('checkout-btn').disabled = cart.length === 0;

  if (!cart.length) {
    document.getElementById('cart-items-list').innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-shopping-cart text-5xl mb-3"></i><p>Your cart is empty</p></div>';
    return;
  }
  let html = '<div class="space-y-3">';
  for (const item of cart) {
    html += '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">';
    html += '<div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fas fa-utensils text-blue-500"></i></div>';
    html += '<div class="flex-1"><p class="font-semibold text-gray-800">' + item.name + '</p><p class="text-sm text-gray-500">₹ ' + item.price.toFixed(2) + ' each</p></div>';
    html += '<div class="flex items-center gap-2">';
    html += '<button onclick="changeQty(' + item.menuItemId + ',-1)" class="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-sm font-bold flex items-center justify-center">-</button>';
    html += '<span class="w-5 text-center font-bold">' + item.quantity + '</span>';
    html += '<button onclick="changeQty(' + item.menuItemId + ',1)" class="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">+</button>';
    html += '</div>';
    html += '<span class="text-sm font-bold text-blue-600">₹ ' + (item.price * item.quantity).toFixed(2) + '</span>';
    html += '</div>';
  }
  html += '</div>';
  document.getElementById('cart-items-list').innerHTML = html;
}

function toggleCart() {
  const d = document.getElementById('cart-drawer');
  const o = document.getElementById('cart-overlay');
  const isHidden = d.classList.contains('hidden');
  d.classList.toggle('hidden');
  o.classList.toggle('hidden');
  if (isHidden) renderCart();
}

async function placeOrder() {
  if (!cart.length || !currentUser) return;
  const btn = document.getElementById('checkout-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Placing order...';
  try {
    const res = await authFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, timeSlot: currentSlot, items: cart })
    });
    const data = await res.json();
    if (data.success) {
      cart = [];
      document.querySelectorAll('[id^="qty-"]').forEach(el => el.textContent = '0');
      toggleCart();
      showToast('Order Placed! 🎉', 'Order ' + escapeHtml(data.order.orderNumber) + ' confirmed. Pickup: ' + escapeHtml(data.order.pickupSlot) + '. Wait: ~' + escapeHtml(String(data.order.estimatedWaitMinutes)) + ' mins', 'green');
      loadQueueStatus();
    } else {
      showToast('Order Failed', escapeHtml(data.error || 'Please try again'), 'red');
    }
  } catch(e) {
    showToast('Error', 'Connection failed. Please retry.', 'red');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check mr-2"></i>Place Order';
}

async function loadQueueStatus() {
  try {
    const res = await authFetch('/api/queue/status?slot=' + currentSlot);
    const data = await res.json();
    document.getElementById('banner-queue-len').textContent = data.queueLength ?? '--';
    document.getElementById('banner-wait').textContent = data.estimatedWaitMinutes ?? '--';
    document.getElementById('banner-next-slot').textContent = data.nextAvailableSlot || '--';
    if (data.isSurge) document.getElementById('banner-surge').classList.remove('hidden');
    else document.getElementById('banner-surge').classList.add('hidden');
  } catch(e) { console.error('loadQueueStatus error:', e); }
}

async function loadQueueSection() {
  try {
    const res = await authFetch('/api/queue/status?slot=' + currentSlot);
    const data = await res.json();
    document.getElementById('q-length').textContent = data.queueLength ?? '--';
    document.getElementById('q-wait').textContent = data.estimatedWaitMinutes ?? '--';
    document.getElementById('q-next-slot').textContent = data.nextAvailableSlot || '--';

    // Slots grid
    const slotsHtml = (data.availableSlots || []).map(s =>
      '<div class="slot-chip p-3 rounded-xl border-2 text-center ' + (s.available ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') + '">' +
      '<div class="font-bold text-sm ' + (s.available ? 'text-green-700' : 'text-red-600') + '">' + escapeHtml(s.slot) + '</div>' +
      '<div class="text-xs text-gray-500 mt-1">' + escapeHtml(String(s.orderCount)) + '/' + escapeHtml(String(s.maxCapacity)) + ' orders</div>' +
      '<div class="text-xs ' + (s.available ? 'text-green-600' : 'text-red-500') + ' font-medium">' + (s.available ? '&#10003; Available' : '&#10007; Full') + '</div>' +
      '</div>'
    ).join('');
    document.getElementById('slots-grid').innerHTML = slotsHtml || '<p class="text-gray-400 col-span-4 text-center py-4">No slot data</p>';

    // Queue entries
    const qHtml = (data.entries || []).map(e => {
      const statusColor = { ready: 'text-green-600 bg-green-50', processing: 'text-orange-600 bg-orange-50', waiting: 'text-blue-600 bg-blue-50', collected: 'text-gray-400 bg-gray-50' }[e.status] || 'text-gray-600 bg-gray-50';
      return '<div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border">' +
        '<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">' + escapeHtml(String(e.queue_position)) + '</div>' +
        '<div class="flex-1"><p class="font-medium text-gray-800 text-sm">' + escapeHtml(e.user_name) + ' <span class="text-gray-400 text-xs">(' + escapeHtml(e.student_id || '--') + ')</span></p>' +
        '<p class="text-xs text-gray-500">' + escapeHtml(e.items || '--') + '</p></div>' +
        '<span class="text-xs px-2 py-1 rounded-full font-medium ' + statusColor + '">' + escapeHtml(e.status) + '</span>' +
        '<span class="text-xs text-gray-500">' + escapeHtml(e.pickup_slot || '--') + '</span></div>';
    }).join('');
    document.getElementById('queue-list').innerHTML = qHtml || '<p class="text-gray-400 text-center py-4">Queue is empty</p>';
  } catch(e) { console.error(e); }
}

async function loadMyOrders() {
  if (!currentUser) return;
  try {
    const res = await authFetch('/api/orders/user/' + currentUser.id + '?limit=15');
    const data = await res.json();
    const statusColors = { completed: 'bg-green-100 text-green-700', ready: 'bg-emerald-100 text-emerald-700', preparing: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600' };
    const statusIcons = { completed: 'fa-check-circle', ready: 'fa-bell', preparing: 'fa-fire', confirmed: 'fa-thumbs-up', pending: 'fa-clock', cancelled: 'fa-times-circle' };
    const html = (data.orders || []).map(o =>
      '<div class="card order-card ' + escapeHtml(o.status) + ' p-5">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div><p class="font-bold text-gray-800">' + escapeHtml(o.order_number) + '</p>' +
      '<p class="text-sm text-gray-500">' + escapeHtml(new Date(o.created_at).toLocaleString()) + '</p></div>' +
      '<span class="text-xs px-3 py-1 rounded-full font-semibold ' + (statusColors[o.status] || 'bg-gray-100') + '">' +
      '<i class="fas ' + (statusIcons[o.status] || 'fa-circle') + ' mr-1"></i>' + escapeHtml(o.status.toUpperCase()) + '</span></div>' +
      '<p class="text-sm text-gray-600 mb-3"><i class="fas fa-utensils text-gray-400 mr-1"></i>' + escapeHtml(o.items_summary || '--') + '</p>' +
      '<div class="flex items-center justify-between text-sm">' +
      '<span><i class="fas fa-clock text-blue-400 mr-1"></i>Pickup: <b>' + escapeHtml(o.pickup_slot || '--') + '</b></span>' +
      '<span class="font-bold text-blue-600">&#x20B9; ' + (o.total_amount || 0).toFixed(2) + '</span></div></div>'
    ).join('');
    document.getElementById('my-orders-list').innerHTML = html || '<div class="card p-8 text-center text-gray-400"><i class="fas fa-receipt text-4xl mb-3"></i><p>No orders yet</p></div>';
  } catch(e) { console.error(e); }
}

async function loadNotifications() {
  if (!currentUser) return;
  try {
    const res = await authFetch('/api/notifications/user/' + currentUser.id);
    const data = await res.json();
    const count = data.unreadCount || 0;
    const badge = document.getElementById('notif-badge');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);

    const typeIcons = { order_ready: 'fa-bell text-green-500', order_delayed: 'fa-clock text-orange-500', low_stock: 'fa-exclamation-triangle text-red-500' };
    const html = (data.notifications || []).map(n =>
      '<div class="card p-4 flex items-start gap-3 ' + (n.is_read ? 'opacity-60' : 'border-l-4 border-blue-500') + '" onclick="markRead(' + n.id + ',this)">' +
      '<div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">' +
      '<i class="fas ' + (typeIcons[n.type] || 'fa-info text-blue-500') + '"></i></div>' +
      '<div class="flex-1"><p class="font-semibold text-gray-800 text-sm">' + escapeHtml(n.title) + '</p>' +
      '<p class="text-sm text-gray-500 mt-0.5">' + escapeHtml(n.message) + '</p>' +
      '<p class="text-xs text-gray-400 mt-1">' + escapeHtml(new Date(n.created_at).toLocaleString()) + '</p></div>' +
      '</div>'
    ).join('');
    document.getElementById('notif-list').innerHTML = html || '<div class="card p-8 text-center text-gray-400"><i class="fas fa-bell text-4xl mb-3"></i><p>No notifications</p></div>';
  } catch(e) {
    console.error('loadNotifications error:', e);
    document.getElementById('notif-list').innerHTML = '<div class="card p-6 text-center text-gray-400"><i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i><p class="text-sm">Unable to load notifications</p></div>';
  }
}

async function markRead(id, el) {
  try {
    await authFetch('/api/notifications/' + id + '/read', { method: 'PATCH' });
    el.classList.add('opacity-60');
    el.classList.remove('border-l-4', 'border-blue-500');
    loadNotifications();
  } catch(e) {
    console.error('markRead error:', e);
  }
}
async function markAllRead() {
  if (!currentUser) return;
  await authFetch('/api/notifications/user/' + currentUser.id + '/read-all', { method: 'PATCH' });
  loadNotifications();
}

function showToast(title, msg, color = 'green') {
  const t = document.getElementById('toast');
  const colors = { green: 'border-green-500', red: 'border-red-500', orange: 'border-orange-500' };
  const icons  = { green: 'fas fa-check-circle text-green-500', red: 'fas fa-exclamation-circle text-red-500', orange: 'fas fa-exclamation-triangle text-orange-500' };
  t.querySelector('.toast').className = 'toast bg-white rounded-xl shadow-2xl p-4 flex items-center gap-3 max-w-sm border-l-4 ' + (colors[color] || colors.green);
  t.querySelector('.toast > i').className = icons[color] || icons.green;
  t.querySelector('.toast > i').style.fontSize = '1.25rem';
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 5000);
}
</script>
</body>
</html>`
}

function kitchenDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SmartCafé – Kitchen Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: 'Segoe UI', sans-serif; }
  .card { background: #1e293b; border-radius: 16px; border: 1px solid #334155; }
  .card-dark { background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; }
  .stat-card { background: linear-gradient(135deg, #1e293b, #0f2044); }
  .alert-card { border-left: 4px solid; animation: pulse-border 2s infinite; }
  @keyframes pulse-border { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
  .order-ticket { background: #1e293b; border-radius: 12px; border: 1px solid #334155; transition: all 0.3s; }
  .order-ticket:hover { border-color: #3b82f6; transform: translateY(-2px); }
  .order-ticket.ready { border-color: #22c55e; background: #052e16; }
  .order-ticket.preparing { border-color: #f59e0b; background: #1c1204; }
  .status-btn { transition: all 0.2s; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; }
  .status-btn:hover { transform: scale(1.05); }
  .forecast-bar { height: 8px; border-radius: 4px; transition: width 0.8s ease; }
  .confidence-ring { transition: stroke-dashoffset 1s ease; }
  .blink { animation: blink 1s step-start infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .scrollbar-dark::-webkit-scrollbar { width: 6px; }
  .scrollbar-dark::-webkit-scrollbar-track { background: #0f172a; }
  .scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .tab-btn { transition: all 0.2s; border-radius: 10px; }
  .tab-btn.active { background: #3b82f6; color: white; }
</style>
</head>
<body>
<!-- Header -->
<div class="bg-gradient-to-r from-slate-900 to-blue-950 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
  <div class="flex items-center gap-4">
    <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
      <i class="fas fa-hat-chef text-white text-lg"></i>
    </div>
    <div>
      <h1 class="text-lg font-bold text-white">Kitchen Dashboard</h1>
      <p class="text-xs text-slate-400">SmartCafé – Demand & Queue Control</p>
    </div>
  </div>
  <div class="flex items-center gap-4">
    <div class="flex bg-slate-800 rounded-xl p-1 gap-1">
      <button onclick="setSlot('breakfast')" class="tab-btn px-3 py-1.5 text-xs font-medium text-slate-400" id="ktab-breakfast">🌅 Breakfast</button>
      <button onclick="setSlot('lunch')" class="tab-btn active px-3 py-1.5 text-xs font-medium" id="ktab-lunch">☀️ Lunch</button>
      <button onclick="setSlot('dinner')" class="tab-btn px-3 py-1.5 text-xs font-medium text-slate-400" id="ktab-dinner">🌙 Dinner</button>
    </div>
    <div class="flex items-center gap-2 text-sm">
      <div class="w-2 h-2 bg-green-500 rounded-full blink"></div>
      <span class="text-slate-300">Live</span>
    </div>
    <span id="k-time" class="text-slate-400 text-sm font-mono"></span>
    <a href="#" onclick="logout(); return false;" class="text-slate-400 hover:text-white text-sm" title="Logout"><i class="fas fa-sign-out-alt"></i></a>
  </div>
</div>

<div class="p-4">
  <!-- Stats Row -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
    <div class="card stat-card p-4 text-center">
      <div class="text-3xl font-bold text-blue-400" id="k-queue-len">--</div>
      <div class="text-xs text-slate-400 mt-1">In Queue</div>
    </div>
    <div class="card stat-card p-4 text-center">
      <div class="text-3xl font-bold text-orange-400" id="k-wait-time">--</div>
      <div class="text-xs text-slate-400 mt-1">Est. Wait (min)</div>
    </div>
    <div class="card stat-card p-4 text-center">
      <div class="text-3xl font-bold text-green-400" id="k-ready">--</div>
      <div class="text-xs text-slate-400 mt-1">Ready</div>
    </div>
    <div class="card stat-card p-4 text-center">
      <div class="text-3xl font-bold text-yellow-400" id="k-preparing">--</div>
      <div class="text-xs text-slate-400 mt-1">Preparing</div>
    </div>
    <div class="card stat-card p-4 text-center">
      <div class="text-3xl font-bold text-red-400" id="k-alerts-count">--</div>
      <div class="text-xs text-slate-400 mt-1">Active Alerts</div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Orders Column -->
    <div class="lg:col-span-2">
      <!-- Alerts Section -->
      <div id="alerts-section" class="mb-4"></div>

      <!-- Active Orders -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-white"><i class="fas fa-fire-alt text-orange-400 mr-2"></i>Active Orders</h2>
          <button onclick="loadOrders()" aria-label="Refresh active kitchen orders" class="text-xs text-blue-400 hover:text-blue-300"><i class="fas fa-sync-alt mr-1"></i>Refresh</button>
        </div>
        <div id="orders-list" class="space-y-3 max-h-96 overflow-y-auto scrollbar-dark pr-1"></div>
      </div>
    </div>

    <!-- Forecasts Column -->
    <div class="space-y-4">
      <!-- Forecast Panel -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-white"><i class="fas fa-chart-line text-blue-400 mr-2"></i>Demand Forecast</h2>
          <button onclick="loadForecasts()" class="text-xs text-blue-400 hover:text-blue-300"><i class="fas fa-magic mr-1"></i>Predict</button>
        </div>
        <div id="forecast-list" class="space-y-3 max-h-80 overflow-y-auto scrollbar-dark pr-1"></div>
      </div>

      <!-- Menu Availability -->
      <div class="card p-4">
        <h2 class="font-bold text-white mb-4"><i class="fas fa-clipboard-list text-green-400 mr-2"></i>Stock Status</h2>
        <div id="stock-list" class="space-y-2 max-h-72 overflow-y-auto scrollbar-dark pr-1"></div>
      </div>
    </div>
  </div>
</div>

<script>
// ── Security helpers ────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function logout() { sessionStorage.clear(); window.location.href = '/login'; }

// ────────────────────────────────────────────────────────────────────────────
let currentSlot = 'lunch';
let refreshTimer;

function setSlot(slot) {
  if (currentSlot === slot) return;
  currentSlot = slot;
  ['breakfast','lunch','dinner'].forEach(s => {
    document.getElementById('ktab-' + s)?.classList.remove('active');
    document.getElementById('ktab-' + s)?.classList.add('text-slate-400');
  });
  document.getElementById('ktab-' + slot)?.classList.add('active');
  document.getElementById('ktab-' + slot)?.classList.remove('text-slate-400');
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshAll();
  }, 150);
}

async function refreshAll() {
  await Promise.all([loadQueueStats(), loadOrders(), loadForecasts(), loadStockStatus(), loadAlerts()]);
}
async function kFetch(url, opts) {
  // alias kept for clarity; kitchen uses authFetch
  return authFetch(url, opts);
}

async function loadQueueStats() {
  try {
    const res = await authFetch('/api/queue/status?slot=' + currentSlot);
    const data = await res.json();
    document.getElementById('k-queue-len').textContent = data.queueLength ?? '--';
    document.getElementById('k-wait-time').textContent = data.estimatedWaitMinutes ?? '--';
    const counts = (data.entries || []).reduce((acc, e) => { acc[e.status] = (acc[e.status]||0)+1; return acc; }, {});
    document.getElementById('k-ready').textContent = counts.ready || 0;
    document.getElementById('k-preparing').textContent = counts.processing || 0;
  } catch(e) {}
}

async function loadAlerts() {
  try {
    const res = await authFetch('/api/queue/alerts');
    const data = await res.json();
    const alerts = data.alerts || [];
    document.getElementById('k-alerts-count').textContent = alerts.length;
    if (!alerts.length) { document.getElementById('alerts-section').innerHTML = ''; return; }
    const alertColors = { demand_surge: 'border-orange-500 bg-orange-900/20', low_stock: 'border-red-500 bg-red-900/20', high_queue: 'border-yellow-500 bg-yellow-900/20' };
    const alertIcons = { demand_surge: 'fa-chart-line text-orange-400', low_stock: 'fa-exclamation-triangle text-red-400', high_queue: 'fa-users text-yellow-400' };
    let html = '<div class="space-y-2 mb-4">';
    for (const a of alerts) {
      html += '<div class="alert-card rounded-xl p-3 flex items-start gap-3 ' + (alertColors[a.alert_type]||'border-blue-500 bg-blue-900/20') + '">';
      html += '<i class="fas ' + (alertIcons[a.alert_type]||'fa-info text-blue-400') + ' mt-0.5"></i>';
      html += '<div class="flex-1"><p class="text-sm font-semibold text-white">' + (a.item_name ? escapeHtml(a.item_name) + ' &#8211; ' : '') + escapeHtml(a.alert_type.replace('_',' ').toUpperCase()) + '</p>';
      html += '<p class="text-xs text-slate-300 mt-0.5">' + escapeHtml(a.message) + '</p></div>';
      html += '<button onclick="resolveAlert(' + a.id + ',this)" class="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-lg text-slate-300">Resolve</button>';
      html += '</div>';
    }
    html += '</div>';
    document.getElementById('alerts-section').innerHTML = html;
  } catch(e) {}
}

async function resolveAlert(id, btn) {
  await authFetch('/api/queue/alerts/' + id + '/resolve', { method: 'PATCH' });
  btn.closest('.alert-card').remove();
  loadAlerts();
}

async function loadOrders() {
  try {
    const res = await authFetch('/api/orders/active/all?slot=' + currentSlot);
    const data = await res.json();
    const orders = data.orders || [];
    if (!orders.length) {
      document.getElementById('orders-list').innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fas fa-check-circle text-3xl mb-2"></i><p>No active orders</p></div>';
      return;
    }
    const statusColors = { confirmed: 'text-blue-400', preparing: 'text-yellow-400', ready: 'text-green-400', pending: 'text-slate-400' };
    let html = '';
    for (const o of orders) {
      html += '<div class="order-ticket ' + escapeHtml(o.status) + ' p-3">';
      html += '<div class="flex items-center justify-between mb-2">';
      html += '<div class="flex items-center gap-2"><span class="w-7 h-7 bg-blue-800 text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">' + escapeHtml(String(o.queue_position||'?')) + '</span>';
      html += '<div><p class="font-semibold text-white text-sm">' + escapeHtml(o.order_number) + '</p><p class="text-xs text-slate-400">' + escapeHtml(o.user_name) + (o.student_id ? ' &middot; ' + escapeHtml(o.student_id) : '') + '</p></div></div>';
      html += '<span class="text-xs font-bold ' + (statusColors[o.status]||'text-slate-400') + '">' + escapeHtml(o.status.toUpperCase()) + '</span></div>';
      html += '<p class="text-xs text-slate-400 mb-2"><i class="fas fa-utensils mr-1"></i>' + escapeHtml(o.items_summary||'--') + '</p>';
      html += '<div class="flex items-center justify-between">';
      html += '<span class="text-xs text-slate-500"><i class="fas fa-calendar-check mr-1"></i>' + escapeHtml(o.pickup_slot||'--') + '</span>';
      html += '<div class="flex gap-1">';
      if (o.status === 'confirmed' || o.status === 'pending') html += '<button onclick="updateStatus(' + o.id + ',\'preparing\',this)" class="status-btn bg-yellow-900 text-yellow-300 hover:bg-yellow-800"><i class="fas fa-fire mr-1"></i>Start</button>';
      if (o.status === 'preparing') html += '<button onclick="updateStatus(' + o.id + ',\'ready\',this)" class="status-btn bg-green-900 text-green-300 hover:bg-green-800"><i class="fas fa-bell mr-1"></i>Ready</button>';
      if (o.status === 'ready') html += '<button onclick="updateStatus(' + o.id + ',\'completed\',this)" class="status-btn bg-slate-700 text-slate-300 hover:bg-slate-600"><i class="fas fa-check mr-1"></i>Done</button>';
      html += '</div></div></div>';
    }
    document.getElementById('orders-list').innerHTML = html;
  } catch(e) { console.error(e); }
}

async function updateStatus(orderId, newStatus, btn) {
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    const res = await authFetch('/api/orders/' + orderId + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      console.error('Failed to update status:', res.statusText);
      return;
    }
    await loadOrders();
  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    console.error('Error updating order status:', e);
  }
}

async function loadForecasts() {
  try {
    const res = await authFetch('/api/forecast/predict?slot=' + currentSlot);
    const data = await res.json();
    const forecasts = (data.forecasts || []).slice(0, 12);
    const maxQty = forecasts.reduce((m, f) => Math.max(m, f.predictedQuantity), 1);
    let html = '';
    for (const f of forecasts) {
      const trendIcon = { rising: 'fa-arrow-trend-up text-green-400', falling: 'fa-arrow-trend-down text-red-400', stable: 'fa-minus text-slate-400' }[f.trend] || 'fa-minus text-slate-400';
      const barPct = Math.min(100, (f.predictedQuantity / maxQty) * 100);
      html += '<div class="card-dark p-3">';
      html += '<div class="flex items-center justify-between mb-1">';
      html += '<span class="text-sm font-medium text-white truncate flex-1">' + escapeHtml(f.menuItemName) + '</span>';
      html += '<div class="flex items-center gap-2 ml-2 flex-shrink-0"><i class="fas ' + trendIcon + ' text-xs"></i>';
      html += '<span class="text-blue-400 font-bold text-sm">' + escapeHtml(String(f.predictedQuantity)) + '</span></div></div>';
      html += '<div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">';
      html += '<div class="forecast-bar h-full bg-gradient-to-r from-blue-500 to-blue-400" style="width:' + barPct + '%"></div></div>';
      html += '<div class="flex justify-between mt-1"><span class="text-xs text-slate-500">' + escapeHtml(String(f.confidencePct)) + '% confidence</span>';
      if (f.actualSold !== null) html += '<span class="text-xs text-slate-500">Actual: ' + escapeHtml(String(f.actualSold)) + '</span>';
      html += '</div>';
      if (f.recommendation) html += '<p class="text-xs text-slate-400 mt-1 border-t border-slate-700 pt-1">' + escapeHtml(f.recommendation) + '</p>';
      html += '</div>';
    }
    document.getElementById('forecast-list').innerHTML = html || '<p class="text-slate-500 text-center py-4">No forecast data</p>';
  } catch(e) { console.error(e); }
}

async function loadStockStatus() {
  try {
    const res = await authFetch('/api/menu?slot=' + currentSlot);
    const data = await res.json();
    let html = '';
    for (const cat of (data.categories||[])) {
      for (const item of cat.items) {
        const pct = item.quantity_prepared > 0 ? Math.round((item.quantity_remaining / item.quantity_prepared) * 100) : 100;
        const barColor = pct <= 20 ? 'bg-red-500' : pct <= 40 ? 'bg-yellow-500' : 'bg-green-500';
        const badge = { available: 'text-green-400', running_low: 'text-yellow-400', sold_out: 'text-red-400' }[item.status] || 'text-slate-400';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex justify-between items-center mb-1"><span class="text-xs text-slate-300 truncate">' + escapeHtml(item.name) + '</span>';
        html += '<span class="text-xs font-bold ' + badge + ' ml-2 flex-shrink-0">' + escapeHtml(item.availability_badge) + '</span></div>';
        html += '<div class="h-1.5 bg-slate-700 rounded-full"><div class="h-full rounded-full ' + barColor + ' transition-all" style="width:' + Math.max(2,pct) + '%"></div></div>';
        html += '<p class="text-xs text-slate-500 mt-0.5">' + escapeHtml(String(item.quantity_remaining)) + '/' + escapeHtml(String(item.quantity_prepared)) + ' remaining</p></div></div>';
      }
    }
    document.getElementById('stock-list').innerHTML = html || '<p class="text-slate-500 text-sm text-center py-4">No stock data</p>';
  } catch(e) {
    console.error('loadStockStatus error:', e);
    document.getElementById('stock-list').innerHTML = '<p class="text-red-400 text-xs text-center py-4">Failed to load stock data</p>';
  }
}

// Live clock
function updateClock() {
  document.getElementById('k-time').textContent = new Date().toLocaleTimeString();
}

window.addEventListener('load', () => {
  const stored = sessionStorage.getItem('user');
  if (!stored) { window.location.href = '/login'; return; }
  const user = JSON.parse(stored);
  if (user.role !== 'kitchen' && user.role !== 'admin') { window.location.href = '/login'; return; }
  refreshAll();
  setInterval(refreshAll, 15000); // Auto-refresh every 15s
  setInterval(updateClock, 1000);
  updateClock();
});
</script>
</body>
</html>`
}

function adminDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SmartCafé – Admin Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body { background: #f8fafc; font-family: 'Segoe UI', sans-serif; }
  .sidebar { background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); }
  .nav-link { transition: all 0.2s; border-radius: 10px; }
  .nav-link:hover, .nav-link.active { background: rgba(255,255,255,0.1); }
  .card { background: white; border-radius: 16px; box-shadow: 0 2px 15px rgba(0,0,0,0.06); }
  .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
  .table-row:hover { background: #f0f4ff; }
  .badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .chart-container { position: relative; height: 240px; }
  .modal { transition: opacity 0.3s; }
  .modal.hidden { opacity: 0; pointer-events: none; }
  .section { display: none; }
  .section.active { display: block; }
</style>
</head>
<body>
<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="sidebar w-56 flex-shrink-0 flex flex-col p-4 text-white">
    <div class="flex items-center gap-2 mb-8 p-2">
      <div class="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
        <i class="fas fa-crown text-white"></i>
      </div>
      <div>
        <p class="font-bold text-sm">SmartCafé</p>
        <p class="text-xs text-slate-400">Admin Panel</p>
      </div>
    </div>
    <nav class="space-y-1 flex-1">
      <a href="#" onclick="showSection('dashboard')" class="nav-link active flex items-center gap-3 px-3 py-2.5 text-sm" id="anav-dashboard"><i class="fas fa-tachometer-alt w-4"></i> Dashboard</a>
      <a href="#" onclick="showSection('orders')" class="nav-link flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300" id="anav-orders"><i class="fas fa-receipt w-4"></i> Orders</a>
      <a href="#" onclick="showSection('menu')" class="nav-link flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300" id="anav-menu"><i class="fas fa-utensils w-4"></i> Menu</a>
      <a href="#" onclick="showSection('analytics')" class="nav-link flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300" id="anav-analytics"><i class="fas fa-chart-bar w-4"></i> Analytics</a>
      <a href="#" onclick="showSection('users')" class="nav-link flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300" id="anav-users"><i class="fas fa-users w-4"></i> Users</a>
    </nav>
    <div class="mt-auto border-t border-slate-700 pt-4 space-y-1">
      <a href="/kitchen" class="nav-link flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-white"><i class="fas fa-hat-chef w-4"></i> Kitchen View</a>
      <a href="#" onclick="logout(); return false;" class="nav-link flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-white"><i class="fas fa-sign-out-alt w-4"></i> Logout</a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto">
    <div class="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 class="text-xl font-bold text-gray-800" id="a-page-title">Dashboard Overview</h2>
        <p class="text-sm text-gray-500" id="a-page-sub">Today's system summary and key metrics</p>
      </div>
      <div class="flex items-center gap-3">
        <span id="a-date" class="text-sm text-gray-500"></span>
        <div id="a-user-chip" class="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <i class="fas fa-crown text-purple-500 text-sm"></i>
          <span class="text-sm font-medium text-gray-700" id="a-user-name">Admin</span>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- DASHBOARD SECTION -->
      <div id="section-dashboard" class="section active">
        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="card stat-card p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fas fa-receipt text-blue-600"></i></div>
              <span class="text-xs text-gray-400">Today</span>
            </div>
            <div class="text-3xl font-bold text-gray-800" id="d-total-orders">--</div>
            <div class="text-sm text-gray-500 mt-1">Total Orders</div>
          </div>
          <div class="card stat-card p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><i class="fas fa-dollar-sign text-green-600"></i></div>
              <span class="text-xs text-green-500">Revenue</span>
            </div>
            <div class="text-3xl font-bold text-gray-800">₹ <span id="d-revenue">--</span></div>
            <div class="text-sm text-gray-500 mt-1">Today's Revenue</div>
          </div>
          <div class="card stat-card p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><i class="fas fa-clock text-orange-600"></i></div>
              <span class="text-xs text-orange-500">Wait Time</span>
            </div>
            <div class="text-3xl font-bold text-gray-800" id="d-avg-wait">--</div>
            <div class="text-sm text-gray-500 mt-1">Avg Wait (min)</div>
          </div>
          <div class="card stat-card p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><i class="fas fa-fire text-purple-600"></i></div>
              <span class="text-xs text-purple-500">Active</span>
            </div>
            <div class="text-3xl font-bold text-gray-800" id="d-active">--</div>
            <div class="text-sm text-gray-500 mt-1">Active Orders</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <!-- Revenue Chart -->
          <div class="card p-5">
            <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-chart-bar text-blue-500 mr-2"></i>Orders by Time Slot</h3>
            <div class="chart-container"><canvas id="slot-chart"></canvas></div>
          </div>
          <!-- Top Items -->
          <div class="card p-5">
            <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-star text-yellow-500 mr-2"></i>Top Menu Items</h3>
            <div id="top-items-list" class="space-y-3"></div>
          </div>
        </div>

        <!-- Forecast Summary -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800"><i class="fas fa-brain text-purple-500 mr-2"></i>AI Demand Forecast – Today</h3>
            <select id="forecast-slot-sel" onchange="loadForecastSummary()" class="text-sm border rounded-lg px-2 py-1">
              <option value="breakfast">Breakfast</option>
              <option value="lunch" selected>Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
          <div id="forecast-summary" class="overflow-x-auto"></div>
        </div>
      </div>

      <!-- ORDERS SECTION -->
      <div id="section-orders" class="section">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800">All Orders Today</h3>
            <div class="flex gap-2">
              <select id="order-slot-filter" onchange="loadOrdersAdmin()" aria-label="Filter orders by time slot" class="text-sm border rounded-lg px-2 py-1">
                <option value="lunch">Lunch</option>
                <option value="breakfast">Breakfast</option>
                <option value="dinner">Dinner</option>
              </select>
              <button onclick="loadOrdersAdmin()" class="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"><i class="fas fa-sync-alt mr-1"></i>Refresh</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-gray-500 border-b">
                <th class="pb-3 font-medium">Order #</th>
                <th class="pb-3 font-medium">Customer</th>
                <th class="pb-3 font-medium">Items</th>
                <th class="pb-3 font-medium">Pickup</th>
                <th class="pb-3 font-medium">Amount</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Time</th>
              </tr></thead>
              <tbody id="orders-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MENU SECTION -->
      <div id="section-menu" class="section">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-800">Menu Management</h3>
            <div class="flex gap-2">
              <select id="menu-slot-filter" onchange="loadMenuAdmin()" class="text-sm border rounded-lg px-2 py-1">
                <option value="lunch" selected>Lunch</option>
                <option value="breakfast">Breakfast</option>
                <option value="dinner">Dinner</option>
              </select>
              <button onclick="document.getElementById('add-item-modal').classList.remove('hidden')" class="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700">
                <i class="fas fa-plus mr-1"></i> Add Item
              </button>
            </div>
          </div>
          <div id="menu-admin-list" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-gray-500 border-b">
                <th class="pb-3 font-medium">Item</th>
                <th class="pb-3 font-medium">Category</th>
                <th class="pb-3 font-medium">Price</th>
                <th class="pb-3 font-medium">Prep Time</th>
                <th class="pb-3 font-medium">Capacity</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Action</th>
              </tr></thead>
              <tbody id="menu-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ANALYTICS SECTION -->
      <div id="section-analytics" class="section">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="card p-5">
            <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-chart-pie text-blue-500 mr-2"></i>Weekly Sales by Item</h3>
            <div class="chart-container"><canvas id="weekly-chart"></canvas></div>
          </div>
          <div class="card p-5">
            <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-table text-green-500 mr-2"></i>Weekly Demand Table</h3>
            <div id="weekly-table" class="overflow-y-auto max-h-56"></div>
          </div>
        </div>
        <div class="card p-5">
          <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-brain text-purple-500 mr-2"></i>Full Forecast Report</h3>
          <div class="flex gap-2 mb-4">
            <select id="af-slot" class="text-sm border rounded-lg px-2 py-1">
              <option value="breakfast">Breakfast</option>
              <option value="lunch" selected>Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
            <button onclick="loadFullForecast()" class="bg-purple-600 text-white text-sm px-3 py-1 rounded-lg hover:bg-purple-700"><i class="fas fa-magic mr-1"></i>Generate Report</button>
          </div>
          <div id="full-forecast-table" class="overflow-x-auto"></div>
        </div>
      </div>

      <!-- USERS SECTION -->
      <div id="section-users" class="section">
        <div class="card p-5">
          <h3 class="font-bold text-gray-800 mb-4">System Users</h3>
          <div id="users-table-wrap" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-gray-500 border-b">
                <th class="pb-3 font-semibold text-gray-600"><i class="fas fa-user text-blue-500 mr-1.5"></i>Name</th>
                <th class="pb-3 font-semibold text-gray-600"><i class="fas fa-envelope text-gray-400 mr-1.5"></i>Email</th>
                <th class="pb-3 font-semibold text-gray-600"><i class="fas fa-user-tag text-purple-500 mr-1.5"></i>Role</th>
                <th class="pb-3 font-semibold text-gray-600"><i class="fas fa-id-card text-green-500 mr-1.5"></i>Student ID</th>
                <th class="pb-3 font-semibold text-gray-600"><i class="fas fa-clock text-orange-500 mr-1.5"></i>Last Login</th>
              </tr></thead>
              <tbody id="users-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Add Item Modal -->
<div id="add-item-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-gray-800">Add Menu Item</h3>
    <div id="add-item-error" class="hidden bg-red-50 text-red-600 rounded-lg p-2.5 text-xs flex items-center gap-2 mb-2">
      <i class="fas fa-exclamation-circle"></i>
      <span id="add-item-error-msg"></span>
    </div>
    <form id="add-item-form" class="space-y-3" onsubmit="addMenuItem(event)">
      <div>
        <label class="text-xs font-medium text-gray-600">Category</label>
        <select id="new-cat" class="w-full border rounded-xl px-3 py-2 mt-1 text-sm" required>
          <option value="">Select...</option>
          <option value="1">Main Course</option>
          <option value="2">Snacks</option>
          <option value="3">Beverages</option>
          <option value="4">Desserts</option>
          <option value="5">Breakfast</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-medium text-gray-600">Item Name</label>
        <input id="new-name" type="text" placeholder="e.g. Laksa" required class="w-full border rounded-xl px-3 py-2 mt-1 text-sm">
      </div>
      <div>
        <label class="text-xs font-medium text-gray-600">Description</label>
        <input id="new-desc" type="text" placeholder="Short description" class="w-full border rounded-xl px-3 py-2 mt-1 text-sm">
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-xs font-medium text-gray-600">Price (₹)</label>
          <input id="new-price" type="number" step="0.5" min="0.5" placeholder="5.00" required class="w-full border rounded-xl px-3 py-2 mt-1 text-sm">
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600">Prep (min)</label>
          <input id="new-prep" type="number" min="1" placeholder="5" class="w-full border rounded-xl px-3 py-2 mt-1 text-sm" value="5">
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600">Daily Cap.</label>
          <input id="new-cap" type="number" min="10" placeholder="50" class="w-full border rounded-xl px-3 py-2 mt-1 text-sm" value="50">
        </div>
      </div>
      <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700">
        <i class="fas fa-plus mr-2"></i> Add Item
      </button>
    </form>
  </div>
</div>

<script>
// ── Security helpers ────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function logout() { sessionStorage.clear(); window.location.href = '/login'; }

// ────────────────────────────────────────────────────────────────────────────
let slotChart, weeklyChart;

function showSection(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + sec).classList.add('active');
  document.querySelectorAll('.nav-link[id^="anav-"]').forEach(n => { n.classList.remove('active'); n.classList.add('text-slate-300'); });
  document.getElementById('anav-' + sec)?.classList.add('active');
  document.getElementById('anav-' + sec)?.classList.remove('text-slate-300');
  const titles = { dashboard: ['Dashboard Overview', "Today's system summary"], orders: ['Orders', 'All orders today'], menu: ['Menu Management', 'Add/edit menu items'], analytics: ['Analytics', 'Demand and sales analytics'], users: ['Users', 'System user accounts'] };
  document.getElementById('a-page-title').textContent = titles[sec]?.[0] || '';
  document.getElementById('a-page-sub').textContent = titles[sec]?.[1] || '';
  if (sec === 'orders') loadOrdersAdmin();
  if (sec === 'menu') loadMenuAdmin();
  if (sec === 'analytics') loadAnalytics();
  if (sec === 'users') loadUsers();
}

async function loadDashboard() {
  try {
    const [statsRes, topRes] = await Promise.all([
      authFetch('/api/orders/stats/today'),
      authFetch('/api/forecast/top-items?limit=5')
    ]);
    const statsData = await statsRes.json();
    const topData = await topRes.json();
    const s = statsData.stats;
    document.getElementById('d-total-orders').textContent = s?.total_orders || 0;
    document.getElementById('d-revenue').textContent = (s?.total_revenue || 0).toFixed(2);
    document.getElementById('d-avg-wait').textContent = s?.avg_wait_minutes || '--';
    document.getElementById('d-active').textContent = s?.active || 0;

    // Slot chart
    const slots = statsData.slotBreakdown || [];
    const ctx = document.getElementById('slot-chart')?.getContext('2d');
    if (ctx) {
      if (slotChart) slotChart.destroy();
      slotChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: slots.map(s => s.time_slot.charAt(0).toUpperCase() + s.time_slot.slice(1)),
          datasets: [
            { label: 'Orders', data: slots.map(s => s.count), backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)'], borderRadius: 8 },
            { label: 'Revenue (₹)', data: slots.map(s => s.revenue||0), backgroundColor: ['rgba(59,130,246,0.2)', 'rgba(16,185,129,0.2)', 'rgba(245,158,11,0.2)'], borderRadius: 8 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
      });
    }

    // Top items
    let topHtml = '';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500'];
    (topData.topItems || []).forEach((item, i) => {
      const maxSold = topData.topItems[0]?.total_sold || 1;
      const pct = Math.round((item.total_sold / maxSold) * 100);
      topHtml += '<div class="flex items-center gap-3"><div class="w-5 h-5 ' + colors[i] + ' rounded text-white text-xs flex items-center justify-center font-bold">' + (i+1) + '</div>' +
        '<div class="flex-1"><div class="flex justify-between text-sm mb-1"><span class="font-medium text-gray-700">' + escapeHtml(item.name) + '</span><span class="text-gray-500">' + escapeHtml(String(item.total_sold)) + ' sold</span></div>' +
        '<div class="h-1.5 bg-gray-100 rounded-full"><div class="h-full rounded-full ' + colors[i] + '" style="width:' + pct + '%"></div></div></div></div>';
    });
    document.getElementById('top-items-list').innerHTML = topHtml || '<p class="text-gray-400 text-sm">No data</p>';

    loadForecastSummary();
  } catch(e) { console.error(e); }
}

async function loadForecastSummary() {
  const slot = document.getElementById('forecast-slot-sel')?.value || 'lunch';
  try {
    const res = await authFetch('/api/forecast/predict?slot=' + slot);
    const data = await res.json();
    const forecasts = (data.forecasts || []).slice(0, 10);
    let html = '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-500 border-b">';
    html += '<th class="pb-2 font-medium">Item</th><th class="pb-2 font-medium">Forecast</th><th class="pb-2 font-medium">Actual</th><th class="pb-2 font-medium">Accuracy</th><th class="pb-2 font-medium">Trend</th><th class="pb-2 font-medium">Confidence</th></tr></thead><tbody>';
    for (const f of forecasts) {
      const trendBadge = { rising: 'bg-green-100 text-green-700', stable: 'bg-gray-100 text-gray-600', falling: 'bg-red-100 text-red-700' }[f.trend] || 'bg-gray-100 text-gray-600';
      const trendIcon = { rising: 'fa-arrow-up', stable: 'fa-minus', falling: 'fa-arrow-down' }[f.trend] || 'fa-minus';
      html += '<tr class="table-row border-b text-sm">';
      html += '<td class="py-2 font-medium text-gray-800">' + escapeHtml(f.menuItemName) + '</td>';
      html += '<td class="py-2 text-blue-600 font-bold">' + escapeHtml(String(f.predictedQuantity)) + '</td>';
      html += '<td class="py-2 text-gray-600">' + (f.actualSold != null ? escapeHtml(String(f.actualSold)) : '–') + '</td>';
      html += '<td class="py-2">' + (f.accuracy !== null ? '<span class="' + (f.accuracy >= 80 ? 'text-green-600' : 'text-orange-500') + ' font-medium">' + escapeHtml(String(f.accuracy)) + '%</span>' : '–') + '</td>';
      html += '<td class="py-2"><span class="badge ' + trendBadge + '"><i class="fas ' + trendIcon + ' mr-1"></i>' + escapeHtml(f.trend) + '</span></td>';
      html += '<td class="py-2"><span class="text-xs text-gray-500">' + escapeHtml(String(f.confidencePct)) + '%</span></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    document.getElementById('forecast-summary').innerHTML = html;
  } catch(e) { console.error(e); }
}

async function loadOrdersAdmin() {
  const slot = document.getElementById('order-slot-filter')?.value || 'lunch';
  const tbody = document.getElementById('orders-table-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2 text-blue-500"></i>Loading orders...</td></tr>';
  try {
    const res = await authFetch('/api/orders/active/all?slot=' + slot);
    const data = await res.json();
    const statusColors = { completed: 'bg-green-100 text-green-700', ready: 'bg-emerald-100 text-emerald-700', preparing: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600' };
    let html = '';
    for (const o of (data.orders||[])) {
      html += '<tr class="table-row border-b text-sm">';
      html += '<td class="py-3 font-mono text-xs font-bold text-gray-700">' + escapeHtml(o.order_number) + '</td>';
      html += '<td class="py-3"><p class="font-medium text-gray-800">' + escapeHtml(o.user_name) + '</p><p class="text-xs text-gray-400">' + escapeHtml(o.student_id||'--') + '</p></td>';
      html += '<td class="py-3 text-gray-600 max-w-xs truncate text-xs">' + escapeHtml(o.items_summary||'--') + '</td>';
      html += '<td class="py-3 text-xs">' + escapeHtml(o.pickup_slot||'--') + '</td>';
      html += '<td class="py-3 font-bold text-blue-600">&#x20B9; ' + (o.total_amount||0).toFixed(2) + '</td>';
      html += '<td class="py-3"><span class="badge ' + (statusColors[o.status]||'bg-gray-100 text-gray-600') + '">' + escapeHtml(o.status) + '</span></td>';
      html += '<td class="py-3 text-xs text-gray-400">' + escapeHtml(new Date(o.created_at).toLocaleTimeString()) + '</td></tr>';
    }
    document.getElementById('orders-table-body').innerHTML = html || '<tr><td colspan="7" class="text-center py-8 text-gray-400">No orders found</td></tr>';
  } catch(e) {
    console.error('loadOrdersAdmin error:', e);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to load orders. <button onclick="loadOrdersAdmin()" class="underline font-semibold ml-2">Retry</button></td></tr>';
  }
}

async function loadMenuAdmin() {
  const slot = document.getElementById('menu-slot-filter')?.value || 'lunch';
  try {
    const res = await authFetch('/api/menu?slot=' + slot);
    const data = await res.json();
    let html = '';
    for (const cat of (data.categories||[])) {
      for (const item of cat.items) {
        const isActive = item.is_active;
        html += '<tr class="table-row border-b text-sm">';
        html += '<td class="py-3 font-medium text-gray-800">' + escapeHtml(item.name) + '</td>';
        html += '<td class="py-3 text-gray-500 text-xs">' + escapeHtml(item.category_name) + '</td>';
        html += '<td class="py-3 font-bold text-blue-600">&#x20B9; ' + item.price.toFixed(2) + '</td>';
        html += '<td class="py-3 text-gray-500 text-xs">' + escapeHtml(String(item.preparation_time_minutes)) + ' min</td>';
        html += '<td class="py-3 text-gray-500 text-xs">' + escapeHtml(String(item.daily_capacity)) + '</td>';
        html += '<td class="py-3"><span class="badge ' + (isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (isActive ? 'Active' : 'Inactive') + '</span></td>';
        html += '<td class="py-3"><button onclick="toggleItem(' + item.id + ',this)" class="text-xs ' + (isActive ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700') + '">' + (isActive ? 'Deactivate' : 'Activate') + '</button></td>';
        html += '</tr>';
      }
    }
    document.getElementById('menu-table-body').innerHTML = html || '<tr><td colspan="7" class="text-center py-4 text-gray-400">No items</td></tr>';
  } catch(e) { console.error(e); }
}

async function toggleItem(id, btn) {
  try {
    await authFetch('/api/menu/' + id + '/toggle', { method: 'PATCH' });
    loadMenuAdmin();
  } catch(e) {}
}

async function addMenuItem(e) {
  e.preventDefault();
  const errBox = document.getElementById('add-item-error');
  const errText = document.getElementById('add-item-error-msg');
  if (errBox) errBox.classList.add('hidden');
  try {
    const res = await authFetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: parseInt(document.getElementById('new-cat').value),
        name: document.getElementById('new-name').value,
        description: document.getElementById('new-desc').value,
        price: parseFloat(document.getElementById('new-price').value),
        preparationTime: parseInt(document.getElementById('new-prep').value),
        dailyCapacity: parseInt(document.getElementById('new-cap').value)
      })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('add-item-modal').classList.add('hidden');
      document.getElementById('add-item-form').reset();
      loadMenuAdmin();
    } else {
      if (errBox && errText) {
        errText.textContent = data.error || 'Failed to add menu item';
        errBox.classList.remove('hidden');
      }
    }
  } catch(e) {
    if (errBox && errText) {
      errText.textContent = 'Connection error. Please try again.';
      errBox.classList.remove('hidden');
    }
  }
}

async function loadAnalytics() {
  try {
    const weeklyRes = await authFetch('/api/forecast/weekly');
    const weeklyData = await weeklyRes.json();
    const items = (weeklyData.weekly || []).slice(0, 6);

    const ctx2 = document.getElementById('weekly-chart')?.getContext('2d');
    if (ctx2) {
      if (weeklyChart) weeklyChart.destroy();
      weeklyChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: items.map(i => i.item_name),
          datasets: [{ data: items.map(i => i.total_sold), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'], borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
      });
    }

    let tableHtml = '<table class="w-full text-xs"><thead><tr class="text-left text-gray-500 border-b"><th class="pb-2">Item</th><th class="pb-2">Slot</th><th class="pb-2">Total Sold</th><th class="pb-2">Avg/Day</th></tr></thead><tbody>';
    for (const item of weeklyData.weekly || []) {
      tableHtml += '<tr class="border-b py-1 hover:bg-gray-50"><td class="py-1.5 font-medium">' + escapeHtml(item.item_name) + '</td><td class="py-1.5 text-gray-500">' + escapeHtml(item.time_slot) + '</td><td class="py-1.5 font-bold text-blue-600">' + escapeHtml(String(item.total_sold)) + '</td><td class="py-1.5 text-gray-500">' + escapeHtml(String(item.avg_per_day)) + '</td></tr>';
    }
    tableHtml += '</tbody></table>';
    document.getElementById('weekly-table').innerHTML = tableHtml;

    loadFullForecast();
  } catch(e) { console.error(e); }
}

async function loadFullForecast() {
  const slot = document.getElementById('af-slot')?.value || 'lunch';
  try {
    const res = await authFetch('/api/forecast/predict?slot=' + slot);
    const data = await res.json();
    let html = '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-500 border-b">';
    html += '<th class="pb-2">Item</th><th class="pb-2">Predicted</th><th class="pb-2">Actual</th><th class="pb-2">Trend</th><th class="pb-2">Confidence</th><th class="pb-2 max-w-xs">Recommendation</th></tr></thead><tbody>';
    for (const f of data.forecasts||[]) {
      const trendColor = { rising:'text-green-600', stable:'text-gray-500', falling:'text-red-500' }[f.trend] || 'text-gray-500';
      html += '<tr class="table-row border-b"><td class="py-2 font-medium">' + escapeHtml(f.menuItemName) + '</td><td class="py-2 font-bold text-blue-600">' + escapeHtml(String(f.predictedQuantity)) + '</td>';
      html += '<td class="py-2">' + (f.actualSold != null ? escapeHtml(String(f.actualSold)) : '–') + '</td>';
      html += '<td class="py-2 ' + trendColor + ' font-medium">' + escapeHtml(f.trend) + '</td>';
      html += '<td class="py-2"><div class="flex items-center gap-1"><div class="flex-1 h-1.5 bg-gray-100 rounded-full"><div class="h-full bg-blue-400 rounded-full" style="width:' + escapeHtml(String(f.confidencePct)) + '%"></div></div><span class="text-xs text-gray-500 ml-1">' + escapeHtml(String(f.confidencePct)) + '%</span></div></td>';
      html += '<td class="py-2 text-xs text-gray-500 max-w-xs">' + (f.recommendation ? escapeHtml(f.recommendation) : '–') + '</td></tr>';
    }
    html += '</tbody></table>';
    document.getElementById('full-forecast-table').innerHTML = html;
  } catch(e) { console.error(e); }
}

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2 text-blue-500"></i>Loading users...</td></tr>';
  try {
    const res = await authFetch('/api/auth/users');
    const data = await res.json();
    const roleColors = { admin: 'bg-purple-100 text-purple-700', kitchen: 'bg-blue-100 text-blue-700', staff: 'bg-green-100 text-green-700', student: 'bg-gray-100 text-gray-600' };
    let html = '';
    for (const u of data.users||[]) {
      html += '<tr class="table-row border-b text-sm"><td class="py-3 font-medium text-gray-800">' + escapeHtml(u.name) + '</td>';
      html += '<td class="py-3 text-gray-500">' + escapeHtml(u.email) + '</td>';
      html += '<td class="py-3"><span class="badge ' + (roleColors[u.role]||'bg-gray-100') + '">' + escapeHtml(u.role) + '</span></td>';
      html += '<td class="py-3 text-gray-500 text-xs">' + (u.student_id ? escapeHtml(u.student_id) : '–') + '</td>';
      html += '<td class="py-3 text-xs text-gray-400">' + (u.last_login ? new Date(u.last_login).toLocaleString() : 'Never') + '</td></tr>';
    }
    document.getElementById('users-tbody').innerHTML = html || '<tr><td colspan="5" class="text-center py-4 text-gray-400">No users</td></tr>';
  } catch(e) { console.error(e); }
}

window.addEventListener('load', () => {
  const stored = sessionStorage.getItem('user');
  if (!stored) { window.location.href = '/login'; return; }
  const user = JSON.parse(stored);
  if (user.role !== 'admin') { window.location.href = '/login'; return; }
  document.getElementById('a-user-name').textContent = user.name;
  document.getElementById('a-date').textContent = new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  loadDashboard();
});
</script>
</body>
</html>`
}
