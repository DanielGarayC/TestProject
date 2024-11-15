const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Medicion',
  tableName: 'Medicion',
  columns: {
    idMedicion: {
      primary: true,
      type: 'int',
      generated: true,
    },
    fecha_hora: {
      type: 'datetime',
    },
  },
  relations: {
    data_sensors: {
      target: 'DataSensor',
      type: 'one-to-many',
      inverseSide: 'medicion',
    },
  },
});
