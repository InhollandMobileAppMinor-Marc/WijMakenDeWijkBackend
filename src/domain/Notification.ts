import { MongoSchema, reference } from "@peregrine/mongo-connect"

export interface Notification {
    /** The author of the post which should receive the notification */
    user: string
    /** The post where these comments belong to */
    post: string
    /** The newly made comments */
    comments: string[]
}

export const Notification = {
    scheme: {
        user: {
            ...reference("users", true),
            index: true
        },
        post: {
            ...reference("posts", true),
            index: true
        },
        comments: {
            type: [reference("comments", true)],
            required: true
        }
    } as MongoSchema<Notification>
}
