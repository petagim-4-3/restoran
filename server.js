const express = require('express');
const bodyParser = require('body-parser');
const dbModule = require('./db');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic Auth middleware
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({ error: 'Autentikacija potrebna' });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }
  
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).json({ error: 'Neispravne vjerodajnice' });
}

app.use(bodyParser.json());

// Protected admin routes (Basic Auth required)
app.get('/admin_auth.html', basicAuth, (req, res) => {
  res.sendFile(__dirname + '/public/admin_auth.html');
});

app.get('/admin_auth.js', basicAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(__dirname + '/public/admin_auth.js');
});

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
  const { customer_name, customer_phone, customer_email, table_number, location, items, payment_method, card } = req.body;
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

    // Extract card data if present
    const card_holder = (card && card.card_holder) ? card.card_holder : null;
    const card_number_masked = (card && card.card_number_masked) ? card.card_number_masked : null;

    const insertOrder = `INSERT INTO orders (customer_name, customer_phone, customer_email, table_number, location, payment_method, card_holder, card_number_masked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(insertOrder, [customer_name, customer_phone, customer_email || null, table_number, location, payment_method, card_holder, card_number_masked], function(err) {
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
  // Support query params: search, location, table_number, payment_method
  const { search, location, table_number, payment_method } = req.query;
  
  let query = `SELECT * FROM orders`;
  let params = [];
  let conditions = [];
  
  if (search) {
    conditions.push(`(customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?)`);
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  if (location) {
    conditions.push(`location = ?`);
    params.push(location);
  }
  
  if (table_number) {
    conditions.push(`table_number = ?`);
    params.push(Number(table_number));
  }
  
  if (payment_method) {
    conditions.push(`payment_method = ?`);
    params.push(payment_method);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }
  
  query += ` ORDER BY created_at DESC`;
  
  db.all(query, params, (err, orders) => {
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

// GET single order by ID with items
app.get('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Neispravan ID' });
  
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!order) return res.status(404).json({ error: 'Narudžba nije pronađena' });
    
    db.all(`SELECT oi.quantity, d.name, d.price FROM order_items oi JOIN dishes d ON oi.dish_id = d.id WHERE oi.order_id = ?`, [id], (err, items) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ order, items });
    });
  });
});

// DELETE order (and its items)
app.delete('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Neispravan ID' });

  db.run(`DELETE FROM order_items WHERE order_id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error pri brisanju stavki' });
    db.run(`DELETE FROM orders WHERE id = ?`, [id], function(err2) {
      if (err2) return res.status(500).json({ error: 'DB error pri brisanju narudžbe' });
      if (this.changes === 0) return res.status(404).json({ error: 'Narudžba nije pronađena' });
      res.json({ success: true });
    });
  });
});

// DELETE reservation
app.delete('/api/reservations/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Neispravan ID' });

  db.run(`DELETE FROM reservations WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error pri brisanju rezervacije' });
    if (this.changes === 0) return res.status(404).json({ error: 'Rezervacija nije pronađena' });
    res.json({ success: true });
  });
});

app.listen(PORT, () => { console.log(`Server pokrenut na http://localhost:${PORT}`); });
