import time
import random
from datetime import datetime
import requests


BASE_URL = 'http://localhost:5000/api/data'
HEADERS = {'Content-Type': 'text/plain'}
NUM_ARDUINOS = 10  # Number of Arduinos to simulate
INTERVAL = 3  # Interval between messages for each Arduino in seconds


def send_data(num_arduinos, interval):
    while True:
        for i in range(1, num_arduinos + 1):
            controlador_id = i
            location = f'Location_{controlador_id}'
            timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
            sensor_states = [random.choice([0, 1]) for _ in range(6)]
            
            # Structure the data as a comma-separated string
            data = f"{controlador_id},{location},{timestamp}," + ",".join(str(state) for state in sensor_states)
            print(data)
            
            # Send the data via POST request
            response = requests.post(BASE_URL, data=data, headers=HEADERS)
            print(response.status_code)  # HTTP status code
            print(f'post_request.text: {response.text}  {data}')    
            
            # Wait for the specified interval before sending the next Arduino's data
            time.sleep(interval)

if __name__ == '__main__':
    send_data(NUM_ARDUINOS, INTERVAL)
