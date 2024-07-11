from flask_app import create_app

# Create the Flask app with the 'development' configuration
app = create_app('testing')

if __name__ == '__main__':
    app.run(debug=True)
