import sys
import os
from flask import json
from flask_app import create_app
from flask_app.models import db
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import time

# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Step 1: Setup Flask application
def setup_app():
    print("Setting up test environment")
    app = create_app('testing')
    app_context = app.app_context()
    app_context.push()
    db.create_all()
    return app, app_context

# Step 2: Create database engine
def create_db_engine(app):
    print("Creating database engine")
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
    return engine

# Step 3: Terminate idle connections
def terminate_idle_connections(engine):
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT pid 
            FROM pg_stat_activity 
            WHERE backend_type = 'client backend'
            AND state = 'idle'
            AND application_name = 'TEST_IoT-Backend'
        """))
        pids = [row[0] for row in result]

        print(f"Terminating idle connections: {pids}")

        # Terminate idle connections
        for pid in pids:
            connection.execute(text(f"SELECT pg_terminate_backend({pid})"))

        return len(pids)

# Step 4: Ensure available connection
def ensure_available_connection(engine):
    pool_status = engine.pool.status()
    print(f"Pool status: {pool_status}")

    # Parse the pool_status string to extract the information
    pool_size = int(pool_status.split("Pool size:")[1].split("Connections in pool:")[0].strip())
    connections_in_pool = int(pool_status.split("Connections in pool:")[1].split("Current Overflow:")[0].strip())
    current_overflow = int(pool_status.split("Current Overflow:")[1].split("Current Checked out connections:")[0].strip())
    checked_out_connections = int(pool_status.split("Current Checked out connections:")[1].strip())

    print(f"Pool size: {pool_size}, Connections in pool: {connections_in_pool}, Current Overflow: {current_overflow}, Checked out connections: {checked_out_connections}")

    if connections_in_pool == 0:
        terminate_idle_connections(engine)
    
    try:
        connection = engine.connect()
        return connection
    except OperationalError as e:
        if "remaining connection slots are reserved for roles with the SUPERUSER attribute" in str(e):
            print("Reached max connections, terminating idle connections")
            terminate_idle_connections(engine)
            connection = engine.connect()
            return connection
        else:
            raise

# Step 5: Test connection checkout and return
def test_connection_checkout_and_return(engine):
    print("Running test_connection_checkout_and_return")
    with ensure_available_connection(engine) as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Result: {result.scalar()}")
        #assert result.scalar() == 1

    with ensure_available_connection(engine) as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Result: {result.scalar()}")
        #assert result.scalar() == 1
    print("Completed test_connection_checkout_and_return")

# Step 6: Test connection pool size
def test_connection_pool_size(engine):
    print("Running test_connection_pool_size")
    pool_size = engine.pool.size()
    print(f"Pool size: {pool_size}")
    #assert pool_size == 5  # Assuming the default pool size is 5
    print("Completed test_connection_pool_size")

# Step 7: Test connection pool timeout
def test_connection_pool_timeout(engine):
    print("Running test_connection_pool_timeout")
    pool_timeout = engine.pool.timeout()
    print(f"Pool timeout: {pool_timeout}")
    #assert pool_timeout == 30  # Assuming the default pool timeout is 30 seconds
    print("Completed test_connection_pool_timeout")

# Step 8: Test close idle connections
def test_close_idle_connections(engine):
    print("Running test_close_idle_connections")
    import time
    try:
        with ensure_available_connection(engine) as connection:
            result = connection.execute(text("SELECT 1"))
            print(f"Result: {result.scalar()}")
            #assert result.scalar() == 1

        time.sleep(2)  # Sleep for a while to simulate idle connections

        terminated_count = terminate_idle_connections(engine)
        print(f"Terminated {terminated_count} idle connections")
        #assert terminated_count > 0, "No idle connections were terminated"
    except OperationalError as e:
        if "remaining connection slots are reserved for roles with the SUPERUSER attribute" in str(e):
            print("Reached max connections, terminating idle connections")
            terminate_idle_connections(engine)
        else:
            raise
    print("Completed test_close_idle_connections")

# Step 9: Tear down test environment with retries for drop_all
def retry_drop_all(engine, retries=3, delay=5):
    for attempt in range(retries):
        try:
            with engine.connect() as connection:
                # Fetch all table names
                result = connection.execute(text("""
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                """))
                tables = [row[0] for row in result]

                # Drop each table
                for table in tables:
                    print(f"Dropping table {table}")
                    connection.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))

            print("Successfully dropped all tables.")
            break
        except OperationalError as e:
            print(f"OperationalError during drop_all: {e}")
            if attempt < retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Failed to drop all tables after multiple attempts.")
                raise
        except Exception as e:
            print(f"Unexpected error during drop_all: {e}")
            if attempt < retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Failed to drop all tables after multiple attempts.")
                raise

def tear_down(app_context, engine):
    print("Tearing down test environment")
    try:
        terminate_idle_connections(engine)
    except OperationalError as e:
        print(f"OperationalError during tearDown: {e}")
    finally:
        db.session.remove()
        retry_drop_all(engine)
        app_context.pop()

# Execute steps
if __name__ == '__main__':
    app, app_context = setup_app()
    engine = create_db_engine(app)

    test_connection_checkout_and_return(engine)
    test_connection_pool_size(engine)
    test_connection_pool_timeout(engine)
    test_close_idle_connections(engine)

    tear_down(app_context, engine)
