import os
import inspect
import logging
from flask import current_app, g, jsonify
from contextlib import contextmanager
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from .models import DatabaseConnectionLog, db

# Set up logging
logging.basicConfig(filename='database_connections.log', level=logging.INFO,
                    format='%(asctime)s - %(message)s')

@contextmanager
def db_connection_logger(is_transaction=False):
    session = None
    try:
        if is_transaction:
            session = current_app.TransactionFactory()
        else:
            session = current_app.SessionFactory()
        
        # Get information about the calling function
        frame = inspect.currentframe().f_back
        func_name = frame.f_code.co_name
        file_name = os.path.basename(frame.f_code.co_filename)
        line_number = frame.f_lineno

        # Log to database
        log_entry = DatabaseConnectionLog(
            process_id=os.getpid(),
            application_name=current_app.name,
            database_name=current_app.config['SQLALCHEMY_DATABASE_URI'].split('/')[-1],
            user_name=current_app.config['SQLALCHEMY_DATABASE_URI'].split(':')[1].split('@')[0],
            client_addr='localhost',  # This might need to be updated based on your setup
            backend_start=None,  # This information isn't readily available with SQLAlchemy
            query=None,  # We don't have a specific query at this point
            state='active',
            function_name=func_name,
            file_name=file_name,
            line_number=line_number
        )
        session.add(log_entry)
        session.commit()

        # Log to file
        log_message = (f"{'Transaction' if is_transaction else 'Session'} opened - "
                       f"PID: {os.getpid()}, App: {current_app.name}, "
                       f"Function: {func_name}, File: {file_name}, Line: {line_number}")
        logging.info(log_message)

        yield session
    except SQLAlchemyError as e:
        logging.error(f"Database error: {str(e)}")
        if session:
            session.rollback()
        raise
    finally:
        if session:
            session.close()
            logging.info(f"{'Transaction' if is_transaction else 'Session'} closed - PID: {os.getpid()}")

def get_db_stats():
    try:
        with db_connection_logger() as session:
            result = session.execute(text("""
                SELECT count(*) as active_connections,
                       count(*) filter (where state = 'idle') as idle_connections,
                       count(*) filter (where state = 'active') as busy_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            """))
            stats = result.fetchone()
            return jsonify({
                'active_connections': stats.active_connections,
                'idle_connections': stats.idle_connections,
                'busy_connections': stats.busy_connections
            })
    except Exception as e:
        current_app.logger.error(f"Error getting DB stats: {str(e)}")
        return jsonify({'error': 'Failed to get database stats'}), 500