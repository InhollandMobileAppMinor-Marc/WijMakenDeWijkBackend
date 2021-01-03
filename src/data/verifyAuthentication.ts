import { BasicAuth, BearerToken } from "@peregrine/koa-with-decorators"
import { Repository, WithId } from "@peregrine/mongo-connect"
import { LinkedCredentials } from "../domain/Credentials"
import { decodeToken } from "../utils/token"
import { getUser } from "./getUser"

export async function verifyAuthentication(
    auth: BearerToken | BasicAuth | null,
    credentials: Repository<LinkedCredentials>
): Promise<WithId<LinkedCredentials>> {
    if (auth instanceof BearerToken) {
        const loginId = decodeToken(auth.token)
        if (loginId === null)
            throw new Error("Token has expired")

        const user = await credentials.getById(loginId)

        if (user === null)
            throw new Error("User does not exist")

        return user
    } else if (auth instanceof BasicAuth) {
        return await getUser(credentials, auth.username, auth.password)
    }

    throw new Error("No authentication provided")
}
