// Verzija 1: lokalno, učenici mogu preuzeti JSON
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

const menu = [
  { id:1, name:"Filet od brancina (grill)", price:85.00 },
  { id:2, name:"Lignje na žaru", price:75.00 },
  { id:3, name:"Škampi na buzaru", price:98.00 },
  { id:4, name:"Riblji paprikaš", price:65.00 },
  { id:5, name:"Salata od hobotnice", price:90.00 },
  { id:6, name:"Pašticada od lososa", price:88.00 },
  { id:7, name:"Rižoto sa školjkama", price:72.00 },
  { id:8, name:"Tuna steak", price:95.00 },
  { id:9, name:"Pohani oslić", price:60.00 },
  { id:10, name:"Miješana plodova mora (mix)", price:120.00 }
];

function renderMenu() { menuListEl.innerHTML = ''; menu.forEach(d => { const div = document.createElement('div'); div.className = 'dish'; div.innerHTML = `<div><strong>${d.name}</strong></div><div>${d.price.toFixed(2)} kn</div>`; menuListEl.appendChild(div); }); }
function renderOrderItems() { orderItemsEl.innerHTML = ''; menu.forEach(d => { const row = document.createElement('div'); row.className = 'item'; row.innerHTML = `
      <div style="flex:1">${d.name} <small>${d.price.toFixed(2)} kn</small></div>
      <div>
        <input class="qty" type="number" min="0" value="0" data-dish-id="${d.id}" />
      </div>
    `; orderItemsEl.appendChild(row); }); }

const tablesByLocation = { terasa: Array.from({length:10}, (_,i)=>i+1), restoran: Array.from({length:10}, (_,i)=>i+1) };
function populateTables(selectEl, location) { selectEl.innerHTML = '<option value="">Odaberite stol</option>'; if (!location) { selectEl.innerHTML = '<option value="">Prvo odaberite lokaciju</option>'; return; } (tablesByLocation[location] || []).forEach(n => { const opt = document.createElement('option'); opt.value = n; opt.textContent = `Stol ${n}`; selectEl.appendChild(opt); }); }

renderMenu(); renderOrderItems();
locationSelect.addEventListener('change', (e) => populateTables(tableSelect, e.target.value));
rLocation.addEventListener('change', (e) => populateTables(rTable, e.target.value));

const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/; const phoneRegex = /^\+?\d{6,15}$/; const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function showMessage(el, text, type) { el.innerHTML = ''; const p = document.createElement('p'); p.textContent = text; p.className = type === 'error' ? 'error' : (type === 'success' ? 'success' : ''); el.appendChild(p); }
function downloadJSON(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

orderForm.addEventListener('submit', (e) => {
  e.preventDefault(); msgEl.innerHTML = '';
  const customer_name = document.getElementById('customer_name').value.trim();
  const customer_phone = document.getElementById('customer_phone').value.trim();
  const customer_email = document.getElementById('customer_email').value.trim();
  const location = document.getElementById('location_select').value;
  const table_number = document.getElementById('table_select').value;
  const payment_method = document.getElementById('payment_method').value;

  if (!nameRegex.test(customer_name)) { showMessage(msgEl, 'Neispravno ime.', 'error'); return; }
  if (!phoneRegex.test(customer_phone)) { showMessage(msgEl, 'Neispravan telefon.', 'error'); return; }
  if (customer_email && !emailRegex.test(customer_email)) { showMessage(msgEl, 'Neispravan email.', 'error'); return; }
  if (!location || !table_number) { showMessage(msgEl, 'Odaberite lokaciju i stol.', 'error'); return; }
  if (!payment_method) { showMessage(msgEl, 'Odaberite način plaćanja.', 'error'); return; }

  const items = Array.from(orderItemsEl.querySelectorAll('input[type="number"]')).map(inp => ({ dish_id: Number(inp.getAttribute('data-dish-id')), quantity: Number(inp.value) })).filter(i => i.quantity && i.quantity > 0);
  if (items.length === 0) { showMessage(msgEl, 'Odaberite barem jedno jelo.', 'error'); return; }

  const payload = { customer_name, customer_phone, customer_email, location, table_number: Number(table_number), payment_method, items, created_at: new Date().toISOString() };
  downloadJSON(`narudzba_${Date.now()}.json`, payload);
  showMessage(msgEl, 'Narudžba spremljena kao JSON (download).', 'success'); orderForm.reset(); renderOrderItems();
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

  const payload = { customer_name, customer_phone, customer_email, location, table_number: Number(table_number), reserved_at, seats: seats ? Number(seats) : null, created_at: new Date().toISOString() };
  downloadJSON(`rezervacija_${Date.now()}.json`, payload);
  showMessage(resMsg, 'Rezervacija spremljena kao JSON (download).', 'success'); reservationForm.reset(); rTable.innerHTML = '<option value="">Prvo odaberite lokaciju</option>'; 
});
