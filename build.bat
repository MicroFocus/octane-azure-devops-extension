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

xcopy /S /Y templates\* pkg\
xcopy /S /Y src\* pkg\Tasks\StartTask\
xcopy /S /Y src\* pkg\Tasks\EndTask\

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
