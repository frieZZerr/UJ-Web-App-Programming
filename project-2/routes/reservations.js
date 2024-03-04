const express = require('express');
const Reservation = require('./../models/reservation');
const fs = require('fs');

const router = express.Router();

router.get('/reservations', async (req, res) => {
    try {
        // Retrieve all reservations with item details
        const reservations = await Reservation.findAll();
        
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
                          ${reservations.map(reservation => `
                              <li>
                                  <strong>${reservation.item_name}</strong> <span class="item-location">${reservation.item_location}</span> ${reservation.user_name} - ${reservation.reservation_date}
                                  <button onclick="cancelReservation(${reservation.id})">Cancel Reservation</button>
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
  
    // Check if userName is provided
    if (!userName) {
        res.status(400).json({ error: 'User name is required.' });
        return;
    }
  
    // Generate a unique reservation ID
    const reservationUniqueId = generateReservationUniqueId();
  
    try {
        // Create a new reservation
        const reservation = await Reservation.create({
            item_id: itemId,
            user_name: userName,
            reservation_unique_id: reservationUniqueId
        });
        
        // Update availability status of the item in the 'items' table
        // Assume you have a method to update availability in the Item model
        // For example: Item.updateAvailability(itemId, false);
        
        res.json({ success: true, reservationId: reservation.id });
    } catch (err) {
        console.error('Error inserting reservation:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/cancel-reservation/:id', async (req, res) => {
    const reservationId = req.params.id;
    const uniqueReservationId = req.body.uniqueReservationId; // Assuming uniqueReservationId is sent in the request body
    
    try {
        // Retrieve reservation details based on the reservation ID
        const reservation = await Reservation.findByPk(reservationId);
        
        if (!reservation) {
            res.status(404).send('Reservation not found');
            return;
        }
        
        if (reservation.reservation_unique_id !== uniqueReservationId) {
            res.status(403).send('Unique reservation ID does not match');
            return;
        }
        
        // Delete the reservation
        await reservation.destroy();
        
        // Update availability status of the item in the 'items' table
        // Assume you have a method to update availability in the Item model
        // For example: Item.updateAvailability(reservation.item_id, true);
        
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
