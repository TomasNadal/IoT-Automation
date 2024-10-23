import logging
import logging.config
import os
from datetime import datetime

def setup_logging(app):
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Remove any existing handlers to prevent duplicates
    app.logger.handlers = []
    
    file_handler = ConcurrentRotatingFileHandler(
        'logs/app.log', 
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        use_gzip=True
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    # Set the app logger level
    app.logger.setLevel(logging.INFO)

    # Add console handler only if it doesn't exist
    has_console_handler = any(isinstance(h, logging.StreamHandler) 
                            for h in app.logger.handlers)
    if not has_console_handler:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        app.logger.addHandler(console_handler)

    # Configure werkzeug logging
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.handlers = []
    werkzeug_logger.setLevel(logging.ERROR)
    
    # Configure SQLAlchemy logging
    sql_logger = logging.getLogger('sqlalchemy.engine')
    sql_logger.setLevel(logging.WARNING)