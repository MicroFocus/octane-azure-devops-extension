echo OFF
set extension=%1
call cleanup_src.bat
call cleanup_templates.bat

echo.
echo Building %extension% extension
echo.
echo ======================================
echo Removing pkg folder and dist folder, if they exist
if exist pkg (
   rmdir /S /Q pkg || goto :error
)
mkdir pkg || goto :error
if exist dist (
   rmdir /S /Q dist || goto :error
)
echo ======================================

pushd .
echo.
echo ======================================
echo Installing and typescript compiling for PROD
cd src
cmd /C "npm install || goto :error"
cmd /C "tsc --build tsconfig.prod.json || goto :error"
echo Installing and compiling for PROD FINISHED
echo ======================================
popd

echo.
echo ======================================
echo Copying package.json
copy src\package.json dist\package.json || goto :error
echo ======================================

pushd .
echo.
echo ======================================
cd dist
echo npm install production
cmd /C "npm install --only=production || goto :error"
echo ======================================
popd

echo.
echo ======================================
echo Removing package.json and package-lock.json from dist folder to avoid being copied unnecessarily
del dist\package.json
del dist\package-lock.json
echo ======================================

echo.
echo ======================================
echo Copying source files
xcopy /S /Y dist\* pkg\Tasks\StartTask\ >NUL || goto :error
xcopy /S /Y dist\* pkg\Tasks\EndTask\ >NUL || goto :error
xcopy /S /Y dist\* pkg\Tasks\TestRunnerStartTask\ >NUL || goto :error

echo Copying source files DONE
echo ======================================

echo.
echo ======================================
echo Copying %extension% extension template files
xcopy /S /Y templates\%extension%\* pkg\ || goto :error
echo ======================================

echo.
echo ======================================
echo Deleting %extension% orchestrator files. We don't want to release this yet
if exist pkg\Tasks\PipelinesOrchestrator (
   rmdir /S /Q pkg\Tasks\PipelinesOrchestrator || goto :error
)
echo ======================================

pushd .
echo.
echo ======================================
echo Packaging the extension
cd pkg
cmd /C "tfx extension create --manifests vss-extension.json --output-path ..\" || goto :error
echo The extension is ready
echo ======================================
popd

echo.
echo ======================================
echo Removing pkg folder and dist folder, if they exist, to avoid IDE indexing and hanging after build
if exist pkg (
   rmdir /S /Q pkg || goto :error
)
if exist dist (
   rmdir /S /Q dist || goto :error
)
echo Removal DONE
echo ======================================

goto :eof

:error
echo Error occurred
popd
:eof
