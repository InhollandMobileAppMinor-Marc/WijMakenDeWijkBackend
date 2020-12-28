import { Auth, BasicAuth, BearerToken, CachedFor, Controller, DefaultStatusCode, HttpDelete, HttpGet, HttpStatusCodes, ID, Path, Res } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { verifyAuthentication } from "../data/verifyAuthentication"
import { LinkedCredentials } from "../domain/Credentials"
import { User } from "../domain/User"

@Controller("/users")
export class UsersController {
    constructor(
        private readonly credentialsRepo: MutableRepository<LinkedCredentials>,
        private readonly users: MutableRepository<User>
    ) {}

    @HttpGet
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(2, "minutes")
    public async getAllUsers(@Res response: Response) {
        response.body = (await this.users.getAll()) ?? []
    }

    @HttpGet
    @Path("/:id")
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(90, "minutes")
    public async getUserById(@ID id: string, @Res response: Response) {
        const item = await this.users.getById(id)
        if(item === null) {
            response.status = HttpStatusCodes.NotFound
        } else {
            response.body = item
        }
    }

    @HttpDelete
    @Path("/:id")
    @DefaultStatusCode(HttpStatusCodes.NoContent)
    public async deleteUserById(
        @Auth auth: BearerToken | BasicAuth | null,
        @ID id: string, 
        @Res response: Response
    ) {
        const loggedInUserId = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        const loggedInUser = await this.users.getById(loggedInUserId)

        if(loggedInUserId !== id && loggedInUser?.role !== "admin") {
            response.status = HttpStatusCodes.Unauthorized
            return
        }

        await this.users.patch(id, { deleted: true })

        const credentialIdOfDeletedUser = (await this.credentialsRepo.firstOrNull({ user: id }))?.id?.toString()
        if(credentialIdOfDeletedUser)
            await this.credentialsRepo.delete(credentialIdOfDeletedUser)
    }
}
