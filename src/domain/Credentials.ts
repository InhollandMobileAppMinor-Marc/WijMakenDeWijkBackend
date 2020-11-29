import { isObject, isString } from "../utils/checkType"
import { EMAIL_REGEXP } from "../utils/email"

export interface Credentials {
    email: string
    password: string
}

export interface LinkedCredentials extends Credentials {
    user: string
}

export const Credentials = {
    areCredentials: (credentials: any): credentials is Credentials => {
        return isObject(credentials) && isString(credentials.email) && isString(credentials.password)
            && EMAIL_REGEXP.test(credentials.email)
    }
}
