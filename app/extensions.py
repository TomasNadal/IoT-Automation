from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO


db = SQLAlchemy()
socketio = SocketIO(
    cors_allowed_origins="*",  # Lo configuraremos después en create_app
    async_mode='eventlet',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    always_connect=True,
    path='/socket.io'  # Explicitar el path
)

