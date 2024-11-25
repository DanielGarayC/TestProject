const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Medicion',
  tableName: 'medicion', // Asegúrate de que el nombre sea el mismo que en la base de datos
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
    tipomedicion: { // Relación many-to-one con Tipomedicion
      target: 'Tipomedicion', // Nombre de la entidad relacionada
      type: 'many-to-one',
      joinColumn: { name: 'idTipoMedicion' }, // Clave foránea en la tabla medicion
      inverseSide: 'mediciones', // Relación inversa definida en Tipomedicion
    },
  },
});
