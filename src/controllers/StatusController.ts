import { Auth, BasicAuth, BearerToken, Controller, DefaultStatusCode, HttpGet, HttpStatusCodes, Res } from "@peregrine/koa-with-decorators"
import { Repository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { User } from "../domain/User"
import { LinkedCredentials } from "../domain/Credentials"
import { verifyAuthentication } from "../data/verifyAuthentication"

@Controller("/status")
export class StatusController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly usersRepo: Repository<User>
    ) {}

    @HttpGet
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async getStatus(@Auth auth: BearerToken | BasicAuth | null, @Res response: Response) {
        let user
        try {
            const credentials = await verifyAuthentication(auth, this.credentialsRepo)
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
