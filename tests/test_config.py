from flask_app import create_app, db  # Adjust the import based on your app's structure
from flask_app.config import TestingConfig

app = create_app(TestingConfig)

@app.before_first_request
def setup_db():
    db.create_all()

@app.teardown_appcontext
def teardown_db(exception):
    db.session.remove()
    db.drop_all()
