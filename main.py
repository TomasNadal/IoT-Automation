from flask_app import create_app
from flask_cors import CORS, cross_origin  # Importa Flask-CORS

app = create_app('testing')
CORS(app, supports_credentials=True)  # Permite solicitudes CORS desde cualquier origen

if __name__ == '__main__':
    app.run(debug=True)
