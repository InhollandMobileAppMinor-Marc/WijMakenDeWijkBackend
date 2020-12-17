import { CachedFor, Controller, DefaultStatusCode, HttpGet, HttpStatusCodes, ID, Path, Res } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { User } from "../domain/User"

@Controller("/users")
export class UsersController {
    constructor(private readonly users: MutableRepository<User>) {}

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
}
