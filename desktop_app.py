import os
import threading
import webview
import requests
from app import app

class Api:
    def select_folder(self):
        window = webview.active_window()
        result = window.create_file_dialog(webview.FOLDER_DIALOG)
        if result:
            folder_path = result[0]
            try:
                # Update the Flask app's folder via API call
                response = requests.post('http://127.0.0.1:5001/api/folder', json={'path': folder_path})
                if response.status_code == 200:
                    return folder_path
            except Exception as e:
                print(f"Error updating folder: {e}")
                return None
        return None

def start_flask():
    app.run(port=5001, debug=False, use_reloader=False)

if __name__ == '__main__':
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()

    api = Api()
    window = webview.create_window(
        'Просмотрщик', 
        'http://127.0.0.1:5001', 
        js_api=api,
        width=1400, 
        height=900, 
        min_size=(800, 600)
    )
    webview.start()
