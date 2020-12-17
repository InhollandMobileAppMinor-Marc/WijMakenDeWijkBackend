import { AuthHeader, Controller, DefaultStatusCode, HttpGet, Path, Res } from "@peregrine/koa-with-decorators"
import { Repository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { User } from "../domain/User"
import { LinkedCredentials } from "../domain/Credentials"
import { getUserFromRequest } from "../data/getUserFromRequest"

@Controller
export class StatusController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly usersRepo: Repository<User>
    ) {}

    @HttpGet
    @Path("/status")
    @DefaultStatusCode(200)
    public async getStatus(@AuthHeader authHeader: string, @Res response: Response) {
        let user
        try {
            const credentials = await getUserFromRequest(this.credentialsRepo, authHeader)
            user = await this.usersRepo.getById(credentials.user)
        } catch (error) {
            user = null
        }

        response.body = {
            loggedIn: user !== null,
            user: user
        }
    }
}
