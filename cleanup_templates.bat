echo OFF
pushd .
cd templates
echo.
echo ======================================
echo Clearing up the templates folder from all non-tracked files and folders
cmd /C "git clean -fdX  || goto :error"
echo ======================================
popd

goto :eof

:error
echo Error occurred
popd

:eof