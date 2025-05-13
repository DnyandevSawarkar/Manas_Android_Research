import os
import sys

# Add your project directory to the sys.path
project_home = '/home/yashsawarkar/Manas_Android_Research'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment variables
os.environ['TOGETHER_API_KEY'] = '866abf990385a71eed854cc250f1fd4b8abd5e6b17b386f48cd795bc7572fe2a'
os.environ['TAVILY_API_KEY'] = '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'

# Import your Flask app
from src.main import app as application  # This is needed for WSGI
