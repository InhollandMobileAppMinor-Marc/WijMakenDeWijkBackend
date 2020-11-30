import { isArray, isObject, isString } from "../utils/checkType"
import moment from "moment"

interface BasePost {
    title: string
    body: string
    category: string
    author: string
    comments: string[]
}

export interface SerialisedPost extends BasePost {
    timestamp: string
}

export interface Post extends BasePost {
    timestamp: Date
}

export const Post = {
    isSerialisedPost: (post: any): post is SerialisedPost => {
        return isObject(post) && isString(post.title) && isString(post.body) 
            && isString(post.timestamp) && isString(post.category) && isString(post.author)
            && isArray(post.comments)
    },
    deserialisePost: (post: SerialisedPost): Post => {
        return {
            title: post.title,
            body: post.body,
            timestamp: moment(post.timestamp).toDate(),
            category: post.category,
            author: post.author,
            comments: post.comments
        }
    }
}
