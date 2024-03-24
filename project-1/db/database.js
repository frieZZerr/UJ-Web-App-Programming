const sqlite3 = require('sqlite3').verbose();

// Define an array of items to insert
const itemsToInsert = [
    ['Ping-Pong Table', 'G-1 Corridor', 1],
    ['Multimedia projector', 'Secretariat of the Institute of Physics', 1],
    ['Laptop', 'Conference Room A', 1],
    ['Table', 'A-2 Corridor', 1],
    ['Ping-Pong Paddles', 'Reception of Faculty of Physics, Astronomy and Applied Computer Science', 1],
    ['Microphone', 'Secretariat of the Institute of Foreign Languages', 1],
    ['Interactive whiteboard', 'Lecture room 102', 1],
    ['Camera', 'Secretariat of the Institute of Photography', 1],
    ['Microphone stand', 'Recording studio', 1]
  ];

const db = new sqlite3.Database('./db/database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the database.');
      // Create tables if they don't exist
      db.run(`CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          location TEXT NOT NULL,
          available BOOLEAN NOT NULL DEFAULT 1
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          reservation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          reservation_unique_id TEXT UNIQUE
      )`);
      // Check if the table is empty
      db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
          if (err) {
            console.error('Error checking if table is empty:', err.message);
          } else {
            const itemCount = row.count;
            if (itemCount === 0) {
              // Table is empty, insert data
              const stmt = db.prepare("INSERT INTO items (name, location, available) VALUES (?, ?, ?)");
              itemsToInsert.forEach(item => {
                stmt.run(item, err => {
                  if (err) {
                    console.error(`Error inserting item ${item[0]} into table:`, err.message);
                  }
                });
              });
              stmt.finalize();
          }
        }
      });
    }
  });

module.exports = db;
