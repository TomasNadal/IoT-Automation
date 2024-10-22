from flask import Blueprint, request, jsonify, current_app
from ..models import Controlador, Signal, Aviso, AvisoLog
from ..extensions import db, socketio
from ..utils.sensor_utils import add_sensor_data, update_sensor_metrics
from flask_mail import Mail, Message
import logging
import traceback
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

arduino = Blueprint('arduino', __name__)
logger = logging.getLogger(__name__)

def send_sensor_alert_email(sensor_name, controlador_name, value, tipo):
    """Helper function to send email alerts"""
    try:
        notification_email = current_app.config.get('NOTIFICATION_EMAIL')
        if not notification_email:
            logger.warning("No notification email configured")
            return False

        # Initialize Flask-Mail
        mail = Mail(current_app)

        # Determine sensor state based on tipo
        if tipo == "NA":
            state = "Inactive" if value else "Active"
        else:  # NC
            state = "Active" if value else "Inactive"

        subject = f"Alert: {controlador_name} - {sensor_name} Status Change"
        body = f"""
        Alert Notification

        Controller: {controlador_name}
        Sensor: {sensor_name}
        Current State: {state}
        Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

        This is an automated message. Please do not reply.
        """

        msg = Message(
            subject=subject,
            recipients=[notification_email],
            body=body
        )

        mail.send(msg)
        logger.info(f"Alert email sent successfully to {notification_email} for {controlador_name}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email alert: {str(e)}")
        return False


def process_alerts(session, controlador, sensor_data, previous_signal):
    """Process alerts for new sensor data"""
    try:
        triggered_alerts = []
        # Get active alerts for this controller
        alerts = session.query(Aviso).\
            filter_by(controlador_id=controlador.id, is_active=True).\
            all()

        for alert in alerts:
            sensor_name = alert.config.get('sensor_name')
            if not sensor_name:
                continue

            # Find sensor key in controller config
            sensor_key = None
            for key, config in controlador.config.items():
                if config.get('name') == sensor_name:
                    sensor_key = key
                    break

            if not sensor_key:
                continue

            # Get old and new values
            old_value = getattr(previous_signal, sensor_key, None) if previous_signal else None
            new_value = getattr(sensor_data, sensor_key, None)

            # Check conditions
            for condition in alert.config.get('conditions', []):
                if (old_value == condition.get('from_state') and 
                    new_value == condition.get('to_state')):
                    
                    # Create alert log
                    alert_log = AvisoLog(
                        aviso_id=alert.id,
                        sensor_name=sensor_name,
                        old_value=old_value,
                        new_value=new_value,
                        signal_id=sensor_data.id
                    )
                    session.add(alert_log)
                    triggered_alerts.append((alert, alert_log))

        return triggered_alerts
    except Exception as e:
        logger.error(f"Error processing alerts: {str(e)}")
        return []

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

        # Get previous signal for alert processing
        previous_signal = session.query(Signal).\
            filter_by(controlador_id=controlador.id).\
            order_by(Signal.tstamp.desc()).\
            offset(1).\
            first()

        # Process alerts
        triggered_alerts = process_alerts(session, controlador, sensor_data, previous_signal)
        if triggered_alerts:
            session.commit()

        # Process email notifications
        for sensor_key, config in controlador.config.items():
            if config.get('email', False):  # Check if email notifications are enabled
                current_value = getattr(sensor_data, sensor_key, None)
                if current_value is not None:  # Only process if we have a value
                    previous_value = getattr(previous_signal, sensor_key, None) if previous_signal else None
                    
                    # Send email if value has changed or it's the first reading
                    if previous_value is None or current_value != previous_value:
                        send_sensor_alert_email(
                            config['name'],
                            controlador.name,
                            current_value,
                            config['tipo']
                        )

        session.refresh(controlador)

        # Prepare data for Socket.IO events
        update_data = {
            'controlador_id': controlador.id,
            'new_signal': sensor_data.to_dict(),
            'controlador_name': controlador.name,
            'empresa_id': controlador.empresa_id
        }

        # Add triggered alerts to the update data if any
        if triggered_alerts:
            update_data['alerts'] = [{
                'alert': alert.to_dict(),
                'log': log.to_dict()
            } for alert, log in triggered_alerts]

        # Emit Socket.IO events
        try:
            logger.info(f"Emitting update_controladores event with data for controlador {controlador_id}")
            socketio.emit('update_controladores', update_data)
            
            # Emit separate alert events if any
            if triggered_alerts:
                for alert, log in triggered_alerts:
                    alert_data = {
                        'controlador_id': controlador.id,
                        'alert': alert.to_dict(),
                        'log': log.to_dict(),
                        'signal': sensor_data.to_dict()
                    }
                    logger.info(f"Emitting alert_triggered event with data: {alert_data}")
                    socketio.emit('alert_triggered', alert_data)
                    logger.info(f"Alert event emitted successfully")
            
            connected_clients = len(socketio.server.eio.sockets)
            logger.info(f"Event emitted. Current connected clients: {connected_clients}")

        except Exception as socket_error:
            logger.error(f"Error emitting Socket.IO event: {str(socket_error)}")

        return jsonify({
            'message': 'Datos recibidos correctamente',
            'socket_clients': connected_clients,
            'alerts_triggered': len(triggered_alerts)
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