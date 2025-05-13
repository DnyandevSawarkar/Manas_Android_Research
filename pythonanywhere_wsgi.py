import os
import sys

# Add your project directory to the sys.path
path = '/home/yashsawarkar/mock_interview_app'
if path not in sys.path:
    sys.path.append(path)

os.environ['FLASK_ENV'] = 'production'

# Import your Flask app
from src.main import app as application

# Optional: Configure logging
import logging
logging.basicConfig(stream=sys.stderr)
