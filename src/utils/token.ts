import moment from "moment"
import jwt from "jwt-simple"

interface Payload {
    exp: number
    iat: number
    sub: string
}

export function encodeToken(username: string) {
    const payload : Payload = {
        exp: moment().add(4, 'months').unix(),
        iat: moment().unix(),
        sub: username
    }
    return jwt.encode(payload, process.env.SECRET_KEY ?? "ABCD")
}

export function decodeToken(token: string): string | null {
    try {
        const payload: Payload = jwt.decode(token, process.env.SECRET_KEY ?? "ABCD")
        const now = moment().unix()

        if (now > payload.exp)
            throw Error("Token has expired")

        return payload.sub
    } catch(err) {
        console.error(err)
        return null
    }
}
