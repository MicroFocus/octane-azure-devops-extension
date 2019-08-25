@echo off

pushd .
echo.
echo ======================================
echo Building src
cd src
cmd /C "npm install && tsc || goto :build_error"
echo src is ready
echo ======================================
popd

copy /y src\* pkg\StartTask
copy /y src\* pkg\EndTask

echo.
echo ======================================
echo Packaging the extension
cmd /C tfx extension create --manifests pkg/vss-extension.json || goto :error
echo The extension is ready
echo ======================================
goto :eof

:build_error
echo Error occurred
popd
goto :eof

:error
echo Error occurred
goto :eof
