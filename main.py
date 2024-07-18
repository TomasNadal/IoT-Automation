from flask_app import create_app, socketio
from flask_cors import CORS

app = create_app('testing')
CORS(app, supports_credentials=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
