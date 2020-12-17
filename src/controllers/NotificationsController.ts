import { Auth, BasicAuth, BearerToken, Controller, DefaultStatusCode, HttpDelete, HttpGet, HttpStatusCodes, Query, Res } from "@peregrine/koa-with-decorators"
import { DocumentsArrayQueryBuilder, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { verifyAuthentication } from "../data/verifyAuthentication"
import { Comment } from "../domain/Comment"
import { LinkedCredentials } from "../domain/Credentials"
import { Notification } from "../domain/Notification"
import { Post } from "../domain/Post"
import { User } from "../domain/User"

type QueryObj = { [key: string]: string | undefined }

@Controller("/notifications")
export class NotificationsController {
    constructor(
        private readonly credentialsRepo: Repository<LinkedCredentials>,
        private readonly notifications: MutableRepository<Notification>
    ) {}

    @HttpGet
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async getNotifications(
        @Auth auth: BearerToken | BasicAuth | null,
        @Query query: QueryObj, 
        @Res response: Response
    ) {
        const items = await this.getNotificationsForUser(auth, query)
        
        response.body = items.map(notification => ({ 
            id: notification.id, 
            post: notification.post, 
            comments: notification.comments 
        }))
    }

    @HttpDelete
    @DefaultStatusCode(HttpStatusCodes.OK)
    public async deleteNotifications(
        @Auth auth: BearerToken | BasicAuth | null, 
        @Query query: QueryObj, 
        @Res response: Response
    ) {
        const items = await this.getNotificationsForUser(auth, query)
        
        response.body = items.map(notification => ({ 
            id: notification.id, 
            post: notification.post, 
            comments: notification.comments 
        }))

        await Promise.all(
            items.map(it => this.notifications.delete(it.id))
        )
    }

    private async getNotificationsForUser(
        auth: BearerToken | BasicAuth | null, 
        requestQuery: QueryObj
    ): Promise<WithId<Notification>[]> {
        const userId = (await verifyAuthentication(auth, this.credentialsRepo))?.user?.toString()
        let query = this.notifications.filterAndQuery({ user: userId })
        if (requestQuery["inlineComments"] === "true") {
            let tmp0 = query.inlineReferencedObject<Comment>("comments")
            query = (requestQuery["inlineAuthor"] === "true" ? 
                tmp0.inlineReferencedSubObject<User, "comments">("comments", "author") : 
                tmp0) as unknown as DocumentsArrayQueryBuilder<Notification>
        }
        if (requestQuery["inlinePost"] === "true") {
            let tmp1 = query.inlineReferencedObject<Post>("post")
            query = (requestQuery["inlineAuthor"] === "true" ? 
                // @ts-ignore
                tmp1.inlineReferencedSubObject<User, "post">("post", "author") : 
                tmp1) as unknown as DocumentsArrayQueryBuilder<Notification>
        }
        return await query.getResult()
    }
}
