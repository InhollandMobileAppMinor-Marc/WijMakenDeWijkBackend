import { ApiController, HttpGet, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { Comment } from "../domain/Comment"

@ApiController("/api/v0")
export class CommentsController {
    constructor(
        private readonly comments: MutableRepository<Comment>
    ) {}

    @HttpGet
    @Path("/comments/:id")
    public async getCommentById({ request, params, response }: Context) {
        const item = await this.comments.custom<any, null>(async (model) => {
            let query = model.findById(params.id)
            if (request.query["inlineAuthor"] === "true")
                query = query.populate("author")
            if (request.query["inlinePost"] === "true")
                query = query.populate("post")
            return await query
        }, null)
        if(item === null) {
            response.status = 404
        } else {
            response.status = 200
            response.body = item
        }
    }
}
