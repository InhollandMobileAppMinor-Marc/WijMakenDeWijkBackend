import { Repository, WithId } from "@peregrine/mongo-connect"
import bcrypt from "bcrypt"
import { LinkedCredentials } from "../domain/Credentials"

export async function getUser(credentials: Repository<LinkedCredentials>, email: string, password: string): Promise<WithId<LinkedCredentials>> {
    const user = await credentials.firstOrNull({ email })

    if (user === null)
        throw new Error("User does not exist")

    const match = await bcrypt.compare(password, user.password)
    if (!match)
        throw new Error("Invalid password")

    return user
}
