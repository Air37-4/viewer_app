@echo off
echo Uploading project to GitHub...
cd /d "%~dp0"

git init
git add .
git commit -m "Initial commit: Desktop Video Gallery"
gh repo create viewer_app --public --source=. --remote=origin --push

echo.
echo Done! Repository URL should be displayed above.
echo.
pause
