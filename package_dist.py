import os
import subprocess
import sys

def package():
    print("Starting packaging process...")
    
    # Ensure pyinstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Define the command
    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "Viewer",
        "--icon", "app_icon.ico",
        "--add-data", "templates;templates",
        "--add-data", "static;static",
        "desktop_app.py"
    ]
    
    # On Windows, path separator in --add-data is ;
    # On Linux/Mac it is :
    # PyInstaller handles many details, but templates/static inclusion is critical for Flask
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd)
    
    print("\nPackage complete! Check the 'dist' folder for VideoGallery.exe")

if __name__ == "__main__":
    package()
