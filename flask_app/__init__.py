from flask import Flask, g
from flask_socketio import SocketIO
from flask_cors import CORS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .config import config
from .models import db
import logging
from .db_utils import get_db_stats, db_connection_logger

socketio = SocketIO(cors_allowed_origins="*", logger=True, engineio_logger=True)

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Create engines for session and transaction pools
    session_engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], **app.config['SESSION_POOL_OPTIONS'])
    transaction_engine = create_engine(app.config['SQLALCHEMY_BINDS']['transaction'], **app.config['TRANSACTION_POOL_OPTIONS'])

    # Create session factories
    app.SessionFactory = scoped_session(sessionmaker(bind=session_engine))
    app.TransactionFactory = scoped_session(sessionmaker(bind=transaction_engine))

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        app.SessionFactory.remove()
        app.TransactionFactory.remove()

    # Import blueprints after initializing extensions
    from .api.arduino import arduino
    from .api.dashboard import dashboard

    # Register blueprints
    app.register_blueprint(arduino, url_prefix='/api')
    app.register_blueprint(dashboard, url_prefix='/dashboard')

    # Add a route to check database stats
    @app.route('/db_stats')
    def db_stats():
        return get_db_stats()
    
    return app