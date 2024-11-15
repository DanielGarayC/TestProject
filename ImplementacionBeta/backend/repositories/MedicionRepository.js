const { getRepository } = require('typeorm');
const Medicion = require('../entities/Medicion');

class MedicionRepository {
  constructor() {
    this.repository = null; // No inicializamos aquí el repositorio
  }

  getRepository() {
    // Solo inicializa el repositorio si aún no se ha inicializado
    if (!this.repository) {
      this.repository = getRepository(Medicion);
    }
    return this.repository;
  }

  async findAllMedicionesWithData() {
    const repository = this.getRepository(); // Obtiene el repositorio aquí
    return await repository.find({
      relations: ['data_sensors', 'data_sensors.sensor'],
    });
  }
}

module.exports = new MedicionRepository();
