from flask import Blueprint, request, jsonify, current_app
from ..models import Controlador, Signal
from ..extensions import db, socketio
from ..utils.sensor_utils import add_sensor_data, update_sensor_metrics
import logging
import requests
import os
import traceback
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

arduino = Blueprint('arduino', __name__)
logger = logging.getLogger(__name__)

@arduino.route('/data', methods=['POST'])
def receive_data():
    session = current_app.db_factory()
    try:
        data = request.json
        if not data:
            raise ValueError("No JSON data received")

        controlador_id = data.get('controlador_id')
        location = data.get('location')
        sensor_states = data.get('sensor_states')

        if not all([controlador_id, location, sensor_states]):
            raise ValueError("Missing required fields in JSON data")

        server_timestamp = datetime.now(timezone.utc)
        logger.info(f"Datos recibidos: {controlador_id}, {location}, Server Timestamp: {server_timestamp}, {sensor_states}")

        controlador = session.query(Controlador).options(joinedload('*')).get(controlador_id)
        if not controlador:
            logger.error(f"Controlador no encontrado: {controlador_id}")
            raise ValueError(f"Controlador no registrado: {controlador_id}")

        logger.info(f"Controlador encontrado: {controlador.id}, {controlador.name}")
        
        logger.info(f"Sensor states before add_sensor_data: {sensor_states}")
        sensor_data = add_sensor_data(controlador, sensor_states)
        logger.info(f"Sensor data after add_sensor_data: {sensor_data.to_dict()}")
        
        session.add(sensor_data)
        session.commit()
        logger.info(f"Datos de sensor añadidos: {sensor_data.id}")

        session.refresh(controlador)

        # Prepare data for Socket.IO event
        update_data = {
            'controlador_id': controlador.id,
            'new_signal': sensor_data.to_dict(),
            'controlador_name': controlador.name,
            'empresa_id': controlador.empresa_id
        }

        # Emit Socket.IO event
        try:
            logger.info(f"Emitting update_controladores event with data for controlador {controlador_id}")
            socketio.emit('update_controladores', update_data)
            
            # Log connected clients for debugging
            connected_clients = len(socketio.server.eio.sockets)
            logger.info(f"Event emitted. Current connected clients: {connected_clients}")
        except Exception as socket_error:
            logger.error(f"Error emitting Socket.IO event: {str(socket_error)}")
            # Continue processing even if socket emission fails
            # The data is already saved in the database

        return jsonify({
            'message': 'Datos recibidos correctamente',
            'socket_clients': connected_clients
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error processing data: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'message': 'Error processing data', 'error': str(e)}), 500
    finally:
        session.close()

@arduino.route('/debug/controladores', methods=['GET'])
def debug_controladores():
    try:
        with current_app.db_factory() as session:
            controladores = session.query(Controlador).all()
            return jsonify({
                'count': len(controladores),
                'ids': [c.id for c in controladores]
            })
    except Exception as e:
        logging.error(f"Error in debug route: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({'message': 'Error in debug route', 'error': str(e)}), 500