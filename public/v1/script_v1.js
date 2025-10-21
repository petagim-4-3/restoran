// Verzija 1: lokalno, učenici mogu preuzeti JSON
const menuListEl = document.getElementById('menu-list');
const locationSelect = document.getElementById('location_select');
const tableSelect = document.getElementById('table_select');
const orderItemsEl = document.getElementById('order-items');
const orderForm = document.getElementById('order-form');
const msgEl = document.getElementById('message');
const paymentMethodSelect = document.getElementById('payment_method');
const cardBlock = document.getElementById('card-block');
const generateReceiptBtn = document.getElementById('generate-receipt');

const menu = [
  { id:1, name:"Hobotnica na žaru", price:95.00 },
  { id:2, name:"Lignje", price:75.00 },
  { id:3, name:"Losos", price:88.00 },
  { id:4, name:"Pastrmka (riba)", price:70.00 },
  { id:5, name:"Kozice", price:90.00 },
  { id:6, name:"Skuša", price:55.00 },
  { id:7, name:"Škampi", price:98.00 },
  { id:8, name:"Ceviche od kozica i ananasa", price:110.00 },
  { id:9, name:"Rižoto", price:72.00 },
  { id:10, name:"Orada", price:85.00 }
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

// Toggle card block visibility
paymentMethodSelect.addEventListener('change', (e) => {
  if (e.target.value === 'kartica') {
    cardBlock.style.display = 'block';
  } else {
    cardBlock.style.display = 'none';
  }
});

// Card validation functions
function validateCardName(name) {
  return name && name.trim().length > 0;
}

function validateCardNumber(number) {
  // Remove spaces and check if 13-19 digits
  const digits = number.replace(/\s/g, '');
  return /^\d{13,19}$/.test(digits);
}

function validateCardExpiry(expiry) {
  // Format: MM/YY
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
}

function validateCardCVC(cvc) {
  // 3-4 digits
  return /^\d{3,4}$/.test(cvc);
}

function maskCardNumber(number) {
  // Remove spaces and keep only last 4 digits
  const digits = number.replace(/\s/g, '');
  if (digits.length < 4) return '****';
  return '**** **** **** ' + digits.slice(-4);
}

const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/; const phoneRegex = /^\+?\d{6,15}$/; const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function showMessage(el, text, type) { el.innerHTML = ''; const p = document.createElement('p'); p.textContent = text; p.className = type === 'error' ? 'error' : (type === 'success' ? 'success' : ''); el.appendChild(p); }
function downloadJSON(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

orderForm.addEventListener('submit', (e) => {
  e.preventDefault(); msgEl.innerHTML = '';
  const customer_name = document.getElementById('customer_name').value.trim();
  const customer_phone = document.getElementById('customer_phone').value.trim();
  const location = document.getElementById('location_select').value;
  const table_number = document.getElementById('table_select').value;
  const payment_method = document.getElementById('payment_method').value;

  if (!nameRegex.test(customer_name)) { showMessage(msgEl, 'Neispravno ime.', 'error'); return; }
  if (!phoneRegex.test(customer_phone)) { showMessage(msgEl, 'Neispravan telefon.', 'error'); return; }
  if (!location || !table_number) { showMessage(msgEl, 'Odaberite lokaciju i stol.', 'error'); return; }
  if (!payment_method) { showMessage(msgEl, 'Odaberite način plaćanja.', 'error'); return; }

  // Validate card details if payment method is 'kartica'
  if (payment_method === 'kartica') {
    const cardName = document.getElementById('card_name').value.trim();
    const cardNumber = document.getElementById('card_number').value.trim();
    const cardExpiry = document.getElementById('card_expiry').value.trim();
    const cardCVC = document.getElementById('card_cvc').value.trim();

    if (!validateCardName(cardName)) {
      showMessage(msgEl, 'Ime i prezime na kartici je obavezno.', 'error');
      return;
    }
    if (!validateCardNumber(cardNumber)) {
      showMessage(msgEl, 'Broj kartice mora imati 13-19 cifara.', 'error');
      return;
    }
    if (!validateCardExpiry(cardExpiry)) {
      showMessage(msgEl, 'Datum isteka mora biti u formatu MM/YY.', 'error');
      return;
    }
    if (!validateCardCVC(cardCVC)) {
      showMessage(msgEl, 'CVC mora imati 3-4 cifre.', 'error');
      return;
    }
  }

  const items = Array.from(orderItemsEl.querySelectorAll('input[type="number"]')).map(inp => ({ dish_id: Number(inp.getAttribute('data-dish-id')), quantity: Number(inp.value) })).filter(i => i.quantity && i.quantity > 0);
  if (items.length === 0) { showMessage(msgEl, 'Odaberite barem jedno jelo.', 'error'); return; }

  const payload = { customer_name, customer_phone, location, table_number: Number(table_number), payment_method, items, created_at: new Date().toISOString() };
  
  // Add card details to payload if payment method is 'kartica'
  if (payment_method === 'kartica') {
    const cardName = document.getElementById('card_name').value.trim();
    const cardNumber = document.getElementById('card_number').value.trim();
    payload.card_holder = cardName;
    payload.card_number_masked = maskCardNumber(cardNumber);
  }
  
  downloadJSON(`narudzba_${Date.now()}.json`, payload);
  showMessage(msgEl, 'Narudžba spremljena kao JSON (download).', 'success'); orderForm.reset(); renderOrderItems();
});

// Receipt generation
generateReceiptBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  // Get company details
  const companyName = document.getElementById('company_name').value.trim() || 'Restoran Sirena';
  const companyAddress = document.getElementById('company_address').value.trim() || 'Adresa nije unesena';
  const companyJIB = document.getElementById('company_jib').value.trim() || 'N/A';
  const companyPIB = document.getElementById('company_pib').value.trim() || 'N/A';
  const companyIBFM = document.getElementById('company_ibfm').value.trim() || 'N/A';
  const operator = document.getElementById('operator').value.trim() || 'N/A';
  
  // Get current date and time
  const now = new Date();
  const datum = now.toLocaleDateString('hr-HR');
  const vrijeme = now.toLocaleTimeString('hr-HR');
  
  // Get order items
  const items = Array.from(orderItemsEl.querySelectorAll('input[type="number"]'))
    .map(inp => ({
      dish_id: Number(inp.getAttribute('data-dish-id')),
      quantity: Number(inp.value)
    }))
    .filter(i => i.quantity && i.quantity > 0);
  
  if (items.length === 0) {
    showMessage(msgEl, 'Odaberite barem jedno jelo za račun.', 'error');
    return;
  }
  
  // Calculate totals
  let subtotal = 0;
  const itemsWithDetails = items.map(item => {
    const dish = menu.find(d => d.id === item.dish_id);
    const lineTotal = dish.price * item.quantity;
    subtotal += lineTotal;
    return {
      name: dish.name,
      price: dish.price,
      quantity: item.quantity,
      lineTotal: lineTotal
    };
  });
  
  const pdvRate = 0.17; // 17%
  const pdvAmount = subtotal * pdvRate;
  const total = subtotal + pdvAmount;
  
  // Create JSON for QR code
  const qrData = {
    company: companyName,
    total: total.toFixed(2),
    date: datum,
    time: vrijeme
  };
  const qrJson = JSON.stringify(qrData);
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(qrJson)}`;
  
  // Generate receipt HTML
  let receiptHTML = `
    <!DOCTYPE html>
    <html lang="hr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Račun - ${companyName}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          max-width: 400px;
          margin: 20px auto;
          padding: 20px;
          background: white;
        }
        h1 {
          text-align: center;
          font-size: 18px;
          margin-bottom: 10px;
        }
        .company-info {
          text-align: center;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .meta-info {
          margin-bottom: 20px;
          font-size: 12px;
        }
        .meta-info div {
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        table th {
          text-align: left;
          border-bottom: 2px solid #000;
          padding: 5px 0;
        }
        table td {
          padding: 5px 0;
          border-bottom: 1px solid #ccc;
        }
        .totals {
          font-size: 12px;
          margin-top: 20px;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .totals .total-line {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #000;
          padding-top: 5px;
          margin-top: 10px;
        }
        .qr-code {
          text-align: center;
          margin-top: 20px;
        }
        .qr-code img {
          border: 1px solid #ccc;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="company-info">
        <h1>${companyName}</h1>
        <div>${companyAddress}</div>
        <div>JIB: ${companyJIB} | PIB: ${companyPIB} | IBFM: ${companyIBFM}</div>
      </div>
      
      <div class="meta-info">
        <div><strong>Operator:</strong> ${operator}</div>
        <div><strong>Datum:</strong> ${datum}</div>
        <div><strong>Vrijeme:</strong> ${vrijeme}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Stavka</th>
            <th style="text-align: center;">Kol.</th>
            <th style="text-align: right;">Cijena</th>
            <th style="text-align: right;">Ukupno</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  itemsWithDetails.forEach(item => {
    receiptHTML += `
          <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${item.price.toFixed(2)}</td>
            <td style="text-align: right;">${item.lineTotal.toFixed(2)}</td>
          </tr>
    `;
  });
  
  receiptHTML += `
        </tbody>
      </table>
      
      <div class="totals">
        <div>
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)} KM</span>
        </div>
        <div>
          <span>PDV (17%):</span>
          <span>${pdvAmount.toFixed(2)} KM</span>
        </div>
        <div class="total-line">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)} KM</span>
        </div>
        <div style="margin-top: 15px;">
          <span>Uplaćeno:</span>
          <span>${total.toFixed(2)} KM</span>
        </div>
        <div>
          <span>Povrat:</span>
          <span>0.00 KM</span>
        </div>
      </div>
      
      <div class="qr-code">
        <img src="${qrUrl}" alt="QR Code" />
        <div style="font-size: 10px; margin-top: 5px;">Skenirajte QR kod za detalje</div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 10px;">
        Hvala na posjeti!
      </div>
    </body>
    </html>
  `;
  
  // Open receipt in new window
  const receiptWindow = window.open('', '_blank', 'width=500,height=700');
  receiptWindow.document.write(receiptHTML);
  receiptWindow.document.close();
  
  // Optional: Auto-print after a delay
  setTimeout(() => {
    receiptWindow.print();
  }, 500);
});
