import { ApiController, HttpGet, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { User } from "../domain/User"
import { LinkedCredentials } from "../domain/Credentials"
import { getUserFromRequest } from "../data/getUserFromRequest"

@ApiController("/api/v0")
export class StatusController {
    constructor(
        private readonly credentialsRepo: MutableRepository<LinkedCredentials>,
        private readonly usersRepo: MutableRepository<User>
    ) {}

    @HttpGet
    @Path("/status")
    public async getStatus({ request, response }: Context) {
        let user
        try {
            const credentials = await getUserFromRequest(this.credentialsRepo, request)
            user = await this.usersRepo.getById(credentials.user)
        } catch (error) {
            user = null
        }

        response.status = 200
        response.body = {
            loggedIn: user !== null,
            user: user
        }
    }
}
