import { isObject, isString } from "../utils/checkType"
import moment from "moment"

interface BasePost {
    title: string
    description: string
    category: string
    author: string
}

export interface SerialisedPost extends BasePost {
    timestamp: string
}

export interface Post extends BasePost {
    timestamp: Date
}

export const Post = {
    isSerialisedPost: (post: any): post is SerialisedPost => {
        return isObject(post) && isString(post.title) && isString(post.description) 
            && isString(post.timestamp) && isString(post.category) && isString(post.author)
    },
    deserialisePost: (post: SerialisedPost): Post => {
        return {
            title: post.title,
            description: post.description,
            timestamp: moment(post.timestamp).toDate(),
            category: post.category,
            author: post.author
        }
    }
}
