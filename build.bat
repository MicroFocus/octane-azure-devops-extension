@echo off

for %%t in (PipelineStartTask) do (
    pushd .
    echo.
    echo ======================================
    echo Building task %%t
    cd Tasks/%%t
    cmd /C "npm install && tsc || goto :loop_error"
    echo Task %%t is ready
    echo ======================================
    popd
)

echo.
echo ======================================
echo Packaging the extension
cmd /C tfx extension create --manifests vss-extension.json || goto :error
echo The extension is ready
echo ======================================
goto :eof

:loop_error
echo Error occurred
popd
goto :eof

:error
echo Error occurred
goto :eof
