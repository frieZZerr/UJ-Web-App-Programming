const express = require('express');
const db      = require('./../db/database');
const fs      = require('fs');

const router  = express.Router();

router.get('/', (req, res) => {
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
                        <div class="item-list">
                          <ul>
                              ${rows.map(row => `
                                  <li>
                                      <strong>${row.name}</strong> <span class="item-location">${row.location}</span> 
                                      <button onclick="reserveItem(${row.id})">Reserve</button>
                                  </li>
                              `).join('')}
                          </ul>
                      </div>`
                    );
                    res.send(modifiedHTML);
                }
            });
        }
    });
});

router.get('/reservations', (req, res) => {
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
                        <div class="item-list">
                          <ul>
                              ${rows.map(row => `
                                  <li>
                                      <strong>${row.item_name}</strong> <span class="item-location">${row.item_location}</span> ${row.user_name} - ${row.reservation_date}
                                      <button onclick="cancelReservation(${row.id})">Cancel Reservation</button>
                                  </li>
                              `).join('')}
                          </ul>
                        </div>`
                    );
                    res.send(modifiedHTML);
                }
            });
        }
    });
});

router.post('/reserve/:id', (req, res) => {
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

router.post('/cancel-reservation/:id', (req, res) => {
    const reservationId = req.params.id;
    const uniqueReservationId = req.body.uniqueReservationId; // Assuming uniqueReservationId is sent in the request body
    
    // Retrieve item ID from the 'reservations' table based on the reservation ID
    db.get("SELECT item_id, reservation_unique_id FROM reservations WHERE id = ?", [reservationId], (err, row) => {
        if (err) {
            console.error('Error retrieving reservation details:', err.message);
            res.status(500).send('Internal Server Error');
        } else if (!row) {
            res.status(404).send('Reservation not found');
        } else if (row.reservation_unique_id !== uniqueReservationId) {
            res.status(403).send('Unique reservation ID does not match');
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

// Function to generate a unique reservation ID
function generateReservationUniqueId() {
    // Generate a random string as the reservation ID
    return Math.random().toString(36).substr(2, 9);
}

module.exports = router;
