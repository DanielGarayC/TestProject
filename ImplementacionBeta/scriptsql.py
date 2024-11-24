import os
import re
import pymysql
from datetime import datetime

# Database connection
connection = pymysql.connect(
    host='localhost',
    user='root',
    password='123456',
    database='monitoreodb',
    port=3306
)

def insert_data(file_path):
    # Extract datetime from the filename using regex
    filename = os.path.basename(file_path)
    date_match = re.search(r'(\d{2})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})', filename)
    if not date_match:
        print("Invalid filename format")
        return
    
    # Format the datetime string
    date_time_str = f"20{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)} {date_match.group(4)}:{date_match.group(5)}:{date_match.group(6)}"
    date_time_obj = datetime.strptime(date_time_str, '%Y-%m-%d %H:%M:%S')

    # Insert into Medicion table
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO Medicion (Fecha_hora, idTipoMedicion) VALUES (%s, 1)", (date_time_obj,))
        medicion_id = cursor.lastrowid
        print("Inserted Medicion with id:", medicion_id)  # Verifica el id generado

    # Commit the transaction for Medicion
    connection.commit()  # Asegura que la inserción en Medicion se confirme

    # Disable foreign key checks before inserting into Data_sensor
    with connection.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
    
    # Read data from the file and insert into Data_sensor
    with open(file_path, 'r') as file:
        index = 1
        first_query_printed = False
        for line in file:
            values = line.strip().split()
            for sensor_id, value in enumerate(values):
                query = (
                    "INSERT INTO Data_sensor (valor, `index`, idMedicion, idSensor) VALUES (%s, %s, %s, %s)"
                )
                params = (float(value), index, medicion_id, sensor_id+1)

                # Use a new cursor for each insert operation
                with connection.cursor() as cursor:
                    # Print the first query
                    if not first_query_printed:
                        print("First query:", cursor.mogrify(query, params))
                        first_query_printed = True

                    # Execute the query
                    cursor.execute(query, params)
                
            index += 1

    # Commit the transaction for Data_sensor
    connection.commit()  # Asegura que todas las inserciones en Data_sensor se confirmen

    # Re-enable foreign key checks after inserting into Data_sensor
    with connection.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
    
    print("Data inserted successfully")

# Example usage
file_path = "C:/Users/bruno/Downloads/ArchivosData/Data_Ensayo__05-11-24_11-12-16.txt"
insert_data(file_path)

# Close the database connection
connection.close()
