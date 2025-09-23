@echo off
set /p commit_message="Please enter your commit message: "

git add .
git commit -m "%commit_message%"
git push

echo.
echo Git operations completed successfully!
pause