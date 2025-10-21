// Frontend v2: komunicira s API-jem
const menuListEl = document.getElementById('menu-list');
const locationSelect = document.getElementById('location_select');
const tableSelect = document.getElementById('table_select');
const orderItemsEl = document.getElementById('order-items');
const orderForm = document.getElementById('order-form');
const msgEl = document.getElementById('message');

const rLocation = document.getElementById('r_location');
const rTable = document.getElementById('r_table');
const reservationForm = document.getElementById('reservation-form');
const resMsg = document.getElementById('res-message');

let menu = []; let tables = [];
const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/;
const phoneRegex = /^\+?\d{6,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showMessage(el, text, type='') { el.innerHTML = ''; const p = document.createElement('p'); p.textContent = text; if (type === 'error') p.className = 'error'; if (type === 'success') p.className = 'success'; el.appendChild(p); }

fetch('/api/menu').then(r => r.json()).then(data => { menu = data; renderMenu(menu); renderOrderItems(menu); }).catch(err => { menuListEl.textContent = 'Greška pri učitavanju menija'; });
fetch('/api/tables').then(r => r.json()).then(t => { tables = t; populateLocationSelects(); }).catch(err => { console.error(err); locationSelect.innerHTML = '<option value="">Greška pri učitavanju</option>'; });

function renderMenu(menu) { menuListEl.innerHTML = ''; menu.forEach(d => { const div = document.createElement('div'); div.className = 'dish'; div.innerHTML = `<div><strong>${d.name}</strong></div><div>${d.price.toFixed(2)} kn</div>`; menuListEl.appendChild(div); }); }
function renderOrderItems(menu) { orderItemsEl.innerHTML = ''; menu.forEach(d => { const row = document.createElement('div'); row.className = 'item'; row.innerHTML = `
      <div style="flex:1">${d.name} <small>${d.price.toFixed(2)} kn</small></div>
      <div>
        <input class="qty" type="number" min="0" value="0" data-dish-id="${d.id}" />
      </div>
    `; orderItemsEl.appendChild(row); }); }
function populateLocationSelects() { const locations = Array.from(new Set(tables.map(t => t.location))); locationSelect.innerHTML = '<option value="">Odaberite lokaciju</option>'; locations.forEach(loc => { const opt = document.createElement('option'); opt.value = loc; opt.textContent = loc; locationSelect.appendChild(opt); }); rLocation.innerHTML = '<option value="">Odaberite</option>'; locations.forEach(loc => { const opt = document.createElement('option'); opt.value = loc; opt.textContent = loc; rLocation.appendChild(opt); }); }
function populateTablesFor(selectEl, location) { selectEl.innerHTML = '<option value="">Odaberite stol</option>'; const filtered = tables.filter(t => t.location === location); filtered.forEach(t => { const opt = document.createElement('option'); opt.value = t.table_number; opt.textContent = `Stol ${t.table_number} (${t.location})`; selectEl.appendChild(opt); }); }

locationSelect.addEventListener('change', (e) => populateTablesFor(tableSelect, e.target.value));
rLocation.addEventListener('change', (e) => populateTablesFor(rTable, e.target.value));

orderForm.addEventListener('submit', (e) => {
  e.preventDefault(); msgEl.innerHTML = '';
  const customer_name = document.getElementById('customer_name').value.trim();
  const customer_phone = document.getElementById('customer_phone').value.trim();
  const customer_email = document.getElementById('customer_email').value.trim();
  const location = document.getElementById('location_select').value;
  const table_number = document.getElementById('table_select').value;
  const payment_method = document.getElementById('payment_method').value;

  if (!nameRegex.test(customer_name)) { showMessage(msgEl, 'Neispravno ime.', 'error'); return; }
  if (!phoneRegex.test(customer_phone)) { showMessage(msgEl, 'Neispravan broj telefona.', 'error'); return; }
  if (customer_email.length > 0 && !emailRegex.test(customer_email)) { showMessage(msgEl, 'Neispravan email.', 'error'); return; }
  if (!location || !table_number) { showMessage(msgEl, 'Odaberite lokaciju i stol.', 'error'); return; }
  if (!payment_method) { showMessage(msgEl, 'Odaberite način plaćanja.', 'error'); return; }

  const qtyInputs = Array.from(orderItemsEl.querySelectorAll('input[type="number"]'));
  const items = qtyInputs.map(inp => ({ dish_id: Number(inp.getAttribute('data-dish-id')), quantity: Number(inp.value) })).filter(i => i.quantity && i.quantity > 0);
  if (items.length === 0) { showMessage(msgEl, 'Odaberite barem jedno jelo s količinom > 0.', 'error'); return; }

  const payload = { customer_name, customer_phone, customer_email, table_number: Number(table_number), location, payment_method, items };
  fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(resp => { if (resp && resp.success) { showMessage(msgEl, 'Narudžba uspješno poslana! ID: ' + resp.orderId, 'success'); orderForm.reset(); renderOrderItems(); } else { showMessage(msgEl, 'Greška: ' + (resp.error || 'Nepoznata greška'), 'error'); } }).catch(err => { showMessage(msgEl, 'Greška pri slanju narudžbe.', 'error'); console.error(err); });
});

reservationForm.addEventListener('submit', (e) => {
  e.preventDefault(); resMsg.innerHTML = '';
  const customer_name = document.getElementById('r_name').value.trim();
  const customer_phone = document.getElementById('r_phone').value.trim();
  const customer_email = document.getElementById('r_email').value.trim();
  const location = document.getElementById('r_location').value;
  const table_number = document.getElementById('r_table').value;
  const reserved_at = document.getElementById('r_datetime').value;
  const seats = document.getElementById('r_seats').value;

  if (!nameRegex.test(customer_name)) { showMessage(resMsg, 'Neispravno ime.', 'error'); return; }
  if (!phoneRegex.test(customer_phone)) { showMessage(resMsg, 'Neispravan telefon.', 'error'); return; }
  if (customer_email && !emailRegex.test(customer_email)) { showMessage(resMsg, 'Neispravan email.', 'error'); return; }
  if (!location || !table_number || !reserved_at) { showMessage(resMsg, 'Popunite lokaciju, stol i datum/vrijeme.', 'error'); return; }

  const payload = { customer_name, customer_phone, customer_email, location, table_number: Number(table_number), reserved_at, seats: seats ? Number(seats) : null };
  fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(resp => { if (resp && resp.success) { showMessage(resMsg, 'Rezervacija uspješno spremljena! ID: ' + resp.reservationId, 'success'); reservationForm.reset(); } else { showMessage(resMsg, 'Greška: ' + (resp.error || 'Nepoznata greška'), 'error'); } }).catch(err => { showMessage(resMsg, 'Greška pri slanju rezervacije.', 'error'); console.error(err); });
});
