import { Repository, WithId } from "@peregrine/mongo-connect"
import { User } from "../domain/User"

export async function getUser(users: Repository<User, null>, email: string, password: string): Promise<WithId<User>> {
    const usersList = (await users.getAll()) ?? []
    const user = usersList.find(it => it.email === email) ?? null

    if (user === null)
        throw new Error("User does not exist")

    if (user.password !== password)
        throw new Error("Invalid password")

    return user
}
