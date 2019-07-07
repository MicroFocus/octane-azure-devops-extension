for %%t in (PipelineInitTask) do (
    pushd .
    cd Tasks/%%t
    cmd /C tsc || goto :loop_error
    popd
)
cmd /C tfx extension create --manifests vss-extension.json || goto :error
goto :eof

:loop_error
echo Error occurred
popd
goto :eof

:error
echo Error occurred
goto :eof
