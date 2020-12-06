import { ApiController, HttpGet, Path } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { Comment } from "../domain/Comment"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

@ApiController("/api/v0")
export class CommentsController {
    constructor(
        private readonly comments: MutableRepository<Comment>
    ) {}

    @HttpGet
    @Path("/comments/:id")
    public async getCommentById({ request, params, response }: Context) {
        let query = this.comments.queryById(params.id)
        if (request.query["inlineAuthor"] === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Comment>
        if (request.query["inlinePost"] === "true")
            query = query.inlineReferencedObject<Post>("post") as unknown as DocumentQueryBuilder<Comment>
        const item = await query.getResult()
        if(item === null) {
            response.status = 404
        } else {
            response.status = 200
            response.body = item
        }
    }
}
