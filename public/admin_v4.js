// Admin v4: Advanced search, filter, and order details
const ordersList = document.getElementById('orders-list');
const orderDetailsSection = document.getElementById('order-details-section');
const orderDetails = document.getElementById('order-details');
const searchInput = document.getElementById('search');
const filterLocation = document.getElementById('filter-location');
const filterPayment = document.getElementById('filter-payment');
const filterTable = document.getElementById('filter-table');
const applyFiltersBtn = document.getElementById('apply-filters');
const resetFiltersBtn = document.getElementById('reset-filters');

function showError(el, text) {
  el.innerHTML = `<p class="error">${text}</p>`;
}

function buildQueryString() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  const location = filterLocation.value;
  const payment = filterPayment.value;
  const table = filterTable.value.trim();
  
  if (search) params.append('search', search);
  if (location) params.append('location', location);
  if (payment) params.append('payment_method', payment);
  if (table) params.append('table_number', table);
  
  return params.toString();
}

function fetchOrders() {
  ordersList.innerHTML = 'Učitavanje...';
  const query = buildQueryString();
  const url = '/api/orders' + (query ? '?' + query : '');
  
  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data)) return showError(ordersList, 'Greška pri dohvaćanju narudžbi');
      if (data.length === 0) { ordersList.innerHTML = '<p>Nema narudžbi.</p>'; return; }
      ordersList.innerHTML = '';
      data.forEach(entry => {
        const o = entry.order;
        const items = entry.items || [];
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <div><strong>ID: ${o.id}</strong> | ${o.customer_name} | ${o.customer_phone} | Stol ${o.table_number} (${o.location}) | ${o.payment_method} | ${o.created_at}</div>
          <div style="margin-top:8px;">
            ${items.map(it => `<div>${it.name} x ${it.quantity} — ${ (it.price||0).toFixed(2) } kn</div>`).join('')}
          </div>
          <div style="margin-top:8px;">
            <button data-id="${o.id}" class="view-details">Detalji</button>
            <button data-id="${o.id}" class="delete-order">Obriši</button>
          </div>
        `;
        ordersList.appendChild(div);
      });
      
      // Attach handlers
      Array.from(document.getElementsByClassName('view-details')).forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          fetchOrderDetails(id);
        });
      });
      
      Array.from(document.getElementsByClassName('delete-order')).forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (!confirm(`Obrisati narudžbu ID ${id}?`)) return;
          fetch(`/api/orders/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(resp => {
              if (resp && resp.success) fetchOrders();
              else alert('Greška pri brisanju narudžbe: ' + (resp.error||''));
            }).catch(err => alert('Greška: ' + err));
        });
      });
    })
    .catch(err => showError(ordersList, 'Greška pri dohvaćanju narudžbi.'));
}

function fetchOrderDetails(id) {
  orderDetails.innerHTML = 'Učitavanje detalja...';
  orderDetailsSection.style.display = 'block';
  
  fetch(`/api/orders/${id}`)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.order) {
        orderDetails.innerHTML = '<p class="error">Narudžba nije pronađena.</p>';
        return;
      }
      
      const o = data.order;
      const items = data.items || [];
      const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      
      let html = `
        <div><strong>Narudžba ID: ${o.id}</strong></div>
        <div>Ime: ${o.customer_name}</div>
        <div>Telefon: ${o.customer_phone}</div>
        ${o.customer_email ? `<div>Email: ${o.customer_email}</div>` : ''}
        <div>Lokacija: ${o.location}</div>
        <div>Stol: ${o.table_number}</div>
        <div>Način plaćanja: ${o.payment_method}</div>
        ${o.card_holder ? `<div>Vlasnik kartice: ${o.card_holder}</div>` : ''}
        ${o.card_number_masked ? `<div>Broj kartice: ${o.card_number_masked}</div>` : ''}
        <div>Datum kreiranja: ${o.created_at}</div>
        <hr>
        <h3>Stavke:</h3>
      `;
      
      items.forEach(it => {
        html += `<div>${it.name} x ${it.quantity} — ${(it.price||0).toFixed(2)} kn = ${(it.price * it.quantity).toFixed(2)} kn</div>`;
      });
      
      html += `<hr><div><strong>Ukupno: ${total.toFixed(2)} kn</strong></div>`;
      
      orderDetails.innerHTML = html;
    })
    .catch(err => {
      orderDetails.innerHTML = '<p class="error">Greška pri dohvaćanju detalja.</p>';
      console.error(err);
    });
}

applyFiltersBtn.addEventListener('click', fetchOrders);
resetFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterLocation.value = '';
  filterPayment.value = '';
  filterTable.value = '';
  fetchOrders();
});

// Init
fetchOrders();
