from flask import Flask, g
from flask_socketio import SocketIO
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .config import config
import logging
from .db_utils import get_db_stats, db_connection_logger
from .extensions import db, socketio

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Create a single engine based on the config
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], **app.config['POOL_OPTIONS'])
    app.db_factory = scoped_session(sessionmaker(bind=engine))

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        app.db_factory.remove()

    # Import blueprints after initializing extensions
    from .api.arduino import arduino
    from .api.dashboard import dashboard

    # Register blueprints
    app.register_blueprint(arduino, url_prefix='/api')
    app.register_blueprint(dashboard, url_prefix='/front')

    # Add a route to check database stats
    @app.route('/db_stats')
    def db_stats():
        return get_db_stats()
    
    return app

# main.py (Adjusted for the single engine setup)

import os
from flask import Flask, request
from app import create_app, socketio
from app.extensions import db
from app.logging_config import setup_logging
from app.maintenance_scripts.db_maintenance import kill_idle_connections
from apscheduler.schedulers.background import BackgroundScheduler
import sys

def create_and_configure_app(config_name):
    app = create_app(config_name)
    if app is None:
        print(f"Error: Application could not be created with config: {config_name}")
        return None

    setup_logging(app)

    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    return app

# Create session app
session_app = create_and_configure_app('production_session')

# Create transaction app
transaction_app = create_and_configure_app('production_transaction')

if session_app is None or transaction_app is None:
    sys.exit(1)


# Add webhook route to session app
@session_app.route('/webhook/update', methods=['POST'])
def webhook_update():
    data = request.json
    socketio.emit('update_controladores', data, namespace='/')
    return '', 204

if __name__ == '__main__':
    # Run the session app
    socketio.run(session_app, debug=False, port=5000)