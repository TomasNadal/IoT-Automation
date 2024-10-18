from flask import current_app
from sqlalchemy import text

def kill_idle_connections(idle_time_minutes=30):
    try:
        with current_app.app_context():
            engine = current_app.extensions['sqlalchemy'].db.engine
            with engine.connect() as connection:
                connection.execute(text(f"""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                    AND state = 'idle'
                    AND state_change < current_timestamp - INTERVAL '{idle_time_minutes} minutes'
                """))
                current_app.logger.info(f"Killed idle connections older than {idle_time_minutes} minutes")
    except Exception as e:
        current_app.logger.error(f"Error killing idle connections: {str(e)}")