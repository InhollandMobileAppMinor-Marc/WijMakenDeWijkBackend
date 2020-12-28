export function isString(instance: any): instance is string {
    return instance !== undefined && instance !== null && typeof instance === "string"
}

export function isStringOrNull(instance: any): instance is (string | null) {
    return instance !== undefined && (instance === null || typeof instance === "string")
}

export function isObject<T extends {[key: string]: any}>(instance: any): instance is Partial<T> {
    return instance !== undefined && instance !== null && typeof instance === "object" && !Array.isArray(instance)
}

export function isObjectOrNull<T extends {[key: string]: any}>(instance: any): instance is (Partial<T> | null) {
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

export function isBoolean(instance: any): instance is boolean {
    return instance !== undefined && instance !== null && typeof instance === "boolean"
}

export function isBooleanOrNull(instance: any): instance is (boolean | null) {
    return instance !== undefined && (instance === null || typeof instance === "boolean")
}
