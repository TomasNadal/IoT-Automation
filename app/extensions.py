from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO


db = SQLAlchemy()
socketio = SocketIO(
    cors_allowed_origins=[
        'http://localhost:5173',
        'https://iot-automation.pages.dev',
    ],
    async_mode='eventlet',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    always_connect=True,
    path='/socket.io'
)

