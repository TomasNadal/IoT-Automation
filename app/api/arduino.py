from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models import Controlador, Signal
from ..utils.sensor_utils import parse_sensor_states, add_sensor_data, update_sensor_metrics
import logging
import requests
import os

arduino = Blueprint('arduino', __name__)

@arduino.route('/data', methods=['POST'])
def receive_data():
    try:
        raw_data = request.data.decode('utf-8')
        unique_id, location, tiempo, sensor_states = parse_sensor_states(raw_data)

        logging.info(f"Datos recibidos: {unique_id}, {location}, {tiempo}, {sensor_states}")

        with current_app.db_factory() as session:
            controlador = session.query(Controlador).get(unique_id)
            if not controlador:
                raise ValueError("Controlador no registrado")

            sensor_data = add_sensor_data(controlador, sensor_states)
            session.add(sensor_data)
            session.commit()

        # Send update to session app via webhook
        webhook_data = {
            'controlador_id': controlador.id,
            'new_signal': sensor_data.to_dict()
        }
        session_app_url = os.environ.get('SESSION_APP_URL', 'http://localhost:5000')
        requests.post(f"{session_app_url}/webhook/update", json=webhook_data)

        return jsonify({'message': 'Datos recibidos correctamente'}), 200

    except Exception as e:
        logging.error(f"Error processing data: {e}")
        return jsonify({'message': 'Error processing data', 'error': str(e)}), 500

def get_or_create_controlador(session, unique_id):
    controlador = session.query(Controlador).filter_by(id=unique_id).first()
    if not controlador:
        raise ValueError("Controlador no registrado")
    return controlador