const express = require('express');
const Item    = require('./../models/item');
const fs      = require('fs');

const router = express.Router();

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

module.exports = router;
