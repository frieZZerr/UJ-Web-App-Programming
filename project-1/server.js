const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

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

// +----------------------------------------------------------------------------------+
// |                               DATABASE CONNECTION                                |
// +----------------------------------------------------------------------------------+

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

// +----------------------------------------------------------------------------------+
// |                                  SERVER ROUTES                                   |
// +----------------------------------------------------------------------------------+

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  // Retrieve all available items
  db.all("SELECT * FROM items WHERE available = 1", (err, rows) => {
      if (err) {
          console.error('Error retrieving available items:', err.message);
          res.status(500).send('Internal Server Error');
      } else {
          // Read the homepage.html file
          fs.readFile('./public/html/homepage.html', 'utf8', (err, data) => {
              if (err) {
                  console.error('Error reading homepage file:', err.message);
                  res.status(500).send('Internal Server Error');
              } else {
                  // Replace the content placeholder with the list of available items
                  const modifiedHTML = data.replace('<!-- Content will be dynamically inserted here -->', 
                      `<h2>List of Available Items</h2>
                      <ul>
                          ${rows.map(row => `
                              <li>${row.name} - ${row.location} 
                                  <button onclick="reserveItem(${row.id})">Reserve</button>
                              </li>
                          `).join('')}
                      </ul>`
                  );
                  res.send(modifiedHTML);
              }
          });
      }
  });
});

app.post('/reserve/:id', (req, res) => {
  const itemId = req.params.id;
  const userName = req.body.userName;

  // Check if userName is provided
  if (!userName) {
      res.status(400).json({ error: 'User name is required.' });
      return;
  }

  // Generate a unique reservation ID
  const reservationUniqueId = generateReservationUniqueId();

  // Update availability status of the item in the 'items' table
  db.run("UPDATE items SET available = 0 WHERE id = ?", [itemId], (err) => {
      if (err) {
          console.error('Error updating availability status of item:', err.message);
          res.status(500).send('Internal Server Error');
      } else {
          // Insert reservation into the 'reservations' table
          const reservationDate = new Date().toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }); // Current date and time
          db.run("INSERT INTO reservations (item_id, user_name, reservation_date, reservation_unique_id) VALUES (?, ?, ?, ?)", [itemId, userName, reservationDate, reservationUniqueId], (err) => {
              if (err) {
                  console.error('Error inserting reservation:', err.message);
                  // Check if the error is due to NOT NULL constraint on 'user_name' column
                  if (err.errno === sqlite3.CONSTRAINT) {
                      res.status(400).json({ error: 'User name is required.' });
                  } else {
                      res.status(500).send('Internal Server Error');
                  }
              } else {
                  res.json({ success: true, reservationId: reservationUniqueId });
              }
          });
      }
  });
});

// Function to generate a unique reservation ID
function generateReservationUniqueId() {
  // Generate a random string as the reservation ID
  return Math.random().toString(36).substr(2, 9);
}

app.get('/reservations', (req, res) => {
  // Retrieve all reservations with item details
  db.all("SELECT r.*, i.name AS item_name, i.location AS item_location FROM reservations r JOIN items i ON r.item_id = i.id", (err, rows) => {
      if (err) {
          console.error('Error retrieving reservations:', err.message);
          res.status(500).send('Internal Server Error');
      } else {
          // Read the reservations.html file
          fs.readFile('./public/html/reservations.html', 'utf8', (err, data) => {
              if (err) {
                  console.error('Error reading reservations file:', err.message);
                  res.status(500).send('Internal Server Error');
              } else {
                  // Replace the content placeholder with the list of reservations
                  const modifiedHTML = data.replace('<!-- Content will be dynamically inserted here -->',
                      `<h2>List of Reservations</h2>
                      <ul>
                          ${rows.map(row => `
                              <li>${row.item_name} - ${row.item_location} - ${row.user_name} - ${row.reservation_date}
                                  <button onclick="cancelReservation(${row.id})">Cancel Reservation</button>
                              </li>
                          `).join('')}
                      </ul>`
                  );
                  res.send(modifiedHTML);
              }
          });
      }
  });
});

app.post('/cancel-reservation/:id', (req, res) => {
  const reservationId = req.params.id;
  
  // Retrieve item ID from the 'reservations' table
  db.get("SELECT item_id FROM reservations WHERE id = ?", [reservationId], (err, row) => {
      if (err) {
          console.error('Error retrieving item details:', err.message);
          res.status(500).send('Internal Server Error');
      } else if (!row) {
          res.status(404).send('Reservation not found');
      } else {
          const itemId = row.item_id;
          // Delete the reservation from the 'reservations' table
          db.run("DELETE FROM reservations WHERE id = ?", [reservationId], (err) => {
              if (err) {
                  console.error('Error cancelling reservation:', err.message);
                  res.status(500).send('Internal Server Error');
              } else {
                  // Update availability status of the item in the 'items' table
                  db.run("UPDATE items SET available = 1 WHERE id = ?", [itemId], (err) => {
                      if (err) {
                          console.error('Error updating availability status of item:', err.message);
                          res.status(500).send('Internal Server Error');
                      } else {
                          res.json({ success: true });
                      }
                  });
              }
          });
      }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
