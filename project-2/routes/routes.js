const express = require('express');
const fs      = require('fs');
const { Op }  = require('sequelize');

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
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Location</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => `
                                    <tr class="item">
                                        <td>${row.name}</td>
                                        <td>${row.location}</td>
                                        <td>
                                            <button class="reserve-button" onclick="window.location.href = '/reserve/${row.id}'">Reserve</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
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
            attributes: ['id', 'userName', 'reservationStartDate', 'reservationEndDate'],
        });

        rows.forEach(row => {
            const formattedStartDate = row.reservationStartDate.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // Use 24-hour format
            });
        
            const formattedEndDate = row.reservationEndDate.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // Use 24-hour format
            });
        
            // Assign formatted dates back to the row object
            row.formattedStartDate = formattedStartDate;
            row.formattedEndDate = formattedEndDate;
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
                        <table>
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Item Location</th>
                                    <th>User Name</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => `
                                    <tr>
                                        <td>${row.Item.name}</td>
                                        <td>${row.Item.location}</td>
                                        <td>${row.userName}</td>
                                        <td>${row.formattedStartDate}</td>
                                        <td>${row.formattedEndDate}</td>
                                        <td><button onclick="cancelReservation(${row.id})">Cancel Reservation</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `
                );
                res.send(modifiedHTML);
            }
        });
    } catch (err) {
        console.error('Error retrieving reservations:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/reserve/:id', (req, res) => {
    const itemId = req.params.id;

    Item.findByPk(itemId)
        .then(item => {
            if (!item) {
                res.status(404).send('Item not found');
                return;
            }

            // Render the reserve.html file with the item details
            fs.readFile('./public/html/reserve.html', 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading reserve file:', err.message);
                    res.status(500).send('Internal Server Error');
                } else {
                    // Replace placeholders in the HTML file with item details
                    const modifiedHTML = data.replace('<!-- Content will be dynamically inserted here -->',
                        `${item.name}`
                    );

                    res.send(modifiedHTML);
                }
            });
        })
        .catch(err => {
            console.error('Error retrieving item details:', err.message);
            res.status(500).send('Internal Server Error');
        });
});

router.post('/reserve/:id', async (req, res) => {
    const itemId = req.params.id;
    const userName = req.body.userName;
    const reservationStartDate = req.body.reservationStartDate;
    const reservationEndDate = req.body.reservationEndDate;

    try {
        // Check if userName is provided
        if (!userName) {
            return res.status(400).json({ error: 'User name is required.' });
        }

        if (!reservationStartDate || !reservationEndDate) {
            return res.status(400).json({ error: 'Both start and end dates and required.' });
        }
    
        // Perform validation for start and end dates
        const startDateObj = new Date(reservationStartDate);
        const endDateObj = new Date(reservationEndDate);
    
        if (startDateObj >= endDateObj) {
            return res.status(400).json({ error: 'End date must be after start date.' });
        }

        const currentDate = new Date(); // Current date and time
        currentDate.setMinutes(currentDate.getMinutes() - 1);
        if ( startDateObj < currentDate) {
            return res.status(400).json({ error: 'Start date must be from now or the future.' });
        }

        // Check if the item is already reserved for the specified period
        const existingReservation = await Reservation.findOne({
            where: {
                itemId: itemId,
                [Op.or]: [
                    {
                        reservationStartDate: { [Op.between]: [reservationStartDate, reservationEndDate] }
                    },
                    {
                        reservationEndDate: { [Op.between]: [reservationStartDate, reservationEndDate] }
                    }
                ]
            }
        });

        if (existingReservation) {
            return res.status(400).json({ error: 'This item is already reserved for this period of time.' });
        }

        // Generate a unique reservation ID
        const reservationUniqueId = generateReservationUniqueId();

        const reservation = await Reservation.create({
            itemId: itemId,
            userName: userName,
            reservationStartDate: reservationStartDate,
            reservationEndDate: reservationEndDate,
            reservationUniqueID: reservationUniqueId
        });

        res.json({ success: true, reservationId: reservation.reservationUniqueID });
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
