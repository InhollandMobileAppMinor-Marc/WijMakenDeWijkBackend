import { isObject, isString } from "../utils/checkType"
import { EMAIL_REGEXP } from "../utils/email"

export interface User {
    email: string
    name: string
    role: "admin" | "user"
}

export const User = {
    isUser: (user: any): user is User => {
        return isObject(user) && isString(user.email) && isString(user.name) && isString(user.role)
            && EMAIL_REGEXP.test(user.email)
    }
}
