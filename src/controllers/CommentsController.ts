import { Auth, BasicAuth, BearerToken, Body, CachedFor, Controller, DefaultStatusCode, HttpDelete, HttpGet, HttpPost, HttpStatusCodes, ID, Path, Query, Res } from "@peregrine/koa-with-decorators"
import { DocumentQueryBuilder, DocumentsArrayQueryBuilder, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { verifyAuthentication } from "../data/verifyAuthentication"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Notification } from "../domain/Notification"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

@Controller
export class CommentsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly usersRepo: Repository<User>,
        private readonly comments: MutableRepository<Comment>,
        private readonly posts: MutableRepository<Post>,
        private readonly notifications: MutableRepository<Notification>
    ) {}

    @HttpGet
    @Path("/comments/:id")
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(90, "minutes")
    public async getCommentById(
        @ID id: string, 
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Query("inlinePost") inlinePost: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        let query = this.comments.queryById(id)
        if (inlineAuthor === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Comment>
        if (inlinePost === "true")
            query = query.inlineReferencedObject<Post>("post") as unknown as DocumentQueryBuilder<Comment>
        const item = await query.getResult()
        if(item === null) {
            response.status = HttpStatusCodes.NotFound
        } else {
            response.body = item
        }
    }

    @HttpPost
    @Path("/comments")
    @DefaultStatusCode(HttpStatusCodes.Created)
    public async createComment(
        @Auth auth: BearerToken | BasicAuth | null,
        @Body body: Partial<Comment>,
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        body.author = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        body.deleted = false
        if (!Comment.isSerialisedComment(body)) {
            response.status = HttpStatusCodes.BadRequest
            response.body = {
                message: "Invalid request body"
            }
        } else {
            const comment = Comment.deserialiseComment(body)
            const createdComment = await this.comments.add(comment)
            const post = await this.posts.getById(body.post)
            if (post === null || createdComment === null)
                throw new Error("Unkown error")

            await Promise.all([
                this.addCommentToPostDbObject(post, createdComment.id),
                this.createNotification(post, createdComment)
            ])
            
            let query = this.comments.queryById(createdComment.id)
            if (inlineAuthor === "true")
                query = query.inlineReferencedObject<User>("author") as unknown as DocumentQueryBuilder<Comment>

            response.body = await query.getResult()
        }
    }

    @HttpDelete
    @Path("/comments/:id")
    @DefaultStatusCode(HttpStatusCodes.NoContent)
    public async deleteComment(
        @Auth auth: BearerToken | BasicAuth | null,
        @ID id: string,
        @Res response: Response
    ) {
        const userId = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        const user = await this.usersRepo.getById(userId)
        const comment = await this.comments.getById(id)

        if(comment?.author?.toString() !== userId && user?.role !== "admin") {
            response.status = HttpStatusCodes.Unauthorized
            return
        }

        await this.comments.patch(id, { deleted: true })
    }

    @HttpPost
    @Path("/comments/:id/reports")
    @DefaultStatusCode(HttpStatusCodes.Created)
    public async addReportToComment() {}

    // --- Comments on posts ---

    @HttpGet
    @Path("/posts/:id/comments")
    @DefaultStatusCode(HttpStatusCodes.OK)
    @CachedFor(90, "seconds")
    public async getAllCommentsForPost(
        @ID id: string, 
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        let query = this.comments.filterAndQuery({ post: id })
        if (inlineAuthor === "true")
            query = query.inlineReferencedObject<User>("author") as unknown as DocumentsArrayQueryBuilder<Comment>
        
        response.body = await query.getResult()
    }

    @HttpPost
    @Path("/posts/:id/comments")
    @DefaultStatusCode(HttpStatusCodes.Created)
    public async createCommentForPost(
        @Auth auth: BearerToken | BasicAuth | null,
        @ID postId: string, 
        @Body body: Partial<Comment>,
        @Query("inlineAuthor") inlineAuthor: "true" | "false" | undefined, 
        @Res response: Response
    ) {
        body.post = postId
        await this.createComment(auth, body, inlineAuthor, response)
    }

    private async addCommentToPostDbObject(post: WithId<Post>, newCommentId: string): Promise<WithId<Post> | null> {
        return await this.posts.patch(post.id, {
            comments: [...post.comments, newCommentId]
        })
    }

    private async createNotification(post: WithId<Post>, comment: WithId<Comment>): Promise<WithId<Notification> | null> {
        if(post.author.toString() === comment.author.toString()) 
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
