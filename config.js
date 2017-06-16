import Cdp from 'chrome-remote-interface'

export default {
    uuid: "ma08ir1jyFkXxp088HgiWkR1m3VL1hQaKBUUhDh2wI",
    loggin:true,
    async handler (event) {

        const versionInfo = await Cdp.Version()

        return {
            statusCode: 200,
            body: JSON.stringify({
                versionInfo,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        }
    },
}
