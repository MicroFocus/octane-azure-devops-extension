@echo off
rmdir /S /Q pkg || goto :error
mkdir pkg || goto :error
xcopy /S /Y templates\* pkg\ || goto :error
xcopy /S /Y src\* pkg\Tasks\StartTask\ || goto :error
xcopy /S /Y src\* pkg\Tasks\EndTask\ || goto :error

pushd .
echo.
echo ======================================
echo Building StartTask
cd pkg\Tasks\StartTask
cmd /C "npm install && tsc || goto :error"
echo StartTask is ready
echo ======================================
popd

pushd .
echo.
echo ======================================
echo Building EndTask
cd pkg\Tasks\EndTask
cmd /C "npm install && tsc || goto :error"
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

:error
echo Error occurred
popd
goto :eof
