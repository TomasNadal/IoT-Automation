import unittest
import sys
import os
from flask import json
from flask_app import create_app
from flask_app.models import Controlador, Empresa, Signal, SensorMetrics, db
import requests
import random
from datetime import datetime


# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Define constants
URL_RECEIVE_DATA = 'http://127.0.0.1:5000/arduino/data'


class ArduinoAPIReceiveDataExistingControlador(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Add a test controlador
        empresa = Empresa(name="Test Company")
        db.session.add(empresa)
        db.session.commit()
        
        controlador = Controlador(id=777, name="Controlador 1", id_empresa=empresa.id)
        db.session.add(controlador)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_receive_data_success(self):
        unique_id = "777"
        location = "Warehouse2"
        timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        sensor_states = [random.choice([0, 1]) for _ in range(6)]
        data = f"{unique_id},{location},{timestamp}," + ",".join(str(state) for state in sensor_states)
        
        headers = {'Content-Type': 'text/plain'} 

        response = self.client.post(URL_RECEIVE_DATA, data=data, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Datos recibidos correctamente', response.get_data(as_text=True))

    def test_receive_data_invalid_format(self):
        data = '777,location,2021-01-01T00:00:00,1,0,1,0,1'
        response = self.client.post(URL_RECEIVE_DATA, data=data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Formato de datos invalido', response.get_data(as_text=True))

    def test_receive_data_controlador_not_registered(self):
        data = '9999,location,2021-01-01T00:00:00,1,0,1,0,1,0'
        response = self.client.post(URL_RECEIVE_DATA, data=data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Controlador no registrado', response.get_data(as_text=True))


class ArduinoAPIReceiveDataNewControlador(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Add a test empresa
        empresa = Empresa(name="Test Company")
        db.session.add(empresa)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_receive_data_new_controlador_success(self):
        unique_id = "888"
        location = "Warehouse2"
        timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        sensor_states = [random.choice([0, 1]) for _ in range(6)]
        data = f"{unique_id},{location},{timestamp}," + ",".join(str(state) for state in sensor_states)
        
        headers = {'Content-Type': 'text/plain'} 

        response = self.client.post(URL_RECEIVE_DATA, data=data, headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Controlador no registrado', response.get_data(as_text=True))


if __name__ == '__main__':
    unittest.main()
