import { ApiController, HttpGet, HttpPost, Path } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, DocumentsArrayQueryBuilder, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
import { create } from "domain"
import { Context } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Notification } from "../domain/Notification"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

@ApiController("/api/v0")
export class CommentsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly comments: MutableRepository<Comment>,
        private readonly posts: MutableRepository<Post>,
        private readonly notifications: MutableRepository<Notification>
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

            await Promise.all([
                this.addCommentToPostDbObject(post, createdComment.id),
                this.createNotification(post, createdComment)
            ])
            
            let query = this.comments.queryById(createdComment.id)
            if (request.query["inlineAuthor"] === "true")
                query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Comment>

            response.status = 200
            response.body = await query.getResult()
        }
    }

    private async addCommentToPostDbObject(post: WithId<Post>, newCommentId: string): Promise<WithId<Post> | null> {
        return await this.posts.patch(post.id, {
            comments: [...post.comments, newCommentId]
        })
    }

    private async createNotification(post: WithId<Post>, comment: WithId<Comment>): Promise<WithId<Notification> | null> {
        if(post.author === comment.author) 
            return null

        const notification = await this.notifications.firstOrNull({ user: post.author, post: post.id })
        if(notification === null) {
            return await this.notifications.add({
                user: post.author,
                post: post.id,
                comments: [comment.id]
            })
        } else {
            return await this.notifications.patch(notification.id, {
                comments: [...notification.comments, comment.id]
            })
        }
    }
}
