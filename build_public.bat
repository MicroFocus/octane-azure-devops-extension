echo OFF
call cleanup_src.bat
call cleanup_templates.bat

echo.
echo Building public extension
echo.
echo ======================================
echo Removing pkg folder, if exists
if exist pkg (
   rmdir /S /Q pkg || goto :error
)
mkdir pkg || goto :error
echo ======================================

echo.
echo ======================================
echo Copying public extension template files
xcopy /S /Y templates\public\* pkg\ || goto :error
echo ======================================

echo.
echo ======================================
echo Copying source files
xcopy /S /Y src\* pkg\Tasks\StartTask\ >NUL || goto :error
xcopy /S /Y src\* pkg\Tasks\EndTask\ >NUL || goto :error
echo Copying source files DONE
echo ======================================

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
cmd /C "tfx extension create --manifests vss-extension.json --output-path ..\" || goto :error
echo The extension is ready
echo ======================================
popd

goto :eof

:error
echo Error occurred
popd
:eof
