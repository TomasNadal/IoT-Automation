from flask import session, request
from flask_socketio import emit, join_room, leave_room, close_room, rooms, disconnect
import logging
from .extensions import socketio
from threading import Lock


@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")
    logging.info(f"Transport: {request.namespace.transport.name}")
    logging.info(f"Total clients: {len(socketio.server.eio.sockets)}")

@socketio.on('disconnect')
def handle_disconnect():
    logging.info(f"Client disconnected: {request.sid}")
 

@socketio.on('my_event')
def handle_my_event(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': message['data'], 'count': session['receive_count']})

@socketio.on('my_broadcast_event')
def handle_my_broadcast_event(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': message['data'], 'count': session['receive_count']}, broadcast=True)

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
    socketio.emit('update_controladores', data, broadcast=True)
