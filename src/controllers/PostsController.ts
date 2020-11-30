import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository, Repository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
import { LinkedCredentials } from "../domain/Credentials"
import { Post } from "../domain/Post"

@ApiController("/api/v0")
export class PostsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly posts: MutableRepository<Post>
    ) {}

    @HttpGet
    @Path("/posts")
    public async getAllPosts({ response }: Context) {
        response.status = 200
        response.body = await this.posts.custom(async (model) => {
            return await model.find().populate("author")
        }, [])
    }

    @HttpGet
    @Path("/posts/:id")
    public async getPostById({ params, response }: Context) {
        const item = await this.posts.custom<any, null>(async (model) => {
            return await model.findById(params.id).populate("author")
        }, null)
        if(item === null) {
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
        body.author = (await getUserFromRequest(this.credentialsRepo, request))?.user?.toString()
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
