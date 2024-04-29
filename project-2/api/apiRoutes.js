const express = require('express');
const { Op } = require('sequelize');
const { Reservation, Item } = require('../db/database');

const router = express.Router();

// Route to get all available items
router.get('/items', async (req, res) => {
    try {
        // Query the database to retrieve all available items
        const availableItems = await Item.findAll({
            where: { available: true },
            attributes: ['id', 'name', 'location', 'available']
        });

        // Send the response with the list of available items in JSON format
        res.json(availableItems);
    } catch (error) {
        // If there's an error, send an error response
        console.error('Error retrieving available items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to get specified item
router.get('/items/:id', async (req, res) => {
    const itemId = req.params.id;

    try {
        // Retrieve the item with the specified ID and select only the required attributes
        const item = await Item.findByPk(itemId, {
            attributes: ['id', 'name', 'location', 'available']
        });
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(item);
    } catch (err) {
        console.error('Error retrieving item:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route for creating a new item
router.post('/items', async (req, res) => {
    const { itemName, location, available } = req.body;

    try {
        // Check if required fields are provided
        if (!itemName || !location || available === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create the item
        const newItem = await Item.create({
            name: itemName,
            location: location,
            available: available
        });

        res.status(201).json(newItem);
    } catch (err) {
        console.error('Error creating item:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route for deleting specified item
router.delete('/items/:id', async (req, res) => {
    const itemId = req.params.id;

    try {
        // Find the item by ID
        const item = await Item.findByPk(itemId);

        // Check if the item exists
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Delete the item
        await item.destroy();

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting item:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to get all reservations
router.get('/reservations', async (req, res) => {
    try {
        // Query the database to retrieve all reservations
        const allReservations = await Reservation.findAll({
            attributes: ['id', 'itemId', 'userName', 'reservationStartDate', 'reservationEndDate']
        });

        // Send the response with the list of reservations in JSON format
        res.json(allReservations);
    } catch (error) {
        // If there's an error, send an error response
        console.error('Error retrieving reservations:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route for creating a new reservation for specified item
router.post('/reserve/:id', async (req, res) => {
    const itemId = req.params.id;
    const { userName, reservationStartDate, reservationEndDate } = req.body;

    try {
        // Check if userName is provided
        if (!userName) {
            return res.status(400).json({ status: 'Error', message: 'User name is required.' });
        }

        if (!reservationStartDate || !reservationEndDate) {
            return res.status(400).json({ status: 'Error', message: 'Both start and end dates are required.' });
        }
    
        // Perform validation for start and end dates
        const startDateObj = new Date(reservationStartDate);
        const endDateObj = new Date(reservationEndDate);
    
        if (startDateObj >= endDateObj) {
            return res.status(400).json({ status: 'Error', message: 'End date must be after start date.' });
        }

        const currentDate = new Date(); // Current date and time
        currentDate.setMinutes(currentDate.getMinutes() - 1);
        if (startDateObj < currentDate) {
            return res.status(400).json({ status: 'Error', message: 'Start date must be from now or the future.' });
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
            return res.status(400).json({ status: 'Error', message: 'This item is already reserved for this period of time.' });
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

        res.json({ status: 'Success', reservationUniqueId });
    } catch (err) {
        console.error('Error inserting reservation:', err.message);
        // Check if the error is due to NOT NULL constraint on 'user_name' column
        if (err.errors && err.errors[0].type === 'notNull Violation') {
            res.status(400).json({ status: 'Error', message: 'User name is required.' });
        } else {
            res.status(500).json({ status: 'Error', message: 'Internal Server Error' });
        }
    }
});

router.delete('/reserve/:id', async (req, res) => {
    const reservationId = req.params.id;
    const uniqueReservationId = req.body.uniqueReservationId;

    try {
        // Retrieve reservation details including item ID and unique reservation ID
        const reservation = await Reservation.findByPk(reservationId);
        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Check if uniqueReservationId matches
        if (reservation.reservationUniqueID !== uniqueReservationId) {
            return res.status(403).json({ error: 'Unique reservation ID does not match' });
        }

        // Delete the reservation
        await reservation.destroy();

        // Update availability status of the item
        await Item.update({ available: true }, { where: { id: reservation.itemId } });

        res.json({ success: true });
    } catch (err) {
        console.error('Error cancelling reservation:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Function to generate a unique reservation ID
function generateReservationUniqueId() {
    // Generate a random string as the reservation ID
    return Math.random().toString(36).substr(2, 9);
}

module.exports = router;
