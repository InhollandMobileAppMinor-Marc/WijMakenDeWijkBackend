import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { MutableRepository, Repository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Post } from "../domain/Post"

@ApiController("/api/v0")
export class PostsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly posts: MutableRepository<Post>,
        private readonly comments: MutableRepository<Comment>
    ) {}

    @HttpGet
    @Path("/posts")
    public async getAllPosts({ request, response }: Context) {
        response.status = 200
        response.body = await this.posts.custom(async (model) => {
            let query = model.find()
            if (request.query["inlineComments"] === "true")
                query = request.query["inlineAuthor"] === "true" ? query.populate({
                    path: "comments",
                    populate: {
                        path: "author"
                    }
                }) : query.populate("comments")
            if (request.query["inlineAuthor"] === "true")
                query = query.populate("author")
            return await query
        }, [])
    }

    @HttpGet
    @Path("/posts/:id")
    public async getPostById({ request, params, response }: Context) {
        const item = await this.posts.custom<any, null>(async (model) => {
            let query = model.findById(params.id)
            if (request.query["inlineComments"] === "true")
                query = request.query["inlineAuthor"] === "true" ? query.populate({
                    path: "comments",
                    populate: {
                        path: "author"
                    }
                }) : query.populate("comments")
            if (request.query["inlineAuthor"] === "true")
                query = query.populate("author")
            return await query
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
        body.comments = []
        if (!Post.isSerialisedPost(body)) {
            response.status = 400
            response.body = {
                message: "Invalid request body"
            }
        } else {
            const post = Post.deserialisePost(body)
            response.status = 200
            response.body = await this.posts.custom<any, null>(async (model) => {
                let query = await model.create(post)
                if (request.query["inlineAuthor"] === "true")
                    query = query.populate("author")
                return query
            }, null)
        }
    }

    @HttpGet
    @Path("/posts/:postId/comments")
    public async getAllCommentsForPost({ request, params, response }: Context) {
        response.status = 200
        response.body = await this.comments.custom(async (model) => {
            let query = model.find({ post: params.postId })
            if (request.query["inlineAuthor"] === "true")
                query = query.populate("author")
            return await query
        }, [])
    }

    @HttpPost
    @Path("/posts/:postId/comments")
    public async createCommentForPost({ request, params, response }: Context) {
        const body = request.body
        body.author = (await getUserFromRequest(this.credentialsRepo, request))?.user?.toString()
        body.post = params.postId
        if (!Comment.isSerialisedComment(body)) {
            response.status = 400
            response.body = {
                message: "Invalid request body"
            }
        } else {
            const comment = Comment.deserialiseComment(body)
            const createdComment = await this.comments.add(comment)
            const post = await this.posts.getById(params.postId)
            if (post === null || createdComment === null)
                throw new Error("Unkown error")

            await this.posts.patch(params.postId, {
                comments: [...post.comments, createdComment.id]
            })

            response.status = 200
            response.body = await this.comments.custom<any, null>(async (model) => {
                let query = model.findById(createdComment.id)
                if (request.query["inlineAuthor"] === "true")
                    query = query.populate("author")
                return await query
            }, null)
        }
    }
}
