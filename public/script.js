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

const paymentMethodSelect = document.getElementById('payment_method');
const cardDetailsSection = document.getElementById('card-details-section');

let menu = []; let tables = [];
let lastOrderData = null; // store last successful order for receipt generation

const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/;
const phoneRegex = /^\+?\d{6,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cardNumberRegex = /^\d{13,19}$/;
const cardExpiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
const cardCvcRegex = /^\d{3,4}$/;

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

// Show/hide card details section based on payment method
paymentMethodSelect.addEventListener('change', (e) => {
  if (e.target.value === 'kartica') {
    cardDetailsSection.style.display = 'block';
    document.getElementById('card_holder').required = true;
    document.getElementById('card_number').required = true;
    document.getElementById('card_expiry').required = true;
    document.getElementById('card_cvc').required = true;
  } else {
    cardDetailsSection.style.display = 'none';
    document.getElementById('card_holder').required = false;
    document.getElementById('card_number').required = false;
    document.getElementById('card_expiry').required = false;
    document.getElementById('card_cvc').required = false;
  }
});

// Format card number as user types (add spaces every 4 digits)
document.getElementById('card_number').addEventListener('input', (e) => {
  let value = e.target.value.replace(/\s/g, '');
  let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
  e.target.value = formattedValue;
});

// Format expiry date as user types (add / after 2 digits)
document.getElementById('card_expiry').addEventListener('input', (e) => {
  let value = e.target.value.replace(/\//g, '');
  if (value.length >= 2) {
    e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
  } else {
    e.target.value = value;
  }
});

// Only allow digits in CVC
document.getElementById('card_cvc').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

function maskCardNumber(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length < 4) return '****';
  return '****' + cleaned.slice(-4);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateReceipt(orderData) {
  const { orderId, items, customer_name, customer_phone, payment_method, 
          company_name, company_address, company_jib, company_pib, company_ibfm, operator,
          card_holder, card_number_masked } = orderData;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('hr-HR');
  const timeStr = now.toLocaleTimeString('hr-HR');
  
  // Calculate totals
  let subtotal = 0;
  let itemsHtml = '';
  items.forEach(item => {
    const total = item.price * item.quantity;
    subtotal += total;
    itemsHtml += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.quantity}</td>
        <td>${item.price.toFixed(2)} kn</td>
        <td>${total.toFixed(2)} kn</td>
      </tr>
    `;
  });
  
  const pdvRate = 0.17;
  const pdvAmount = subtotal * pdvRate;
  const total = subtotal + pdvAmount;
  
  // Create QR code data (using safe values only)
  const qrData = JSON.stringify({
    company: company_name || 'Restoran',
    total: total.toFixed(2),
    date: dateStr,
    time: timeStr
  });
  const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrData)}`;
  
  // Generate receipt HTML with escaped values
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Račun #${orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; }
        h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company-info, .order-info { margin: 20px 0; }
        .company-info div, .order-info div { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .totals { margin-top: 20px; text-align: right; }
        .totals div { margin: 5px 0; }
        .total-line { font-size: 1.2em; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .qr-code { text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>RAČUN #${orderId}</h1>
      
      ${company_name ? `
      <div class="company-info">
        <div><strong>Naziv firme:</strong> ${escapeHtml(company_name)}</div>
        ${company_address ? `<div><strong>Adresa:</strong> ${escapeHtml(company_address)}</div>` : ''}
        ${company_jib ? `<div><strong>JIB:</strong> ${escapeHtml(company_jib)}</div>` : ''}
        ${company_pib ? `<div><strong>PIB:</strong> ${escapeHtml(company_pib)}</div>` : ''}
        ${company_ibfm ? `<div><strong>IBFM:</strong> ${escapeHtml(company_ibfm)}</div>` : ''}
      </div>
      ` : ''}
      
      <div class="order-info">
        <div><strong>Datum:</strong> ${dateStr}</div>
        <div><strong>Vrijeme:</strong> ${timeStr}</div>
        <div><strong>Kupac:</strong> ${escapeHtml(customer_name)}</div>
        <div><strong>Telefon:</strong> ${escapeHtml(customer_phone)}</div>
        ${operator ? `<div><strong>Operator:</strong> ${escapeHtml(operator)}</div>` : ''}
        <div><strong>Način plaćanja:</strong> ${payment_method === 'kartica' ? 'Kartica' : 'Gotovina'}</div>
        ${payment_method === 'kartica' && card_holder ? `<div><strong>Vlasnik kartice:</strong> ${escapeHtml(card_holder)}</div>` : ''}
        ${payment_method === 'kartica' && card_number_masked ? `<div><strong>Kartica:</strong> ${escapeHtml(card_number_masked)}</div>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Stavka</th>
            <th>Količina</th>
            <th>Cijena</th>
            <th>Ukupno</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div class="totals">
        <div>Međuzbroj: ${subtotal.toFixed(2)} kn</div>
        <div>PDV (17%): ${pdvAmount.toFixed(2)} kn</div>
        <div class="total-line">UKUPNO: ${total.toFixed(2)} kn</div>
      </div>
      
      <div class="qr-code">
        <img src="${qrUrl}" alt="QR Code">
        <div>Skenirajte za detalje</div>
      </div>
      
      <div class="footer">
        <p>Hvala na posjeti!</p>
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 1em; cursor: pointer;">Ispis računa</button>
      </div>
    </body>
    </html>
  `;
  
  // Open receipt in new window
  const receiptWindow = window.open('', '_blank', 'width=800,height=900');
  receiptWindow.document.write(receiptHtml);
  receiptWindow.document.close();
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

  let card_holder = null;
  let card_number_masked = null;
  
  // Validate card details if payment method is kartica
  if (payment_method === 'kartica') {
    card_holder = document.getElementById('card_holder').value.trim();
    const card_number = document.getElementById('card_number').value.trim();
    const card_expiry = document.getElementById('card_expiry').value.trim();
    const card_cvc = document.getElementById('card_cvc').value.trim();
    
    if (!nameRegex.test(card_holder)) { showMessage(msgEl, 'Neispravno ime na kartici.', 'error'); return; }
    
    const cardNumberCleaned = card_number.replace(/\s/g, '');
    if (!cardNumberRegex.test(cardNumberCleaned)) { showMessage(msgEl, 'Neispravan broj kartice (13-19 cifara).', 'error'); return; }
    
    if (!cardExpiryRegex.test(card_expiry)) { showMessage(msgEl, 'Neispravan datum isteka (format MM/YY).', 'error'); return; }
    
    if (!cardCvcRegex.test(card_cvc)) { showMessage(msgEl, 'Neispravan CVC (3-4 cifre).', 'error'); return; }
    
    // Mask the card number
    card_number_masked = maskCardNumber(card_number);
  }

  const qtyInputs = Array.from(orderItemsEl.querySelectorAll('input[type="number"]'));
  const items = qtyInputs.map(inp => ({ dish_id: Number(inp.getAttribute('data-dish-id')), quantity: Number(inp.value) })).filter(i => i.quantity && i.quantity > 0);
  if (items.length === 0) { showMessage(msgEl, 'Odaberite barem jedno jelo s količinom > 0.', 'error'); return; }

  // Get company info for receipt
  const company_name = document.getElementById('company_name').value.trim();
  const company_address = document.getElementById('company_address').value.trim();
  const company_jib = document.getElementById('company_jib').value.trim();
  const company_pib = document.getElementById('company_pib').value.trim();
  const company_ibfm = document.getElementById('company_ibfm').value.trim();
  const operator = document.getElementById('operator').value.trim();

  const payload = { customer_name, customer_phone, customer_email, table_number: Number(table_number), location, payment_method, items };
  
  // Add card details to payload if payment method is kartica
  if (payment_method === 'kartica' && card_holder && card_number_masked) {
    payload.card_holder = card_holder;
    payload.card_number_masked = card_number_masked;
  }
  
  fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()).then(resp => { 
    if (resp && resp.success) { 
      // Store order data for receipt generation
      lastOrderData = {
        orderId: resp.orderId,
        items: items.map(item => {
          const dish = menu.find(d => d.id === item.dish_id);
          return { ...item, name: dish.name, price: dish.price };
        }),
        customer_name,
        customer_phone,
        payment_method,
        company_name,
        company_address,
        company_jib,
        company_pib,
        company_ibfm,
        operator,
        card_holder,
        card_number_masked
      };
      
      const successMsg = `Narudžba uspješno poslana! ID: ${resp.orderId}`;
      const receiptBtn = document.createElement('button');
      receiptBtn.textContent = 'Generiraj račun';
      receiptBtn.style.marginLeft = '10px';
      receiptBtn.onclick = (e) => {
        e.preventDefault();
        generateReceipt(lastOrderData);
      };
      
      msgEl.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'success';
      p.textContent = successMsg;
      p.appendChild(receiptBtn);
      msgEl.appendChild(p);
      
      orderForm.reset();
      cardDetailsSection.style.display = 'none';
      renderOrderItems(menu);
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
