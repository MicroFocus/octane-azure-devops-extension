@echo off
rmdir /S /Q pkg
mkdir pkg
xcopy /S /Y templates\* pkg\
mkdir pkg\Tasks\StartTask\
xcopy /S /Y src\* pkg\Tasks\StartTask\
mkdir pkg\Tasks\EndTask\
xcopy /S /Y src\* pkg\Tasks\EndTask\

pushd .
echo.
echo ======================================
echo Building StartTask
cd pkg\Tasks\StartTask
cmd /C "npm install && tsc || goto :build_error"
echo StartTask is ready
echo ======================================
popd

pushd .
echo.
echo ======================================
echo Building EndTask
cd pkg\Tasks\EndTask
cmd /C "npm install && tsc || goto :build_error"
echo EndTask is ready
echo ======================================
popd

pushd .
echo.
echo ======================================
echo Packaging the extension
cd pkg
cmd /C tfx extension create --manifests vss-extension.json || goto :error
echo The extension is ready
echo ======================================
popd
goto :eof

:build_error
echo Error occurred
popd
goto :eof

:error
echo Error occurred
goto :eof
