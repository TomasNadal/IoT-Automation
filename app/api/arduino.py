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
from functools import wraps

arduino = Blueprint('arduino', __name__)
logger = logging.getLogger(__name__)

def allow_http(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function

@arduino.route('/test', methods=['GET', 'POST'])
@allow_http
def test():
    method = request.method
    logger.info(f"Test endpoint called with method: {method}")
    return jsonify({
        'status': 'success',
        'message': f'{method} ok 200'
    }), 200

@arduino.route('/data', methods=['POST'])
@allow_http
def receive_data():
    session = current_app.db_factory()
    logger.info("\n=== Starting new data processing ===")
    
    try:
        if not request.is_json:
            logger.error(f"Incorrect Content-Type: {request.content_type}")
            return jsonify({
                'error': 'Content-Type must be application/json'
            }), 415
        
        data = request.get_json(silent=True)
        if data is None:
            logger.error("Failed to parse JSON data")
            return jsonify({
                'error': 'Invalid JSON format'
            }), 400
        #{"id":"+34603743593","location":"Warehouse1","sensors":[1,1,1,1,1,1]}


        logger.info(f"Received raw data: {data}")
        
        # Split the data string
        #parts = data.strip().split(',')
        #if len(parts) != 8:  # controlador_id, location, 6 sensor values
        #    raise ValueError(f"Expected 8 values, got {len(parts)}")

        controlador_id = data['id']
        sensor_states_data = data['sensors']
        logger.info(f"Processing data for controller: {controlador_id}")

        # Convert string sensor states to dictionary
        print(sensor_states_data)
        sensor_states = {
            'value_sensor1': sensor_states_data[0] == 1,
            'value_sensor2': sensor_states_data[1] == 1,
            'value_sensor3': sensor_states_data[2] == 1,
            'value_sensor4': sensor_states_data[3] == 1,
            'value_sensor5': sensor_states_data[4] == 1,
            'value_sensor6': sensor_states_data[5] == 1
        }
        logger.info(f"Sensor states: {sensor_states}")

        # Get controller with all relationships loaded
        controlador = session.query(Controlador).options(joinedload('*')).get(controlador_id)
        logger.info(f'{controlador}')
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

        # Process alerts
        alert_service = AlertService(session)
        logger.info("Starting alert processing")
        new_alerts, resolved_alerts = alert_service.check_alerts(
            controlador_id, 
            sensor_data, 
            previous_signal
        )
        logger.info(f"Alert processing complete. New alerts: {len(new_alerts)}, Resolved: {len(resolved_alerts)}")

        # Process email notifications
        notification_email = current_app.config.get('NOTIFICATION_EMAIL')
        if notification_email and (new_alerts or resolved_alerts):
            logger.info("Processing email notifications")
            mail = Mail(current_app)
            
            for alert in new_alerts + resolved_alerts:
                try:
                    sensor_name = alert.sensor_name
                    # Check if email is enabled for this sensor
                    sensor_config = None
                    for config in controlador.config.values():
                        if config.get('name') == sensor_name:
                            sensor_config = config
                            break
                    
                    if sensor_config and sensor_config.get('email'):
                        is_resolved = alert in resolved_alerts
                        subject = f"{'✅ Alert Resolved' if is_resolved else '⚠️ Alert Triggered'}: {controlador.name} - {sensor_name}"
                        
                        body = f"""
Alert Notification

Controller: {controlador.name}
Sensor: {sensor_name}
Status: {'RESOLVED' if is_resolved else 'TRIGGERED'}
Time: {alert.resolved_at if is_resolved else alert.triggered_at}
Previous State: {'ON' if alert.old_value else 'OFF'}
Current State: {'ON' if alert.new_value else 'OFF'}

This is an automated message. Please do not reply.
"""
                        msg = Message(
                            subject=subject,
                            recipients=[notification_email],
                            body=body
                        )
                        mail.send(msg)
                        logger.info(f"Sent email notification for sensor {sensor_name}")
                    else:
                        logger.debug(f"Email notifications not enabled for sensor {sensor_name}")
                        
                except Exception as email_error:
                    logger.error(f"Error sending email for sensor {sensor_name}: {str(email_error)}")
                    continue

        # Prepare and emit socket.io updates
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