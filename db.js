const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './db.sqlite';

function init() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL,
      location TEXT,
      seats INTEGER,
      UNIQUE(table_number, location)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      table_number INTEGER NOT NULL,
      location TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      card_holder TEXT,
      card_number_masked TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      dish_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(dish_id) REFERENCES dishes(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      table_number INTEGER NOT NULL,
      location TEXT NOT NULL,
      reserved_at TEXT NOT NULL,
      seats INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // seed dishes if empty (Sirena menu)
    db.get(`SELECT COUNT(*) AS count FROM dishes`, (err, row) => {
      if (err) { console.error('DB error', err); return; }
      if (row.count === 0) {
        const stmt = db.prepare(`INSERT INTO dishes (name, price) VALUES (?, ?)`);
        const dishes = [
          ["Hobotnica na žaru", 95.00],
          ["Lignje", 75.00],
          ["Losos", 88.00],
          ["Pastrmka (riba)", 70.00],
          ["Kozice", 90.00],
          ["Skuša", 55.00],
          ["Škampi", 98.00],
          ["Ceviche od kozica i ananasa", 110.00],
          ["Rižoto", 72.00],
          ["Orada", 85.00]
        ];
        dishes.forEach(d => stmt.run(d[0], d[1]));
        stmt.finalize();
        console.log('Seeded dishes (Sirena menu)');
      }
    });

    // seed tables: 10 terasa + 10 restoran if empty
    db.get(`SELECT COUNT(*) AS count FROM tables`, (err, row) => {
      if (err) { console.error('DB error', err); return; }
      if (row.count === 0) {
        const stmt = db.prepare(`INSERT INTO tables (table_number, location, seats) VALUES (?, ?, ?)`);
        for (let i = 1; i <= 10; i++) stmt.run(i, 'terasa', 4);
        for (let i = 1; i <= 10; i++) stmt.run(i, 'restoran', 4);
        stmt.finalize();
        console.log('Seeded tables: 10 terasa + 10 restoran');
      }
    });
  });
  return db;
}

module.exports = {
  init,
  DB_PATH
};