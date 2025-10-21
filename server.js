const express = require('express');
const bodyParser = require('body-parser');
const dbModule = require('./db');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

dbModule.init();
const db = new sqlite3.Database('./db.sqlite');

const nameRegex = /^[A-Za-zČćŽžŠšĐđ\s\-]{2,100}$/;
const phoneRegex = /^\+?\d{6,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const paymentMethods = ['gotovina', 'kartica'];

app.get('/api/menu', (req, res) => {
  db.all(`SELECT id, name, price FROM dishes ORDER BY id`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.get('/api/tables', (req, res) => {
  db.all(`SELECT id, table_number, location, seats FROM tables ORDER BY location, table_number`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_email, table_number, location, items, payment_method } = req.body;
  if (!customer_name || !customer_phone || !table_number || !location || !Array.isArray(items) || !payment_method) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja' });
  }
  if (!nameRegex.test(customer_name)) return res.status(400).json({ error: 'Neispravno ime' });
  if (!phoneRegex.test(customer_phone)) return res.status(400).json({ error: 'Neispravan telefon' });
  if (customer_email && !emailRegex.test(customer_email)) return res.status(400).json({ error: 'Neispravan email' });
  if (!paymentMethods.includes(payment_method)) return res.status(400).json({ error: 'Neispravan način plaćanja' });

  const itemsFiltered = items.filter(i => i.quantity && Number(i.quantity) > 0);
  if (itemsFiltered.length === 0) return res.status(400).json({ error: 'Nema odabranih jela' });

  db.get(`SELECT * FROM tables WHERE table_number = ? AND location = ?`, [table_number, location], (err, tableRow) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!tableRow) return res.status(400).json({ error: 'Nevažeći broj stola ili lokacija' });

    const insertOrder = `INSERT INTO orders (customer_name, customer_phone, customer_email, table_number, location, payment_method) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(insertOrder, [customer_name, customer_phone, customer_email || null, table_number, location, payment_method], function(err) {
      if (err) return res.status(500).json({ error: 'DB error prilikom spremanja narudžbe' });
      const orderId = this.lastID;
      const insertItemStmt = db.prepare(`INSERT INTO order_items (order_id, dish_id, quantity) VALUES (?, ?, ?)`);
      let pending = itemsFiltered.length;
      itemsFiltered.forEach(it => {
        db.get(`SELECT id FROM dishes WHERE id = ?`, [it.dish_id], (err, dishRow) => {
          if (err) { console.error(err); pending--; if (pending===0) finalize(); return; }
          if (!dishRow) { pending--; if (pending===0) finalize(); return; }
          const qty = Math.max(1, Math.floor(Number(it.quantity)));
          insertItemStmt.run(orderId, it.dish_id, qty, (err) => { if (err) console.error(err); pending--; if (pending===0) finalize(); });
        });
      });
      function finalize() { insertItemStmt.finalize(); res.json({ success: true, orderId }); }
    });
  });
});

app.post('/api/reservations', (req, res) => {
  const { customer_name, customer_phone, customer_email, table_number, location, reserved_at, seats } = req.body;
  if (!customer_name || !customer_phone || !table_number || !location || !reserved_at) {
    return res.status(400).json({ error: 'Nedostaju obavezna polja za rezervaciju' });
  }
  if (!nameRegex.test(customer_name)) return res.status(400).json({ error: 'Neispravno ime' });
  if (!phoneRegex.test(customer_phone)) return res.status(400).json({ error: 'Neispravan telefon' });
  if (customer_email && !emailRegex.test(customer_email)) return res.status(400).json({ error: 'Neispravan email' });

  db.get(`SELECT * FROM tables WHERE table_number = ? AND location = ?`, [table_number, location], (err, tableRow) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!tableRow) return res.status(400).json({ error: 'Nevažeći broj stola ili lokacija' });

    db.get(`SELECT * FROM reservations WHERE table_number = ? AND location = ? AND reserved_at = ?`, [table_number, location, reserved_at], (err, existing) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (existing) return res.status(400).json({ error: 'Stol je već rezerviran u odabranom terminu' });

      const stmt = `INSERT INTO reservations (customer_name, customer_phone, customer_email, table_number, location, reserved_at, seats) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(stmt, [customer_name, customer_phone, customer_email || null, table_number, location, reserved_at, seats || null], function(err) {
        if (err) return res.status(500).json({ error: 'DB error prilikom spremanja rezervacije' });
        res.json({ success: true, reservationId: this.lastID });
      });
    });
  });
});

app.get('/api/orders', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, (err, orders) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const result = [];
    let pending = orders.length;
    if (pending === 0) return res.json([]);
    orders.forEach(o => {
      db.all(`SELECT oi.quantity, d.name, d.price FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = ?`, [o.id], (err, items) => {
        if (err) items = [];
        result.push({ order: o, items });
        pending--;
        if (pending === 0) res.json(result);
      });
    });
  });
});

app.get('/api/reservations', (req, res) => {
  db.all(`SELECT * FROM reservations ORDER BY reserved_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.listen(PORT, () => { console.log(`Server pokrenut na http://localhost:${PORT}`); });