for %%t in (PipelineInitTask) do (
    pushd .
    cd Tasks/%%t
    cmd /C tsc || goto :error
    popd
)
tfx extension create --manifests vss-extension.json
goto :eof
:error
popd