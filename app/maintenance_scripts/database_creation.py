# Table creation script
from sqlalchemy import create_engine
from sqlalchemy_utils import database_exists, create_database

def create_tables(db_url):
    engine = create_engine(db_url)
    
    if not database_exists(engine.url):
        create_database(engine.url)
    
    BaseModel.metadata.create_all(engine)
    
    # Create hypertable for signals
    with engine.connect() as conn:
        conn.execute("SELECT create_hypertable('signals', 'tstamp');")
    
    print("Tables created successfully.")

if __name__ == "__main__":
    DB_URL = "postgresql://username:password@localhost:5432/your_database_name"
    create_tables(DB_URL)