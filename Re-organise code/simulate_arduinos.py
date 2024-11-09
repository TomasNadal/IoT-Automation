import time
import random
from datetime import datetime
import requests
import json

BASE_URL = 'https://calm-awfully-shrew.ngrok-free.app/api/data'
HEADERS = {'Content-Type': 'application/json'}  # Changed to JSON
NUM_CONTROLADORES = 2  # Number of Controladores to simulate
INTERVAL = 3  # Interval between messages for each Controlador in seconds

# List of Controlador IDs (you can add more if needed)
CONTROLADOR_IDS = ["+34087079290", "+34618812925"]

def send_data(num_controladores, interval):
    while True:
        for i in range(num_controladores):
            controlador_id = CONTROLADOR_IDS[i % len(CONTROLADOR_IDS)]
            location = f'Location{i+1}'
            timestamp = datetime.now().isoformat()
            sensor_states = [random.choice([True, False]) for _ in range(6)]
            
            # Structure the data as a JSON object
            data = {
                "controlador_id": controlador_id,
                "location": location,
                "timestamp": timestamp,
                "sensor_states": {
                    f"value_sensor{j+1}": state for j, state in enumerate(sensor_states)
                }
            }
            
            print(f"Sending data: {json.dumps(data, indent=2)}")
            
            # Send the data via POST request
            response = requests.post(BASE_URL, json=data, headers=HEADERS)
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Wait for the specified interval before sending the next Controlador's data
            time.sleep(interval)

if __name__ == '__main__':
    send_data(NUM_CONTROLADORES, INTERVAL) 