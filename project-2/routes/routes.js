const express = require('express');
const fs      = require('fs');

const { Reservation, Item } = require('../db/database');
const router  = express.Router();

router.get('/', async (req, res) => {
    try {
        // Retrieve all available items using Sequelize
        const rows = await Item.findAll({ where: { available: true } });

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
    } catch (err) {
        console.error('Error retrieving available items:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/reservations', async (req, res) => {
    try {
        // Retrieve all reservations with item details using Sequelize
        const rows = await Reservation.findAll({
            include: { model: Item },
            attributes: ['id', 'userName', 'reservationStartDate'],
        });

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
                                    <strong>${row.Item.name}</strong> <span class="item-location">${row.Item.location}</span> ${row.userName} - ${row.reservationStartDate}
                                    <button onclick="cancelReservation(${row.id})">Cancel Reservation</button>
                                </li>
                            `).join('')}
                        </ul>
                    </div>`
                );
                res.send(modifiedHTML);
            }
        });
    } catch (err) {
        console.error('Error retrieving reservations:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/reserve/:id', async (req, res) => {
    const itemId = req.params.id;
    const userName = req.body.userName;

    try {
        // Check if userName is provided
        if (!userName) {
            return res.status(400).json({ error: 'User name is required.' });
        }

        // Generate a unique reservation ID
        const reservationUniqueId = generateReservationUniqueId();

        // Insert reservation into the 'reservations' table
        const reservationDate = new Date(); // Current date and time

        const reservation = await Reservation.create({
            itemId: itemId,
            userName: userName,
            reservationStartDate: reservationDate,
            reservationUniqueID: reservationUniqueId
        });

        res.json({ success: true, reservationId: reservationUniqueId });
    } catch (err) {
        console.error('Error inserting reservation:', err.message);
        // Check if the error is due to NOT NULL constraint on 'user_name' column
        if (err.errors && err.errors[0].type === 'notNull Violation') {
            res.status(400).json({ error: 'User name is required.' });
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

router.post('/cancel-reservation/:id', async (req, res) => {
    const reservationId = req.params.id;
    const uniqueReservationId = req.body.uniqueReservationId; // Assuming uniqueReservationId is sent in the request body

    try {
        // Retrieve reservation details including item ID and unique reservation ID
        const reservation = await Reservation.findByPk(reservationId);
        if (!reservation) {
            return res.status(404).send('Reservation not found');
        }

        // Check if uniqueReservationId matches
        if (reservation.reservationUniqueID !== uniqueReservationId) {
            return res.status(403).send('Unique reservation ID does not match');
        }

        // Delete the reservation
        await reservation.destroy();

        // Update availability status of the item
        await Item.update({ available: true }, { where: { id: reservation.itemId } });

        res.json({ success: true });
    } catch (err) {
        console.error('Error cancelling reservation:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Function to generate a unique reservation ID
function generateReservationUniqueId() {
    // Generate a random string as the reservation ID
    return Math.random().toString(36).substr(2, 9);
}

module.exports = router;
