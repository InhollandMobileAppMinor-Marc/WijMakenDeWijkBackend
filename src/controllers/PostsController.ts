import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { Post } from "../domain/Post"

@ApiController("/api/v0")
export class PostsController {
    constructor(private readonly posts: MutableRepository<Post, null>) { }

    @HttpGet
    @Path("/posts")
    public async getAllPosts({ response }: Context) {
        response.status = 200
        response.body = (await this.posts.getAll()) ?? []
    }

    @HttpGet
    @Path("/posts/:id")
    public async getPostById({ params, response }: Context) {
        const item = await this.posts.getById(params.id)
        if(item == null) {
            response.status = 404
        } else {
            response.status = 200
            response.body = item
        }
    }

    @HttpPost
    @Path("/posts")
    public async createPost({ request, response }: Context) {
        const body = request.body
        if (!Post.isSerialisedPost(body)) {
            response.status = 400
            response.body = {
                message: "Invalid request body"
            }
        } else {
            const post = Post.deserialisePost(body)
            response.status = 200
            response.body = await this.posts.add(post)
        }
    }
}
