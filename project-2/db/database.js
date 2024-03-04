const { Sequelize, DataTypes } = require('sequelize');

const db = new Sequelize({
    dialect: 'sqlite',
    storage: './db/database.db',
});

const Item = db.define('Item', {
  name: {
      type: DataTypes.STRING,
      allowNull: false
  },
  location: {
      type: DataTypes.STRING,
      allowNull: false
  },
  available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
  }
});

const Reservation = db.define('Reservation', {
  id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
  },
  itemId: {
      type: DataTypes.INTEGER,
      allowNull: false
  },
  userName: {
      type: DataTypes.STRING,
      allowNull: false
  },
  reservationStartDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
  },
  reservationEndDate: {
      type: DataTypes.DATE
  },
  reservationUniqueID: {
      type: DataTypes.STRING,
      unique: true
  }
});

Reservation.belongsTo(Item, { foreignKey: 'itemId' });
Item.hasMany(Reservation, { foreignKey: 'itemId' });

// Synchronizing the models with the database
db.sync()
    .then(() => {
        console.log('Database synchronized');
        // Insert items if the table is empty
        return Item.count();
    })
    .then(count => {
        if (count === 0) {
            return Item.bulkCreate([
                { name: 'Ping-Pong Table', location: 'G-1 Corridor' },
                { name: 'Multimedia projector', location: 'Secretariat of the Institute of Physics' },
                { name: 'Laptop', location: 'Conference Room A' },
                { name: 'Table', location: 'A-2 Corridor' },
                { name: 'Ping-Pong Paddles', location: 'Reception of Faculty of Physics, Astronomy and Applied Computer Science' },
                { name: 'Microphone', location: 'Secretariat of the Institute of Foreign Languages' },
                { name: 'Interactive whiteboard', location: 'Lecture room 102' },
                { name: 'Camera', location: 'Secretariat of the Institute of Photography' },
                { name: 'Microphone stand', location: 'Recording studio' }
            ]);
        }
    })
    .catch(err => {
        console.error('Error synchronizing database:', err);
    });

module.exports = { db, Item, Reservation };
