import os
import logging
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class BaseConfig:
    SECRET_KEY = os.getenv('SECRET_KEY','dev-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY','dev-jwt-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_API_URL = os.getenv('BASE_API_URL', 'http://localhost:5000')
    LOGGING_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOGGING_LOCATION = 'app.log'
    LOGGING_LEVEL = logging.DEBUG
    CORS_ORIGINS = [os.getenv('FRONTEND_URL', 'http://localhost:5173')]
    # Email configuration base settings
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    NOTIFICATION_EMAIL = os.getenv('NOTIFICATION_EMAIL')
    MAIL_SUPPRESS_SEND = False  # Default to allowing email sending

class DevelopmentSessionConfig(BaseConfig):
    DEBUG = True
    DEVELOPMENT = True
    
    POOL_OPTIONS = {
        'pool_size': 5,
        'max_overflow': 5,
        'pool_timeout': 10,
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'echo_pool': 'debug'
    }

    # Local database
    username = os.getenv("DATABASE_USERNAME")
    password = os.getenv("DATABASE_PASSWORD")
    host = os.getenv("DATABASE_HOST_URL")
    port = os.getenv("DATABASE_PORT_TRANSACTION_POOL")
    database_name = os.getenv("DATABASE_NAME_TRANSACTION_POOL")
    application_name = "IoT-Backend-Prod_transaction"

    SOCKET = True
    SQLALCHEMY_DATABASE_URI = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database_name}?application_name={application_name}"
    MAIL_DEBUG = True

class DevelopmentTransactionConfig(BaseConfig):
    DEBUG = True
    DEVELOPMENT = True
    
    POOL_OPTIONS = {
        'pool_size': 3,
        'max_overflow': 2,
        'pool_timeout': 10,
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'echo_pool': 'debug'
    }

    # Local database for transactions
    username = os.getenv("DATABASE_USERNAME")
    password = os.getenv("DATABASE_PASSWORD")
    host = os.getenv("DATABASE_HOST_URL")
    port = os.getenv("DATABASE_PORT_TRANSACTION_POOL")
    database_name = os.getenv("DATABASE_NAME_TRANSACTION_POOL")
    application_name = "IoT-Backend-Prod_transaction"

    SOCKET = False
    SQLALCHEMY_DATABASE_URI = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database_name}?application_name={application_name}"
    MAIL_DEBUG = True

class ProductionSessionConfig(BaseConfig):
    DEBUG = False
    DEVELOPMENT = False
    
    POOL_OPTIONS = {
        'pool_size': 20,
        'max_overflow': 10,
        'pool_timeout': 30,
        'pool_pre_ping': True,
        'pool_recycle': 1800,
        'echo_pool': 'debug'
    }

    username = os.getenv("DATABASE_USERNAME")
    password = os.getenv("DATABASE_PASSWORD")
    host = os.getenv("DATABASE_HOST_URL")
    port = os.getenv("DATABASE_PORT_TRANSACTION_POOL")
    database_name = os.getenv("DATABASE_NAME_TRANSACTION_POOL")
    application_name = "IoT-Backend-Prod_transaction"
    CORS_ORIGINS = [
        os.getenv('FRONTEND_URL')
    ]
    SOCKET = True
    SQLALCHEMY_DATABASE_URI = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database_name}?sslmode=require&application_name={application_name}"
    
    MAIL_DEBUG = False
    MAIL_SUPPRESS_SEND = False

class ProductionTransactionConfig(BaseConfig):
    DEBUG = False
    DEVELOPMENT = False
    
    POOL_OPTIONS = {
        'pool_size': 5,
        'max_overflow': 5,
        'pool_timeout': 10,
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'echo_pool': 'debug'
    }

    CORS_ORIGINS = [
        os.getenv('FRONTEND_URL')
    ]
    username = os.getenv("DATABASE_USERNAME")
    password = os.getenv("DATABASE_PASSWORD")
    host = os.getenv("DATABASE_HOST_URL")
    port = os.getenv("DATABASE_PORT_TRANSACTION_POOL")
    database_name = os.getenv("DATABASE_NAME_TRANSACTION_POOL")
    application_name = "IoT-Backend-Prod_transaction"

    SOCKET = False
    SQLALCHEMY_DATABASE_URI = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database_name}?sslmode=require&application_name={application_name}"
    
    MAIL_DEBUG = False
    MAIL_SUPPRESS_SEND = False

config = {
    'development_session': DevelopmentSessionConfig,
    'development_transaction': DevelopmentTransactionConfig,
    'production_session': ProductionSessionConfig,
    'production_transaction': ProductionTransactionConfig,
    'default': DevelopmentSessionConfig
}