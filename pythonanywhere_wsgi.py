import os
import sys

# Add your project directory to the sys.path
path = '/home/YashSawarkar/Manas_Android_Research'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables - IMPORTANT: These must be set before importing the app
os.environ.setdefault('TOGETHER_API_KEY', '866abf990385a71eed854cc250f1fd4b8abd5e6b17b386f48cd795bc7572fe2a')
os.environ.setdefault('TAVILY_API_KEY', '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')
os.environ.setdefault('FLASK_ENV', 'production')

# Import your Flask app
from src.main import app as application

# Optional: Configure logging
import logging
logging.basicConfig(stream=sys.stderr)
