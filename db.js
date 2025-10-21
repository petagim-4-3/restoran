const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './db.sqlite';

function init() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS dishes (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      name TEXT NOT NULL,\
      price REAL NOT NULL\
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tables (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      table_number INTEGER NOT NULL,\
      location TEXT,\
      seats INTEGER,\
      UNIQUE(table_number, location)\
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      customer_name TEXT NOT NULL,\
      customer_phone TEXT NOT NULL,\
      customer_email TEXT,\
      table_number INTEGER NOT NULL,\
      location TEXT NOT NULL,\
      payment_method TEXT NOT NULL,\
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP\
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      order_id INTEGER NOT NULL,\
      dish_id INTEGER NOT NULL,\
      quantity INTEGER NOT NULL,\
      FOREIGN KEY(order_id) REFERENCES orders(id),\
      FOREIGN KEY(dish_id) REFERENCES dishes(id)\
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reservations (\
      id INTEGER PRIMARY KEY AUTOINCREMENT,\
      customer_name TEXT NOT NULL,\
      customer_phone TEXT NOT NULL,\
      customer_email TEXT,\
      table_number INTEGER NOT NULL,\
      location TEXT NOT NULL,\
      reserved_at TEXT NOT NULL,\
      seats INTEGER,\
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP\
    )`);

    db.get(`SELECT COUNT(*) AS count FROM dishes`, (err, row) => {
      if (err) { console.error('DB error', err); return; }
      if (row.count === 0) {
        const stmt = db.prepare(`INSERT INTO dishes (name, price) VALUES (?, ?)`);
        const dishes = [
          ["Filet od brancina (grill)", 85.00],
          ["Lignje na žaru", 75.00],
          ["Škampi na buzaru", 98.00],
          ["Riblji paprikaš", 65.00],
          ["Salata od hobotnice", 90.00],
          ["Pašticada od lososa", 88.00],
          ["Rižoto sa školjkama", 72.00],
          ["Tuna steak", 95.00],
          ["Pohani oslić", 60.00],
          ["Miješana plodova mora (mix)", 120.00]
        ];
        dishes.forEach(d => stmt.run(d[0], d[1]));
        stmt.finalize();
        console.log('Seeded dishes');
      }
    });

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

module.exports = { init, DB_PATH };