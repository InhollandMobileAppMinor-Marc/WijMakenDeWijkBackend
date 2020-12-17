import { CachedFor, Controller, DefaultStatusCode, HttpGet, ID, Path, Res } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { User } from "../domain/User"

@Controller("/users")
export class UsersController {
    constructor(private readonly users: MutableRepository<User>) {}

    @HttpGet
    @DefaultStatusCode(200)
    @CachedFor(2, "minutes")
    public async getAllUsers(@Res response: Response) {
        response.body = (await this.users.getAll()) ?? []
    }

    @HttpGet
    @Path("/:id")
    @DefaultStatusCode(200)
    @CachedFor(90, "minutes")
    public async getUserById(@ID id: string, @Res response: Response) {
        const item = await this.users.getById(id)
        if(item === null) {
            response.status = 404
        } else {
            response.body = item
        }
    }
}
