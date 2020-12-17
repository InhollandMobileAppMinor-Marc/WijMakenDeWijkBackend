import { AuthHeader, Controller, DefaultStatusCode, HttpDelete, HttpGet, Query, Res } from "@peregrine/koa-with-decorators"
import { DocumentsArrayQueryBuilder, MutableRepository, Repository, WithId } from "@peregrine/mongo-connect"
import { Response } from "koa"
import { getUserFromRequest } from "../data/getUserFromRequest"
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
    @DefaultStatusCode(200)
    public async getNotifications(@AuthHeader authHeader: string, @Query query: QueryObj, @Res response: Response) {
        const items = await this.getNotificationsForUser(authHeader, query)
        if(items === []) {
            response.status = 204
        } else {
            response.body = items.map(notification => ({ 
                id: notification.id, 
                post: notification.post, 
                comments: notification.comments 
            }))
        }
    }

    @HttpDelete
    @DefaultStatusCode(200)
    public async deleteNotifications(@AuthHeader authHeader: string, @Query query: QueryObj, @Res response: Response) {
        const items = await this.getNotificationsForUser(authHeader, query)
        if(items === []) {
            response.status = 204
        } else {
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

    private async getNotificationsForUser(authHeader: string, requestQuery: QueryObj): Promise<WithId<Notification>[]> {
        const userId = (await getUserFromRequest(this.credentialsRepo, authHeader))?.user?.toString()
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
