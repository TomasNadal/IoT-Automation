from flask import session, request

from flask_socketio import emit, join_room, leave_room, close_room, rooms, disconnect
import logging
from flask_socketio import SocketIO
from threading import Lock
from .extensions import socketio

logger = logging.getLogger(__name__)


@socketio.on_error_default
def default_error_handler(e):
    logger.error(f"Socket.IO error: {str(e)}")

logger = logging.getLogger(__name__)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    try:
        sid = request.sid
        origin = request.headers.get('Origin', 'Unknown')
        logger.info(f"Client connecting - SID: {sid}, Origin: {origin}")
        
        # Log connection details
        environ = request.environ
        transport = environ.get('wsgi.url_scheme', 'unknown')
        
        # Send connection confirmation
        emit('connection_response', {
            'data': 'Connected successfully!',
            'sid': sid
        })
        
        logger.info(f"Client connected successfully - SID: {sid}")
    except Exception as e:
        logger.error(f"Error in handle_connect: {str(e)}", exc_info=True)

@socketio.on('message')
def handle_message(message):
    try:
        logger.info(f"Received message from {request.sid}")
        emit('response', {'data': 'Message received!'})
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}", exc_info=True)

@socketio.on('disconnect')
def handle_disconnect():
    try:
        logger.info(f"Client disconnected: {request.sid}")
    except Exception as e:
        logger.error(f"Error in disconnect handler: {str(e)}", exc_info=True)

@socketio.on('my_broadcast_event')
def handle_my_broadcast_event(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': message['data'], 'count': session['receive_count']})

@socketio.on('join')
def handle_join(message):
    join_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'In rooms: ' + ', '.join(rooms()), 'count': session['receive_count']})

@socketio.on('leave')
def handle_leave(message):
    leave_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'In rooms: ' + ', '.join(rooms()), 'count': session['receive_count']})

@socketio.on('close_room')
def handle_close_room(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'Room ' + message['room'] + ' is closing.', 'count': session['receive_count']}, room=message['room'])
    close_room(message['room'])

@socketio.on('my_room_event')
def handle_my_room_event(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': message['data'], 'count': session['receive_count']}, room=message['room'])

@socketio.on('disconnect_request')
def handle_disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()

@socketio.on('my_ping')
def handle_my_ping():
    emit('my_pong')

@socketio.on('update_controladores')
def handle_update_controladores(data):
    print('Emitting update_controladores event with data:', data)
    socketio.emit('update_controladores', data)


@socketio.on('join_controller_alerts')
def handle_join_controller_alerts(data):
    """Allow clients to subscribe to specific controller alerts"""
    controller_id = data.get('controller_id')
    if controller_id:
        room = f"controller_alerts_{controller_id}"
        join_room(room)
        logger.info(f"Client {request.sid} joined alert room for controller {controller_id}")
        emit('room_join_response', {
            'status': 'success',
            'room': room,
            'message': f'Joined alert room for controller {controller_id}'
        })

def emit_alert(alert_type, data):
    """
    Emit alert events to specific rooms
    alert_type: 'alert_triggered', 'alert_created', 'alert_updated', 'alert_deleted'
    """
    try:
        controller_id = data.get('controlador_id')
        if not controller_id:
            logger.error(f"No controller_id in alert data: {data}")
            return

        room = f"controller_alerts_{controller_id}"
        socketio.emit(alert_type, data, room=room)
        logger.info(f"Emitted {alert_type} event to room {room}")
    except Exception as e:
        logger.error(f"Error emitting {alert_type} event: {str(e)}")