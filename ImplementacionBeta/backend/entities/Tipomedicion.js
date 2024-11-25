const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Tipomedicion',
  tableName: 'tipomedicion', // Nombre de la tabla en la base de datos
  columns: {
    idTipoMedicion: {
      primary: true,
      type: 'int',
      generated: true,
    },
    nombreTipo: {
      type: 'varchar',
      length: 45,
    },
  },
  relations: {
    mediciones: {
      target: 'Medicion',
      type: 'one-to-many',
      inverseSide: 'tipomedicion',
    },
  },
});
