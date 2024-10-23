from flask import Blueprint, request, jsonify, current_app
from ..models import Controlador, Signal, Aviso, AvisoLog
from ..extensions import db, socketio
from ..utils.sensor_utils import add_sensor_data
from ..services.alert_service import AlertService
from flask_mail import Mail, Message
import logging
import traceback
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

arduino = Blueprint('arduino', __name__)
logger = logging.getLogger(__name__)

@arduino.route('/data', methods=['POST'])
def receive_data():
    session = current_app.db_factory()
    logger.info("\n=== Starting new data processing ===")
    
    try:
        data = request.json
        if not data:
            raise ValueError("No JSON data received")

        controlador_id = data.get('controlador_id')
        sensor_states = data.get('sensor_states')

        logger.info(f"Received data for controller {controlador_id}")
        logger.info(f"Sensor states: {sensor_states}")

        controlador = session.query(Controlador).options(joinedload('*')).get(controlador_id)
        if not controlador:
            logger.error(f"Controller not found: {controlador_id}")
            raise ValueError(f"Controller not registered: {controlador_id}")

        # Add new sensor data
        sensor_data = add_sensor_data(controlador, sensor_states)
        session.add(sensor_data)
        session.commit()
        logger.info(f"Added new sensor data with ID: {sensor_data.id}")

        # Get previous signal for comparison
        previous_signal = session.query(Signal).\
            filter_by(controlador_id=controlador_id).\
            order_by(Signal.tstamp.desc()).\
            offset(1).\
            first()

        if previous_signal:
            logger.info("Found previous signal for comparison")
            logger.info(f"Previous signal data: {previous_signal.to_dict()}")
        else:
            logger.info("No previous signal found")

        # Process alerts using AlertService
        alert_service = AlertService(session)
        logger.info("Starting alert processing")
        new_alerts, resolved_alerts = alert_service.check_alerts(
            controlador_id, 
            sensor_data, 
            previous_signal
        )
        
        logger.info(f"Alert processing complete. New alerts: {len(new_alerts)}, Resolved: {len(resolved_alerts)}")

        # Prepare socket.io update data
        update_data = {
            'controlador_id': controlador_id,
            'new_signal': sensor_data.to_dict(),
            'controlador_name': controlador.name,
            'empresa_id': controlador.empresa_id
        }

        if new_alerts or resolved_alerts:
            update_data['alerts'] = {
                'new': [{'alert': alert.aviso.to_dict(), 'log': alert.to_dict()} for alert in new_alerts],
                'resolved': [{'alert': alert.aviso.to_dict(), 'log': alert.to_dict()} for alert in resolved_alerts]
            }

        # Emit socket events
        try:
            logger.info("Emitting socket events")
            socketio.emit('update_controladores', update_data)
            
            for alert in new_alerts:
                socketio.emit('alert_triggered', {
                    'controlador_id': controlador_id,
                    'alert': alert.aviso.to_dict(),
                    'log': alert.to_dict(),
                    'signal': sensor_data.to_dict()
                })
            
            for alert in resolved_alerts:
                socketio.emit('alert_resolved', {
                    'controlador_id': controlador_id,
                    'alert': alert.aviso.to_dict(),
                    'log': alert.to_dict(),
                    'signal': sensor_data.to_dict()
                })

            logger.info("Socket events emitted successfully")
            
        except Exception as socket_error:
            logger.error(f"Socket event emission error: {str(socket_error)}")
            logger.error(traceback.format_exc())

        return jsonify({
            'status': 'success',
            'message': 'Data processed successfully',
            'alerts': {
                'new': len(new_alerts),
                'resolved': len(resolved_alerts)
            }
        }), 200

    except Exception as e:
        logger.error("Error in data processing:")
        logger.error(str(e))
        logger.error(traceback.format_exc())
        session.rollback()
        return jsonify({'error': str(e)}), 500
        
    finally:
        session.close()
        logger.info("=== Data processing complete ===\n")


        
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