export function isString(instance: any): instance is string {
    return instance !== undefined && instance !== null && typeof instance === "string"
}

export function isStringOrNull(instance: any): instance is (string | null) {
    return instance !== undefined && (instance === null || typeof instance === "string")
}

export function isObject(instance: any): instance is {[key: string]: any} {
    return instance !== undefined && instance !== null && typeof instance === "object" && !Array.isArray(instance)
}

export function isObjectOrNull(instance: any): instance is ({[key: string]: any} | null) {
    return instance !== undefined && (instance === null || (typeof instance === "object" && !Array.isArray(instance)))
}

export function isArray(instance: any): instance is any[] {
    return instance !== undefined && instance !== null && typeof instance === "object" && Array.isArray(instance)
}

export function isArrayOrNull(instance: any): instance is (any[] | null) {
    return instance !== undefined && (instance === null || (typeof instance === "object" && Array.isArray(instance)))
}

export function isNumber(instance: any): instance is number {
    return instance !== undefined && instance !== null && typeof instance === "number"
}

export function isNumberOrNull(instance: any): instance is (number | null) {
    return instance !== undefined && (instance === null || typeof instance === "number")
}
