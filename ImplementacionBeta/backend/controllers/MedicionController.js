const MedicionRepository = require('../repositories/MedicionRepository');

class MedicionController {
  async getAllMediciones(req, res) {
    try {
      const mediciones = await MedicionRepository.findAllMedicionesWithData();
      res.status(200).json(mediciones);
    } catch (err) {
      res.status(500).json({ message: 'Error al obtener las mediciones', error: err.message });
    }
  }

  // Nueva función para mostrar la vista con Highcharts
  async mostrarMedicionesEnVista(req, res) {
    try {
      const mediciones = await MedicionRepository.findAllMedicionesWithData();
      res.render('index', { mediciones });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al mostrar las mediciones en la vista', error: err.message });
    }
  }
}

module.exports = new MedicionController();
