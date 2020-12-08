import { isObject, isString } from "../utils/checkType"
import moment from "moment"
import { MongoSchema, required, reference } from "@peregrine/mongo-connect"

interface BaseComment {
    body: string
    author: string
    post: string
}

export interface SerialisedComment extends BaseComment {
    timestamp: string
}

export interface Comment extends BaseComment {
    timestamp: Date
}

export const Comment = {
    isSerialisedComment: (comment: any): comment is SerialisedComment => {
        return isObject(comment) && isString(comment.body) && isString(comment.author) 
            && isString(comment.timestamp) && isString(comment.post)
    },
    deserialiseComment: (comment: SerialisedComment): Comment => {
        return {
            body: comment.body,
            timestamp: moment(comment.timestamp).toDate(),
            author: comment.author,
            post: comment.post
        }
    },
    scheme: {
        body: required(String),
        timestamp: required(Date),
        author: reference("users", true),
        post: reference("posts", true)
    } as MongoSchema<Comment>
}
