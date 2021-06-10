echo OFF
pushd .
cd src
echo.
echo ======================================
echo Clearing up the src folder from all non-tracked files and folders
cmd /C "git clean -fdX  || goto :error"
echo ======================================
popd

goto :eof

:error
echo Error occurred
popd

:eof