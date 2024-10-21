# In logging_config.py

import logging
from logging.handlers import RotatingFileHandler
import os
from concurrent_log_handler import ConcurrentRotatingFileHandler

def setup_logging(app):
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    file_handler = ConcurrentRotatingFileHandler(
        'logs/app.log', 
        maxBytes=10 * 1024 * 1024,  # 10MB
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

    # Optionally, add a StreamHandler for console output
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    app.logger.addHandler(console_handler)

    # Suppress werkzeug logging
    logging.getLogger('werkzeug').setLevel(logging.ERROR)