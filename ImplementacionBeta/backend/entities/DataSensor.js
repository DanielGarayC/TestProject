const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'DataSensor',
  tableName: 'Data_sensor',
  columns: {
    idData_sensor: {
      primary: true,
      type: 'int',
      generated: true,
    },
    valor: {
      type: 'float',
    },
    index: {
      type: 'varchar',
      length: 45,
    },
  },
  relations: {
    medicion: {
      target: 'Medicion',
      type: 'many-to-one',
      joinColumn: { name: 'idMedicion' },
    },
    sensor: {
      target: 'Sensor',
      type: 'many-to-one',
      joinColumn: { name: 'idSensor' },
    },
  },
});
