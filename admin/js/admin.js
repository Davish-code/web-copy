import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeaUoQLLDDh1-FgeAdGfT1CWBghudWZMA",
  authDomain: "yumei-bakery.firebaseapp.com",
  projectId: "yumei-bakery",
  storageBucket: "yumei-bakery.firebasestorage.app",
  messagingSenderId: "638425095770",
  appId: "1:638425095770:web:7dac8ab6486752e2c28263",
  measurementId: "G-H0JP9M3E1B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const ADMIN_EMAIL = 'davishtalreja11@gmail.com';

// --- UTILS ---
function showToast(msg, type='success') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerText = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// --- AUTH ---
onAuthStateChanged(auth, user => {
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      document.getElementById('login-section').classList.remove('active');
      document.getElementById('dashboard-section').classList.add('active');
      document.getElementById('admin-email').innerText = user.email;
      loadOrders();
      loadProducts();
    } else {
      showToast("Access denied. Admin only.", "error");
      signOut(auth);
    }
  } else {
    document.getElementById('login-section').classList.add('active');
    document.getElementById('dashboard-section').classList.remove('active');
  }
});

document.getElementById('btn-login').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  signOut(auth);
});

// --- NAVIGATION ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById(`view-${e.target.dataset.target}`).classList.add('active');
  });
});

// --- ORDERS MANAGEMENT ---
async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  try {
    const q = query(collection(db, "orders"));
    const snapshot = await getDocs(q);
    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    
    orders.sort((a, b) => {
      const d1 = a.date ? new Date(a.date).getTime() : 0;
      const d2 = b.date ? new Date(b.date).getTime() : 0;
      return d2 - d1;
    });

    if(orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.date ? new Date(o.date).toLocaleDateString() : 'N/A'}</td>
        <td>${o.customer ? o.customer.name : 'Unknown'}<br><small style="color:var(--text-muted)">${o.customer ? o.customer.phone : ''}</small></td>
        <td style="color:var(--accent-gold)">${formatCurrency(o.total || 0)}</td>
        <td>
          <select class="status-select ${o.status || 'processing'}" data-id="${o.id}">
            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewOrder('${o.id}')">View</button>
        </td>
      </tr>
    `).join('');

    // Attach status change listeners
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const orderId = e.target.dataset.id;
        const newStatus = e.target.value;
        e.target.className = `status-select ${newStatus}`;
        try {
          await updateDoc(doc(db, "orders", orderId), { status: newStatus });
          showToast("Order status updated.");
        } catch(err) {
          showToast("Error updating order", "error");
        }
      });
    });
  } catch(err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load orders.</td></tr>`;
  }
}

document.getElementById('btn-refresh-orders').addEventListener('click', loadOrders);
window.viewOrder = (id) => showToast(`View details for ${id} coming soon...`);

// --- PRODUCTS MANAGEMENT ---
let productsList = [];

async function loadProducts() {
  const tbody = document.getElementById('products-table-body');
  try {
    const q = query(collection(db, "products"));
    const snapshot = await getDocs(q);
    productsList = [];
    snapshot.forEach(doc => productsList.push(doc.data()));

    if(productsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">No products found.</td></tr>`;
      return;
    }

    tbody.innerHTML = productsList.map(p => `
      <tr>
        <td><img src="../${p.image}" class="product-img-thumb" onerror="this.src='${p.image}'" alt="img"></td>
        <td><strong>${p.name}</strong><br><small style="color:var(--text-muted)">${p.category}</small></td>
        <td>${formatCurrency(p.price)}</td>
        <td><small>${p.id}</small></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch(err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load products.</td></tr>`;
  }
}

// Modal Logic
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');

document.getElementById('btn-add-product').addEventListener('click', () => {
  document.getElementById('modal-title').innerText = "Add New Product";
  form.reset();
  document.getElementById('prod-original-id').value = "";
  document.getElementById('prod-id').readOnly = false;
  modal.classList.add('active');
});

document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));
document.getElementById('btn-cancel-modal').addEventListener('click', () => modal.classList.remove('active'));

window.editProduct = (id) => {
  const p = productsList.find(x => x.id === id);
  if(!p) return;
  document.getElementById('modal-title').innerText = "Edit Product";
  document.getElementById('prod-original-id').value = p.id;
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-id').readOnly = true; // Cannot change ID once created
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-category').value = p.category || 'cakes';
  document.getElementById('prod-price').value = p.price || 0;
  document.getElementById('prod-description').value = p.description || '';
  document.getElementById('prod-image').value = p.image || '';
  document.getElementById('prod-badge').value = p.badge || '';
  modal.classList.add('active');
};

window.deleteProduct = async (id) => {
  if(!confirm(`Are you sure you want to delete product ${id}?`)) return;
  try {
    await deleteDoc(doc(db, "products", id));
    showToast("Product deleted successfully.");
    loadProducts();
  } catch(err) {
    showToast("Failed to delete product.", "error");
  }
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const originalId = document.getElementById('prod-original-id').value;
  const id = document.getElementById('prod-id').value;
  
  const productData = {
    id: id,
    name: document.getElementById('prod-name').value,
    category: document.getElementById('prod-category').value,
    price: parseFloat(document.getElementById('prod-price').value),
    description: document.getElementById('prod-description').value,
    image: document.getElementById('prod-image').value,
    badge: document.getElementById('prod-badge').value || null,
  };

  try {
    const docRef = doc(db, "products", id);
    await setDoc(docRef, productData);
    
    // If ID changed (not possible via UI currently but good practice), delete old doc
    if(originalId && originalId !== id) {
      await deleteDoc(doc(db, "products", originalId));
    }
    
    showToast("Product saved successfully.");
    modal.classList.remove('active');
    loadProducts();
  } catch(err) {
    showToast("Failed to save product.", "error");
    console.error(err);
  }
});
