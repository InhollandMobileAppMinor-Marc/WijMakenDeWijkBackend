/** Utility function that wraps a callback function into a Promise. */
export async function promisify<R>(func: (cb: (err?: Error) => void) => R): Promise<R> {
    return new Promise((resolve, reject) => {
        const returnValue = func((err) => {
            if (err)
                reject(err)
            else
                resolve(returnValue)
        })
    })
}
