const express = require('express');
const path    = require('path');
const apiRoutes  = require('./api/apiRoutes');

const app  = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/reserve', express.static(path.join(__dirname, 'public')));

// Use the API routes
app.use('/api/v1', apiRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`API Server is running on http://localhost:${PORT}`);
});
