const menuListEl = document.getElementById('menu-list');
const locationSelect = document.getElementById('location_select');
const tableSelect = document.getElementById('table_select');
const orderItemsEl = document.getElementById('order-items');
const orderForm = document.getElementById('order-form');
const msgEl = document.getElementById('message');
const paymentMethodSelect = document.getElementById('payment_method');
const cardBlock = document.getElementById('card-block');
const receiptSection = document.getElementById('receipt-section');

const rLocation = document.getElementById('r_location');
const rTable = document.getElementById('r_table');
const reservationForm = document.getElementById('reservation-form');
const resMsg = document.getElementById('res-message');

let menu = []; let tables = [];
let lastOrderId = null;
let lastOrderItems = [];
const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/;
const phoneRegex = /^\+?\d{6,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cardNumberRegex = /^\d{13,19}$/;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showMessage(el, text, type='') { el.innerHTML = ''; const p = document.createElement('p'); p.textContent = text; if (type === 'error') p.className = 'error'; if (type === 'success') p.className = 'success'; el.appendChild(p); }

fetch('/api/menu').then(r => r.json()).then(data => { menu = data; renderMenu(menu); renderOrderItems(menu); }).catch(err => { menuListEl.textContent = 'Greška pri učitavanju menija'; });
fetch('/api/tables').then(r => r.json()).then(t => { tables = t; populateLocationSelects(); }).catch(err => { console.error(err); locationSelect.innerHTML = '<option value="">Greška pri učitavanju</option>'; });

function renderMenu(menu) { menuListEl.innerHTML = ''; menu.forEach(d => { const div = document.createElement('div'); div.className = 'dish'; div.innerHTML = `<div><strong>${d.name}</strong></div><div>${d.price.toFixed(2)} KM</div>`; menuListEl.appendChild(div); }); }
function renderOrderItems(menu) { orderItemsEl.innerHTML = ''; menu.forEach(d => { const row = document.createElement('div'); row.className = 'item'; row.innerHTML = `
      <div style="flex:1">${d.name} <small>${d.price.toFixed(2)} KM</small></div>
      <div>
        <input class="qty" type="number" min="0" value="0" data-dish-id="${d.id}" />
      </div>
    `; orderItemsEl.appendChild(row); }); }
function populateLocationSelects() { const locations = Array.from(new Set(tables.map(t => t.location))); locationSelect.innerHTML = '<option value="">Odaberite lokaciju</option>'; locations.forEach(loc => { const opt = document.createElement('option'); opt.value = loc; opt.textContent = loc; locationSelect.appendChild(opt); }); rLocation.innerHTML = '<option value="">Odaberite</option>'; locations.forEach(loc => { const opt = document.createElement('option'); opt.value = loc; opt.textContent = loc; rLocation.appendChild(opt); }); }
function populateTablesFor(selectEl, location) { selectEl.innerHTML = '<option value="">Odaberite stol</option>'; const filtered = tables.filter(t => t.location === location); filtered.forEach(t => { const opt = document.createElement('option'); opt.value = t.table_number; opt.textContent = `Stol ${t.table_number} (${t.location})`; selectEl.appendChild(opt); }); }

locationSelect.addEventListener('change', (e) => populateTablesFor(tableSelect, e.target.value));
rLocation.addEventListener('change', (e) => populateTablesFor(rTable, e.target.value));

// Show/hide card block based on payment method
paymentMethodSelect.addEventListener('change', (e) => {
  if (e.target.value === 'kartica') {
    cardBlock.style.display = 'block';
  } else {
    cardBlock.style.display = 'none';
  }
});

function maskCardNumber(number) {
  const clean = number.replace(/\D/g, '');
  if (clean.length < 4) return 'xxxx';
  return 'xxxx xxxx xxxx ' + clean.slice(-4);
}

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

  // Validate card if payment method is kartica
  let cardData = null;
  if (payment_method === 'kartica') {
    const card_holder = document.getElementById('card_holder').value.trim();
    const card_number = document.getElementById('card_number').value.trim();
    const card_expiry = document.getElementById('card_expiry').value.trim();
    const card_cvc = document.getElementById('card_cvc').value.trim();
    
    if (!card_holder || !nameRegex.test(card_holder)) { showMessage(msgEl, 'Neispravno ime vlasnika kartice.', 'error'); return; }
    const cardClean = card_number.replace(/\s/g, '');
    if (!cardNumberRegex.test(cardClean)) { showMessage(msgEl, 'Neispravan broj kartice (13-19 cifara).', 'error'); return; }
    if (!/^\d{2}\/\d{2}$/.test(card_expiry)) { showMessage(msgEl, 'Neispravan format datuma isteka (MM/YY).', 'error'); return; }
    if (!/^\d{3,4}$/.test(card_cvc)) { showMessage(msgEl, 'Neispravan CVC (3-4 cifre).', 'error'); return; }
    
    cardData = {
      card_holder: card_holder,
      card_number_masked: maskCardNumber(cardClean)
    };
  }

  const qtyInputs = Array.from(orderItemsEl.querySelectorAll('input[type="number"]'));
  const items = qtyInputs.map(inp => ({ dish_id: Number(inp.getAttribute('data-dish-id')), quantity: Number(inp.value) })).filter(i => i.quantity && i.quantity > 0);
  if (items.length === 0) { showMessage(msgEl, 'Odaberite barem jedno jelo s količinom > 0.', 'error'); return; }

  const payload = { customer_name, customer_phone, customer_email, table_number: Number(table_number), location, payment_method, items };
  if (cardData) payload.card = cardData;
  
  fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(resp => { 
    if (resp && resp.success) { 
      lastOrderId = resp.orderId;
      lastOrderItems = items.map(it => {
        const dish = menu.find(d => d.id === it.dish_id);
        return { name: dish ? dish.name : 'Unknown', price: dish ? dish.price : 0, quantity: it.quantity };
      });
      showMessage(msgEl, 'Narudžba uspješno poslana! ID: ' + resp.orderId, 'success'); 
      receiptSection.style.display = 'block';
      orderForm.reset(); 
      renderOrderItems(); 
      cardBlock.style.display = 'none';
    } else { 
      showMessage(msgEl, 'Greška: ' + (resp.error || 'Nepoznata greška'), 'error'); 
    } 
  }).catch(err => { showMessage(msgEl, 'Greška pri slanju narudžbe.', 'error'); console.error(err); });
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

// Receipt generation
document.getElementById('print-receipt').addEventListener('click', () => {
  if (!lastOrderId || lastOrderItems.length === 0) {
    alert('Nema narudžbe za ispis računa.');
    return;
  }
  
  const companyName = document.getElementById('company_name').value || 'Restoran Sirena';
  const companyAddress = document.getElementById('company_address').value || '';
  const companyJib = document.getElementById('company_jib').value || '';
  const companyPib = document.getElementById('company_pib').value || '';
  const companyIbfm = document.getElementById('company_ibfm').value || '';
  const operator = document.getElementById('operator').value || '';
  
  const now = new Date();
  const dateTimeStr = now.toLocaleString('hr-HR');
  
  const subtotal = lastOrderItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const pdvRate = 0.17;
  const pdvAmount = subtotal * pdvRate;
  const total = subtotal + pdvAmount;
  
  // QR code data (Google Chart API)
  const qrData = encodeURIComponent(JSON.stringify({
    company: companyName,
    total: total.toFixed(2),
    date: dateTimeStr
  }));
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${qrData}`;
  
  let itemsHtml = '';
  lastOrderItems.forEach(it => {
    const itemTotal = it.price * it.quantity;
    itemsHtml += `<tr><td>${escapeHtml(it.name)}</td><td>${it.quantity}</td><td>${it.price.toFixed(2)} KM</td><td>${itemTotal.toFixed(2)} KM</td></tr>`;
  });
  
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Račun - Narudžba ${lastOrderId}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f4f4f4; }
        .totals { text-align: right; margin: 20px 0; }
        .totals div { margin: 5px 0; }
        .company-info { margin-bottom: 20px; }
        .qr-code { text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="company-info">
        <h1>${escapeHtml(companyName)}</h1>
        ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
        ${companyJib ? `<p>JIB: ${escapeHtml(companyJib)}</p>` : ''}
        ${companyPib ? `<p>PIB: ${escapeHtml(companyPib)}</p>` : ''}
        ${companyIbfm ? `<p>IBFM: ${escapeHtml(companyIbfm)}</p>` : ''}
        ${operator ? `<p>Operator: ${escapeHtml(operator)}</p>` : ''}
        <p>Datum i vrijeme: ${dateTimeStr}</p>
        <p>Narudžba ID: ${lastOrderId}</p>
      </div>
      
      <table>
        <thead>
          <tr><th>Artikl</th><th>Kol.</th><th>Cijena</th><th>Ukupno</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div class="totals">
        <div><strong>Međuzbroj:</strong> ${subtotal.toFixed(2)} KM</div>
        <div><strong>PDV (17%):</strong> ${pdvAmount.toFixed(2)} KM</div>
        <div style="font-size:1.2em"><strong>UKUPNO:</strong> ${total.toFixed(2)} KM</div>
      </div>
      
      <div class="qr-code">
        <img src="${qrUrl}" alt="QR Code" />
        <p>Skenirajte QR kod za provjeru</p>
      </div>
      
      <script>window.print();</script>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
});
