# test_fetch_sensor_connection_data.py

from datetime import datetime, timedelta
from sqlalchemy import create_engine, func, case
from sqlalchemy.orm import sessionmaker
from ..models import Signal, Base  # Import your actual models
from your_dashboard import fetch_sensor_connection_data  # Import the function you want to test

# Create a test database
engine = create_engine('sqlite:///:memory:')
Session = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

def create_test_data(session):
    # Create some test data
    start_date = datetime(2024, 7, 1)
    for i in range(10):
        for hour in range(24):
            signal = Signal(
                id=1,  # Assume controlador_id is 1
                tstamp=start_date + timedelta(days=i, hours=hour),
                value_sensor1=True if hour < 12 else False,
                value_sensor2=True if hour % 2 == 0 else False
            )
            session.add(signal)
    session.commit()

def test_fetch_sensor_connection_data():
    session = Session()
    create_test_data(session)

    start_date = datetime(2024, 7, 1)
    end_date = datetime(2024, 7, 10)
    controlador_id = 1
    sensor_id = 'value_sensor1'

    # Set a breakpoint here to start debugging
    result = fetch_sensor_connection_data(controlador_id, sensor_id, start_date, end_date)

    # Print the result
    for day_data in result:
        print(f"Date: {day_data['date']}")
        print(f"  Connected: {day_data['connected']} minutes")
        print(f"  Disconnected: {day_data['disconnected']} minutes")
        print(f"  No Data: {day_data['noData']} minutes")

    session.close()

if __name__ == "__main__":
    test_fetch_sensor_connection_data()