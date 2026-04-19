import traceback
import sys
import os

# Set python path to current dir to find app
sys.path.append(os.getcwd())

try:
    from app.main import app
    print("App loaded successfully")
except Exception:
    with open("error_trace.txt", "w") as f:
        traceback.print_exc(file=f)
    print("Error captured in error_trace.txt")
