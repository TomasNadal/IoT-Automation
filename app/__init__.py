from flask import Flask, g, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from app.config import config
import logging
from app.db_utils import get_db_stats, db_connection_logger
from app.extensions import db, socketio
from app.socket_events import socketio

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Create a single engine based on the config
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], **app.config['POOL_OPTIONS'])
    app.db_factory = scoped_session(sessionmaker(bind=engine))

    # Filtrar y limpiar CORS_ORIGINS
    db.init_app(app)

    
    # Define allowed origins
    allowed_origins = [
        'http://localhost:5173',
        'https://iot-automation.pages.dev',
    ]
    if app.config.get('FRONTEND_URL'):
        allowed_origins.append(app.config['FRONTEND_URL'])
    
    # Remove any empty strings and duplicates
    allowed_origins = list(set(filter(None, allowed_origins)))

    # Configure CORS for the entire application
    CORS(app, 
        resources={
            r"/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "Accept"],
                "supports_credentials": True,
                "expose_headers": ["Content-Type", "X-CSRFToken"],
                "max_age": 600
            }
        },
        supports_credentials=True
    )


    # Initialize Socket.IO
    if not socketio.server:
        # Update Socket.IO CORS settings
        socketio.cors_allowed_origins = allowed_origins
        
        socketio.init_app(
            app,
            cors_allowed_origins=allowed_origins,
            async_mode='eventlet',
            ping_timeout=60,
            ping_interval=25,
            path='/socket.io',
            always_connect=True,
            logger=True,
            engineio_logger=True
        )

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        app.db_factory.remove()

    # Import blueprints after initializing extensions
    from .api.arduino import arduino
    from .api.dashboard import dashboard
    from .api.webhook_blueprint import webhook_bp
    from .api.alerts import alerts_bp

    # Register blueprints
    app.register_blueprint(arduino, url_prefix='/api')
    app.register_blueprint(dashboard, url_prefix='/front')
    app.register_blueprint(webhook_bp, url_prefix='/webhook')
    app.register_blueprint(alerts_bp, url_prefix='/alerts')

    # Import socket events to register them
    from . import socket_events  # This imports and registers the event handler

    # Add a route to check database stats
    @app.route('/db_stats')
    def db_stats():
        return get_db_stats()
    

    return app