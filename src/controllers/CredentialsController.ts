import { Auth, BasicAuth, BearerToken, Body, Controller, DefaultStatusCode, HttpPatch, HttpPost, HttpStatusCodes, Path, Res } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { getUser } from "../data/getUser"
import { encodeToken } from "../utils/token"
import { User } from "../domain/User"
import bcrypt from "bcrypt"
import { Credentials, LinkedCredentials } from "../domain/Credentials"
import { verifyAuthentication } from "../data/verifyAuthentication"

@Controller
export class CredentialsController {
    constructor(
        private readonly credentialsRepo: MutableRepository<LinkedCredentials>,
        private readonly usersRepo: MutableRepository<User>
    ) {}

    @HttpPost
    @Path("/login")
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async login(@Body body: Partial<Credentials>, @Res response: Response) {
        // TODO: Use short-lived tokens and long-lived refresh tokens
        try {
            if(Credentials.areCredentials(body)) {
                const user = await getUser(this.credentialsRepo, body.email, body.password)

                response.body = {
                    user: user.user.toString(),
                    token: encodeToken(user.id)
                }
            } else {
                throw new Error("Invalid body")
            }
        } catch (error) {
            response.status = HttpStatusCodes.BadRequest
            response.body = {
                message: error instanceof Error ? error.message : "Unknown Error"
            }
        }
    }

    @HttpPost
    @Path("/register")
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async register(@Body body: Partial<Credentials & User>, @Res response: Response) {
        try {
            // TODO: Allow registered admins to create new admins
            body.role = "user"
            body.deleted = false
            if(Credentials.areCredentials(body) && User.isUser(body)) {
                const emailExists = await this.credentialsRepo.exists({ email: body.email })
                if(emailExists)
                    throw new Error("E-mail is already registered")

                const user = await this.usersRepo.add({
                    name: body.name,
                    role: body.role,
                    houseNumber: body.houseNumber,
                    hallway: body.hallway,
                    location: body.location,
                    deleted: body.deleted
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

                response.body = { ...user, email: credentials.email }
            } else {
                throw new Error("Invalid body")
            }
        } catch (error) {
            response.status = HttpStatusCodes.BadRequest
            response.body = {
                message: error instanceof Error ? error.message : "Unknown Error"
            }
        }
    }

    @HttpPatch
    @Path("/credentials")
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async updateCredentials(
        @Auth auth: BearerToken | BasicAuth | null,
        @Body body: Partial<Credentials>, 
        @Res response: Response
    ) {
        const loggedInUser = await verifyAuthentication(auth, this.credentialsRepo)
        
        try {
            if(Credentials.isCredentialsWithEmail(body)) {
                const emailExists = await this.credentialsRepo.exists({ email: body.email })
                if(emailExists)
                    throw new Error("E-mail is already registered")

                const credentials = await this.credentialsRepo.patch(loggedInUser.id, {
                    email: body.email
                })
                
                if(credentials === null) 
                    throw new Error("Unknown error")

                response.body = { email: credentials.email, user: credentials.user }
            } else if(Credentials.isCredentialsWithPassword(body)) {
                const credentials = await this.credentialsRepo.patch(loggedInUser.id, {
                    password: await bcrypt.hash(body.password, 10)
                })
                
                if(credentials === null) 
                    throw new Error("Unknown error")

                response.body = { email: credentials.email, user: credentials.user }
            } else {
                throw new Error("Invalid body")
            }
        } catch (error) {
            response.status = HttpStatusCodes.BadRequest
            response.body = {
                message: error instanceof Error ? error.message : "Unknown Error"
            }
        }
    }
}
