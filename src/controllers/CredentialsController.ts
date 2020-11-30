import { ApiController, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUser } from "../data/getUser"
import { encodeToken } from "../utils/token"
import { User } from "../domain/User"
import bcrypt from "bcrypt"
import { Credentials, LinkedCredentials } from "../domain/Credentials"

@ApiController("/api/v0")
export class CredentialsController {
    constructor(
        private readonly credentialsRepo: MutableRepository<LinkedCredentials>,
        private readonly usersRepo: MutableRepository<User>
    ) {}

    @HttpPost
    @Path("/login")
    public async login({ request, response }: Context) {
        const body = request.body
        try {
            if(Credentials.areCredentials(body)) {
                const user = await getUser(this.credentialsRepo, body.email, body.password)
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
            body["role"] = "user"
            if(Credentials.areCredentials(body) && User.isUser(body)) {
                const emailExists = await this.credentialsRepo.exists({ email: body.email })
                if(emailExists)
                    throw new Error("E-mail is already registered")

                const user = await this.usersRepo.add({
                    name: body.name,
                    role: body.role,
                    houseNumber: body.houseNumber,
                    hallway: body.hallway,
                    location: body.location
                })
                if(user === null) 
                    throw new Error("Unknown error")

                const credentials = await this.credentialsRepo.add({
                    email: body.email,
                    password: await bcrypt.hash(body.password, 10),
                    user: user.id
                })
                if(credentials === null) 
                    throw new Error("Unknown error")

                response.status = 200
                response.body = { ...user, email: credentials.email }
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
