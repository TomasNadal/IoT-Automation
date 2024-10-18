from flask import Blueprint, request, jsonify, current_app, g
from flask_socketio import emit
from datetime import datetime, timedelta
import pytz
import os
from ..models import Controlador, Signal, SensorMetrics, db
from ..db_utils import db_connection_logger
import json
import logging

arduino = Blueprint('arduino', __name__)

# Function to load configuration from JSON file
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config_controlador.json')
    with open(config_path, 'r') as config_file:
        config_data = json.load(config_file)
    return config_data

# Load the configuration once at the start
CONFIG_DATA = load_config()

@arduino.route('/data', methods=['POST'])
def receive_data():
    try:
        raw_data = request.data.decode('utf-8')
        unique_id, location, tiempo, sensor_states = parse_sensor_states(raw_data)

        logging.info(f"Datos recibidos: {unique_id}, {location}, {tiempo}, {sensor_states}")

        with db_connection_logger(is_transaction=True) as session:
            controlador = get_or_create_controlador(session, unique_id)

            last_signal = session.query(Signal).filter_by(id=controlador.id).order_by(Signal.tstamp.desc()).first()
            if controlador.config is None:
                controlador.config = CONFIG_DATA

            config = controlador.config
            key_to_tipo = {key: value['tipo'] for key, value in config.items()}

            sensor_data = add_sensor_data(controlador, sensor_states)
            update_sensor_metrics(session, controlador, sensor_data, last_signal, key_to_tipo)

            session.add(sensor_data)
            session.commit()

        logging.info("Emitting update to WebSocket clients")
        # Get the SocketIO instance
        socketio = current_app.extensions['socketio']
        
        # Emit the new data to all connected WebSocket clients
        socketio.emit('update_controladores', {
            'controlador_id': controlador.id,
            'new_signal': sensor_data.to_dict()
        }, namespace='/') # Add namespace if you're using one

        return jsonify({'message': 'Datos recibidos correctamente'}), 200

    except Exception as e:
        logging.error(f"Error processing data: {e}")
        return jsonify({'message': 'Error processing data', 'error': str(e)}), 500

def parse_sensor_states(raw_data):
    parts = raw_data.split(',')
    if len(parts) != 9:
        raise ValueError("Formato de datos invalido")

    unique_id, location, tiempo, *sensor_states = parts
    sensor_states = [state == '1' for state in sensor_states]
    return unique_id, location, tiempo, sensor_states

def get_or_create_controlador(session, unique_id):
    controlador = session.query(Controlador).filter_by(id=unique_id).first()
    if not controlador:
        raise ValueError("Controlador no registrado")
    return controlador

def add_sensor_data(controlador, sensor_states):
    sensor_data = Signal(
        tstamp=datetime.now(),
        id=controlador.id,
        value_sensor1=sensor_states[0],
        value_sensor2=sensor_states[1],
        value_sensor3=sensor_states[2],
        value_sensor4=sensor_states[3],
        value_sensor5=sensor_states[4],
        value_sensor6=sensor_states[5]
    )
    return sensor_data

def update_sensor_metrics(session, controlador, sensor_data, last_signal, key_to_tipo):
    sensor_metrics = session.query(SensorMetrics).filter_by(controlador_id=controlador.id).first()
    if not sensor_metrics:
        sensor_metrics = SensorMetrics(controlador_id=controlador.id)
        session.add(sensor_metrics)

    for key, tipo in key_to_tipo.items():
        value = getattr(sensor_data, key)
        sensor_connected = is_sensor_connected(tipo, value)
        if sensor_connected and last_signal:
            current_time = sensor_data.tstamp.replace(tzinfo=last_signal.tstamp.tzinfo)
            if (current_time - last_signal.tstamp) < timedelta(minutes=5):
                time_difference_minutes = (current_time - last_signal.tstamp).total_seconds() / 60
                sensor_time = getattr(sensor_metrics, f'time_{key}') + time_difference_minutes
                setattr(sensor_metrics, f'time_{key}', sensor_time)
    return sensor_metrics

def is_sensor_connected(tipo, sensor_reading):
    if tipo == "NA":
        return not sensor_reading
    if tipo == "NC":
        return sensor_reading
    return False

def is_controlador_connected(controlador):
    with db_connection_logger(is_transaction=True) as session:
        last_sample = session.query(Signal).filter_by(id=controlador.id).order_by(Signal.tstamp.desc()).first()
        if last_sample:
            return last_sample.tstamp > datetime.now(pytz.timezone('Europe/Paris')) - timedelta(minutes=5)
    return False