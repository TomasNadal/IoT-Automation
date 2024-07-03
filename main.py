from flask_app import create_app
from flask_app.config import config


app = create_app('development') # Permite solicitudes CORS desde cualquier origen

if __name__ == '__main__':
    # Push an application context
    with app.app_context():
        app.run(debug=True)