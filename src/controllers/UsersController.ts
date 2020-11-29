import { ApiController, HttpGet, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { User } from "../domain/User"

@ApiController("/api/v0")
export class UsersController {
    constructor(private readonly users: MutableRepository<User, null>) { }

    @HttpGet
    @Path("/users")
    public async getAllUsers({ response }: Context) {
        response.status = 200
        response.body = (await this.users.getAll()) ?? []
    }

    @HttpGet
    @Path("/users/:id")
    public async getUserById({ params, response }: Context) {
        const item = await this.users.getById(params.id)
        if(item == null) {
            response.status = 404
        } else {
            response.status = 200
            response.body = item
        }
    }
}
