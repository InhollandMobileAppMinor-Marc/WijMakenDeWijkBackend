import { Repository, WithId } from "@peregrine/mongo-connect"
import { Request } from "koa"
import { isString } from "../utils/checkType"
import { decodeToken } from "../utils/token"
import { User } from "../domain/User"
import { getUser } from "./getUser"

export async function getUserFromRequest(users: Repository<User, null>, request: Request): Promise<WithId<User>> {
    const authHeader = request.get("Authorization")
    if (!isString(authHeader) || authHeader === "")
        throw Error("No Authorization header provided")

    if (authHeader.startsWith("Basic")) {
        const auth = authHeader.replace("Basic ", "")
        const [, email, password] = /^([^:]*):(.*)$/.exec(Buffer.from(auth, "base64").toString()) ?? [null, null, null]

        if (email === null || password === null)
            throw Error("Invalid authentication data")

        return await getUser(users, email, password)
    } else if (authHeader.startsWith("Bearer")) {
        const token = authHeader.replace("Bearer ", "")
        const email = decodeToken(token)
        if (email === null)
            throw Error("Token has expired")

        const usersList = (await users.getAll()) ?? []
        const user = usersList.find(it => it.email === email) ?? null

        if (user === null)
            throw new Error("User does not exist")

        return user
    }

    throw Error("No Authorization header provided")
}
