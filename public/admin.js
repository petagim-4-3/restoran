// Jednostavno admin sučelje: dohvaća narudžbe i rezervacije, omogućuje brisanje
const ordersList = document.getElementById('orders-list');
const reservationsList = document.getElementById('reservations-list');
const refreshOrdersBtn = document.getElementById('refresh-orders');
const refreshReservationsBtn = document.getElementById('refresh-reservations');

function showError(el, text) {
  el.innerHTML = `<p class="error">${text}</p>`;
}

function fetchOrders() {
  ordersList.innerHTML = 'Učitavanje...';
  fetch('/api/orders')
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
            <button data-id="${o.id}" class="delete-order">Obriši</button>
          </div>
        `;
        ordersList.appendChild(div);
      });
      // attach delete handlers
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

function fetchReservations() {
  reservationsList.innerHTML = 'Učitavanje...';
  fetch('/api/reservations')
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data)) return showError(reservationsList, 'Greška pri dohvaćanju rezervacija');
      if (data.length === 0) { reservationsList.innerHTML = '<p>Nema rezervacija.</p>'; return; }
      reservationsList.innerHTML = '';
      data.forEach(r => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <div><strong>ID: ${r.id}</strong> | ${r.customer_name} | ${r.customer_phone} | Stol ${r.table_number} (${r.location}) | ${r.reserved_at}</div>
          <div style="margin-top:8px;">
            <button data-id="${r.id}" class="delete-reservation">Obriši</button>
          </div>
        `;
        reservationsList.appendChild(div);
      });
      Array.from(document.getElementsByClassName('delete-reservation')).forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (!confirm(`Obrisati rezervaciju ID ${id}?`)) return;
          fetch(`/api/reservations/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(resp => {
              if (resp && resp.success) fetchReservations();
              else alert('Greška pri brisanju rezervacije: ' + (resp.error||''));
            }).catch(err => alert('Greška: ' + err));
        });
      });
    })
    .catch(err => showError(reservationsList, 'Greška pri dohvaćanju rezervacija.'));
}

refreshOrdersBtn.addEventListener('click', fetchOrders);
refreshReservationsBtn.addEventListener('click', fetchReservations);

// init
fetchOrders();
fetchReservations();
