import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, DocumentsArrayQueryBuilder, MutableRepository, Repository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

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
        let query = this.posts.queryAll({ sort: { timestamp: "desc" } })
        if (request.query["inlineComments"] === "true") {
            let tmp = query.inlineReferencedObject<Comment>("comments")
            query = (request.query["inlineAuthor"] === "true" ? 
                tmp.inlineReferencedSubObject<User>("comments", "author") : 
                tmp) as unknown as DocumentsArrayQueryBuilder<Post>
        }
        if (request.query["inlineAuthor"] === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentsArrayQueryBuilder<Post>
        response.status = 200
        response.body = await query.getResult()
    }

    @HttpGet
    @Path("/posts/:id")
    public async getPostById({ request, params, response }: Context) {
        let query = this.posts.queryById(params.id)
        if (request.query["inlineComments"] === "true") {
            let tmp = query.inlineReferencedObject<Comment>("comments")
            query = (request.query["inlineAuthor"] === "true" ? 
                tmp.inlineReferencedSubObject<User>("comments", "author") : 
                tmp) as unknown as DocumentQueryBuilder<Post>
        }
        if (request.query["inlineAuthor"] === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Post>
        
        const item = await query.getResult()
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
            const createdPost = await this.posts.add(post)

            if (createdPost === null)
                throw new Error("Unkown error")

            let query = this.posts.queryById(createdPost.id)
            if (request.query["inlineAuthor"] === "true")
                query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Post>

            response.status = 200
            response.body = await query.getResult()
        }
    }

    @HttpGet
    @Path("/posts/:postId/comments")
    public async getAllCommentsForPost({ request, params, response }: Context) {
        let query = this.comments.filterAndQuery({ post: params.postId })
        if (request.query["inlineAuthor"] === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentsArrayQueryBuilder<Comment>
        
        response.status = 200
        response.body = await query.getResult()
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
            
            let query = this.comments.queryById(createdComment.id)
            if (request.query["inlineAuthor"] === "true")
                query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Comment>

            response.status = 200
            response.body = await query.getResult()
        }
    }
}
