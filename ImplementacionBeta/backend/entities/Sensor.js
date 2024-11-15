const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Sensor',
  tableName: 'Sensor',
  columns: {
    idSensor: {
      primary: true,
      type: 'int',
      generated: true,
    },
    nombreSensor: {
      type: 'varchar',
      length: 45,
    },
  },
  relations: {
    data_sensors: {
      target: 'DataSensor',
      type: 'one-to-many',
      inverseSide: 'sensor',
    },
  },
});
