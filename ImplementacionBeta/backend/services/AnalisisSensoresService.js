const processDataNative = require('../build/Release/process_data_final.node'); // Asegúrate de que el módulo esté en el path correcto

class AnalisisSensoresService {
  constructor() {
    // Verifica las funciones disponibles en el módulo nativo
    console.log('Funciones disponibles en el módulo nativo:', processDataNative);

    // Validación para evitar errores si no se encuentran las funciones esperadas
    if (
      !processDataNative.computePSD ||
      !processDataNative.computeFDD ||
      !processDataNative.computeSpectrogramFDD
    ) {
      throw new Error(
        'El módulo nativo no tiene las funciones necesarias. Asegúrate de que computePSD, computeFDD y computeSpectrogramFDD estén exportadas correctamente.'
      );
    }

    this.fs = 2048; // Frecuencia de muestreo
    this.nfft = 1024; // Tamaño de FFT
    this.step = this.nfft / 4; // Paso para espectrograma
  }

  validateData(data, nfft) {
    if (!Array.isArray(data)) {
      throw new Error('Los datos de entrada deben ser un arreglo.');
    }
    if (data.length < nfft) {
        throw new Error(`El tamaño de los datos (${data.length}) es menor que nfft (${nfft}).`);
    }
    if (data.some(value => typeof value !== 'number' || isNaN(value))) {
      throw new Error('El arreglo de datos contiene valores no numéricos o NaN.');
    }
  }

  computePSD(data) {
    this.validateData(data, this.nfft);
    try {
      if (!data || data.length === 0) {
        throw new Error('Los datos de entrada para PSD están vacíos.');
      }
      console.log(`Calculando PSD para ${data.length} datos con nfft=${this.nfft}`);
      return processDataNative.computePSD(data, this.fs, this.nfft);
    } catch (error) {
      console.error('Error al calcular el PSD:', error.message);
      throw new Error(`Error interno al calcular el PSD para ${data.length} datos con nfft=${this.nfft}`);
    }
  }

  computeFDD(data) {
    try {
      console.log('Calculando FDD para los datos:', data);
      return processDataNative.computeFDD(data, this.fs, this.nfft);
    } catch (error) {
      console.error('Error al calcular el FDD:', error.message);
      throw new Error('Error interno al calcular el FDD');
    }
  }

  calculateSpectrogram(data) {
    this.validateData(data, this.nfft);
    try {
      console.log(`Calculando Espectrograma para ${data.length} datos con nfft=${this.nfft} y paso=${this.step}`);
      return processDataNative.computeSpectrogramFDD(data, this.fs, this.nfft, this.step);
    } catch (error) {
      console.error('Error al calcular el espectrograma:', error.message);
      throw new Error('Error interno al calcular el espectrograma');
    }
  }
}

// Exporta el servicio como instancia única
module.exports = new AnalisisSensoresService();