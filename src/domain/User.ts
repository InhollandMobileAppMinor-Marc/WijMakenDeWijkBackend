import { isObject, isString } from "../utils/checkType"

export interface User {
    email: string
    password: string
}

export const User = {
    isUser: (user: any): user is User => {
        return isObject(user) && isString(user.email) && isString(user.password)
    }
}
