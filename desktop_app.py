import os
import threading
import webview
from app import app

def start_flask():
    # Run Flask on a different port to avoid conflicts
    app.run(port=5001, debug=False, use_reloader=False)

if __name__ == '__main__':
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()

    # Create a pywebview window
    webview.create_window('Лена - Галерея', 'http://127.0.0.1:5001', 
                          width=1400, height=900, 
                          min_size=(800, 600))
    webview.start()
