import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, DocumentsArrayQueryBuilder, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
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
        private readonly usersRepo: Repository<User>,
        private readonly posts: MutableRepository<Post>,
        private readonly comments: MutableRepository<Comment>
    ) {}

    protected static getPostPreference(userHallway: string | null, first: WithId<Post>, second: WithId<Post>): number {
        const differenceInHours = Math.round((first.timestamp.getTime() - second.timestamp.getTime()) / 1000 / 60 / 60)
        if(userHallway === null) return differenceInHours
        // Award additional points if the post was made in the same hallway
        const thresholdInHours = 36
        const scoreForFirst = (differenceInHours > 0 ? differenceInHours : 0) + (first.hallway === userHallway ? thresholdInHours : 0)
        const scoreForSecond = (differenceInHours < 0 ? differenceInHours * -1 : 0) + (second.hallway === userHallway ? thresholdInHours : 0)
        // Preference if score is the same
        const hallwayBasedPreference = 
            first.hallway === userHallway && second.hallway !== userHallway ? -1 : 
            second.hallway === userHallway && first.hallway !== userHallway ? 1 : 0
        return scoreForFirst === scoreForSecond ? hallwayBasedPreference : scoreForSecond - scoreForFirst
    }

    @HttpGet
    @Path("/posts")
    public async getAllPosts({ request, response }: Context) {
        const user = await this.usersRepo.getById((await getUserFromRequest(this.credentialsRepo, request)).user)
        let query = this.posts.filterAndQuery({ location: user?.location }, { sort: { timestamp: "desc" } })
        if (request.query["inlineComments"] === "true") {
            let tmp = query.inlineReferencedObject<Comment>("comments")
            query = (request.query["inlineAuthor"] === "true" ? 
                tmp.inlineReferencedSubObject<User>("comments", "author") : 
                tmp) as unknown as DocumentsArrayQueryBuilder<Post>
        }
        if (request.query["inlineAuthor"] === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentsArrayQueryBuilder<Post>
        response.status = 200
        response.body = (await query.getResult()).sort((first, second) => PostsController.getPostPreference(user?.hallway ?? null, first, second))
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
        const authorId = (await getUserFromRequest(this.credentialsRepo, request))?.user?.toString()
        const user = await this.usersRepo.getById(authorId)
        body.author = authorId
        body.comments = []
        body.hallway = user?.hallway
        body.location = user?.location
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
