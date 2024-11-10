import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, request
from app import create_app, socketio
import logging
import sys
from logging.handlers import RotatingFileHandler
from datetime import datetime

class CustomFormatter(logging.Formatter):
    """Custom formatter adding colors and better categorization"""
    
    def format(self, record):
        # Add timestamp with milliseconds
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        # Add log level padded to 8 characters for alignment
        level = f"{record.levelname:8}"
        
        # Add the logger name (category) if it exists
        category = record.name or 'root'
        
        return f"{timestamp} {level} [{category}] {record.getMessage()}"

def setup_logging():
    # Create handlers for different log levels
    info_handler = logging.StreamHandler(sys.stdout)
    error_handler = logging.StreamHandler(sys.stderr)
    
    # Create and set formatter
    formatter = CustomFormatter()
    info_handler.setFormatter(formatter)
    error_handler.setFormatter(formatter)
    
    # Set levels and filters
    info_handler.setLevel(logging.INFO)
    info_handler.addFilter(lambda record: record.levelno <= logging.INFO)
    error_handler.setLevel(logging.WARNING)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove any existing handlers
    root_logger.handlers = []
    
    # Add our handlers
    root_logger.addHandler(info_handler)
    root_logger.addHandler(error_handler)
    
    # Configure specific loggers
    loggers = {
        'werkzeug': logging.INFO,
        'socketio': logging.INFO,
        'engineio': logging.WARNING,
        'app': logging.INFO
    }
    
    for logger_name, level in loggers.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
        logger.propagate = True

    return logging.getLogger(__name__)

# Set up logging
logger = setup_logging()

def create_and_configure_app(config_name):
    """Create and configure the Flask application"""
    logger.info(f"Creating app with config: {config_name}")
    try:
        app = create_app(config_name)
        if app is None:
            logger.error(f"Error: Application could not be created with config: {config_name}")
            return None

        @app.after_request
        def after_request(response):
            # Log request details
            logger.info(
                f"Request completed: {request.method} {request.path} - "
                f"Status: {response.status_code}"
            )
            
            # Add CORS headers
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response

        @app.errorhandler(Exception)
        def handle_exception(e):
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
            return "Internal Server Error", 500

        logger.info("Application created successfully")
        return app
    except Exception as e:
        logger.error(f"Error creating app: {str(e)}", exc_info=True)
        return None

# Determine environment
env_prefix = 'production' if os.getenv('FLASK_ENV') == 'production' else 'development'
logger.info(f"Environment prefix: {env_prefix}")

# Create session app
session_app = create_and_configure_app(f'{env_prefix}_session')

if session_app is None:
    logger.error("Failed to create session app")
    sys.exit(1)

# Add routes
@session_app.route('/test')
def test_route():
    logger.info("Test route accessed")
    return "Session app is running!"

@session_app.route('/')
def home():
    logger.info("Home route accessed")
    return "IoT Backend is running!"

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    if os.getenv('FLASK_ENV') == 'production':
        host = '0.0.0.0'
        debug = False
    else:
        host = '127.0.0.1'
        debug = True

    logger.info(f"Starting server on {host}:{port} (debug={debug})")
    
    try:
        socketio.run(
            session_app,
            host=host,
            port=port,
            debug=debug,
            use_reloader=False,
            log_output=True
        )
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)