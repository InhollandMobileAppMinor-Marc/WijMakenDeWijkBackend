import { ApiController, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUser } from "../data/getUser"
import { encodeToken } from "../utils/token"
import { User } from "../domain/User"
import bcrypt from "bcrypt"

@ApiController("/api/v0")
export class UsersController {
    constructor(private readonly users: MutableRepository<User, null>) { }

    @HttpPost
    @Path("/login")
    public async login({ request, response }: Context) {
        const body = request.body
        try {
            if(User.isUser(body)) {
                const user = await getUser(this.users, body.email, body.password)
                response.status = 200
                response.body = {
                    token: encodeToken(user.email)
                }
            } else {
                throw new Error("Invalid body")
            }
        } catch (error) {
            response.status = 400
            response.body = {
                message: error instanceof Error ? error.message : "Unknown Error"
            }
        }
    }

    @HttpPost
    @Path("/register")
    public async register({ request, response }: Context) {
        const body = request.body
        try {
            if(User.isUser(body)) {
                const usersList = (await this.users.getAll()) ?? []
                const emailIsUnique = (usersList.find(it => it.email === body.email) ?? null) !== null
                if(emailIsUnique)
                    throw new Error("E-mail is already registered")

                const user = await this.users.add({
                    email: body.email,
                    password: await bcrypt.hash(body.password, 10)
                })
                if(user === null) 
                    throw new Error("Unknown error")
                response.status = 200
                response.body = {
                    id: user.id,
                    email: user.email
                }
            } else {
                throw new Error("Invalid body")
            }
        } catch (error) {
            response.status = 400
            response.body = {
                message: error instanceof Error ? error.message : "Unknown Error"
            }
        }
    }
}
