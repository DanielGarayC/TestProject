import time
import subprocess
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class FileArrivalHandler(FileSystemEventHandler):
    def __init__(self, columnas, output_folder):
        #Datos de inicialización
        self.columnas = columnas  
        self.output_folder = output_folder  

    def on_created(self, event):
        # Comprobaciones previas
        if not event.is_directory and event.src_path.endswith(".dxd"):
            print(f"Nuevo archivo .dxd detectado: {event.src_path}")

            # Obtener el nombre del dxd detectado
            filename = os.path.splitext(os.path.basename(event.src_path))[0]
            output_file = os.path.join(self.output_folder, f"{filename}.txt")

            # Ejecutar el primer script con los argumentos necesarios
            try:
                subprocess.run(
                    [
                        "python",
                        "dxdtotxt.py",  # Asegúrate de que este script esté en el mismo directorio o ajusta la ruta
                        event.src_path,  # Ruta del archivo .dxd detectado
                        self.columnas,   # Índices de las columnas deseadas
                        output_file      # Ruta completa del archivo .txt a generar
                    ],
                    check=True
                )
                print(f"Archivo procesado exitosamente: {output_file}")
            except subprocess.CalledProcessError as e:
                print(f"Error al procesar el archivo: {e}")


if __name__ == "__main__":
    # Configurar carpeta a monitorear, columnas a exportar y carpeta de salida
    carpeta = "."  # Carpeta a monitorear (. significa la carpeta en la que encuentra el archivo)
    columnas = "0,1,2,3,4,5,6,7"  # Columnas a tener en cuenta, separadas por  comas
    output_folder = "D:/PUCP/chamba/testFolder/testDataOutput"  # Carpeta donde se guardarán los archivos .txt

    # Crear la carpeta de salida si no existe
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Configurar el observador
    event_handler = FileArrivalHandler(columnas, output_folder)
    observer = Observer()
    observer.schedule(event_handler, path=carpeta, recursive=False)

    try:
        print(f"Monitoreando la carpeta: {carpeta}")
        observer.start()
        while True:
            time.sleep(1)  # Mantiene el script ejecutándose
    except KeyboardInterrupt:
        print("Deteniendo el monitoreo...")
        observer.stop()

    observer.join()
