# logging_config.py

import logging
from logging.handlers import RotatingFileHandler
import os
from logging.handlers import TimedRotatingFileHandler

def setup_logging(app):
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Use TimedRotatingFileHandler instead of RotatingFileHandler
    file_handler = TimedRotatingFileHandler(
        'logs/app.log', 
        when="midnight", 
        interval=1,
        backupCount=10
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