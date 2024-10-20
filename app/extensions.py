from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

db = SQLAlchemy()
socketio = SocketIO(path = "/socket.io",cors_allowed_origins="*", async_mode='eventlet')

def init_socketio(app):
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')