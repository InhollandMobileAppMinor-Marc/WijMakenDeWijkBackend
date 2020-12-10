import { ApiController, HttpDelete, Path } from "@peregrine/koa-with-decorators"
import { DocumentsArrayQueryBuilder, MutableRepository, Repository } from "@peregrine/mongo-connect"
import { Context } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Notification } from "../domain/Notification"
import { User } from "../domain/User"

@ApiController("/api/v0")
export class NotificationsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly notifications: MutableRepository<Notification>
    ) {}

    @HttpDelete
    @Path("/notifications")
    public async getCommentById({ request, response }: Context) {
        const userId = (await getUserFromRequest(this.credentialsRepo, request))?.user?.toString()
        let query = this.notifications.filterAndQuery({ user: userId })
        if (request.query["inlineComments"] === "true") {
            let tmp0 = query.inlineReferencedObject<Comment>("comments")
            query = (request.query["inlineAuthor"] === "true" ? 
                tmp0.inlineReferencedSubObject<User>("comments", "author") : 
                tmp0) as unknown as DocumentsArrayQueryBuilder<Notification>
        }
        /* if (request.query["inlinePost"] === "true") {
            let tmp1 = query.inlineReferencedObject<Post>("post") as DocumentsArrayQueryBuilder<ReplaceValueForKey<Notification, "post", WithId<Post> | null>>
            query = (request.query["inlineAuthor"] === "true" ? 
                tmp1.inlineReferencedSubObject<User>("post", "author") : 
                tmp1) as unknown as DocumentsArrayQueryBuilder<Notification>
        } */
        const items = await query.getResult()
        if(items === []) {
            response.status = 204
        } else {
            response.status = 200
            response.body = items.map(notification => ({ 
                id: notification.id, 
                post: notification.post, 
                comments: notification.comments 
            }))

            await Promise.all(
                items.map(it => this.notifications.delete(it.id))
            )
        }
    }
}
