#define _USE_MATH_DEFINES
#include <mysql_driver.h>
#include <mysql_connection.h>
#include <prepared_statement.h>
#include <resultset.h>
#include <exception.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <fstream>
#include <fftw3.h>
#include <napi.h>
#include <string>
#include <algorithm>


void applyHanningWindow(std::vector<double>& data) {
    size_t N = data.size();
    for (size_t i = 0; i < N; ++i) {
        data[i] *= 0.5 * (1 - cos(2 * M_PI * i / (N - 1)));
    }
}
// Función para calcular PSD usando el método de Welch
std::vector<double> computeWelch(const std::vector<double>& data, int fs, int nfft) {
    int windowSize = nfft;
    int overlap = windowSize / 2;
    int step = windowSize - overlap;
    int numWindows = (data.size() - windowSize) / step + 1;

    std::vector<double> psd(nfft / 2 + 1, 0.0);

    for (int i = 0; i < numWindows; ++i) {
        std::vector<double> window(data.begin() + i * step, data.begin() + i * step + windowSize);

        // Aplicar ventana de Hanning
        for (int j = 0; j < windowSize; ++j) {
            window[j] *= 0.5 * (1 - cos(2 * M_PI * j / (windowSize - 1)));
        }

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Calcular PSD
        for (int j = 0; j < nfft / 2 + 1; ++j) {
            psd[j] += (out[j][0] * out[j][0] + out[j][1] * out[j][1]) / (windowSize * fs);
        }

        fftw_destroy_plan(plan);
        fftw_free(out);
    }
    for (auto& p : psd) {
        p /= numWindows;
    }

    return psd;
}

std::vector<double> computeFDD(const std::vector<double>& signal, int fs, int nfft) {
    std::vector<double> fdd(nfft / 2 + 1, 0.0); // Inicializa el FDD con ceros
    int step = nfft / 2; // 50% de solapamiento
    int numWindows = 0;

    for (size_t start = 0; start + nfft <= signal.size(); start += step) {
        std::vector<double> window(signal.begin() + start, signal.begin() + start + nfft);

        // Aplicar ventana de Hanning
        applyHanningWindow(window);

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Acumular espectro de amplitud (lineal)
        for (int i = 0; i < nfft / 2 + 1; ++i) {
            double amplitude = sqrt(out[i][0] * out[i][0] + out[i][1] * out[i][1]);
            fdd[i] += amplitude;
        }

        fftw_destroy_plan(plan);
        fftw_free(out);
        numWindows++;
    }

    // Promediar los valores acumulados
    for (auto& value : fdd) {
        value /= numWindows;
    }

    return fdd; // Devuelve el FDD en escala lineal
}


// Función para calcular espectrograma basado en FDD
std::vector<std::vector<double>> computeSpectrogramFDD(const std::vector<double>& data, int fs, int nfft, int step) {
    int windowSize = nfft;
    std::vector<std::vector<double>> spectrogram; // Matriz para el espectrograma

    for (size_t start = 0; start + windowSize <= data.size(); start += step) {
        std::vector<double> window(data.begin() + start, data.begin() + start + windowSize);

        // Aplicar ventana de Hanning
        for (size_t i = 0; i < windowSize; ++i) {
            window[i] *= 0.5 * (1 - cos(2 * M_PI * i / (windowSize - 1)));
        }

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Calcular PSD
        std::vector<double> psd(nfft / 2 + 1, 0.0);
        for (int i = 0; i < nfft / 2 + 1; ++i) {
            psd[i] = (out[i][0] * out[i][0] + out[i][1] * out[i][1]) / (windowSize * fs);
        }

        fftw_destroy_plan(plan);
        fftw_free(out);

        // Agregar la PSD calculada al espectrograma
        spectrogram.push_back(psd);
    }

    return spectrogram;
}

// Función para calcular PSD (expuesta a Node.js)
Napi::Value ComputePSD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Array inputData = info[0].As<Napi::Array>();
    std::vector<double> data;
    for (size_t i = 0; i < inputData.Length(); ++i) {
        data.push_back(inputData.Get(i).As<Napi::Number>().DoubleValue());
    }
    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();

    auto psd = computeWelch(data, fs, nfft);

    Napi::Array psdArray = Napi::Array::New(env, psd.size());
    for (size_t i = 0; i < psd.size(); ++i) {
        psdArray[i] = psd[i];
    }

    return psdArray;
}

Napi::Value ComputeFDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Validación de parámetros
    if (info.Length() < 3 || !info[0].IsArray() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Argumentos inválidos: Se espera (Array, fs, nfft)").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Leer datos de entrada
    Napi::Array inputData = info[0].As<Napi::Array>();
    std::vector<double> signal;
    for (size_t i = 0; i < inputData.Length(); ++i) {
        signal.push_back(inputData.Get(i).As<Napi::Number>().DoubleValue());
    }

    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();

    // Validar parámetros
    if (signal.size() < (size_t)nfft || fs <= 0 || nfft <= 0) {
        Napi::TypeError::New(env, "Parámetros inválidos: El tamaño de la señal o nfft es incorrecto").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Calcular FDD
    std::vector<double> fdd = computeFDD(signal, fs, nfft);

    // Convertir el resultado a Napi::Array
    Napi::Array result = Napi::Array::New(env, fdd.size());
    for (size_t i = 0; i < fdd.size(); ++i) {
        result.Set(i, Napi::Number::New(env, fdd[i]));
    }

    return result;
}

// Función para calcular espectrograma (expuesta a Node.js)
Napi::Value ComputeSpectrogramFDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Leer argumentos desde Node.js
    Napi::Array inputData = info[0].As<Napi::Array>();
    std::vector<double> data;
    for (size_t i = 0; i < inputData.Length(); ++i) {
        data.push_back(inputData.Get(i).As<Napi::Number>().DoubleValue());
    }
    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();
    int step = info[3].As<Napi::Number>().Int32Value();

    // Calcular espectrograma
    auto spectrogram = computeSpectrogramFDD(data, fs, nfft, step);

    // Convertir el espectrograma a `Napi::Array` (matriz 2D)
    Napi::Array spectrogramArray = Napi::Array::New(env, spectrogram.size());
    for (size_t i = 0; i < spectrogram.size(); ++i) {
        Napi::Array rowArray = Napi::Array::New(env, spectrogram[i].size());
        for (size_t j = 0; j < spectrogram[i].size(); ++j) {
            rowArray[j] = Napi::Number::New(env, spectrogram[i][j]);
        }
        spectrogramArray[i] = rowArray;
    }

    return spectrogramArray;
}

// Inicialización del módulo
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("computePSD", Napi::Function::New(env, ComputePSD));
    exports.Set("computeFDD", Napi::Function::New(env, ComputeFDD));
    exports.Set("computeSpectrogramFDD", Napi::Function::New(env, ComputeSpectrogramFDD));
    return exports;
}

NODE_API_MODULE(process_data_final, Init)