const express = require('express');
const path    = require('path');

const homepageRoutes     = require('./routes/homepage');
const reservationsRoutes = require('./routes/reservations');
const routes             = require('./routes/routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/reservations', routes);
app.use('/reserve/:id', routes);
app.use('/cancel-reservation/:id', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
