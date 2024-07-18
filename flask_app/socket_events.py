from flask_socketio import emit, join_room, leave_room, request
from . import socketio

# In-memory storage for connected clients
connected_clients = {}

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f'Client connected: {sid}')
    connected_clients[sid] = {'rooms': []}
    print("Connected")
    emit('status', {'msg': f'Client connected: {sid}'}, room=sid)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f'Client disconnected: {sid}')
    if sid in connected_clients:
        del connected_clients[sid]
    print("DISconnected")
    emit('status', {'msg': f'Client disconnected: {sid}'})

@socketio.on('join')
def handle_join(data):
    sid = request.sid
    room = data['room']
    join_room(room)
    if sid in connected_clients:
        connected_clients[sid]['rooms'].append(room)
    emit('status', {'msg': f'Joined room: {room}'}, room=room)

@socketio.on('leave')
def handle_leave(data):
    sid = request.sid
    room = data['room']
    leave_room(room)
    if sid in connected_clients and room in connected_clients[sid]['rooms']:
        connected_clients[sid]['rooms'].remove(room)
    emit('status', {'msg': f'Left room: {room}'}, room=room)

@socketio.on('message')
def handle_message(data):
    emit('response', {'msg': data['msg']}, broadcast=True)

@socketio.on('my_event')
def handle_my_event(data):
    print(f"Received my_event with data: {data['data']}")
    # Process the event as needed

# Example of sending an update_controladores event
def send_update_controladores(controlador_data):
    socketio.emit('update_controladores', controlador_data)
