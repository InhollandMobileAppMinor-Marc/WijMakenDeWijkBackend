import { Repository, WithId } from "@peregrine/mongo-connect"
import { Request } from "koa"
import { isString } from "../utils/checkType"
import { decodeToken } from "../utils/token"
import { getUser } from "./getUser"
import { LinkedCredentials } from "../domain/Credentials"

export async function getUserFromRequest(credentials: Repository<LinkedCredentials>, requestOrAuthHeader: Request | string): Promise<WithId<LinkedCredentials>> {
    const authHeader = typeof requestOrAuthHeader === "string" ? requestOrAuthHeader : requestOrAuthHeader.get("Authorization")
    if (!isString(authHeader) || authHeader === "")
        throw Error("No Authorization header provided")

    if (authHeader.startsWith("Basic")) {
        const auth = authHeader.replace("Basic ", "")
        const [, email, password] = /^([^:]*):(.*)$/.exec(Buffer.from(auth, "base64").toString()) ?? [null, null, null]

        if (email === null || password === null)
            throw Error("Invalid authentication data")

        return await getUser(credentials, email, password)
    } else if (authHeader.startsWith("Bearer")) {
        const token = authHeader.replace("Bearer ", "")
        const email = decodeToken(token)
        if (email === null)
            throw Error("Token has expired")

        const user = await credentials.firstOrNull({email})

        if (user === null)
            throw new Error("User does not exist")

        return user
    }

    throw Error("No Authorization header provided")
}
