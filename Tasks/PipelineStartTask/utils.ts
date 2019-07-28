export function createAsyncApi(apiToConvert) {
    return async function(data) {
        return new Promise((resolve, reject) => {
            apiToConvert(data, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    };
}
